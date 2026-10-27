#!/usr/bin/env bash
set -euo pipefail
release="${1:-release}"
: "${CPANEL_HOST:?Set CPANEL_HOST}"
: "${CPANEL_USER:?Set CPANEL_USER}"
: "${CPANEL_API_DIR:?Set CPANEL_API_DIR}"
: "${CPANEL_STUDENT_DIR:?Set CPANEL_STUDENT_DIR}"
: "${CPANEL_ADMIN_DIR:?Set CPANEL_ADMIN_DIR}"
: "${CPANEL_API_ORIGIN:?Set CPANEL_API_ORIGIN}"
port="${CPANEL_SSH_PORT:-22}"
[[ "$CPANEL_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ && "$CPANEL_USER" =~ ^[a-zA-Z0-9_]+$ && "$port" =~ ^[0-9]+$ ]] || { echo 'Invalid SSH configuration'; exit 1; }
[[ "$CPANEL_API_ORIGIN" =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]+)?$ ]] || { echo 'API origin must be HTTPS with no path or trailing slash'; exit 1; }
dirs=("$CPANEL_API_DIR" "$CPANEL_STUDENT_DIR" "$CPANEL_ADMIN_DIR")
for dir in "${dirs[@]}" "${CPANEL_NODE_ENV:-/home/unused/activate}"; do
  [[ "$dir" =~ ^/home[0-9]*/[a-zA-Z0-9_-]+/[a-zA-Z0-9_/-]+$ && "$dir" != *'//'* && "$dir" != */ ]] || { echo 'Use absolute /home or /home2 paths without spaces or parent traversal'; exit 1; }
done
for a in "${dirs[@]}"; do for b in "${dirs[@]}"; do
  if [[ "$a" != "$b" && "$a/" == "$b/"* ]]; then echo 'Deploy destinations cannot be nested'; exit 1; fi
done; done
[[ "$CPANEL_API_DIR" != "$CPANEL_STUDENT_DIR" && "$CPANEL_API_DIR" != "$CPANEL_ADMIN_DIR" && "$CPANEL_STUDENT_DIR" != "$CPANEL_ADMIN_DIR" ]] || { echo 'Use three separate destinations'; exit 1; }
for app in admin student backend; do test -f "$release/$app/hosting/package.json"; done
ssh_args=(-p "$port" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
remote="$CPANEL_USER@$CPANEL_HOST"
# All three destinations must be explicitly marked before any write happens.
for dir in "${dirs[@]}"; do ssh "${ssh_args[@]}" "$remote" "test -f '$dir/.mdcat-deploy-target'"; done
for app in student admin; do
  API_URL="$CPANEL_API_ORIGIN" node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],"window.__MDCAT_CONFIG__ = "+JSON.stringify({apiOrigin:process.env.API_URL})+";\n")' "$release/$app/hosting/config.js"
done
rsync_transport="ssh -p $port -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15"
# No --delete: retain .env, user uploads, cPanel-managed node_modules and previous hashed assets.
rsync -az -e "$rsync_transport" --exclude=.env --exclude=node_modules --exclude=uploads "$release/backend/hosting/" "$remote:$CPANEL_API_DIR/"
ssh "${ssh_args[@]}" "$remote" "bash -s -- '$CPANEL_API_DIR' '${CPANEL_NODE_ENV:-}'" <<'REMOTE'
set -euo pipefail
cd "$1"
if [[ -n "$2" ]]; then source "$2"; fi
node -e 'if(![24].includes(+process.versions.node.split(".")[0]))process.exit(1)'
npx --yes npm@12.2.1 install --omit=dev --no-audit --no-fund
mkdir -p tmp
touch tmp/restart.txt
REMOTE
# Verify public site-content too: healthz alone does not confirm database access.
curl --fail --silent --show-error --retry 8 --retry-all-errors --retry-delay 5 --max-time 20 "$CPANEL_API_ORIGIN/api/healthz" >/dev/null
curl --fail --silent --show-error --retry 5 --retry-all-errors --retry-delay 5 --max-time 20 "$CPANEL_API_ORIGIN/api/site-content" >/dev/null
rsync -az -e "$rsync_transport" "$release/student/hosting/" "$remote:$CPANEL_STUDENT_DIR/"
rsync -az -e "$rsync_transport" "$release/admin/hosting/" "$remote:$CPANEL_ADMIN_DIR/"
echo 'cPanel upload and API checks passed. Verify a browser login and upload.'
