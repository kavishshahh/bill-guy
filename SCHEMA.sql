-- Billing Platform schema (Supabase Postgres)
-- Scope: multi-user -> multi-company -> multi-financial-year
-- Notes:
-- 1) This is an MVP-safe schema with strong constraints.
-- 2) Uses UUID primary keys for compatibility with Supabase patterns.

-- Enable UUID generator
create extension if not exists pgcrypto;

-- =========================================
-- Core identity and tenant tables
-- =========================================

create table if not exists app_users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
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
    gstin text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    pincode text,
    phone text,
    email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_companies_owner_name
on companies(owner_user_id, lower(name));

create table if not exists company_users (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    user_id uuid not null references app_users(id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
    created_at timestamptz not null default now(),
    unique(company_id, user_id)
);

create table if not exists financial_years (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    label text not null, -- e.g. 2026-27
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

-- Optional: enforce only one active FY per company
create unique index if not exists ux_financial_year_one_active
on financial_years(company_id)
where is_active = true;

-- =========================================
-- Master data tables
-- =========================================

create table if not exists sites (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    name text not null,
    location text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(company_id, lower(name))
);

create table if not exists lorries (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    lorry_no text not null,
    capacity numeric(12,3),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(company_id, lower(lorry_no))
);

create table if not exists parties (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    party_type text not null check (party_type in ('buyer', 'supplier', 'both')),
    name text not null,
    gstin text,
    phone text,
    address text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(company_id, lower(name), party_type)
);

create table if not exists items (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    name text not null,
    hsn_code text,
    unit text not null default 'MT',
    default_rate numeric(12,2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(company_id, lower(name))
);

create table if not exists item_specs (
    id uuid primary key default gen_random_uuid(),
    item_id uuid not null references items(id) on delete cascade,
    spec_type text not null check (spec_type in ('dimension', 'weight', 'other')),
    length numeric(12,3),
    breadth numeric(12,3),
    height numeric(12,3),
    weight numeric(12,3),
    notes text,
    created_at timestamptz not null default now()
);

-- =========================================
-- Transaction and invoice tables
-- =========================================

create table if not exists transactions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    financial_year_id uuid not null references financial_years(id) on delete restrict,
    tx_date date not null,
    voucher_no text,
    challan_no text,
    lorry_id uuid references lorries(id) on delete set null,
    site_id uuid references sites(id) on delete set null,
    buyer_id uuid references parties(id) on delete set null,
    supplier_id uuid references parties(id) on delete set null,
    item_id uuid not null references items(id) on delete restrict,
    quantity numeric(12,3) not null check (quantity > 0),
    unit text not null default 'MT',
    purchase_rate numeric(12,2),
    sale_rate numeric(12,2) not null,
    trip_count integer default 1 check (trip_count > 0),
    notes text,
    invoice_status text not null default 'not_invoiced'
        check (invoice_status in ('not_invoiced', 'invoiced')),
    invoiced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists ix_transactions_company_fy_date
on transactions(company_id, financial_year_id, tx_date);

create index if not exists ix_transactions_invoice_status
on transactions(company_id, financial_year_id, invoice_status);

create table if not exists invoices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references companies(id) on delete cascade,
    financial_year_id uuid not null references financial_years(id) on delete restrict,
    invoice_no integer not null check (invoice_no > 0),
    invoice_date date not null,
    invoice_heading text default 'TAXABLE GST INVOICE',
    buyer_id uuid references parties(id) on delete set null,
    place_of_supply text,
    subtotal numeric(14,2) not null default 0,
    cgst_amount numeric(14,2) not null default 0,
    sgst_amount numeric(14,2) not null default 0,
    igst_amount numeric(14,2) not null default 0,
    total_amount numeric(14,2) not null default 0,
    round_off numeric(14,2) not null default 0,
    grand_total numeric(14,2) not null default 0,
    status text not null default 'draft'
        check (status in ('draft', 'finalized', 'cancelled')),
    finalized_at timestamptz,
    cancelled_at timestamptz,
    notes text,
    created_by uuid references app_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Invoice numbering unique inside company + FY
create unique index if not exists ux_invoices_company_fy_invoice_no
on invoices(company_id, financial_year_id, invoice_no);

create index if not exists ix_invoices_company_fy_date
on invoices(company_id, financial_year_id, invoice_date);

create table if not exists invoice_transactions (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references invoices(id) on delete cascade,
    transaction_id uuid not null references transactions(id) on delete restrict,
    created_at timestamptz not null default now(),
    unique(invoice_id, transaction_id),
    unique(transaction_id) -- one transaction can appear in only one invoice
);

create index if not exists ix_invoice_transactions_invoice
on invoice_transactions(invoice_id);

-- =========================================
-- Optional DB-side consistency trigger
-- =========================================
-- Ensures transaction date falls inside linked financial year.

create or replace function fn_check_transaction_date_in_fy()
returns trigger
language plpgsql
as $$
declare
    fy_start date;
    fy_end date;
begin
    select start_date, end_date
      into fy_start, fy_end
      from financial_years
     where id = new.financial_year_id
       and company_id = new.company_id;

    if fy_start is null then
        raise exception 'Invalid financial_year_id for company_id';
    end if;

    if new.tx_date < fy_start or new.tx_date > fy_end then
        raise exception 'Transaction date % out of FY range (% - %)', new.tx_date, fy_start, fy_end;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_check_transaction_date_in_fy on transactions;
create trigger trg_check_transaction_date_in_fy
before insert or update on transactions
for each row
execute function fn_check_transaction_date_in_fy();

-- =========================================
-- Helper comments for application layer
-- =========================================
-- Invoice generation API should:
-- 1) lock selected rows with FOR UPDATE
-- 2) ensure invoice_status = 'not_invoiced'
-- 3) create invoice + mappings + update transaction statuses
-- 4) commit in one transaction
