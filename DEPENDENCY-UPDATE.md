# Dependency update — 26 October 2026

Target runtime: Node.js 24.22.1 (24.x); npm 12.2.1. Registry latest tags were checked during this update. Versions are pinned in the manifests and lockfile.

Removed OSPE/OSCE and Resources page routes, navigation, prefetch imports and public feature mentions from both portals. Existing database tables and backup data are retained. The historical resources permission key still controls Notes access; its displayed label is now Notes.

## Direct dependency changes

| Package | Previous declaration | Updated |
|---|---|---|
| @capacitor/android | ^7.4.4, ^7.6.9 | 8.5.3 |
| @capacitor/app | ^7.1.0 | 8.1.2 |
| @capacitor/assets | ^3.0.5 | 3.0.5 |
| @capacitor/cli | ^7.4.4, ^7.6.9 | 8.5.3 |
| @capacitor/core | ^7.4.4, ^7.6.9 | 8.5.3 |
| @capacitor/ios | ^7.4.4 | 8.5.3 |
| @capacitor/preferences | ^7.0.4 | 8.0.1 |
| @capacitor/privacy-screen | ^1.1.4 | 2.0.1 |
| @capawesome/capacitor-live-update | ^7.5.2 | 8.7.1 |
| @electric-sql/pglite | ^0.3.16 | 0.5.11 |
| @hookform/resolvers | ^3.10.0 | 6.0.0 |
| @napi-rs/canvas | ^0.1.100 | 1.0.13 |
| @radix-ui/react-accordion | ^1.2.4 | 1.3.1 |
| @radix-ui/react-alert-dialog | ^1.1.7 | 1.2.1 |
| @radix-ui/react-aspect-ratio | ^1.1.3 | 1.2.0 |
| @radix-ui/react-avatar | ^1.1.4 | 1.3.1 |
| @radix-ui/react-checkbox | ^1.1.5 | 1.4.1 |
| @radix-ui/react-collapsible | ^1.1.4 | 1.2.1 |
| @radix-ui/react-context-menu | ^2.2.7 | 2.4.1 |
| @radix-ui/react-dialog | ^1.1.7 | 1.3.1 |
| @radix-ui/react-dropdown-menu | ^2.1.7 | 2.2.1 |
| @radix-ui/react-hover-card | ^1.1.23, ^1.1.7 | 1.2.1 |
| @radix-ui/react-label | ^2.1.3 | 2.1.17 |
| @radix-ui/react-menubar | ^1.1.7 | 1.2.1 |
| @radix-ui/react-navigation-menu | ^1.2.6 | 1.4.1 |
| @radix-ui/react-popover | ^1.1.7 | 1.3.1 |
| @radix-ui/react-progress | ^1.1.3 | 1.2.1 |
| @radix-ui/react-radio-group | ^1.2.4 | 1.5.1 |
| @radix-ui/react-scroll-area | ^1.2.4 | 1.4.0 |
| @radix-ui/react-select | ^2.1.7 | 2.4.1 |
| @radix-ui/react-separator | ^1.1.3 | 1.2.0 |
| @radix-ui/react-slider | ^1.2.4 | 1.6.1 |
| @radix-ui/react-slot | ^1.2.0 | 1.5.0 |
| @radix-ui/react-switch | ^1.1.4 | 1.4.1 |
| @radix-ui/react-tabs | ^1.1.4 | 1.2.1 |
| @radix-ui/react-toast | ^1.2.7 | 1.3.1 |
| @radix-ui/react-toggle | ^1.1.3 | 1.2.1 |
| @radix-ui/react-toggle-group | ^1.1.3 | 1.2.1 |
| @radix-ui/react-tooltip | ^1.2.0 | 1.4.1 |
| @replit/connectors-sdk | ^0.4.1 | 0.5.0 |
| @replit/vite-plugin-cartographer | ^0.5.21 | 0.6.1 |
| @replit/vite-plugin-dev-banner | ^0.1.1 | 0.1.2 |
| @replit/vite-plugin-runtime-error-modal | ^0.0.6 | 0.0.6 |
| @tailwindcss/typography | ^0.5.15 | 0.5.20 |
| @tailwindcss/vite | ^4.1.14 | 4.3.3 |
| @tanstack/react-query | ^5.90.21 | 5.105.0 |
| @types/compression | ^1.7.5 | 1.8.1 |
| @types/cookie-parser | ^1.4.10 | 1.4.10 |
| @types/cors | ^2.8.19 | 2.8.19 |
| @types/express | ^5.0.6 | 5.0.6 |
| @types/jsonwebtoken | ^9.0.7 | 9.0.10 |
| @types/multer | ^1.4.12 | 2.3.0 |
| @types/node | ^25.3.3 | 26.6.5 |
| @types/pg | ^8.20.0 | 8.23.1 |
| @types/react | ^19.2.0 | 19.3.0 |
| @types/react-dom | ^19.2.0 | 19.3.0 |
| @types/three | ^0.180.0 | 0.186.0 |
| @vitejs/plugin-react | ^5.0.4 | 6.1.2 |
| bcryptjs | ^2.4.3 | 3.0.3 |
| class-variance-authority | ^0.7.1 | 0.7.1 |
| cloudinary | ^2.5.1 | 2.11.0 |
| clsx | ^2.1.1 | 2.1.1 |
| cmdk | ^1.1.1 | 1.1.1 |
| compression | ^1.7.5 | 1.8.2 |
| concurrently | ^9.1.0 | 10.0.6 |
| cookie-parser | ^1.4.7 | 1.4.7 |
| cors | ^2.8.6 | 2.8.6 |
| cross-env | ^7.0.3 | 10.1.0 |
| date-fns | ^3.6.0 | 4.4.0 |
| dompurify | ^3.4.17 | 3.4.17 |
| dotenv | ^16.4.5 | 18.0.9 |
| drizzle-kit | ^0.31.10 | 0.31.11 |
| drizzle-orm | ^0.45.2 | 0.45.4 |
| drizzle-zod | ^0.8.3 | 0.8.3 |
| embla-carousel-react | ^8.6.0 | 8.6.0 |
| esbuild | 0.25.8 | 0.28.2 |
| express | ^5.2.1 | 5.3.0 |
| framer-motion | ^12.23.24 | 14.6.0 |
| input-otp | ^1.4.2 | 1.5.0 |
| jsonwebtoken | ^9.0.2 | 9.0.3 |
| lucide-react | ^0.545.0 | 1.61.0 |
| mammoth | ^1.12.2, ^1.8.0 | 1.13.0 |
| multer | ^2.0.2 | 2.5.0 |
| mysql2 | ^3.15.4 | 3.24.6 |
| next-themes | ^0.4.6 | 0.4.6 |
| nodemailer | ^10.0.15 | 10.2.1 |
| orval | ^8.23.0 | 8.45.0 |
| pdfjs-dist | 4.10.38, 5.4.624, ^4.7.76 | 6.4.299 |
| pg | ^8.22.0 | 8.23.1 |
| pino | ^9.14.0 | 10.4.0 |
| pino-http | ^10.5.0 | 11.0.0 |
| pino-pretty | ^13.1.3 | 13.2.0 |
| prettier | ^3.9.6 | 3.9.10 |
| react | 19.1.0 | 19.3.1 |
| react-day-picker | ^9.11.1 | 10.0.2 |
| react-dom | 19.1.0 | 19.3.1 |
| react-hook-form | ^7.55.0 | 7.91.0 |
| react-icons | ^5.4.0 | 5.7.0 |
| react-resizable-panels | ^2.1.7 | 4.15.0 |
| recharts | ^2.15.2 | 3.10.1 |
| sonner | ^2.0.7 | 2.0.8 |
| supertest | ^7.3.1 | 7.3.1 |
| tailwind-merge | ^3.3.1 | 3.7.0 |
| tailwindcss | ^4.1.14 | 4.3.3 |
| three | ^0.180.0 | 0.186.1 |
| tsx | ^4.21.0 | 4.23.15 |
| tw-animate-css | ^1.4.0 | 1.4.0 |
| typescript | ~5.9.3 | 7.0.2 |
| vaul | ^1.1.2 | 1.1.2 |
| vite | ^7.3.2 | 8.3.5 |
| wouter | ^3.3.5 | 3.13.0 |
| xlsx | ^0.18.5 | file:vendor/xlsx-0.20.3.tgz |
| zod | ^4.0.0 | 4.6.7 |

## Compatibility changes

- Migrated PDF.js cleanup to loading tasks and rendering to the current canvas API. Added a real secure-page JPEG rendering regression test.
- Updated Recharts tooltip/legend types and React keys, calendar class names and resizable-panel APIs.
- Removed unused pdf-parse and its types, obsolete bcrypt types, and the incompatible esbuild-plugin-pino. Pino now ships as a normal runtime dependency.
- Updated Node/npm targets in local scripts, hosting packages and cPanel Actions. npm 12 install-script permissions are explicitly recorded for esbuild and sharp.
- SheetJS 0.20.3 comes from the official vendor distribution, included in backend/vendor; npm registry xlsx remains outdated.
- Updated transitive sharp, tar, uuid, postcss-selector-parser and replaced the old Drizzle loader with tsx through root overrides.

Official SheetJS installation: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/

Native Android projects are retained, but Android/Capacitor builds and live hosting are not validated by the web test suite.

## Verification

- npm 12.2.1 clean install and dependency-tree validation passed.
- All workspace TypeScript checks and all three production builds passed.
- TXT, CSV, XLSX, XLS, DOCX and PDF upload/commit tests passed with the current SheetJS/PDF.js versions.
- Real admin/student authentication, session and development-account guards passed against PGlite; native secure PDF page rendering produced a JPEG successfully.
- Sharp image transformation, Capacitor CLI and Drizzle CLI smoke checks passed.
- Standalone production backend installation and HTTP health smoke test passed. The smoke test used no live database; it verifies packaging/startup only.
- OSPE/OSCE and Resources routes, sidebar links, public feature mentions and production page chunks are absent.
- npm audit reported 0 known vulnerabilities on 26 October 2026. This is an advisory snapshot, not a guarantee of absence of vulnerabilities.
- Frontend prebuild explicitly cleans dist to keep removed pages out of deployment packages.

Live cPanel deployment, real PostgreSQL connectivity, browser visual testing and native Android builds were not performed in this update.
