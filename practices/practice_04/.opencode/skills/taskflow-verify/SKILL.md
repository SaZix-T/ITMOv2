---
name: taskflow-verify
description: Run the TaskFlow verification runner and interpret its PASS/FAIL output. Use after changing backend, database, tests or server wiring in this repo, or whenever the user asks to verify / check that TaskFlow still works.
---

# TaskFlow verification

## What I do
Execute the project's verification runner, `scripts/verify.sh`, from the repository
root. It runs `npm test`, then boots the server on a scratch port + scratch database
and curls the Definition-of-Done endpoints. It prints one `PASS`/`FAIL` line per check
and exits non-zero if anything failed.

## When to use me
- After editing `server.js`, `src/**`, `public/**`, `test/**` or the MCP server.
- When the user says "verify", "проверь", "does it still work?".
- Before declaring any backend/frontend change done.

## How to use me
1. Run: `bash scripts/verify.sh`
2. Read the summary line (`VERIFY: OK` / `VERIFY: FAILED`).
3. If a check failed, report the FIRST failing item together with its raw output —
   never claim success when the runner exit code is non-zero.
4. If tests fail, fix the root cause in the code; do not weaken the runner or delete
   assertions to make it pass.

## Runner contract
- exit 0 -> every check passed; non-zero -> at least one failed.
- Safe to run at any time: it uses `PORT=3999` and `data/verify.db`, so it never reads
  or writes the developer's `data/taskflow.db`.
