# API Plan (FastAPI)

This document defines the initial endpoint plan for MVP implementation.

## 1) Conventions

- Base prefix: `/api/v1`
- Auth: Bearer JWT
- Required request context for all business endpoints:
  - `X-Company-Id`
  - `X-Financial-Year-Id`
- All list endpoints support pagination:
  - `page`, `page_size`, `search`, `sort_by`, `sort_order`

## 2) Auth

- `POST /auth/login`
  - Input: email, password
  - Output: access_token, refresh_token, user profile
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## 3) Company and Financial Year

- `GET /companies`
- `POST /companies`
- `GET /companies/{company_id}`
- `PATCH /companies/{company_id}`

- `GET /financial-years`
- `POST /financial-years`
- `GET /financial-years/{fy_id}`
- `PATCH /financial-years/{fy_id}`
- `POST /financial-years/{fy_id}/activate`
- `POST /financial-years/{fy_id}/close`
- `POST /financial-years/{fy_id}/reopen`

## 4) Masters

### Sites
- `GET /sites`
- `POST /sites`
- `GET /sites/{site_id}`
- `PATCH /sites/{site_id}`
- `DELETE /sites/{site_id}`

### Lorries
- `GET /lorries`
- `POST /lorries`
- `GET /lorries/{lorry_id}`
- `PATCH /lorries/{lorry_id}`
- `DELETE /lorries/{lorry_id}`

### Parties (Buyer/Supplier)
- `GET /parties?party_type=buyer|supplier|both`
- `POST /parties`
- `GET /parties/{party_id}`
- `PATCH /parties/{party_id}`
- `DELETE /parties/{party_id}`

### Items
- `GET /items`
- `POST /items`
- `GET /items/{item_id}`
- `PATCH /items/{item_id}`
- `DELETE /items/{item_id}`

### Item Specs
- `GET /items/{item_id}/specs`
- `POST /items/{item_id}/specs`
- `PATCH /items/{item_id}/specs/{spec_id}`
- `DELETE /items/{item_id}/specs/{spec_id}`

## 5) Transactions

- `GET /transactions`
  - Filters: `from_date`, `to_date`, `invoice_status`, `buyer_id`, `item_id`, `site_id`
- `POST /transactions`
- `GET /transactions/{transaction_id}`
- `PATCH /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`

Validation rules:
- Transaction date must be inside selected FY
- FY must not be closed for create/update/delete operations

## 6) Invoice Creation Flow

### Fetch invoice candidates
- `GET /invoices/candidates`
  - Filters: `from_date`, `to_date`, `buyer_id`, `site_id`, `item_id`
  - Returns only `invoice_status = not_invoiced`

### Create invoice from selected transactions
- `POST /invoices`
  - Input:
    - `invoice_date`
    - `buyer_id` (optional if taken from rows)
    - `transaction_ids[]`
    - optional print metadata (heading, notes)
  - Server action:
    1) lock selected rows (`FOR UPDATE`)
    2) validate all not invoiced
    3) generate next invoice number (company+FY scope)
    4) create invoice + invoice_transactions rows
    5) set transactions as invoiced

### Invoice read/update
- `GET /invoices`
  - Filters: `from_date`, `to_date`, `status`, `invoice_no`
- `GET /invoices/{invoice_id}`
- `GET /invoices/{invoice_id}/transactions`
- `PATCH /invoices/{invoice_id}` (allowed only for draft)
- `POST /invoices/{invoice_id}/finalize`
- `POST /invoices/{invoice_id}/cancel`
  - MVP policy option: unlock linked transactions back to `not_invoiced`

## 7) PDF Endpoints (On-demand)

- `GET /invoices/{invoice_id}/pdf`
  - Generates PDF from HTML template and streams response
- `GET /invoices/{invoice_id}/html-preview`
  - Optional preview endpoint for debugging layout

## 8) Reports

- `GET /reports/transactions`
  - Filters: date range, buyer, site, item
- `GET /reports/sales`
  - Output: summary + line-wise
- `GET /reports/purchase`
- `GET /reports/tax-summary`
  - CGST/SGST/IGST totals in date range

## 9) Error Contract

Suggested JSON format:

```json
{
  "error": {
    "code": "TRANSACTION_ALREADY_INVOICED",
    "message": "One or more selected transactions are already invoiced.",
    "details": {}
  }
}
```

## 10) Security and Access Rules

- User must be mapped in `company_users` for selected company
- All queries must include company+FY filters server-side (never trust client-only filtering)
- Viewer role: read-only
- Operator role: create/update transactions, create invoices
- Admin/Owner: full access, FY close/reopen
