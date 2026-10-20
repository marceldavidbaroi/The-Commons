-- ==============================================================================
-- Migration: 20271013000000_create_credit_ledger_schema.sql
-- Description: Credit Ledger schema, multi-tenant RLS, and payment processor
-- ==============================================================================

-- 1. CREDIT BOOKS (Multi-tenancy container)
create table if not exists public.credit_books (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    currency text not null default 'USD',
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

comment on table public.credit_books is 'Multi-tenant credit and cooperative ledger books owned by authenticated users.';

-- 2. MEMBERS
create table if not exists public.members (
    id uuid primary key default gen_random_uuid(),
    book_id uuid not null references public.credit_books(id) on delete cascade,
    account_no text not null,
    full_name text not null,
    phone text,
    email text,
    status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    unique (book_id, account_no)
);

comment on table public.members is 'Members belonging to a credit book ledger.';

-- 3. LOANS
create table if not exists public.loans (
    id uuid primary key default gen_random_uuid(),
    book_id uuid not null references public.credit_books(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    total_loan_amount numeric(12, 2) not null check (total_loan_amount > 0),
    credit_months int not null check (credit_months > 0),
    annual_rate numeric(5, 2) not null default 12.00 check (annual_rate >= 0),
    enable_security boolean not null default false,
    disbursed_at date not null default current_date,
    status text not null default 'active' check (status in ('active', 'paid_off', 'defaulted')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

comment on table public.loans is 'Micro-loans issued to members within a credit book.';

-- 4. MONTHLY TRANSACTIONS / COLLECTIONS
create table if not exists public.member_payments (
    id uuid primary key default gen_random_uuid(),
    book_id uuid not null references public.credit_books(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    loan_id uuid references public.loans(id) on delete set null,
    payment_date date not null default current_date,
    transaction_type text not null default 'payment' check (transaction_type in ('payment', 'savings_withdrawal', 'adjustment')),
    
    -- Breakdown
    share_amount numeric(12, 2) not null default 0.00 check (share_amount >= 0),
    health_amount numeric(12, 2) not null default 0.00 check (health_amount >= 0),
    loan_principal numeric(12, 2) not null default 0.00 check (loan_principal >= 0),
    loan_interest numeric(12, 2) not null default 0.00 check (loan_interest >= 0),
    loan_security numeric(12, 2) not null default 0.00 check (loan_security >= 0),
    savings_amount numeric(12, 2) not null default 0.00,
    total_amount numeric(12, 2) not null check (total_amount > 0),
    
    -- Snapshot states post-payment
    remaining_loan_balance numeric(12, 2) not null default 0.00 check (remaining_loan_balance >= 0),
    notes text,
    created_at timestamptz default now() not null
);

comment on table public.member_payments is 'Transaction journal recording collections, equity shares, savings, and loan paydowns.';

-- 5. Foreign Key & Performance Indexes
create index if not exists idx_credit_books_owner on public.credit_books(owner_id);
create index if not exists idx_members_book on public.members(book_id);
create index if not exists idx_loans_book_status on public.loans(book_id, status);
create index if not exists idx_loans_member on public.loans(member_id);
create index if not exists idx_member_payments_loan on public.member_payments(loan_id, payment_date desc, created_at desc);
create index if not exists idx_member_payments_member on public.member_payments(member_id, payment_date desc);
create index if not exists idx_member_payments_book on public.member_payments(book_id);

-- 6. Row Level Security (RLS)
alter table public.credit_books enable row level security;
alter table public.members enable row level security;
alter table public.loans enable row level security;
alter table public.member_payments enable row level security;

create policy "Owners manage credit books" on public.credit_books
    for all to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

create policy "Owners manage members" on public.members
    for all to authenticated
    using (book_id in (select id from public.credit_books where owner_id = (select auth.uid())))
    with check (book_id in (select id from public.credit_books where owner_id = (select auth.uid())));

create policy "Owners manage loans" on public.loans
    for all to authenticated
    using (book_id in (select id from public.credit_books where owner_id = (select auth.uid())))
    with check (book_id in (select id from public.credit_books where owner_id = (select auth.uid())));

create policy "Owners manage payments" on public.member_payments
    for all to authenticated
    using (book_id in (select id from public.credit_books where owner_id = (select auth.uid())))
    with check (book_id in (select id from public.credit_books where owner_id = (select auth.uid())));

-- 7. Atomic Payment Processor Stored Procedure
create or replace function public.record_monthly_payment(
    p_book_id uuid,
    p_member_id uuid,
    p_loan_id uuid,
    p_payment_date date,
    p_share numeric,
    p_health numeric,
    p_loan_principal numeric,
    p_total_payment numeric,
    p_notes text default null
) returns jsonb as $$
declare
    v_loan record;
    v_last_payment_date date;
    v_last_balance numeric;
    v_days_diff int;
    v_min_principal numeric;
    v_interest numeric := 0;
    v_security numeric := 0;
    v_savings numeric := 0;
    v_new_balance numeric := 0;
    v_fixed_deductions numeric;
    v_payment_id uuid;
begin
    -- 0. Authorization validation
    if not exists (select 1 from public.credit_books where id = p_book_id and owner_id = auth.uid()) then
        raise exception 'Unauthorized credit book access';
    end if;

    -- 1. Base share validation
    if p_share < 50 then
        raise exception 'Share contribution must be at least 50';
    end if;

    -- 2. Loan Processing (if an active loan is linked)
    if p_loan_id is not null then
        select * into v_loan from public.loans where id = p_loan_id for update;
        
        if not found or v_loan.status != 'active' then
            raise exception 'Loan not found or not currently active';
        end if;

        -- Fetch prior balance & payment date
        select payment_date, remaining_loan_balance
        into v_last_payment_date, v_last_balance
        from public.member_payments
        where loan_id = p_loan_id
        order by payment_date desc, created_at desc
        limit 1;

        if not found then
            v_last_payment_date := v_loan.disbursed_at;
            v_last_balance := v_loan.total_loan_amount;
        end if;

        -- Day difference calculation
        v_days_diff := greatest(0, p_payment_date - v_last_payment_date);

        -- Loan formulas
        v_min_principal := round(v_loan.total_loan_amount / v_loan.credit_months, 2);
        
        if p_loan_principal < v_min_principal and v_last_balance >= v_min_principal then
            raise exception 'Principal repayment % is below the minimum required %', p_loan_principal, v_min_principal;
        end if;

        -- Cap principal at outstanding balance
        if p_loan_principal > v_last_balance then
            p_loan_principal := v_last_balance;
        end if;

        -- Daily accrued interest: (days * remaining_balance * rate) / 36500
        v_interest := round((v_days_diff * v_last_balance * v_loan.annual_rate) / 36500.0, 2);

        -- Security: (remaining_balance * 0.5) / 1000
        if v_loan.enable_security then
            v_security := round((v_last_balance * 0.5) / 1000.0, 2);
        end if;

        v_new_balance := greatest(0.00, v_last_balance - p_loan_principal);
    end if;

    -- 3. Calculate auto-savings
    v_fixed_deductions := p_share + coalesce(p_health, 0) + p_loan_principal + v_interest + v_security;
    v_savings := p_total_payment - v_fixed_deductions;

    if v_savings < 0 then
        raise exception 'Total payment (%) is less than total required charges (%)', p_total_payment, v_fixed_deductions;
    end if;

    -- 4. Record Payment
    insert into public.member_payments (
        book_id, member_id, loan_id, payment_date, transaction_type,
        share_amount, health_amount, loan_principal,
        loan_interest, loan_security, savings_amount,
        total_amount, remaining_loan_balance, notes
    ) values (
        p_book_id, p_member_id, p_loan_id, p_payment_date, 'payment',
        p_share, coalesce(p_health, 0), p_loan_principal,
        v_interest, v_security, v_savings,
        p_total_payment, v_new_balance, p_notes
    ) returning id into v_payment_id;

    -- 5. Mark loan as paid off if balance hits zero
    if p_loan_id is not null and v_new_balance <= 0 then
        update public.loans set status = 'paid_off', updated_at = now() where id = p_loan_id;
    end if;

    return jsonb_build_object(
        'payment_id', v_payment_id,
        'interest', v_interest,
        'security', v_security,
        'savings', v_savings,
        'remaining_loan_balance', v_new_balance,
        'is_paid_off', (p_loan_id is not null and v_new_balance <= 0)
    );
end;
$$ language plpgsql security invoker;
