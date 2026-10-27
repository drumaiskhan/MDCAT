# MDCAT study platform

Three source folders: **admin**, **student**, **backend**. Shared database/client libraries, tests and maintenance scripts live inside backend. Open this root folder in VS Code.

## Start locally

Install Node.js 24.22.1 and Docker Desktop, then run:

```sh
npm install --global npm@12.2.1
npm run setup
npm run db:start
npm run dev
```

Use the generated credentials in root `.env`: DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD at http://localhost:5174 and LOCAL_STUDENT_EMAIL / LOCAL_STUDENT_PASSWORD at http://localhost:5173. The local PostgreSQL schema and accounts initialize on first startup. No email setup is needed for these local accounts. Setup preserves existing `.env` files. If using your own PostgreSQL installation, update DATABASE_URL and skip db:start.

## Customize and deploy

Change the name in Admin → Learning settings. Design & Branding controls the shared theme. Subjects → Topics are the content hierarchy.

Production layout: **student** and **admin** are two separate static sites on **Hostinger**; the **backend** API runs on **cPanel** (Node.js + PostgreSQL).

```sh
npm run build
npm run package:hosting
```

This writes upload-ready folders and ZIPs to `deploy/` (student-hostinger, admin-hostinger, api-cpanel, optional filebridge-cpanel). Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the exact steps, DNS, environment variables and optional GitHub Actions deployment. Backend requires Node.js and a reachable PostgreSQL database (ordinary PHP/MySQL-only hosting cannot run this backend).

Checks: `npm run typecheck`, `npm run test:mdcat`, `npm run test:auth`. No pnpm or Corepack required. `npm ci` installs from the included lockfile.

GitHub Actions deployment (API to cPanel; frontends via Hostinger Git branches) is described in [DEPLOYMENT.md](DEPLOYMENT.md). Keep `.github/workflows/deploy.yml` at your GitHub repository root.

Latest update: Node.js 24.22.1 / npm 12.2.1; OSPE/OSCE and Resources panels removed. See [DEPENDENCY-UPDATE.md](DEPENDENCY-UPDATE.md) for dependency versions and checks.
