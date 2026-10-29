#!/usr/bin/env bash
# Deploys the API (deploy/api-cpanel) to a cPanel Node.js application over SSH/rsync,
# restarts it and verifies /api/healthz and /api/site-content.
# Usage: bash deploy-cpanel.sh <release-dir>   (release-dir contains api-cpanel/)
set -euo pipefail
release="${1:-deploy}"
: "${CPANEL_HOST:?Set CPANEL_HOST}"
: "${CPANEL_USER:?Set CPANEL_USER}"
: "${CPANEL_API_DIR:?Set CPANEL_API_DIR}"
: "${CPANEL_API_ORIGIN:?Set CPANEL_API_ORIGIN}"
port="${CPANEL_SSH_PORT:-22}"
[[ "$CPANEL_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ && "$CPANEL_USER" =~ ^[a-zA-Z0-9_]+$ && "$port" =~ ^[0-9]+$ ]] || { echo 'Invalid SSH configuration'; exit 1; }
[[ "$CPANEL_API_ORIGIN" =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]+)?$ ]] || { echo 'API origin must be HTTPS with no path or trailing slash'; exit 1; }
for dir in "$CPANEL_API_DIR" "${CPANEL_NODE_ENV:-/home/unused/activate}"; do
  [[ "$dir" =~ ^/home[0-9]*/[a-zA-Z0-9_-]+/[a-zA-Z0-9_/-]+$ && "$dir" != *'//'* && "$dir" != */ ]] || { echo 'Use absolute /home or /home2 paths without spaces, dots or trailing slash'; exit 1; }
done
case "$CPANEL_API_DIR" in */public_html|*/public_html/*) echo 'The API directory must be OUTSIDE public_html'; exit 1;; esac
test -f "$release/api-cpanel/package.json"
ssh_args=(-p "$port" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
remote="$CPANEL_USER@$CPANEL_HOST"
# The destination must be explicitly marked before anything is written.
ssh "${ssh_args[@]}" "$remote" "test -f '$CPANEL_API_DIR/.mdcat-deploy-target'"
rsync_transport="ssh -p $port -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15"
# No --delete: keeps .env, uploads, cPanel-managed node_modules and logs.
rsync -az -e "$rsync_transport" --exclude=.env --exclude=node_modules --exclude=uploads --exclude=tmp --exclude=.htaccess "$release/api-cpanel/" "$remote:$CPANEL_API_DIR/"
ssh "${ssh_args[@]}" "$remote" "bash -s -- '$CPANEL_API_DIR' '${CPANEL_NODE_ENV:-}'" <<'REMOTE'
set -euo pipefail
cd "$1"
if [[ -n "$2" ]]; then source "$2"; fi
node -e 'if(+process.versions.node.split(".")[0]!==22)process.exit(1)' || { echo 'Node 22 is not active. Set CPANEL_NODE_ENV to the activate script shown in cPanel.'; exit 1; }
npx --yes npm@10.9.7 install --omit=dev --no-audit --no-fund
mkdir -p tmp
touch tmp/restart.txt
REMOTE
# healthz alone does not prove database access, so check site-content too.
curl --fail --silent --show-error --retry 8 --retry-all-errors --retry-delay 5 --max-time 20 "$CPANEL_API_ORIGIN/api/healthz" >/dev/null
curl --fail --silent --show-error --retry 5 --retry-all-errors --retry-delay 5 --max-time 20 "$CPANEL_API_ORIGIN/api/site-content" >/dev/null
echo 'cPanel API deployed and healthy.'
