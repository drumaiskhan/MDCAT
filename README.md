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

```sh
npm run build
npm run package:hosting
```

Upload **student/hosting**, **admin/hosting**, and **backend/hosting** to their respective hosts. See [HOSTING-AND-LOCAL.md](HOSTING-AND-LOCAL.md) for exact environment settings and cPanel/Hostinger instructions. Backend requires Node.js and a reachable PostgreSQL database (ordinary PHP/MySQL-only hosting cannot run this backend).

Checks: `npm run typecheck`, `npm run test:mdcat`, `npm run test:auth`. No pnpm or Corepack required. `npm ci` installs from the included lockfile.

GitHub Actions cPanel deployment is included: see [CPANEL-WORKFLOW.md](CPANEL-WORKFLOW.md). Keep `.github/workflows/cpanel-deploy.yml` at your GitHub repository root.

Latest update: Node.js 24.22.1 / npm 12.2.1; OSPE/OSCE and Resources panels removed. See [DEPENDENCY-UPDATE.md](DEPENDENCY-UPDATE.md) for dependency versions and checks.
