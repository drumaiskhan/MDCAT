# Node 24 and dependency update

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
