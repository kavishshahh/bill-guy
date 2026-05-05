# Billing Platform Plan Summary

## 1) Goal

Build a web platform similar to the current billing workflow where users can:

- Log in with user ID/password
- Manage multiple companies under one account
- Work across multiple financial years per company
- Add masters (sites, lorries, items, buyers/suppliers, units, dimensions/weights)
- Enter daily transactions
- Generate invoices from non-invoiced transactions
- Generate invoice PDFs on demand
- Run transaction/sales/purchase/tax reports

---

## 2) Final Tech Stack Decision

- **Frontend:** Next.js
- **Backend:** FastAPI (Python)
- **Database:** Supabase Postgres (SQL)
- **PDF:** HTML templates -> PDF engine (recommended: WeasyPrint)

### Note

- **Supabase includes Postgres.**
  So "Postgres vs Supabase" is not either/or: Supabase is the managed platform, Postgres is the DB engine.

---

## 3) Why This Stack

- Relational data fits SQL well (users -> companies -> FY -> transactions -> invoices)
- Strong constraints and joins needed for invoice integrity and reports
- FastAPI provides clean APIs and quick development
- HTML-template PDF generation gives invoice-style output with good formatting control

---

## 4) PDF Strategy Chosen

- **Generate PDFs on demand** (not stored initially)

### Pros

- Simpler architecture
- No file storage complexity
- Always reflects latest template/data

### Caution

- Need invoice data immutability after finalization so regenerated PDF stays consistent
- May generate slower than serving cached files

---

## 5) Core Business Workflow

1. User enters transactions
2. Invoice creation screen shows only **not invoiced** transactions
3. User selects rows and creates invoice
4. Selected transactions are marked as invoiced
5. These transactions no longer appear in invoice creation list
6. Invoice keeps permanent mapping of included transactions

---

## 6) Multi-Company + Financial Year Design

- One account can have multiple companies (e.g., Mehul Traders, Heena Traders)
- Each company has multiple financial years
- User selects active **Company + FY**
- All operations are scoped to selected Company + FY

### Mandatory rules

- Entry date must be within FY start/end
- Closed FY cannot accept new entries
- Invoice generation must use transactions from same company + same FY
- Invoice numbering should be unique/reset per company + FY

---

## 7) Recommended Data Model (High Level)

- `users`
- `companies`
- `financial_years`
- `company_users` (for future multi-user staff access)
- `sites`, `lorries`, `items`, `item_specs`, `parties`
- `transactions`
- `invoices`
- `invoice_transactions` (junction table)

### Important constraints

- `invoice_transactions.transaction_id` unique (prevents one transaction in multiple invoices)
- `invoices` unique key on `(company_id, financial_year_id, invoice_no)`
- `financial_years` unique `(company_id, label)`

---

## 8) Invoice Safety / Race Condition Prevention

Invoice creation must run in one DB transaction:

1. Lock selected transactions (`FOR UPDATE`)
2. Validate all are `not_invoiced`
3. Create invoice
4. Insert mappings in `invoice_transactions`
5. Update transactions to `invoiced`
6. Commit

This prevents duplicate invoicing under concurrent requests.

---

## 9) Suggested Invoice Lifecycle

- `draft`
- `finalized`
- `cancelled`

For MVP:

- Cancelling invoice may unlock transactions back to `not_invoiced` (simple approach)

Later (accounting-safe):

- Keep invoice immutable after finalization and use credit/debit note adjustments.

---

## 10) Implementation Direction (MVP First)

1. Auth + company/FY selection
2. Masters CRUD (sites/lorries/items/parties)
3. Transaction entry
4. Invoice creation from non-invoiced rows
5. On-demand PDF generation
6. Reports (date range, sales/purchase/tax)
7. Role permissions + audit + FY close controls

---

## 11) Final Planning Decision

Proceed with:

- **Supabase Postgres**
- **FastAPI backend**
- **Next.js frontend**
- **On-demand HTML-to-PDF generation (WeasyPrint recommended)**

with strict **company + financial year scoping** and **non-invoiced -> invoiced lock flow**.
