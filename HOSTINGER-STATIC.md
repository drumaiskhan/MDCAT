# Hostinger static-website deployment (same method as Medify)

Student and admin are two separate STATIC sites. Do NOT create a Node.js web app for them
(that causes "ERROR: Entry file not found" - a static site has no server entry file).
The API stays on cPanel (see DEPLOYMENT.md).

## Option A - Hostinger Git deploy (per site)
Create one Hostinger website per frontend and connect the GitHub repo.

Student site (e.g. example.com):
- Project root: `student`        (this ignores the root app.js / server.cjs)
- Build command: `npm install && npm run build`
- Publish / output directory: `dist`
- Node version: 24

Admin site (e.g. admin.example.com): same, with Project root `admin`.

If Hostinger only offers repository root instead:
- Student build: `npm install --prefix student && npm run build --prefix student`, output `student/dist`
- Admin build:   `npm install --prefix admin && npm run build --prefix admin`, output `admin/dist`

(Use `npm install`, not `npm ci`: student/ and admin/ have no package-lock.json.)

## Option B - Upload built files (no build on Hostinger)
```
npm run setup
npm run build
set API_URL=https://api.example.com   (PowerShell: $env:API_URL="https://api.example.com")
npm run package:hosting
```
Upload the CONTENTS of `deploy/student-hostinger` and `deploy/admin-hostinger` (or the zips in
`deploy/zips`) into each site's public_html, including the hidden `.htaccess`.

## After either option
1. Edit `config.js` on each site: set `API_ORIGIN` to `https://api.example.com`.
2. On the API set APP_URL to both frontend origins (CORS), see DEPLOYMENT.md.
3. Check: refresh a nested page (no 404), open /config.js, and /api/healthz on the API domain.
