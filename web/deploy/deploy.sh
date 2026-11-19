#!/usr/bin/env bash
# One-command update for the Jain OOA Portal.
#
#   sudo bash /var/www/jain-sarathi-new/web/deploy/deploy.sh
#
# 1. Fetches the branch and fast-forwards (stops if the server copy has local edits).
# 2. Installs packages only when package-lock.json changed.
# 3. Builds into .next-new while the live site keeps running from .next.
# 4. Swaps the new build in, restarts the service and checks the site answers.
# If any step fails, the previous code and build are put back and the service
# is restarted on them. Settings can be overridden with environment variables.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/jain-sarathi-new}"
WEB_DIR="$APP_DIR/web"
BRANCH="${BRANCH:-claude/wonderful-goldberg-raqtrg}"
SERVICE="${SERVICE:-jain-sarathi-web}"
PORT="${PORT:-8091}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:$PORT/login}"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nDEPLOY FAILED: %s\n' "$*" >&2; exit 1; }

cd "$APP_DIR" || die "no app folder at $APP_DIR"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "the server copy has local changes; see 'git status' in $APP_DIR"

OLD_COMMIT="$(git rev-parse HEAD)"
say "Fetching $BRANCH (now at ${OLD_COMMIT:0:7})"
git fetch --quiet origin "$BRANCH"
NEW_COMMIT="$(git rev-parse FETCH_HEAD)"
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ] && [ "${FORCE:-0}" != "1" ]; then
  say "Already up to date (${OLD_COMMIT:0:7}). Nothing to do. Use FORCE=1 to rebuild anyway."
  exit 0
fi
git merge --ff-only --quiet FETCH_HEAD || die "cannot fast-forward to ${NEW_COMMIT:0:7}"

LOCK_CHANGED=0
git diff --quiet "$OLD_COMMIT" "$NEW_COMMIT" -- web/package-lock.json || LOCK_CHANGED=1

rollback_code() {
  say "Putting the code back to ${OLD_COMMIT:0:7}"
  git -C "$APP_DIR" reset --quiet --hard "$OLD_COMMIT"
  if [ "$LOCK_CHANGED" = "1" ]; then (cd "$WEB_DIR" && npm ci --no-audit --no-fund --loglevel=error) || true; fi
}

cd "$WEB_DIR"
if [ "$LOCK_CHANGED" = "1" ]; then
  say "Installing packages (package-lock.json changed)"
  if ! npm ci --no-audit --no-fund --loglevel=error; then rollback_code; die "npm ci failed; the site was not touched"; fi
fi

# Building into .next-new makes Next.js add that folder to tsconfig.json (and
# may touch next-env.d.ts); put tracked files back so the copy stays clean.
restore_tracked() {
  local f
  for f in web/tsconfig.json web/next-env.d.ts; do
    if git -C "$APP_DIR" ls-files --error-unmatch "$f" >/dev/null 2>&1; then git -C "$APP_DIR" checkout --quiet -- "$f"; fi
  done
}

say "Building ${NEW_COMMIT:0:7} into .next-new (the site stays up)"
rm -rf .next-new
build_ok=1
NEXT_DIST_DIR=.next-new npx next build || build_ok=0
restore_tracked
if [ "$build_ok" != "1" ]; then
  rm -rf .next-new
  rollback_code
  die "the build failed; the site keeps running the previous version"
fi

say "Switching to the new build and restarting $SERVICE"
rm -rf .next-prev
[ -d .next ] && mv .next .next-prev
mv .next-new .next
systemctl restart "$SERVICE"

healthy=0
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [ "$code" = "200" ]; then healthy=1; break; fi
  sleep 2
done

if [ "$healthy" != "1" ]; then
  say "The site did not answer after the restart; switching back"
  rm -rf .next
  [ -d .next-prev ] && mv .next-prev .next
  rollback_code
  systemctl restart "$SERVICE"
  die "the new version did not start; the previous version is running again (see: journalctl -u $SERVICE -n 50)"
fi

say "Done: ${OLD_COMMIT:0:7} -> ${NEW_COMMIT:0:7}, site answering on $HEALTH_URL"
