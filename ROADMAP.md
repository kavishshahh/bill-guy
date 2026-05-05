# Build Roadmap (MVP -> V1)

## Phase 0: Setup (2-3 days)

- Create repositories: `frontend` (Next.js), `backend` (FastAPI)
- Configure environments and secrets management
- Create Supabase project and apply `SCHEMA.sql`
- Add CI basics (lint + tests) for both apps
- Define coding standards and branch workflow

Deliverable:
- Project boots locally with DB connection working

## Phase 1: Auth + Scope Context (4-5 days)

- Implement login/refresh/logout in FastAPI
- Build company selector and FY selector in Next.js top bar
- Add request context headers (`X-Company-Id`, `X-Financial-Year-Id`)
- Add backend dependency that validates user access to selected company/FY
- Implement financial year open/close APIs

Deliverable:
- User logs in and can switch company + financial year safely

## Phase 2: Masters Module (5-7 days)

- Sites CRUD
- Lorries CRUD
- Parties (buyers/suppliers) CRUD
- Items + item specs CRUD
- Reusable table + form components in frontend
- Validation and duplicate-name checks in backend

Deliverable:
- Master data fully manageable per company

## Phase 3: Transactions Module (5-7 days)

- Transaction create/list/edit/delete
- Date-range filters + search
- FY date boundary validation
- Closed-FY write protection
- UX features: defaults, quick entry, keyboard flow

Deliverable:
- Daily entries can be created and reviewed reliably

## Phase 4: Invoicing Engine (6-8 days)

- Invoice candidate endpoint (only not invoiced rows)
- Multi-select transaction invoice creation
- Transactional lock flow (`FOR UPDATE`) to avoid duplicate invoicing
- Invoice list and detail pages
- Draft/finalized/cancelled lifecycle handling

Deliverable:
- End-to-end invoice generation with correct data locking

## Phase 5: PDF On-demand (3-5 days)

- Jinja HTML template for invoice
- WeasyPrint integration endpoint (`GET /invoices/{id}/pdf`)
- Print CSS tuning for A4 layout, headers, totals, tax blocks
- Browser-side download/print actions

Deliverable:
- Production-like invoice PDF from live invoice data

## Phase 6: Reports (4-6 days)

- Transaction report
- Sales report
- Purchase report
- Tax summary report
- Export support (CSV first, optional Excel later)

Deliverable:
- Core business reports usable by operations

## Phase 7: Hardening + V1 Release (5-7 days)

- Role-based permissions refinement
- Audit fields and logs
- Validation and error UX improvements
- Performance indexes review
- Backups and restore drill (Supabase)
- UAT fixes and production deployment

Deliverable:
- Stable V1 release

---

## Suggested Timeline (Single Developer)

- Fast-track MVP: **5-7 weeks**
- Comfortable MVP with QA: **8-10 weeks**

---

## Priority Backlog After MVP

- Immutable finalized invoice snapshot strategy
- Credit/debit note workflows
- E-way bill / GST integrations (if required)
- Multi-user invite flow and permissions UI
- Dashboard metrics
- Email/WhatsApp invoice sharing

---

## Definition of Done (MVP)

- User can select company and FY and operate in isolated scope
- Masters and transactions work reliably
- Invoicing excludes already invoiced transactions
- Invoice creation is race-condition safe
- PDF generation works on demand with acceptable print layout
- Core reports are available for date ranges
