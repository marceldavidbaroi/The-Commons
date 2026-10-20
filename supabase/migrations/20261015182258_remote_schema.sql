-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

DROP FUNCTION
  public.record_monthly_payment(p_book_id uuid, p_member_id uuid, p_loan_id uuid, p_payment_date date, p_total_payment numeric, p_share numeric, p_health numeric, p_loan_principal
  numeric, p_notes text);

COMMENT ON COLUMN public.tag_categories.schema_blueprint IS NULL;

COMMENT ON COLUMN public.tag_groups.schema_blueprint IS NULL;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

GRANT ALL ON FUNCTION public.create_diary_entry(bigint, text, text, text[], integer, text, text, text, text, boolean, text[]) TO anon;

GRANT ALL ON FUNCTION public.create_diary_entry(bigint, text, text, text[], integer, text, text, text, text, boolean, text[]) TO service_role;

GRANT ALL ON FUNCTION public.create_diary_entry(uuid, text, text, text[], integer, text, text, text, text, boolean, text[]) TO anon;

GRANT ALL ON FUNCTION public.create_diary_entry(uuid, text, text, text[], integer, text, text, text, text, boolean, text[]) TO service_role;

GRANT ALL ON FUNCTION public.create_diary_with_first_page(text, text, text, text) TO anon;

GRANT ALL ON FUNCTION public.create_diary_with_first_page(text, text, text, text) TO service_role;

GRANT ALL ON FUNCTION public.get_citizen_passport_metrics() TO anon;

GRANT ALL ON FUNCTION public.get_citizen_passport_metrics() TO service_role;

GRANT ALL ON FUNCTION public.get_diary_stats(bigint) TO anon;

GRANT ALL ON FUNCTION public.get_diary_stats(bigint) TO service_role;

GRANT ALL ON FUNCTION public.get_diary_stats(uuid) TO anon;

GRANT ALL ON FUNCTION public.get_diary_stats(uuid) TO service_role;

GRANT ALL ON FUNCTION public.get_user_diaries_overview() TO anon;

GRANT ALL ON FUNCTION public.get_user_diaries_overview() TO service_role;

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;

GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.handle_user_items_updated_at() TO anon;

GRANT ALL ON FUNCTION public.handle_user_items_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.handle_user_items_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.provision_feature_tag_categories(text) TO anon;

CREATE FUNCTION public.record_monthly_payment (
  p_book_id        uuid,
  p_member_id      uuid,
  p_loan_id        uuid,
  p_payment_date   date,
  p_share          numeric,
  p_health         numeric,
  p_loan_principal numeric,
  p_total_payment  numeric,
  p_notes          text    DEFAULT NULL::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  AS $function$
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
$function$;

GRANT ALL ON FUNCTION public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric, text) TO anon;

GRANT ALL ON FUNCTION public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric, text) TO authenticated;

GRANT ALL ON FUNCTION public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric, text) TO service_role;

CREATE FUNCTION public.record_monthly_payment (
  p_book_id        uuid,
  p_member_id      uuid,
  p_loan_id        uuid,
  p_payment_date   date,
  p_total_payment  numeric,
  p_share          numeric,
  p_health         numeric DEFAULT 0,
  p_loan_principal numeric DEFAULT 0
)
  RETURNS public.member_payments
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
    v_new_payment public.member_payments;
begin
    -- 1. Base Validations
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

        -- Loan formulas: use optional custom min_principal if configured, otherwise calculate
        if v_loan.min_principal is not null then
            v_min_principal := v_loan.min_principal;
        else
            v_min_principal := round(v_loan.total_loan_amount / v_loan.credit_months, 2);
        end if;
        
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
        share_amount, health_amount, loan_principal, interest_amount,
        security_amount, auto_savings_amount, total_collected, remaining_loan_balance
    ) values (
        p_book_id, p_member_id, p_loan_id, p_payment_date, 'payment',
        p_share, coalesce(p_health, 0), p_loan_principal, v_interest,
        v_security, v_savings, p_total_payment, v_new_balance
    ) returning * into v_new_payment;

    -- 5. Auto-settle loan if fully paid off
    if p_loan_id is not null and v_new_balance = 0.00 then
        update public.loans set status = 'paid_off', updated_at = now() where id = p_loan_id;
    end if;

    return v_new_payment;
end;
$function$;

GRANT ALL ON FUNCTION public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric) TO anon;

GRANT ALL ON FUNCTION public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric) TO authenticated;

GRANT ALL ON FUNCTION public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric) TO service_role;

GRANT ALL ON FUNCTION public.reorder_diaries(bigint[]) TO anon;

GRANT ALL ON FUNCTION public.reorder_diaries(bigint[]) TO service_role;

GRANT ALL ON FUNCTION public.reorder_diaries(uuid[]) TO anon;

GRANT ALL ON FUNCTION public.reorder_diaries(uuid[]) TO service_role;

GRANT ALL ON FUNCTION public.reorder_user_items(uuid[]) TO anon;

GRANT ALL ON FUNCTION public.reorder_user_items(uuid[]) TO authenticated;

GRANT ALL ON FUNCTION public.reorder_user_items(uuid[]) TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE FUNCTION public.seed_default_tags_for_user (
  p_user_id bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_cat_id bigint;
begin
  -- ----------------------------------------------------------------------------
  -- GOALS FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- 1. Domain Category (Indigo)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Domain', 'domain', '#6366F1', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'domain';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Civic & Guild', 'civic-guild', true),
    (v_cat_id, p_user_id, 'Knowledge & Craft', 'knowledge-craft', true),
    (v_cat_id, p_user_id, 'Health & Vitality', 'health-vitality', true),
    (v_cat_id, p_user_id, 'Finance & Capital', 'finance-capital', true),
    (v_cat_id, p_user_id, 'Home & Hearth', 'home-hearth', true),
    (v_cat_id, p_user_id, 'Creative & Venture', 'creative-venture', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 2. Energy & Bandwidth Category (Emerald)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Energy & Bandwidth', 'energy-bandwidth', '#10B981', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'energy-bandwidth';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Deep Focus', 'deep-focus', true),
    (v_cat_id, p_user_id, 'Quick Win', 'quick-win', true),
    (v_cat_id, p_user_id, 'Administrative', 'administrative', true),
    (v_cat_id, p_user_id, 'Collaborative', 'collaborative', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 3. Impact & Leverage Category (Amber)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Impact & Leverage', 'impact-leverage', '#F59E0B', 3, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'impact-leverage';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'High Leverage', 'high-leverage', true),
    (v_cat_id, p_user_id, 'Foundational / Enabler', 'foundational-enabler', true),
    (v_cat_id, p_user_id, 'Maintenance', 'maintenance', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 4. Horizon & Cycle Category (Sky)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Horizon & Cycle', 'horizon-cycle', '#0EA5E9', 4, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'horizon-cycle';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Immediate Focus', 'immediate-focus', true),
    (v_cat_id, p_user_id, 'Quarterly Milestone', 'quarterly-milestone', true),
    (v_cat_id, p_user_id, 'Long-term Horizon', 'long-term-horizon', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 5. Execution Archetype Category (Violet)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Execution Archetype', 'execution-archetype', '#8B5CF6', 5, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'execution-archetype';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Project Deliverable', 'project-deliverable', true),
    (v_cat_id, p_user_id, 'Ritual & Habit', 'ritual-habit', true),
    (v_cat_id, p_user_id, 'Research & Discovery', 'research-discovery', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- ----------------------------------------------------------------------------
  -- DIARY FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- Context (Blue)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'diary', 'Context', 'context', '#3B82F6', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'diary' and slug = 'context';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Deep Work', 'deep-work', true),
    (v_cat_id, p_user_id, 'Reflections', 'reflections', true),
    (v_cat_id, p_user_id, 'Planning', 'planning', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;

  -- Energy Level (Emerald)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'diary', 'Energy Level', 'energy-level', '#10B981', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'diary' and slug = 'energy-level';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'High Vitality', 'high-vitality', true),
    (v_cat_id, p_user_id, 'Medium Vitality', 'medium-vitality', true),
    (v_cat_id, p_user_id, 'Rest & Recovery', 'rest-recovery', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;

  -- ----------------------------------------------------------------------------
  -- TASKS FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- 1. Area of Life Category (Indigo)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Area of Life', 'area-of-life', '#6366F1', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and slug = 'area-of-life';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, color, is_system)
  values 
    (v_cat_id, p_user_id, 'Chores', 'chores', '#F59E0B', true),
    (v_cat_id, p_user_id, 'Cleaning', 'cleaning', '#10B981', true),
    (v_cat_id, p_user_id, 'Groceries', 'groceries', '#84CC16', true),
    (v_cat_id, p_user_id, 'Home Maintenance', 'home-maintenance', '#D97706', true),
    (v_cat_id, p_user_id, 'Workout & Fitness', 'workout-fitness', '#EF4444', true),
    (v_cat_id, p_user_id, 'Health & Medical', 'health-medical', '#EC4899', true),
    (v_cat_id, p_user_id, 'Hygiene & Self-Care', 'hygiene-self-care', '#06B6D4', true),
    (v_cat_id, p_user_id, 'Bills & Finance', 'bills-finance', '#10B981', true),
    (v_cat_id, p_user_id, 'Work & Career', 'work-career', '#3B82F6', true),
    (v_cat_id, p_user_id, 'Learning & Study', 'learning-study', '#8B5CF6', true),
    (v_cat_id, p_user_id, 'Family & Relationships', 'family-relationships', '#F43F5E', true)
  on conflict (category_id, slug) do update set name = excluded.name, color = excluded.color;
  end if;

  -- 2. Location & Context Category (Blue / Indigo)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Location & Context', 'location-context', '#2563EB', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and slug = 'location-context';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, color, is_system)
  values 
    (v_cat_id, p_user_id, '@home', 'home', '#6366F1', true),
    (v_cat_id, p_user_id, '@desk', 'desk', '#2563EB', true),
    (v_cat_id, p_user_id, '@errand', 'errand', '#F59E0B', true),
    (v_cat_id, p_user_id, '@outdoors', 'outdoors', '#059669', true),
    (v_cat_id, p_user_id, '@phone', 'phone', '#8B5CF6', true)
  on conflict (category_id, slug) do update set name = excluded.name, color = excluded.color;
  end if;

  -- 3. Energy & Focus Category (Amber / Red)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Energy & Focus', 'energy-focus', '#F59E0B', 3, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and slug = 'energy-focus';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, color, is_system)
  values 
    (v_cat_id, p_user_id, '⚡ High Focus', '-high-focus', '#DC2626', true),
    (v_cat_id, p_user_id, '⚡ Low Focus', '-low-focus', '#3B82F6', true),
    (v_cat_id, p_user_id, '⚡ Quick Hit (<5m)', '-quick-hit-5m', '#10B981', true)
  on conflict (category_id, slug) do update set name = excluded.name, color = excluded.color;
  end if;

  -- 4. Action Triggers Category (Red)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Action Triggers', 'action-triggers', '#B91C1C', 4, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and slug = 'action-triggers';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, color, is_system)
  values 
    (v_cat_id, p_user_id, 'Today Must', 'today-must', '#B91C1C', true),
    (v_cat_id, p_user_id, 'This Week', 'this-week', '#D97706', true),
    (v_cat_id, p_user_id, 'Waiting On', 'waiting-on', '#6B7280', true),
    (v_cat_id, p_user_id, 'Someday / Maybe', 'someday-maybe', '#9CA3AF', true)
  on conflict (category_id, slug) do update set name = excluded.name, color = excluded.color;
  end if;

  -- ----------------------------------------------------------------------------
  -- DOCUMENT FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- Department (Violet)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'document', 'Department', 'department', '#8B5CF6', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'document' and slug = 'department';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Engineering', 'engineering', true),
    (v_cat_id, p_user_id, 'Research', 'research', true),
    (v_cat_id, p_user_id, 'Governance', 'governance', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;

  -- Document Type (Amber)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'document', 'Document Type', 'document-type', '#F59E0B', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'document' and slug = 'document-type';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Report', 'report', true),
    (v_cat_id, p_user_id, 'Charter', 'charter', true),
    (v_cat_id, p_user_id, 'Dispatch', 'dispatch', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;
end;
$function$;

GRANT ALL ON FUNCTION public.seed_default_tags_for_user(bigint) TO anon;

GRANT ALL ON FUNCTION public.seed_default_tags_for_user(bigint) TO authenticated;

GRANT ALL ON FUNCTION public.seed_default_tags_for_user(bigint) TO service_role;

GRANT ALL ON FUNCTION public.seed_homeops_tags_for_user(bigint) TO anon;

GRANT ALL ON FUNCTION public.seed_system_taxonomies_for_user(bigint) TO anon;

GRANT ALL ON FUNCTION public.slugify_text(text) TO anon;

GRANT ALL ON FUNCTION public.slugify_text(text) TO authenticated;

GRANT ALL ON FUNCTION public.slugify_text(text) TO service_role;

GRANT ALL ON FUNCTION public.touch_tag_group_updated_at() TO anon;

GRANT ALL ON FUNCTION public.touch_tag_group_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.touch_tag_group_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.update_citizen_passport(text, text, text, text, jsonb) TO anon;

GRANT ALL ON FUNCTION public.update_citizen_passport(text, text, text, text, jsonb) TO service_role;

GRANT ALL ON FUNCTION public.update_sort_preferences(text, text, boolean) TO anon;

GRANT ALL ON FUNCTION public.update_sort_preferences(text, text, boolean) TO authenticated;

GRANT ALL ON FUNCTION public.update_sort_preferences(text, text, boolean) TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.allowed_members TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.allowed_members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.allowed_members TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.credit_books TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.credit_books TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.credit_books TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.diaries TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.diaries TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.diaries TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.diary_entries TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.diary_entries TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.diary_entries TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.goals TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.goals TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.goals TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.loans TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.loans TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.loans TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.locations TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.locations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.locations TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.member_payments TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.member_payments TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.member_payments TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.members TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.members TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tag_categories TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tag_categories TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tag_categories TO service_role;

COMMENT ON COLUMN public.tag_groups.icon IS 'Lucide icon identifier (e.g. utensils, sparkler, heart-pulse, wrench, tv, file-text).';

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tag_groups TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tag_groups TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tag_groups TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tags TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tags TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tags TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tasks TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tasks TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.tasks TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.user_items TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.user_items TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.user_items TO service_role;

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
