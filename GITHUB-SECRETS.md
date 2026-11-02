# GitHub setup for FTP deployment

Workflow: `.github/workflows/deploy.yml`. Every push to `main` tests and builds. Deploy is manual:
**Actions -> Test, build and deploy to cPanel (FTP) -> Run workflow -> main -> tick "deploy" -> choose package.**

## Settings -> Secrets and variables -> Actions -> Repository secrets

| Secret | Value |
|---|---|
| `CPANEL_FTP_SERVER` | FTP host, e.g. business900.mypowerfulserver.com |
| `CPANEL_FTP_PORT` | 21 unless your host says otherwise |
| `CPANEL_FTP_USERNAME` | FTP username |
| `CPANEL_FTP_PASSWORD` | FTP password |
| `CPANEL_FTP_TARGET` | Remote folder for the chosen package (e.g. /mdcat-api) |

Variables `API_ORIGIN` (https://api.yourdomain.com, no /api) and `STUDENT_ORIGIN` are read by the build job.
Create the environment `cpanel-production` (optional required reviewer).

## Notes
- Uses explicit FTPS (encrypted). Plain-FTP-only servers will fail.
- API uploads skip `.env`, `node_modules`, `uploads`, `tmp`, then upload `tmp/restart.txt` for Passenger.
- FTP cannot run npm: use cPanel -> Setup Node.js App -> Run NPM Install (Node 22) after first deploy or dependency changes.
- Keep DATABASE_URL, JWT_SECRET etc. in cPanel, never in GitHub.
