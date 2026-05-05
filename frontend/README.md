# Frontend (Next.js + Tailwind)

Next.js 14 (App Router) frontend for the Flask backend in `../backend/`. Talks to the backend over a Next.js rewrite so the browser never makes a cross-origin request.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing — redirects to `/dashboard` if already logged in. |
| `/login` | Email + password login. Calls `POST /api/v1/auth/login`. |
| `/signup` | Account creation. Calls `POST /api/v1/auth/signup`. |
| `/dashboard` | Authenticated overview with cards linking to the two forms. |
| `/dashboard/companies/new` | Add a new company. Calls `POST /api/v1/companies`. |
| `/dashboard/entries/new` | Add a daily entry. Calls `POST /api/v1/daily-entries`. |

The dashboard layout (`app/dashboard/layout.tsx`) gates everything inside it: if there's no access token in `localStorage`, it redirects to `/login`.

## Setup

```bash
cd frontend
cp .env.local.example .env.local   # edit BACKEND_URL if Flask isn't on :8000
npm install
npm run dev                         # http://localhost:3000
```

Make sure the Flask backend is running on the URL set in `BACKEND_URL` (defaults to `http://localhost:8000`):

```bash
cd ../backend
python run.py
```

## How auth works

1. Login/signup hits the Flask backend, which proxies to Supabase Auth and returns a session shaped like:
   ```json
   { "access_token": "...", "refresh_token": "...", "user": { "id": "...", "email": "..." } }
   ```
2. The frontend persists `access_token`, `refresh_token`, and `user` in `localStorage` (`lib/auth.ts`).
3. Every authenticated request goes through `apiFetch` (`lib/api.ts`), which sends `Authorization: Bearer <access_token>`.
4. Logout (`Log out` button in the dashboard header) clears `localStorage` and pushes back to `/login`.

There is no token refresh loop yet — once Supabase's `access_token` expires the user has to log in again. Easy follow-up if needed.

## Backend gaps to be aware of

These two things will surface as failures the moment you click around:

### 1. `POST /api/v1/companies` doesn't exist on the backend

The Flask backend currently only has `CompanyRepository.get_company_for_owner` — there's no handler/service path that creates a company. The frontend's `Add Company` page POSTs to `/api/v1/companies` and shows a friendly error if the route is missing (404). To make it work end-to-end, add something like:

- `backend/src/handlers/company_handler.py` with a `POST /api/v1/companies` route.
- `backend/src/services/company_service.py` with `create_company(user_id, name, legal_name)`.
- `backend/src/repositories/company_repository.py` extended with `create_company(...)` that inserts into the `companies` table with `owner_user_id = current_user_id`.
- Register the new blueprint in `backend/src/app.py`.

### 2. CORS

The Flask backend doesn't install `flask-cors`. To avoid that entirely the frontend uses a Next.js rewrite (`next.config.mjs`): the browser fetches relative `/api/*` URLs, Next forwards them server-side to `BACKEND_URL`. Works in dev and prod-ish setups.

If you'd rather hit Flask directly from the browser, install `flask-cors` on the backend, allow the frontend origin, and change `lib/api.ts` to point at the absolute backend URL.

## Project layout

```
frontend/
├── app/
│   ├── layout.tsx            Root HTML shell + global styles
│   ├── globals.css           Tailwind directives
│   ├── page.tsx              Landing page
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── dashboard/
│       ├── layout.tsx        Auth-gated layout + nav
│       ├── page.tsx          Overview cards
│       ├── companies/new/page.tsx
│       └── entries/new/page.tsx
├── lib/
│   ├── api.ts                Bearer-aware fetch wrapper, throws ApiError
│   └── auth.ts               localStorage helpers (saveSession, clearSession, etc.)
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs           /api/* rewrite to BACKEND_URL
├── tsconfig.json
└── package.json
```

## What's intentionally not here yet

- **Listing pages.** `GET /api/v1/daily-entries` is wired in the backend but no list view exists in the UI yet — only the create flow.
- **Item / financial-year / site pickers.** The backend stores these as raw UUID FKs without exposing CRUD, so the entry form takes them as text inputs. When the backend gains those endpoints, swap the inputs for `<select>`s populated from a fetch.
- **Token refresh.** `/auth/me` exists but isn't called automatically; we trust `localStorage` until a 401 lands.
