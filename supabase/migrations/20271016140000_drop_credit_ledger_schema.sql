-- Migration: 20271016140000_drop_credit_ledger_schema.sql
-- Description: Completely drop credit ledger tables, functions, and policies.

drop function if exists public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric, text);
drop function if exists public.record_monthly_payment(uuid, uuid, uuid, date, numeric, numeric, numeric, numeric);

drop table if exists public.member_payments cascade;
drop table if exists public.loans cascade;
drop table if exists public.members cascade;
drop table if exists public.credit_books cascade;
