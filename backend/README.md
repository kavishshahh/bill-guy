# Flask Backend (Handler / Service / Repository)

## What is implemented

- Auth endpoints
  - `POST /api/v1/auth/signup`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- Daily entry endpoints
  - `POST /api/v1/daily-entries`
  - `GET /api/v1/daily-entries?company_id=...&financial_year_id=...`
- Layered architecture
  - `handlers` -> `services` -> `repositories`
- ORM
  - SQLAlchemy (used inside repository layer)

## Setup

1. Create and activate virtual environment
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Copy env:
   - `copy .env.example .env` (Windows)
4. Update `.env` values:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_JWT_SECRET`
5. Run SQL in your DB:
   - execute `schema_bootstrap.sql`
6. Start app:
   - `python run.py`

## Important note

This starter uses Supabase Auth for signup/login and token issuance.
`app_users` is now a profile mirror table keyed by `auth.users.id` (no local password column).
Company access is validated with `companies.owner_user_id = current_user_id`.

## Example requests

### Signup

```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "mehul@example.com",
  "full_name": "Mehul",
  "password": "StrongPass123"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "mehul@example.com",
  "password": "StrongPass123"
}
```

Response includes Supabase session tokens (`access_token`, `refresh_token`).

### Create daily entry

```http
POST /api/v1/daily-entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "company_id": "uuid",
  "financial_year_id": "uuid",
  "tx_date": "2026-04-16",
  "item_id": "uuid",
  "site_id": "uuid",
  "quantity": 6.55,
  "sale_rate": 4850,
  "voucher_no": "V-1001",
  "challan_no": "1328",
  "trip_count": 1,
  "notes": "first entry"
}
```
