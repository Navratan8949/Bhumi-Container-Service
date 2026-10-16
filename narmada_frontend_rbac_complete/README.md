# Narmada Road Lines — Integrated Frontend

This frontend is built on the uploaded Next.js project and integrated with the current Narmada Road Lines backend.

## Stack
- Next.js 16
- React 19
- JavaScript / JSX
- Tailwind CSS v4
- Axios
- Redux Toolkit
- React Hook Form / Zod packages already present
- Recharts / Lucide / Sonner packages already present

## Run

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Then:

```bash
npm install
npm run dev
```

The backend must be running on port 8000 unless `NEXT_PUBLIC_API_URL` is changed.

## Authentication

Login stores the JWT in `sessionStorage` under `nrl_token` and the returned user under `nrl_user`. Axios automatically sends `Authorization: Bearer <token>`.

The frontend uses the backend's actual `/api` prefix. The old `/api/v1` prefix was removed because the supplied backend mounts routes at `/api/...`.

## Important backend limitation

The current backend login JWT sets `companyId: null` for `super_admin`. Operational controllers such as Driver, Vehicle and most company-scoped masters read `req.user.companyId`, so a super admin cannot become company-scoped merely by selecting a company in this frontend. The Select Company screen therefore stores the selection for UI context but does not pretend that it changes backend authorization.

For day-to-day company operations, log in with a company-scoped `admin`, `manager`, `accountant`, etc.

## Included UI
- Login
- Super-admin company selection
- Responsive sidebar/header
- Role-aware navigation
- Dashboard
- Masters
- D.O. Received
- Supply Orders
- Bookings
- LR/Bilty
- Trips with dispatch/start/deliver/complete/cancel actions
- Fleet: fuel, tyres, maintenance, vehicle documents, driver assignment
- Accounts
- HR & payroll
- Reports backed by the supplied report endpoints
- Search, loading, empty, error and confirmation states
- Responsive tables/forms

## Backend-driven forms

The forms intentionally send only fields represented in the current backend models/controllers. Reference fields are currently exposed as IDs where the backend expects MongoDB ObjectIds. They can be upgraded to searchable relation selectors after the API provides dedicated lookup/option endpoints.

## Services

The uploaded service layer remains in `src/services/` and `src/services/index.js`. The shared Axios client has been corrected to use `/api` and the same JWT storage key used by the UI.
