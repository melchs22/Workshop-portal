# Workshop portal deployment

The portal is a Vite static application served by Nginx at
`https://smartmobilityroadcare.com/workshop/`. It shares the existing API
origin at `/api/`; it does not need its own service, domain, or TLS certificate.

## Deploy directly from a PC

Requirements: Node.js 22, npm, `rsync`, and SSH access to the production server.
The SSH account must be able to write to the portal `dist` directory. Set the
connection variables and run this from the repository root:

```sh
export DEPLOY_HOST=201.79.45.60
export DEPLOY_USER=root
bash ./scripts/deploy-production.sh
```

The script installs the locked dependencies, runs the TypeScript/Vite
production build, replaces only the generated `dist` files on the server, and
checks the public workshop route. It does not copy local environment files or
backend secrets.

## Deploy through GitHub

Pushing to `feat/workshop-portal-mvp` runs the production deployment workflow.
The workflow builds the checked-out commit on a self-hosted runner installed on
the production server. No server SSH key or other deployment credential is
stored in GitHub. The runner must have Linux x64 labels including
`smr-production`, Node.js 22, npm, and permission to update the static files.

Register a repository-level runner in **Settings → Actions → Runners** and
install its service on the production host. Repeat registration for each
repository that uses this deployment workflow. Use a dedicated runner identity
where practical; restrict write access to the deployment branch, protect the
branch, and configure the `production` environment to allow only that branch.
The runner has write access to production assets, so restrict repository and
runner access and never run untrusted pull-request or fork workflows on it.
GitHub provides a short-lived runner-registration token; enter it on the host
only and do not store it in the repository.

The workflow can also be started manually from **Actions → Deploy workshop
portal → Run workflow**.

## Production target and rollback

- Static document root: `/opt/smart-mobility/workshop-portal/dist/`
- Public route: `https://smartmobilityroadcare.com/workshop/`
- No service restart is required; Nginx serves the deployed files directly.
- The deploy replaces generated static assets only. For rollback, redeploy a
  previously successful commit from GitHub Actions or check out that commit on a
  PC and rerun the script.

Never copy `.env`, API credentials, uploads, or backend payment secrets into
this frontend deployment.
The direct PC path uses SSH; the PC's private key stays on the PC and is never
sent to GitHub.
