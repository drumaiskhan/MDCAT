# Hostinger static-website deployment (same method as Medify)

Student and admin are two separate STATIC sites. Do NOT create a Node.js web app for them
(that causes "ERROR: Entry file not found" - a static site has no server entry file).
The API stays on cPanel (see DEPLOYMENT.md).

## Option A - Hostinger Git deploy (per site)
Create one Hostinger website per frontend and connect the GitHub repo.

Student site (e.g. example.com):
- Project root: `student`        (this ignores the root app.js / server.cjs)
- Build command: `npm install --include=dev && npm run build`
- Publish / output directory: `dist`
- Node version: 22 or 24

Admin site (e.g. admin.example.com): same, with Project root `admin`.

If Hostinger only offers repository root instead:
- Student build: `npm install --include=dev --prefix student && npm run build --prefix student`, output `student/dist`
- Admin build:   `npm install --include=dev --prefix admin && npm run build --prefix admin`, output `admin/dist`

(student/ and admin/ now have package-lock.json, so `npm ci` also works.)

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

## Important: never commit student/hosting or admin/hosting
Those folders are prebuilt copies. If they are in the repo, an old build can be served and
changes to src/ never show up. They are now deleted and git-ignored; Hostinger must build
from `student/src` and `admin/src` and publish `dist`.

## If your Hostinger plan uses "Node.js Web App" (asks for a startup file)
`student/server.cjs` and `admin/server.cjs` serve the built `dist/` folder (no dependencies).
- Project root: `student` (or `admin`)
- Build command: `npm install --include=dev && npm run build`
- Start command: `npm start`
- Startup / entry file: `server.cjs`   (NOT hosting/server.cjs - that folder is deleted)
- Node version: 22 or 24

## Why `--include=dev`
Vite, Tailwind and the React plugin are devDependencies. Hostinger often sets NODE_ENV=production,
and then a plain `npm install` skips them and the build fails with "vite: not found" or a missing plugin.
