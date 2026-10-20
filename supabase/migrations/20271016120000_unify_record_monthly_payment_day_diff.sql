-- Migration: 20271016120000_unify_record_monthly_payment_day_diff.sql
-- Description: Drop deprecated overload and ensure record_monthly_payment adds +1 to day difference for inclusive interest calculation.

drop function if exists public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric);
drop function if exists public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric, text);

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
) returns jsonb
language plpgsql
security invoker
as $$
declare
    v_loan public.loans%rowtype;
    v_last_payment_date date;
    v_last_balance numeric(12, 2);
    v_days_diff int := 0;
    v_interest numeric(12, 2) := 0.00;
    v_security numeric(12, 2) := 0.00;
    v_min_principal numeric(12, 2) := 0.00;
    v_new_balance numeric(12, 2) := null;
    v_fixed_deductions numeric(12, 2);
    v_savings numeric(12, 2);
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

        -- Day difference calculation: add 1 day for inclusive interest calculation
        v_days_diff := greatest(1, (p_payment_date - v_last_payment_date) + 1);

        -- Loan formulas: use optional custom min_principal if configured, otherwise calculate rounded to whole integer
        if v_loan.min_principal is not null then
            v_min_principal := round(v_loan.min_principal);
        else
            v_min_principal := round(v_loan.total_loan_amount / v_loan.credit_months);
        end if;
        
        if p_loan_principal < v_min_principal and v_last_balance >= v_min_principal then
            raise exception 'Principal repayment % is below the minimum required %', p_loan_principal, v_min_principal;
        end if;

        -- Cap principal at outstanding balance
        if p_loan_principal > v_last_balance then
            p_loan_principal := v_last_balance;
        end if;

        -- Daily accrued interest rounded to whole integer (with +1 day diff)
        v_interest := round((v_days_diff * v_last_balance * v_loan.annual_rate) / 36500.0);

        -- Security: (remaining_balance * 0.5) / 1000 rounded to whole integer
        if v_loan.enable_security then
            v_security := round((v_last_balance * 0.5) / 1000.0);
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
        'days_diff', v_days_diff,
        'is_paid_off', (p_loan_id is not null and v_new_balance <= 0)
    );
end;
$$;
