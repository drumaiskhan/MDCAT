# cPanel deployment from GitHub

The workflow is `.github/workflows/cpanel-deploy.yml`. Push the **contents** of MDCAT-Three-Folders to the repository root, including the hidden `.github` folder and package-lock.json.

Every push to `main` installs npm dependencies, runs upload/authentication tests, type-checks and builds all three apps, and uploads a `cpanel-build` artifact. Actual deployment is manual: **Actions → Build and deploy to cPanel → Run workflow → main → enable deploy**. The workflow never deploys other branches.

## One-time cPanel setup

Create a separate Node 22.22.2 application for this website, startup file `app.js`, and a new reachable PostgreSQL database. Set production environment variables using hosting.env.example in the panel or an API `.env`. Create separate student/admin document roots and map their domains. Do not reuse MedSchoolProffs or Medify application folders/databases.

SSH and rsync must be enabled by your provider. Add the deployment public key in cPanel SSH Access and authorize it. The private key must be usable non-interactively. Ask the provider for the SSH port and verified host-key fingerprint; obtain the known_hosts entry and compare its fingerprint before storing it. Do not disable host-key verification.

Before the first deployment, mark each intended destination in cPanel Terminal (replace these examples with YOUR actual directories):

```sh
mkdir -p /home2/ACCOUNT/mdcat-api /home2/ACCOUNT/mdcat-student /home2/ACCOUNT/mdcat-admin
touch /home2/ACCOUNT/mdcat-api/.mdcat-deploy-target
touch /home2/ACCOUNT/mdcat-student/.mdcat-deploy-target
touch /home2/ACCOUNT/mdcat-admin/.mdcat-deploy-target
```

The three destinations must be distinct and not nested. Supported paths start with /home/ACCOUNT/ or /home2/ACCOUNT/ (other numbered home roots also work), without spaces, dots or trailing slashes. The deployment refuses unmarked destinations before writing any files.

## GitHub configuration

Under **Settings → Secrets and variables → Actions**, add:

| Kind | Name | Value |
|---|---|---|
| Secret | CPANEL_HOST | SSH hostname, without https:// |
| Secret | CPANEL_USER | cPanel SSH username |
| Secret | CPANEL_SSH_PRIVATE_KEY | Complete private SSH key |
| Secret | CPANEL_SSH_KNOWN_HOSTS | Verified known_hosts entry; custom ports use [host]:port |
| Variable | CPANEL_SSH_PORT | SSH port, default 22 |
| Variable | CPANEL_API_DIR | /home2/ACCOUNT/mdcat-api |
| Variable | CPANEL_STUDENT_DIR | Student domain document root |
| Variable | CPANEL_ADMIN_DIR | Admin domain document root |
| Variable | CPANEL_API_ORIGIN | https://api.your-domain.com — no /api or trailing slash |
| Variable | CPANEL_NODE_ENV | Optional absolute activation file, e.g. /home2/ACCOUNT/nodevenv/mdcat-api/22/bin/activate |

Use repository-level variables so the build job can read CPANEL_API_ORIGIN. Create the **cpanel-production** environment under Settings → Environments; you may add required reviewers if you want an approval gate. Do not put database passwords or JWT_SECRET in the frontend build or repository. They remain on cPanel.

CPANEL_NODE_ENV is the file after `source` in the activation command shown by cPanel. If omitted, Node 22.22.2 and npm must already be on the SSH login PATH. The script activates the environment, runs npm 10.9.7 through npx to install production runtime dependencies, and touches `tmp/restart.txt` to request a Passenger restart. It then checks `/api/healthz` AND `/api/site-content` before uploading the frontends. Config.js is populated automatically with CPANEL_API_ORIGIN.

## Deployment behavior and recovery

The upload preserves backend `.env`, uploads and cPanel-managed node_modules. It does not delete remote files, so older hashed frontend assets remain available for open browser tabs. Frontend .htaccess is updated by the package; use dedicated static document roots. Do not point these variables at the existing MedSchoolProffs directories.

This is an in-place deployment, not an atomic zero-downtime release. If npm installation or a health check fails, GitHub marks the job failed and does not upload the frontends; some backend files may already have changed. Keep a server/database backup. Restore the previous backend package and restart through cPanel if needed. Build artifacts are retained for 14 days for manual recovery; database restoration is separate. A 200 response does not verify payments, email or every user flow: sign in and test a file upload after deploying.

If the host does not support SSH/rsync, download `cpanel-build` from the successful build run and upload each hosting folder through cPanel File Manager using HOSTING-AND-LOCAL.md. No SSH is needed for build-only runs.

Validation here covers workflow structure, shell syntax, configuration rejection and a mocked SSH/rsync deployment sequence. No live GitHub run or cPanel deployment was performed.

Official references:
- https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/
- https://support.cpanel.net/hc/en-us/articles/1500002443862-How-to-restart-an-application-that-s-using-cPanel-s-Application-Manager
- https://github.com/actions/setup-node
