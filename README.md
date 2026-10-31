# SMR Workshop Portal

Standalone workshop-facing web client for Smart Mobility Roadcare. The portal uses the existing Django API and keeps scheduled workshop bookings separate from roadside-assistance dispatch.

## Requirements

- Node.js 20.19+ or 22.12+
- Access to a running SMR Django backend with the workshop API and migrations installed
- For cross-origin development only, the portal origin added to the backend's `WORKSHOP_PORTAL_ORIGIN` CORS allowlist

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
- Service-centre application review, image previews, structured typical pricing, supporting files, and application tracking
- Workshop-scoped booking list, search/status filters, request detail, quote revisions, decline reason, start, and completion actions
- Editable workshop profile, service capabilities, operating hours, pricing, and policies
- Read-only view of issued invoices and payment-attempt status

The portal does not create workshop accounts directly, approve applications, issue member invoices independently, or simulate payment success. A workshop owner account can sign in only after backend approval and activation. Workshop applications link to the published Smart Mobility Roadcare Terms & Conditions at `https://smartmobilityroadcare.com/terms-and-conditions`; `VITE_WORKSHOP_TERMS_URL` can override that link with another approved HTTPS terms page. Applicants must actively accept the terms before reviewing and submitting. Typical prices are entered as service-and-price rows and sent to the existing backend as a pricing object.

The login client falls back to the existing generic `/api/login/` route only when `/api/login/workshop/` returns `404`, then still requires the returned account role to be `WORKSHOP` and approved. Application status similarly tries the current GET contract before the earlier POST status route.

## Existing-server deployment

The server at `201.79.45.60` serves `smartmobilityroadcare.com` through Nginx. Nginx sends `/api/` to the backend on `127.0.0.1:8001`, the admin dashboard to `127.0.0.1:3000`, and the workshop portal to static files under `/workshop/` on the same HTTPS origin. This needs no extra listener, DNS name, TLS certificate, or cross-origin browser request.

The portal was deployed on 2026-10-30 to `/opt/smart-mobility/workshop-portal/dist/`. The Nginx `/workshop/` location has an SPA fallback to `index.html`, and the existing `/api/` proxy remains in place. The production API base is unset so browser requests use the current site's `/api/` origin.

For repeatable PC/SSH deployments and push-triggered GitHub deployments, follow [DEPLOYMENT.md](./DEPLOYMENT.md).

## Production status

The workshop backend and admin dashboard were deployed to production on 2026-10-30. Garage migration `0003_garageinvoice_garage_owner_user_and_more` is applied. Workshop login, application status, workshop profile, and admin API routes are present; unauthenticated route checks return validation or authorization responses rather than `404`.

- `VITE_API_BASE_URL` is blank for the same-origin `/api/` proxy.
- `VITE_WORKSHOP_TERMS_URL` defaults to the published Smart Mobility Roadcare Terms & Conditions. Confirm ROSAF has approved the terms for members, roadside responders, and workshop partners before treating them as legally final.
- PayChangu credentials and callback/webhook URLs are not configured. Invoice checkout must not be treated as available until the merchant integration is configured and verified.
- The production Resend API key is also missing, so workshop-owner activation emails are unavailable. Do not approve new workshops for operational access until email delivery is configured.
- The production Celery Beat schedule was corrected and the primary backend web, worker, and beat services are running. A separate legacy `backend` Compose project's beat container remains unhealthy and was not changed as part of this deployment.

Backend contract reference: `../vehix-backend/garages/API_DOCUMENTATION.md`.
