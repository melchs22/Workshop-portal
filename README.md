# SMR Workshop Portal

Standalone workshop-facing web client for Smart Mobility Roadcare. The portal uses the existing Django API and keeps scheduled workshop bookings separate from roadside-assistance dispatch.

## Requirements

- Node.js 20.19+ or 22.12+
- Access to a running SMR Django backend with the workshop API and migrations installed
- The portal origin added to the backend's `WORKSHOP_PORTAL_ORIGIN` CORS allowlist

## Local development

```sh
npm install
cp .env.example .env
```

For local development, set `VITE_API_BASE_URL` in `.env` to the backend origin without `/api`, for example `http://localhost:8000`. The production build defaults to the current site's `/api` route, so the portal can share the admin site's origin. Start the portal with:

```sh
npm run dev
```

The development server prints the local URL. Do not put backend credentials or payment secrets in this frontend environment; they belong in backend secrets only.

## Build

```sh
npm run build
npm run preview
```

The TypeScript project check runs as part of the production build. The Vite build uses `/workshop/` as its deployment base path.

## Portal capabilities

- Workshop owner sign-in via `POST /api/login/workshop/`
- Owner password setup/reset using the existing workshop password-reset endpoints
- Service-centre application submission with supporting files and application tracking
- Workshop-scoped booking list, search/status filters, request detail, quote revisions, decline reason, start, and completion actions
- Editable workshop profile, service capabilities, operating hours, pricing, and policies
- Read-only view of issued invoices and payment-attempt status

The portal does not create workshop accounts directly, approve applications, issue member invoices independently, or simulate payment success. A workshop owner account can sign in only after backend approval and activation. Application submission is intentionally blocked until `VITE_WORKSHOP_TERMS_URL` points to the actual ROSAF partner-terms document; no legal terms have been fabricated.

The login client falls back to the existing generic `/api/login/` route only when `/api/login/workshop/` returns `404`, then still requires the returned account role to be `WORKSHOP` and approved. Application status similarly tries the current GET contract before the earlier POST status route.

## Existing-server deployment layout

The current server at `201.79.45.60` serves `smartmobilityroadcare.com` through Nginx. Nginx sends `/api/` to the backend on `127.0.0.1:8001` and other site requests to the existing frontend on `127.0.0.1:3000`. Deploy the portal as static files under `/workshop/` on that same HTTPS origin. This needs no extra listener, DNS name, TLS certificate, or cross-origin browser request:

- Build `dist/` and place it at `/opt/smart-mobility/workshop-portal/dist/`.
- Add an Nginx `/workshop/` static-file location with an SPA fallback to that directory's `index.html`; preserve the existing `/api/` proxy location.
- Keep the API base unset in the production build so browser requests use `https://smartmobilityroadcare.com/api/`.
- Reload Nginx only after `nginx -t` succeeds. Deployment and Nginx changes have not been performed by this repository.

## Deployment and API readiness

1. Deploy the backend workshop changes and apply the new garage migration in staging. The server inspection on 2026-10-30 found only garage migrations `0001` and `0002` applied; the running API does not expose workshop login, application-status, or workshop profile routes yet.
2. Verify the backend migration and all portal routes in staging before exposing the UI; do not treat the current live registration endpoint as proof the complete portal API is deployed.
3. Keep `VITE_API_BASE_URL` blank for the same-origin `/api/` proxy. Leave `VITE_WORKSHOP_TERMS_URL` unset until ROSAF publishes the approved partner-terms document; application submission intentionally stays disabled meanwhile.
4. Serve the built `dist/` directory under `/workshop/` and configure Nginx to fall back to `index.html` for portal routes.
5. Test workshop login, application submission/status, booking isolation, booking actions, and profile updates against staging before launch. The production API cannot yet complete these checks because its workshop backend update is pending.

Backend contract reference: `../vehix-backend/garages/API_DOCUMENTATION.md`.
