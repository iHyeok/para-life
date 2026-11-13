#!/bin/bash
# On-demand project chat sessions: one Claude Code session per project, each with its
# own channel server (port, tunnel path, chat history) in its own tmux window.
#
#   scripts/session.sh start paper   # start, or resume the same conversation
#   scripts/session.sh stop paper
#   scripts/session.sh status [paper]
#
# Session definitions live in sessions/<id>/{session.env,brief.md}.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMUX_SESSION="dev"
TMUX_BIN="$(command -v tmux || echo /opt/homebrew/bin/tmux)"

die() { echo "error: $*" >&2; exit 1; }

load() {
  ID="$1"
  [[ "$ID" =~ ^[a-z0-9-]+$ ]] || die "bad session id: $ID"
  DIR="$ROOT/sessions/$ID"
  [[ -f "$DIR/session.env" && -f "$DIR/brief.md" ]] || die "no session definition in sessions/$ID/"
  # shellcheck disable=SC1091
  source "$DIR/session.env"
  STATE="$HOME/.claude/channels/$ID"
  SERVER="para-$ID-channel"
  # Optional: run inside the project's own repo instead of para-life (see sessions/museum)
  CWD="${SESSION_CWD:-$ROOT}"
}

window_exists() { "$TMUX_BIN" list-windows -t "$TMUX_SESSION" -F '#{window_name}' 2>/dev/null | grep -qx "$ID"; }
port_up() { lsof -nP -iTCP:"$SESSION_PORT" -sTCP:LISTEN >/dev/null 2>&1; }

start() {
  load "$1"
  if window_exists; then echo "$ID: already running (tmux $TMUX_SESSION:$ID)"; return 0; fi
  if port_up; then die "port $SESSION_PORT is already in use"; fi
  mkdir -p "$STATE"

  # Fixed conversation id so every start resumes the same project context
  local resume=()
  if [[ -s "$STATE/session-id" ]]; then
    resume=(--resume "$(cat "$STATE/session-id")")
  else
    local sid; sid="$(uuidgen | tr 'A-Z' 'a-z')"
    echo "$sid" > "$STATE/session-id"
    resume=(--session-id "$sid")
  fi

  cat > "$STATE/mcp.json" <<JSON
{
  "mcpServers": {
    "$SERVER": {
      "command": "bun",
      "args": ["run", "--cwd", "$ROOT/channel", "--shell=bun", "--silent", "start"],
      "env": {
        "PARA_CHANNEL_ID": "$ID",
        "PARA_CHANNEL_NAME": "$SESSION_NAME",
        "PARA_CHANNEL_PORT": "$SESSION_PORT",
        "PARA_CHANNEL_BASE": "$SESSION_BASE",
        "SKIP_AUTH": "1"
      }
    }
  }
}
JSON

  # A session outside para-life doesn't load para-life's .claude/settings.json, so give it
  # the chat activity hooks and access to para-life explicitly.
  local outside=()
  if [[ "$CWD" != "$ROOT" ]]; then
    [[ -d "$CWD/.git" ]] || die "$ID: $CWD is not a git checkout (clone ${SESSION_REPO:-the project repo} there first)"
    python3 - "$ROOT/channel/hooks/activity.ts" > "$STATE/settings.json" <<'PY'
import json, sys
cmd = '"$HOME/.bun/bin/bun" "%s"' % sys.argv[1]
hook = {"hooks": [{"type": "command", "command": cmd, "timeout": 3}]}
tool = {"matcher": "*", **hook}
print(json.dumps({"hooks": {"UserPromptSubmit": [hook], "PreToolUse": [tool], "PostToolUse": [tool], "Stop": [hook]}}, indent=2))
PY
    outside=(--add-dir "$ROOT" --settings "$STATE/settings.json")
  fi

  "$TMUX_BIN" has-session -t "$TMUX_SESSION" 2>/dev/null || "$TMUX_BIN" new-session -d -s "$TMUX_SESSION" -c "$ROOT"
  "$TMUX_BIN" new-window -d -t "$TMUX_SESSION:" -n "$ID" -c "$CWD" \
    env PATH="$HOME/.local/bin:$HOME/.bun/bin:/opt/homebrew/bin:$PATH" \
    claude "${resume[@]}" -n "PARA · $SESSION_NAME" \
      ${outside[@]+"${outside[@]}"} \
      --strict-mcp-config --mcp-config "$STATE/mcp.json" \
      --dangerously-load-development-channels "server:$SERVER" \
      --append-system-prompt "$(cat "$DIR/brief.md")"

  local confirmed=""
  for _ in $(seq 1 60); do
    # The dev-channel warning waits for Enter on option 1 ("I am using this for local development")
    if [[ -z "$confirmed" ]] && "$TMUX_BIN" capture-pane -p -t "$TMUX_SESSION:$ID" 2>/dev/null | grep -q "I am using this for local development"; then
      "$TMUX_BIN" send-keys -t "$TMUX_SESSION:$ID" Enter
      confirmed=1
    fi
    if port_up; then echo "$ID: up on :$SESSION_PORT (tmux $TMUX_SESSION:$ID, https://api.kyxi.net$SESSION_BASE)"; return 0; fi
    window_exists || die "$ID: claude exited during startup"
    sleep 1
  done
  echo "$ID: started but channel port $SESSION_PORT not up yet — check: tmux attach -t $TMUX_SESSION:$ID" >&2
  return 2
}

stop() {
  load "$1"
  if ! window_exists; then echo "$ID: not running"; return 0; fi
  "$TMUX_BIN" kill-window -t "$TMUX_SESSION:$ID"
  for _ in $(seq 1 10); do port_up || break; sleep 1; done
  echo "$ID: stopped (conversation kept; start resumes it)"
}

status_one() {
  load "$1"
  local w="stopped" p="down"
  window_exists && w="running"
  port_up && p="up"
  echo "$ID: $w, channel :$SESSION_PORT $p"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  start) [[ $# -eq 1 ]] || die "usage: $0 start <id>"; start "$1" ;;
  stop) [[ $# -eq 1 ]] || die "usage: $0 stop <id>"; stop "$1" ;;
  status)
    if [[ $# -eq 1 ]]; then status_one "$1"
    else for d in "$ROOT"/sessions/*/; do status_one "$(basename "$d")"; done; fi ;;
  *) die "usage: $0 start|stop|status [id]" ;;
esac
