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

Set `VITE_API_BASE_URL` in `.env` to the backend origin, without `/api`, for example `http://localhost:8000`. Start the portal with:

```sh
npm run dev
```

The development server prints the local URL. Do not put backend credentials or payment secrets in this frontend environment; they belong in backend secrets only.

## Build

```sh
npm run build
npm run preview
```

The TypeScript project check runs as part of the production build. Configure `VITE_API_BASE_URL` at build time to point to the intended backend environment.

## Portal capabilities

- Workshop owner sign-in via `POST /api/login/workshop/`
- Owner password setup/reset using the existing workshop password-reset endpoints
- Service-centre application submission with supporting files and application tracking
- Workshop-scoped booking list, search/status filters, request detail, quote revisions, decline reason, start, and completion actions
- Editable workshop profile, service capabilities, operating hours, pricing, and policies
- Read-only view of issued invoices and payment-attempt status

The portal does not create workshop accounts directly, approve applications, issue member invoices independently, or simulate payment success. A workshop owner account can sign in only after backend approval and activation. Application submission is intentionally blocked until `VITE_WORKSHOP_TERMS_URL` points to the actual ROSAF partner-terms document; no legal terms have been fabricated.

## Deployment and API setup

1. Apply the backend's workshop migration in the target database and verify the workshop APIs there.
2. Set `VITE_API_BASE_URL` to the backend's HTTPS origin and `VITE_WORKSHOP_TERMS_URL` to the approved public partner-terms document in the production build environment.
3. Set `WORKSHOP_PORTAL_ORIGIN` in the backend environment to the exact deployed portal origin, then restart the backend.
4. Serve the built `dist/` directory from the chosen static host and configure it to return `index.html` for SPA routes.
5. Test sign-in, application submission/status, booking isolation, booking actions, and profile updates against a non-production backend before launch.

Backend contract reference: `../vehix-backend/garages/API_DOCUMENTATION.md`.
