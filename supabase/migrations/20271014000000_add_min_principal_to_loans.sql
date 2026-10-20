-- ==============================================================================
-- Migration: 20271014000000_add_min_principal_to_loans.sql
-- Description: Add optional min_principal override column to loans table
-- ==============================================================================

alter table public.loans 
add column if not exists min_principal numeric(12, 2) default null check (min_principal is null or min_principal >= 0);

comment on column public.loans.min_principal is 'Optional custom monthly minimum principal repayment override. If null, defaults to (total_loan_amount / credit_months).';
