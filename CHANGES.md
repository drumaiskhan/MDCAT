# Chapters (Subject → Chapter → Topic)

- New `med_chapters` table and nullable `med_topics.chapter_id` (created automatically on API start by `ensureSchema`; also in `ensure-schema.sql` / `manual-migration.sql`). Existing topics stay valid and show as "No chapter".
- API: `GET/POST /chapters`, `PATCH/DELETE /chapters/:id`, `POST /topics/move`; topics accept and return `chapterId`. Deleting a chapter keeps its topics; deleting a subject archives its chapters. Full backups include chapters.
- MCQs, flashcards and lectures stay attached to a topic and inherit the chapter through it.
- Student sidebar: removed the legacy sidebar rules from `fx.css` that fought `sidebar.css` (oversized rows, huge group gaps, clipped active marker); `sidebar.css` is now the single compact, light/dark-aware style.
- Student: Topics page groups topics under chapter headings (with per-chapter progress), the flashcard topic filter groups by chapter, and lectures show Subject / Chapter / Topic. Subjects without chapters look unchanged.
- Admin: new Chapters page (`/admin/chapters`), chapter-aware Topics page (filter, add/bulk-add into a chapter, move, bulk move), topic pickers grouped by chapter in MCQ bank / flashcards / lectures / past-paper tagging, and MCQ + flashcard trees grouped Subject → Chapter → Topic.

# Deployment restructure: Hostinger frontends + cPanel API

- Student and admin are now packaged as two independent static Hostinger sites (`deploy/student-hostinger`, `deploy/admin-hostinger`); the API is packaged for cPanel (`deploy/api-cpanel`). New `DEPLOYMENT.md` replaces the old Hostinger-API / cPanel-frontend instructions and CPANEL-WORKFLOW.md.
- `npm run package:hosting` now writes everything to `deploy/`, creates ready-to-upload ZIPs (hidden `.htaccess` included), no longer needs installed node_modules, and can set `API_URL` / `STUDENT_URL`.
- New hardened Hostinger `.htaccess` (HTTPS + www redirect, SPA fallback with real 404 for missing assets, WASM MIME type, caching, security headers, dotfile blocking). Removed the Node static server and `package.json`/`server.cjs` from the frontend packages.
- `hosting.env.example` rewritten for the cPanel API (localhost PostgreSQL, Hostinger origins, file bridge, TRUST_PROXY).
- GitHub workflow `deploy.yml`: build/test, deploy API to cPanel over SSH (health-checked, `deploy-cpanel.sh`), then publish the built sites to branches `hostinger-student` and `hostinger-admin` (`publish-frontend-branch.sh`) for Hostinger's Git auto-deploy.
- File bridge instructions updated: API and bridge are both on cPanel now.

# Typecheck: always rebuild project-reference declarations

- `typecheck:libs`, `build:api` and the api-server `typecheck` script now use `tsc --build --force` for `lib/db` / `lib/api-zod`. `tsc --build` skips a rebuild when source mtimes are older than the old `dist/*.d.ts`/`.tsbuildinfo` (e.g. after extracting a zip), leaving stale declarations that made `usersTable` look like it lacked the merit-list columns (37 false errors in `routes/auth.ts` / `routes/merit.ts`). No source or schema changes.

# Node 22 target (downgraded from Node 24)

- Node.js 22.22.2 (>=22.12.0 <23) and npm 10.9.7 across package engines, local setup, hosting packages, deploy script and GitHub Actions; @types/node pinned to 22.20.5.

# Earlier: Node 24 and dependency update

- Node.js 24.22.1 and npm 12.2.1 targets across local setup, hosting packages and GitHub Actions.
- Updated dependencies and lockfile; compatibility fixes for PDF.js, charts, calendar and resizable panels. See DEPENDENCY-UPDATE.md for versions and validation.
- Removed OSPE/OSCE and Resources sections from admin and student panels, including routes, prefetching, navigation and marketing mentions. Existing data remains in backups.
- Current SheetJS package included under backend/vendor. Removed unused legacy parser and logger bundler; npm audit reports zero known vulnerabilities.

# Latest changes

- Three top-level source directories: admin, student and backend. Shared packages, tests, scripts and supporting files are under backend.
- npm workspaces, concrete dependency versions and package-lock.json replace pnpm catalogs/workspace protocols. Clean npm ci verified without force or legacy-peer-deps.
- Indigo landing hero and feature styling; matching static/React loading screens with reduced-motion support. Admin website name is fetched across both portals and cached for the next cold-start loader. Cached theme colors also apply before React loads.
- Development-only verified local student account plus generated admin/student passwords. No credentials shipped. Seed requires development mode, an explicit opt-in and a localhost database; existing users are preserved.
- Local PostgreSQL via Docker Compose or DATABASE_URL, VS Code workspace, fixed moved paths and environment loading.
- Prebuilt independent hosting folders inside admin/student/backend, plain npm backend runtime and runtime frontend API configuration.

## Validation

All workspace TypeScript checks and three production builds passed. Clean npm ci, local environment preservation, six-format MCQ upload/commit tests and real login/session tests passed. Login tests use a PGlite PostgreSQL-compatible adapter with genuine application authentication. The isolated backend hosting package installed its production dependencies and reached its listening state; that smoke test deliberately had no live database. Docker/live PostgreSQL and real hosting deployment still require a user-environment smoke test. Browser visual validation was blocked by browser-download availability.


## Frontends now deploy like Medify
* Student and admin Vite builds output to `dist/` (was `dist/public`); Capacitor `webDir`, `package-hosting.mjs` and the mobile OTA workflow updated to match.
* Hostinger builds each app from GitHub (root directory `student` or `admin`, output `dist`). Removed the `hostinger-student` / `hostinger-admin` branch publishing and `publish-frontend-branch.sh`.
* `deploy.yml` now tests, builds and deploys only the API to cPanel.
* `student/` and `admin/` are standalone like Medify: the shared API client is copied into each app (`src/lib/api-client-react`), `@workspace/api-client-react` imports became `@/lib/api-client-react`, `tsconfig.json` no longer extends the root, and the two apps are no longer root workspaces (root scripts use `--prefix`). The `@assets` alias to `backend/assets` was removed (unused).
* Root `npm run setup`/CI use `npm install` (and per-app installs) until fresh lockfiles are committed.
