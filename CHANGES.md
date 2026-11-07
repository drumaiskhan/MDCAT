# Fix: "Please sign in to continue" in the Android app (Lectures and others)

- `student/src/lib/mdcat-api.ts` (`learningApi`, used by Lectures, Chapters, Course years, Flashcard progress) now sends the native bearer token and omits cookies inside the Capacitor app, like `lib/api.ts`. Previously it sent only a cookie, which the WebView doesn't carry cross-origin, so every call returned 401.
- Study Library (`medify/lib/client.ts`, note images, book-reader progress) now omits cookies in the native app so a stale cookie can't shadow the bearer token.
- `student/src/lib/api.ts`: web branch no longer lets caller-supplied `options.headers` replace the merged headers (it dropped `Content-Type`).
- `backend/src/middlewares/auth.ts`: if the session cookie is invalid/expired but a valid `Authorization: Bearer` token is present, the bearer token is used instead of treating the request as signed out.

# FSc years by plan: separate FSc-I / FSc-II content, one storage module per year

- **Plan-based year access** (`backend/src/lib/courseYearAccess.ts`): the FSc years a student can study come from the purchased, unexpired plan(s) they hold. An FSc-I plan unlocks FSc-I, an FSc-II plan FSc-II, and a "Full Course" plan (any course year named full / both / combined / complete / whole, or a plan that ticks both years) unlocks both. A plan with no years is open to every year. A newer purchase no longer hides an older paid one (FSc-I then FSc-II = both); admin-assigned plan changes still replace the old plan. Students with no purchased plan (trial/expired) fall back to the year picked at signup; students with none on file stay unrestricted, as before.
- `getStudentTargeting` now carries `courseYearIds`, and `courseYearAllows` uses it, so books, exams, past papers, lectures, notes, modules and notifications all follow the plan instead of only the signup year.
- **One internal storage module per FSc year** (`curriculumStorageId(courseYearId)`): subjects filed under a year live in a module tagged with that year, so the existing module-visibility rules keep FSc-II content from FSc-I-only students. Subjects without a year keep the shared module. Changing a subject's year re-files it and its MCQs/flashcards; a startup backfill (`syncSubjectYearStorage`) moves existing year-tagged subjects. No schema changes.
- `GET /subjects` filters by the student's allowed years; new `GET /course-years/mine` (years + unlocked flag) and `GET /course-years/content` (real years, no bundles). Notes and lectures return the subject's `courseYearId`.
- `POST /payments` no longer limits a student to plans for their signup year, so they can add the other year or the Full Course later.
- **Admin:** Flashcards upload, AI draft and manual add use the shared FSc Year > Subject > Chapter > Topic picker; the flashcard bank tree is grouped by year; Lectures, Notes, Chapters, Topics and Subjects get the year step; "Full Course" is no longer offered as a place to file content.
- **Student:** FSc-I / FSc-II tabs on Subjects (locked years show a "not in your plan" panel), a year select on Flashcards and Lectures, year tabs on Notes, a Year > Subject breadcrumb on topics, and plan cards on Payments show the years they cover. The chosen year is shared across pages.

# Admin: FSc Year > Subject > Chapter > Topic, AI MCQ Maker removed from admin

- Removed the admin "AI MCQ Maker: questions saved to the bank" panel, the "AI-made" stat tile and filter chip, the AI badge on questions, and the AI question generators (top "Add multiple" generator and the per-topic generate button). Deleted `AiMcqReviewPanel.tsx`.
- Backend no longer files student AI-made questions into the Qbank (`studentQbankContribution.ts` deleted, call removed from `/ai/mcq-maker`). The student-side AI MCQ Maker page itself is unchanged; switch it off with the `AI_MCQ_MAKER_ENABLED` site setting if it should go too.
- New `med_subjects.course_year_id` (nullable, added automatically by `ensureSchema`; also in `ensure-schema.sql` / `manual-migration.sql`). `GET/POST/PATCH /subjects` return and accept `courseYearId`; `GET /subjects?courseYearId=` filters for admins. Students only see subjects of their own FSc year plus subjects with no year. Existing subjects stay valid (no year = shown under every year).
- Admin MCQ page: new `CurriculumPicker` (FSc year > subject > chapter > topic) replaces the old subject/topic pickers for bulk file upload, manual add and "Add multiple". The Block / Module / Program steps are no longer shown.
- Question bank tree is now FSc year > subject > chapter > topic > questions.
- Admin Subjects page: choose the FSc year when creating or editing a subject.
- Admin Settings: removed the two "student-made MCQs to the Qbank" toggles.

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

## Past papers: per-subject page (ported from MedSchoolProffs)
- New student page `/past-papers/:id` (`student/src/pages/PastPaperDetail.tsx`): pick one, several or all subjects, then difficulty, number of questions, timer and shuffle, and start. Past-paper cards now open this page instead of jumping straight into practice.
- `Practice.tsx` understands the options the page sends (`go`, `subject`, `diff`, `n`, `timer`, `min`, `shuffle`) and starts the session immediately for past papers.
- Backend: `GET /past-papers/:id/subjects` groups a paper's questions by subject (admin-tagged subject first, otherwise an AI label, otherwise "General"). `src/lib/paperTopics.ts` sorts untagged questions with the configured AI provider in the background (when a paper is first opened, and right after an import into a paper). Two new nullable columns on `med_mcqs` (`paper_subject`, `paper_subject_ver`) are added automatically by ensureSchema on start-up.
- Requires: rebuild + redeploy the API and the student app. Subject sorting needs an AI provider configured in Admin → Settings.
