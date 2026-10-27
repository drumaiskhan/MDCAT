# MDCAT deployment: frontends on Hostinger, API on cPanel

```
 Students ──► https://example.com          Hostinger  (static site #1, folder: student-hostinger)
 Admins   ──► https://admin.example.com    Hostinger  (static site #2, folder: admin-hostinger)
                       │  browser calls (fetch, cookies)
                       ▼
              https://api.example.com      cPanel     (Node.js app, folder: api-cpanel)  ──► PostgreSQL (cPanel)
```

* Two **separate** Hostinger sites (student and admin), both plain static files: no Node needed on Hostinger.
* One Node.js API on **cPanel**, with its own PostgreSQL database on the same server.
* Use **sub-domains of one domain** (`example.com`, `admin.example.com`, `api.example.com`). The login cookies are
  then first-party and survive Safari/Chrome third-party-cookie blocking. Entirely different domains work but are less reliable.
* Replace `example.com` everywhere below with your real domain.

The upload-ready folders and ZIPs are in `deploy/` (see "Build the packages" if you need to regenerate them).

| Folder / ZIP in `deploy/` | Goes to | Notes |
|---|---|---|
| `api-cpanel` / `zips/api-cpanel.zip` | cPanel, a NEW folder **outside** `public_html` | Node.js app, startup file `app.js` |
| `student-hostinger` / `zips/student-hostinger.zip` | Hostinger site `example.com` | extract into `public_html` |
| `admin-hostinger` / `zips/admin-hostinger.zip` | Hostinger site `admin.example.com` | extract into the sub-domain's folder |
| `filebridge-cpanel` | cPanel (optional) | only for book PDFs over 200 MB |

---

## Part 1: DNS plan (do this first)

| Host name | Points to | Where it is hosted |
|---|---|---|
| `example.com` (and `www`) | Hostinger | student site |
| `admin.example.com` | Hostinger | admin site |
| `api.example.com` | **your cPanel server's IP address** | API |

If the domain's DNS is managed at Hostinger (hPanel → Domains → DNS / Nameservers), add an **A record**
`api` → *cPanel server IP* (shown in cPanel's right-hand "General Information" panel as "Shared IP Address").
If DNS is managed at cPanel, add the `www`/`admin` records pointing to Hostinger instead. Wait for DNS to propagate
(minutes to a few hours) before requesting SSL certificates.

## Part 2: Backend API on cPanel

1. **Create the sub-domain.** cPanel → *Domains* → *Create A New Domain*: `api.example.com`. Untick "share document root"; accept the suggested folder.
2. **Create the database.** cPanel → *PostgreSQL® Databases*: create a database (e.g. `mdcat`), create a user with a strong password, and add the user to the database with **ALL PRIVILEGES**. cPanel prefixes both names with your account name (`acct_mdcat`, `acct_mdcatuser`). Use a NEW database; never share one with another site.
3. **Upload the API.** cPanel → *File Manager* → your home folder (NOT `public_html`) → create folder `mdcat-api` → upload `deploy/zips/api-cpanel.zip` there → *Extract*. `app.js`, `package.json` and `dist/` must sit directly inside `mdcat-api` (hidden `.env.example` included).
4. **Create the Node.js app.** cPanel → *Software* → *Setup Node.js App* → *Create Application*:
   * Node.js version: **24.22.1** (any 24.x; the app refuses to run on other majors)
   * Application mode: **Production**
   * Application root: `mdcat-api`
   * Application URL: `api.example.com`
   * Application startup file: `app.js`
5. **Environment variables.** Still on that screen, *Add Variable* for every value from `hosting.env.example` (also saved as `.env.example` inside the API folder). Minimum:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `postgresql://acct_mdcatuser:PASSWORD@localhost:5432/acct_mdcat` (URL-encode special characters in the password) |
   | `JWT_SECRET` | long random string |
   | `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | your first admin login |
   | `MDCAT_BOOTSTRAP` | `1` (set to `0` after the first successful start) |
   | `APP_URL` | `https://example.com,https://admin.example.com` |
   | `ADMIN_APP_URL` | `https://admin.example.com` |
   | `PUBLIC_APP_URL` | `https://example.com` |

   Do **not** set `PORT`. Origins must be exact: `https`, no trailing slash, no `/api`. Email (Brevo/SMTP) and Cloudinary keys can be added here or later in the admin panel.
   *Alternative:* instead of the panel, copy `.env.example` to `.env` in `mdcat-api` and fill it in.
6. **Install dependencies.** Click **Run NPM Install** on the Node.js app screen (or, in cPanel *Terminal*, run the `source …/activate` line shown at the top of the screen, then `npm install --omit=dev`).
7. **Start.** Click **Restart** (or **Start App**). Allow up to a minute on first boot: the database schema is created automatically.
8. **SSL.** cPanel → *SSL/TLS Status* → run **AutoSSL** for `api.example.com` (needs the DNS record from Part 1).
9. **Check it.** In a browser open:
   * `https://api.example.com/api/healthz` → should show an OK response
   * `https://api.example.com/api/site-content` → should return JSON. If this fails but healthz works, the database connection is wrong: check `DATABASE_URL` and the app's error log (Node.js app screen → log, or `~/mdcat-api/stderr.log`).

## Part 3: Student site on Hostinger

1. hPanel → *Websites* → add/select `example.com` (hosting plan with free SSL).
2. hPanel → *Files* → *File Manager* → `public_html`. Delete Hostinger's placeholder `default.php` if present.
3. Upload `deploy/zips/student-hostinger.zip` into `public_html` and **Extract** it there. Check that `index.html`, `config.js`, `assets/`, `pdf-assets/` and the hidden **`.htaccess`** (enable "Show hidden files") are directly inside `public_html`, not in a sub-folder.
4. Open `public_html/config.js` (Edit) and set your API address: 
   ```js
   window.__MDCAT_CONFIG__ = { apiOrigin: "https://api.example.com" };
   ```
   Origin only: no `/api`, no trailing slash. (Skip if you built with `API_URL` set.)
5. hPanel → *Security* → *SSL* → make sure SSL is **active** for the domain (the `.htaccess` redirects http → https and `www` → non-www).

## Part 4: Admin site on Hostinger (separate site)

1. hPanel → *Domains* → *Subdomains* → create `admin` under `example.com`. Note the folder Hostinger assigns (usually `public_html/admin`; you may choose a custom folder).
2. In *File Manager* open that folder, upload and extract `deploy/zips/admin-hostinger.zip` (same checks as Part 3, including `.htaccess`).
3. Edit `config.js` in that folder with the **same** `apiOrigin` as the student site.
4. Confirm SSL is active for `admin.example.com`.

> If the admin folder sits inside the student `public_html`, `example.com/admin/` also shows a copy of the admin app. That is harmless (it cannot log in because its origin is not whitelisted), but you can avoid it by choosing a custom folder outside `public_html`.

## Part 5: First start and smoke test

1. Open `https://admin.example.com` → sign in with `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`. **Change the password** in Admin → Settings.
2. In cPanel set `MDCAT_BOOTSTRAP=0` and restart the app.
3. Admin → Settings: configure **Email** (Brevo/SMTP) and **File storage** (Cloudinary). Upload one test file to verify.
4. Create one subject/topic, parse the sample TXT (`backend/tests/mdcat/fixtures/mcq-sample.txt`) in the MCQ bank, import as draft, then publish one question.
5. Open `https://example.com` in a private window → register/sign in → confirm the question appears, answer it, refresh, and check *Saved MCQs*. Test logout and mobile navigation.

## Optional: PDFs over 200 MB on cPanel disk

Follow `backend/cpanel-filebridge/README.md` (also in `deploy/filebridge-cpanel`). It needs a separate sub-domain such as `files.example.com`, a `config.php` secret, and two API variables `FILE_BRIDGE_URL` and `FILE_BRIDGE_SECRET`.

## Updating later

* **Frontend change:** with GitHub: push to `main` (Hostinger rebuilds that site from GitHub). Manual alternative: run `npm run package:hosting` (below), upload and extract the ZIP over the existing files; re-check `config.js`.
* **API change:** upload/extract `api-cpanel.zip` over `mdcat-api` (do not delete `.env` or `node_modules`), click **Run NPM Install** if dependencies changed, then **Restart**.
* **Change the API address:** edit `config.js` on both Hostinger sites. No rebuild.

## Build the packages (only if you changed code)

```powershell
npm ci
npm run build
$env:API_URL="https://api.example.com"       # optional: written into both config.js files
$env:STUDENT_URL="https://example.com"       # optional: replaces the placeholder in canonical/sitemap/robots
npm run package:hosting
```

Manual ZIP uploading (Parts 3 and 4) is the alternative to Git deployment. Output: `deploy/` (folders + `deploy/zips/*.zip`, hidden `.htaccess` files included automatically). Use these ZIPs rather than Windows "Compress-Archive", which can drop dotfiles.

## Deploying from GitHub (frontends built by Hostinger, API to cPanel via the workflow)

The two frontends deploy the same way Medify does: Hostinger connects to the GitHub repo, builds each app from its own folder, and publishes the `dist` output.

### Hostinger: one website per app (same as Medify)
`student/` and `admin/` are now fully standalone apps (own `package.json`, own copy of the API client in `src/lib/api-client-react`, no workspace links). Hostinger builds each one from its own folder. In hPanel connect this GitHub repo (branch `main`) to each site and use:

| Site | Project / root directory | Install + build command | Output / publish directory |
|---|---|---|---|
| `example.com` (student) | `student` | `npm install && npm run build` | `dist` |
| `admin.example.com` (admin) | `admin` | `npm install && npm run build` | `dist` |

* Use the Project-root form above; do not also add `student/` or `admin/` to the build command or output path.
* Once you have committed `student/package-lock.json` and `admin/package-lock.json` (see below) you can switch to `npm ci && npm run build`.
* Keep auto-deploy on: every push to `main` rebuilds both sites.
* `.htaccess` (page-refresh and `.wasm` rules) is in each app's `public/` folder and is copied into `dist` automatically.

**Create the lockfiles once, on your computer** (needs internet), then commit them: run `npm install` in the repo root, then `npm run install:apps` (installs `student/` and `admin/`). This regenerates `package-lock.json` in all three places. The root lockfile in this ZIP predates the change and is out of date until you do this.

### Set the API address once, before the first Hostinger build
Edit `student/public/config.js` and `admin/public/config.js` in the repo and set `apiOrigin` to your cPanel API address (`https://api.example.com`, no `/api`, no trailing slash), then commit. Hostinger copies the file into each build. Changing the address later means editing the file in the repo (or in `config.js` on the live site) with no rebuild.

The GitHub workflow no longer touches the frontends. On every push to `main` it tests and builds; when you run it manually with deploy ticked, it deploys only the API to cPanel and checks `/api/healthz` and `/api/site-content`.

### GitHub configuration
Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Secret | `CPANEL_HOST`, `CPANEL_USER` | cPanel SSH host and user |
| Secret | `CPANEL_SSH_PRIVATE_KEY` | private key authorised in cPanel *SSH Access* |
| Secret | `CPANEL_SSH_KNOWN_HOSTS` | verified known_hosts line (`[host]:port` if not 22) from `ssh-keyscan -p PORT HOST`; compare the fingerprint with your provider's. Host-key checking is never disabled |
| Variable | `API_ORIGIN` | `https://api.example.com` (used for the API health check and the manual ZIP packages) |
| Variable | `STUDENT_ORIGIN` | `https://example.com` (optional: fixes canonical/sitemap/robots) |
| Variable | `CPANEL_SSH_PORT` | default 22 |
| Variable | `CPANEL_API_DIR` | `/home2/ACCOUNT/mdcat-api` |
| Variable | `CPANEL_NODE_ENV` | optional: `/home2/ACCOUNT/nodevenv/mdcat-api/24/bin/activate` |

Create a GitHub **Environment** `cpanel-production` (optionally with required reviewers). In repo *Settings → Actions → General → Workflow permissions* nothing special is needed.

Before the first run, on the cPanel server (Terminal) create the API folder and its safety marker, and create the Node.js app manually as in Part 2:

```sh
mkdir -p /home2/ACCOUNT/mdcat-api && touch /home2/ACCOUNT/mdcat-api/.mdcat-deploy-target
```

Database passwords and `JWT_SECRET` stay in cPanel's Node.js app settings and never go into GitHub. API uploads are in-place and never delete `.env` or `node_modules`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Failed to fetch" / network error in browser | `config.js` origin wrong, API DNS/SSL not ready, or the site origin is missing from `APP_URL` (exact match, https, no `www`). |
| Login succeeds then immediately signs out | Cookies blocked cross-site. Use sub-domains of one domain, https everywhere; ensure `ADMIN_APP_URL` equals the admin origin exactly. |
| `/api/healthz` OK but `/api/site-content` fails | Database credentials/permissions. Check `DATABASE_URL` (encoded password, `acct_` prefixes) and the app log. |
| 503 or "Incomplete response" from API right after deploy | Passenger is still starting or `npm install` has not been run. Click Run NPM Install, then Restart. |
| Page refresh gives 404 / blank on Hostinger | `.htaccess` missing (hidden file not uploaded). Re-extract the ZIP. |
| Old site shows after update | Hard refresh; `index.html` and `config.js` are served `no-store`, but Hostinger's CDN cache can be purged in hPanel → *Performance*. |
| Book reader / PDF fails to load | `.wasm` MIME type: the supplied `.htaccess` sets it; confirm it exists. |
| Uploads over a few MB fail | cPanel/Apache request limits (`LimitRequestBody`, PHP irrelevant). Ask your host to allow ≥ 25 MB bodies for the API domain. |
