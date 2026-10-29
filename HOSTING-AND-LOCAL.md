# MDCAT: local setup and hosting

This is a separate application. Keep its database, domains, JWT secret and app directory separate from MedSchoolProffs and Medify. The website name remains editable in Admin → Learning settings.

## Windows / VS Code

Install Node.js 22.22.2 and Docker Desktop. Extract the ZIP, open the MDCAT-Three-Folders folder in VS Code, and open its terminal. Run commands from the folder containing package.json, not C:\Windows\System32.

```powershell
npm install --global npm@10.9.7
npm run setup
npm run db:start
npm run dev
```

`setup` installs the locked npm dependencies and creates a root `.env` with a random JWT secret and random local admin password. It never replaces an existing `.env`. Open `.env` to read DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD; use these on the admin portal. These local credentials are not intended for hosting.

- Student: http://localhost:5173 — use LOCAL_STUDENT_EMAIL and LOCAL_STUDENT_PASSWORD from `.env`. This verified development account needs no SMTP and is created only for a localhost database with NODE_ENV=development and LOCAL_DEMO_ACCOUNT=1. Existing accounts/passwords are preserved.
- For an existing `.env`, add the LOCAL_* variables from `.env.example` with your own password, then restart.
- Student pages: http://localhost:5173
- Admin: http://localhost:5174
- API: http://localhost:3001/api/healthz

The first API start creates the schema and five subjects. Allow startup to finish before signing in. Create topics in admin. When first boot succeeds, change MDCAT_BOOTSTRAP to 0. Configure email, payment details and file storage before testing those external services. Ctrl+C stops the dev processes; `npm run db:stop` stops PostgreSQL without deleting its volume. `npm run doctor` checks basic setup; `docker compose ps` shows database readiness. If Docker Desktop is unavailable, supply a separate PostgreSQL DATABASE_URL in `.env` and skip db:start.

## MCQ uploader

Admin → Subjects → add a subject; Admin → Topics → add its topics. In MCQ bank, choose the subject and topic, select a TXT, CSV, XLSX, XLS, DOCX or text-based PDF (maximum 20 MB), then Parse file. Your host’s request/upload limit must also allow the selected file size. Review/edit the candidates, including the correct answers and explanations, and choose draft or published before committing. The subject/topic IDs are checked by the API; the inherited internal storage ID is automatic.

For the per-option format, use `backend/tests/mdcat/fixtures/mcq-sample.txt` as a syntax sample. PDF imports require a selectable text layer; scanned images require OCR first. DOCX/PDF reading order can affect extraction, so review parsed questions before saving. Keep large jobs in batches of around 500 to reduce review time and hosting request pressure. A published import appears to students; a draft does not.

Verification: `npm run test:mdcat` sends real multipart requests in all six supported formats, commits them to a PostgreSQL-compatible PGlite test database, and checks options, answers, explanations, hints, references, placement and publication state. Authentication uses explicit test adapters; live hosting, real payment/email providers and browser file selection still need a deployment smoke test.

## Hosting (frontends on Hostinger, API on cPanel)

Student and admin are two separate static sites on Hostinger; the API is a Node.js app on cPanel. **Follow [DEPLOYMENT.md](DEPLOYMENT.md)** for the full, step-by-step instructions, DNS plan, environment variables and troubleshooting.

```powershell
npm run build
npm run package:hosting    # optional: $env:API_URL="https://api.your-domain.com"
```

This creates `deploy/student-hostinger`, `deploy/admin-hostinger`, `deploy/api-cpanel`, `deploy/filebridge-cpanel` and ready-to-upload ZIPs in `deploy/zips` (hidden `.htaccess` files included). The API environment reference is `hosting.env.example`.

## Deployment smoke test

Sign into admin, create one subject/topic, parse the sample TXT, import as draft, then publish a reviewed question. Sign into the student portal and confirm it appears in that topic; answer it, save it, refresh and check Saved MCQs. Also verify team members, Sunday test timing, lecture membership, an uploaded book and notes, logout and mobile navigation. If a frontend reports failed fetch, confirm its config.js origin, API DNS/HTTPS, APP_URL CORS origins and database readiness. If nested pages 404, verify that the hidden .htaccess file was uploaded to the Hostinger site.

No live deployment has been performed from this package. SMTP, payments, domain DNS, storage and the final hosting database require your own configuration.


## Validation and editor notes

Open MDCAT.code-workspace, install with npm run setup, and use the workspace TypeScript version in VS Code. Run npm run typecheck to check all three apps. No global TypeScript or pnpm is needed.

`npm run test:auth` checks actual authentication, password hashing, sessions and development-account guards using a PGlite PostgreSQL-compatible database adapter. It does not replace a connection test to your own PostgreSQL server. Docker and live hosting were not available in the build environment. Browser visual verification could not run because the browser download was unavailable.

## GitHub deployment workflow

See the "Automatic deployment with GitHub Actions" section of [DEPLOYMENT.md](DEPLOYMENT.md). Pushes build and test only; use the manual deploy option on main to publish the API to cPanel and then the frontends to Hostinger.
