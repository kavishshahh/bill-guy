-- Run once on databases that were created before the `buyers` table existed.
-- Example: psql "$DATABASE_URL" -f backend/migrations/001_add_buyers_table.sql

create extension if not exists pgcrypto;

create table if not exists buyers (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_buyers_company_name_ci
on buyers(company_id, lower(name));

alter table transactions add column if not exists buyer_id uuid references buyers(id) on delete set null;
alter table transactions add column if not exists metadata jsonb;
