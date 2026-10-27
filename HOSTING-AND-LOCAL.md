# MDCAT: local setup and hosting

This is a separate application. Keep its database, domains, JWT secret and app directory separate from MedSchoolProffs and Medify. The website name remains editable in Admin → Learning settings.

## Windows / VS Code

Install Node.js 24.22.1 and Docker Desktop. Extract the ZIP, open the MDCAT-Three-Folders folder in VS Code, and open its terminal. Run commands from the folder containing package.json, not C:\Windows\System32.

```powershell
npm install --global npm@12.2.1
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

## Build upload-ready folders

Prebuilt `student/hosting`, `admin/hosting` and `backend/hosting` folders are included. To regenerate after changing code:

```powershell
npm run build:api
npm run build:student
npm run build:admin
npm run package:hosting
```

Set the NEW API address in BOTH `student/hosting/config.js` and `admin/hosting/config.js`:

```javascript
window.__MDCAT_CONFIG__ = { apiOrigin: "https://api.your-new-domain.com" };
```

Use the origin only, without `/api` or a trailing path. This works for MCQs, uploads, notes, the book reader, lectures and generated API calls. You can change this file after upload without rebuilding. Empty means same-origin `/api` (local Vite proxies support that). The supplied builds deliberately have no production API domain configured. Never point them at your existing site's API.

Optionally set `$env:API_URL="https://api.your-new-domain.com"` before running package:hosting to write both config files automatically.

Create individual ZIPs on Windows if your host requires them:

```powershell
Compress-Archive -Path .\student\hosting\* -DestinationPath .\student-upload.zip -Force
Compress-Archive -Path .\admin\hosting\* -DestinationPath .\admin-upload.zip -Force
Compress-Archive -Path .\backend\hosting\* -DestinationPath .\api-upload.zip -Force
```

PowerShell may omit dotfiles: separately upload `.htaccess` from each static folder using File Manager, and use `hosting.env.example` as the API environment reference. Do not include `.env` secrets in a public repository or static document root.

## cPanel

1. Upload the CONTENTS of `backend/hosting` to a NEW Node application root outside the static student/admin roots.
2. Create a Node application using Node 24.22.1, production mode, startup file `app.js`. `server.cjs` is also supplied for hosts that require it. Keep the provider's assigned PORT.
3. Set the environment variables from `hosting.env.example` in the Node application settings, or copy it to `.env` inside the API app directory. Use a NEW database, strong credentials and a unique JWT_SECRET. APP_URL contains both exact frontend origins, separated by commas; ADMIN_APP_URL is only the admin origin; PUBLIC_APP_URL is the student origin. Use HTTPS for all production origins.
4. In the application's Node environment/terminal run `npm install --omit=dev`. This runtime folder has a plain npm package.json; no workspace installation, TypeScript build or Windows node_modules is required. Native PDF dependencies are installed for the host's Linux platform.
5. Start/restart the application and check `/api/healthz`, then `/api/site-content`. Inspect application logs if database initialization fails. A listening process alone does not prove database access.
6. Upload CONTENTS of `student/hosting` and `admin/hosting` to separate domain document roots. Ensure their `index.html`, `config.js`, `assets` and `.htaccess` are present. Do not upload `src/main.tsx` as the website.
7. After successful first initialization, set MDCAT_BOOTSTRAP=0. Configure SMTP and file storage in admin. The source includes backend/cpanel-filebridge for hosts using that storage method; configure its URL/secret according to its included instructions. Verify an actual upload before publishing books or notes.

The database must be reachable from the Node app. Use the hostname/port given by your provider. Where PostgreSQL is socket-only, a node-postgres connection URL may use an encoded socket directory, e.g. `postgresql://USER:PASSWORD@localhost/DB?host=%2Fvar%2Frun%2Fpostgresql`; confirm the actual socket directory with the host. Do not assume an external app can reach cPanel's PostgreSQL port.

Standard cPanel Passenger uses app.js; some providers expose CloudLinux's Setup Node.js App with an editable startup file. On standard Passenger, a `tmp/restart.txt` timestamp change restarts the app; prefer your panel's Restart button when available.

## Hostinger

For a Node.js Web App, upload `backend/hosting` as a ZIP whose root contains package.json and app.js. Select Express / Node.js, Node 24.22.1, root directory `.`, package manager npm, build command `npm run build` (the API is already built), startup/entry file `app.js`, and start command `npm start` if shown. Set the same production environment variables as above before deployment. Install runs from the runtime package.json, with no workspace dependency references.

For student/admin you can either upload the static folder contents to regular web hosting, or create separate Node.js Web Apps using their prebuilt folders: npm, build `npm run build`, entry `server.cjs`, start `npm start`. The dependency-free static server provides SPA fallback, correct JS/WASM MIME types and config.js cache prevention. Edit config.js to the real API origin before uploading/redeploying. Hostinger's Node.js availability depends on your plan; static-only hosting cannot run Express.

Hostinger API hosting requires a PostgreSQL service reachable from Hostinger. If cPanel PostgreSQL only permits local socket connections, host the API on that same cPanel server or use a reachable managed PostgreSQL service. The UI can still be hosted on Hostinger.

## Deployment smoke test

Sign into admin, create one subject/topic, parse the sample TXT, import as draft, then publish a reviewed question. Sign into the student portal and confirm it appears in that topic; answer it, save it, refresh and check Saved MCQs. Also verify team members, Sunday test timing, lecture membership, an uploaded book and notes, logout and mobile navigation. If a frontend reports failed fetch, confirm its config.js origin, API DNS/HTTPS, APP_URL CORS origins and database readiness. If nested pages 404, verify .htaccess or the supplied static server.

No live deployment has been performed from this package. SMTP, payments, domain DNS, storage and the final hosting database require your own configuration.

Official hosting references (checked 26 October 2026):
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/
- https://support.cpanel.net/hc/en-us/articles/1500002443862-How-to-restart-an-application-that-s-using-cPanel-s-Application-Manager

## Validation and editor notes

Open MDCAT.code-workspace, install with npm run setup, and use the workspace TypeScript version in VS Code. Run npm run typecheck to check all three apps. No global TypeScript or pnpm is needed.

`npm run test:auth` checks actual authentication, password hashing, sessions and development-account guards using a PGlite PostgreSQL-compatible database adapter. It does not replace a connection test to your own PostgreSQL server. Docker and live hosting were not available in the build environment. Browser visual verification could not run because the browser download was unavailable.

## GitHub deployment workflow

See [CPANEL-WORKFLOW.md](CPANEL-WORKFLOW.md) for the included GitHub Actions workflow, SSH secrets, deployment paths, Node activation, restart and recovery steps. Pushes build/test only; use the manual deploy option on main to publish to your configured cPanel account.
