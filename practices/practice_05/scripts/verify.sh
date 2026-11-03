#!/usr/bin/env bash
# TaskFlow verification runner — the Definition of Done from AGENTS.md, executed.
#
# Prints one PASS/FAIL line per check. Exit 0 = all passed, non-zero = something failed.
# It never touches the developer's data/taskflow.db: it uses scratch PORT/DB_PATH.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

LOGDIR="data"
mkdir -p "$LOGDIR"
PORT=3999
DB_PATH="$(pwd)/data/verify.db"
fail=0
pass() { printf 'PASS  %s\n' "$1"; }
bad()  { printf 'FAIL  %s\n' "$1"; fail=1; }

# --- 1) unit + integration tests (the project's canonical check) --------------
if npm test >"$LOGDIR/verify-test.log" 2>&1; then
  pass "npm test"
else
  bad "npm test"
  tail -40 "$LOGDIR/verify-test.log" | sed 's/^/      /'
fi

# --- 2) boot the server on a scratch port + scratch DB ------------------------
PORT="$PORT" DB_PATH="$DB_PATH" node server.js >"$LOGDIR/verify-server.log" 2>&1 &
srv=$!
cleanup() {
  kill "$srv" 2>/dev/null
  wait "$srv" 2>/dev/null
  rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
}
trap cleanup EXIT

# Readiness wait (poll, no blind sleep).
ready=0
for _ in $(seq 1 50); do
  if curl -sf "http://localhost:$PORT/api/tasks" >/dev/null 2>&1; then ready=1; break; fi
  sleep 0.1
done
if [ "$ready" -ne 1 ]; then
  bad "server did not become ready on :$PORT"
  tail -20 "$LOGDIR/verify-server.log" | sed 's/^/      /'
fi

# --- 3) DoD endpoints ---------------------------------------------------------
if curl -sf "http://localhost:$PORT/api/tasks" | grep -q '^\['; then
  pass "GET /api/tasks returns a JSON array"
else
  bad "GET /api/tasks"
fi

if curl -sf "http://localhost:$PORT/" | grep -qi '<html'; then
  pass "GET / returns HTML"
else
  bad "GET /"
fi

if [ "$fail" -eq 0 ]; then echo "VERIFY: OK"; else echo "VERIFY: FAILED"; fi
exit "$fail"
