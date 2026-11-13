#!/bin/bash
# Keep a project session's repo current and its progress site deployed.
# Run every 30 minutes by launchd (scripts/launchd/com.para-life.project-sync.plist), or by hand:
#
#   scripts/project-sync.sh museum              # NO_DEPLOY=1 to only pull
#
# 1. Fetch the project repo (sessions/<id>/session.env SESSION_CWD). Fast-forward only when the
#    work tree has no uncommitted changes and is on the default branch, so it never touches work
#    in progress (a Claude session or the user may be editing there).
# 2. If the repo HEAD, the PARA project file or the site source changed since the last deploy,
#    rebuild and deploy SESSION_SITE.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

ID="${1:-}"
[[ "$ID" =~ ^[a-z0-9-]+$ ]] || { echo "usage: $0 <session-id>" >&2; exit 64; }
# shellcheck disable=SC1090
source "$ROOT/sessions/$ID/session.env"
STATE="$HOME/.claude/channels/$ID"
mkdir -p "$STATE"
LOG="$STATE/sync.log"
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

REPO="${SESSION_CWD:?SESSION_CWD not set for $ID}"
[[ -d "$REPO/.git" ]] || { log "no checkout at $REPO"; exit 1; }

# 1. pull
before="$(git -C "$REPO" rev-parse HEAD)"
if git -C "$REPO" fetch --quiet origin 2>>"$LOG"; then
  branch="$(git -C "$REPO" symbolic-ref --quiet --short HEAD || true)"
  default="$(git -C "$REPO" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')"
  default="${default:-main}"
  if [[ "$branch" != "$default" ]]; then
    log "skip pull: on '$branch', not $default"
  elif [[ -n "$(git -C "$REPO" status --porcelain --untracked-files=no)" ]]; then
    log "skip pull: uncommitted changes"
  elif ! git -C "$REPO" merge --ff-only --quiet "origin/$default" 2>>"$LOG"; then
    log "skip pull: not a fast-forward (local commits not pushed?)"
  fi
else
  log "fetch failed"
fi
after="$(git -C "$REPO" rev-parse HEAD)"
[[ "$before" != "$after" ]] && log "pulled ${before:0:7}..${after:0:7}: $(git -C "$REPO" log --oneline "$before..$after" | wc -l | tr -d ' ') commit(s)"

# 2a. the project's own web app (optional): rebuild and deploy when the repo HEAD changed.
# Built inside the repo (dist/ is gitignored) so wrangler picks up the repo's functions/ folder.
if [[ -n "${SESSION_APP_PROJECT:-}" && "${NO_DEPLOY:-}" != "1" && -f "$REPO/web/build.sh" && -n "${SESSION_SITE:-}" ]] \
   && [[ "$(cat "$STATE/app-stamp" 2>/dev/null)" != "$after" || "${FORCE:-}" == "1" ]]; then
  [[ -d "$ROOT/$SESSION_SITE/node_modules" ]] || (cd "$ROOT/$SESSION_SITE" && npm install --silent >>"$LOG" 2>&1)
  if (cd "$REPO" && bash web/build.sh >>"$LOG" 2>&1 \
      && npx --prefix "$ROOT/$SESSION_SITE" wrangler pages deploy dist --project-name "$SESSION_APP_PROJECT" \
           --branch main --commit-hash "$after" --commit-dirty=true >>"$LOG" 2>&1); then
    echo "$after" > "$STATE/app-stamp"
    log "deployed app $SESSION_APP_PROJECT (repo ${after:0:7})"
  else
    log "app deploy failed (see above)"
  fi
fi

# 2b. progress site: deploy when inputs changed
[[ -n "${SESSION_SITE:-}" && "${NO_DEPLOY:-}" != "1" ]] || exit 0
SITE="$ROOT/$SESSION_SITE"
stamp="$( {
  echo "$after"
  cat "$ROOT/projects/$SESSION_PROJECT.md"
  # Site sources only (not node_modules, dist or the .wrangler cache a deploy rewrites)
  find "$SITE" \( -name node_modules -o -name dist -o -name .wrangler \) -prune -o -type f -print0 | LC_ALL=C sort -z | xargs -0 cat
} | shasum | cut -c1-40)"
if [[ "$(cat "$STATE/site-stamp" 2>/dev/null)" == "$stamp" && "${FORCE:-}" != "1" ]]; then
  exit 0
fi
[[ -d "$SITE/node_modules" ]] || (cd "$SITE" && npm install --silent >>"$LOG" 2>&1)
if (cd "$SITE" && npm run --silent deploy >>"$LOG" 2>&1); then
  echo "$stamp" > "$STATE/site-stamp"
  log "deployed $SESSION_SITE (repo ${after:0:7})"
else
  log "deploy failed (see above)"
  exit 1
fi
