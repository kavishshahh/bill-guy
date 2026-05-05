-- Minimal bootstrap schema for Flask + Supabase Auth + daily entries.
-- This variant removes company_users and uses owner_user_id checks.

create extension if not exists pgcrypto;

create table if not exists app_users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    full_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists companies (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references app_users(id) on delete restrict,
    name text not null,
    legal_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_companies_owner_name_ci
on companies(owner_user_id, lower(name));

create table if not exists financial_years (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    label text not null,
    start_date date not null,
    end_date date not null,
    is_active boolean not null default false,
    is_closed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (start_date <= end_date)
);

create unique index if not exists ux_financial_year_company_label
on financial_years(company_id, label);

create unique index if not exists ux_financial_year_one_active
on financial_years(company_id)
where is_active = true;

create table if not exists items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    name text not null,
    unit text not null default 'MT',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_items_company_name_ci
on items(company_id, lower(name));

create table if not exists sites (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    name text not null,
    location text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_sites_company_name_ci
on sites(company_id, lower(name));

create table if not exists transactions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    financial_year_id uuid not null references financial_years(id) on delete restrict,
    tx_date date not null,
    voucher_no text,
    challan_no text,
    site_id uuid references sites(id) on delete set null,
    item_id uuid not null references items(id) on delete restrict,
    quantity numeric(12,3) not null check (quantity > 0),
    unit text not null default 'MT',
    purchase_rate numeric(12,2),
    sale_rate numeric(12,2) not null,
    trip_count integer default 1 check (trip_count > 0),
    notes text,
    invoice_status text not null default 'not_invoiced'
        check (invoice_status in ('not_invoiced', 'invoiced')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_transactions_company_fy_date
on transactions(company_id, financial_year_id, tx_date);
