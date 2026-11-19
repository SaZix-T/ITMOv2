# TaskFlow — AI Agent Instructions

TaskFlow is a personal task manager: Express REST API + SQLite + vanilla JS SPA frontend.

## Setup & Build Commands
- Install: `npm install`
- Start (prod): `npm start` → http://localhost:3000
- Dev (auto-restart): `npm run dev`
- Run tests: `npm test` (node:test + node:assert)
- Full verify before commit: `npm test`

## Project Structure
- `server.js` — Express entry point, exports server instance
- `src/db.js` — SQLite factory (takes dbPath, returns {add, all, getById, update, remove, search})
- `src/routes/tasks.js` — CRUD router for /api/tasks (takes db, returns Router)
- `src/middleware/error.js` — 4-param Express error handler
- `public/` — Static SPA (`index.html`, `styles/app.css`, `js/api.js`, `js/app.js`), DaisyUI 5 via CDN, no build step
- `test/` — `db.test.js` (unit, temp-file DB), `api.test.js` (integration, starts server on PORT env), `client/` (Playwright UI tests with mocked API)

## Architecture Rules
- Routes handle HTTP only — call db functions, never write raw SQL in routes
- All SQL lives in `src/db.js` via prepared statements (`?` placeholders only — no string interpolation)
- Frontend talks to backend via `fetch('/api/tasks/...')` only — no direct DOM-db coupling
- `server.js` imports db factory, creates db instance, passes it to routes

## When Writing Backend Code
- Wrap every async route handler: `const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);`
- Return JSON errors as `{ error: "message" }` with proper HTTP status (400/404/500)
- Validate: title required (non-empty after trim) for POST; cast `req.params.id` with Number()
- All DB queries use prepared statements — never `db.exec(\`SELECT * FROM tasks WHERE title = '${x}'\`)`

## When Writing Frontend Code
- No framework, no build step — ES modules + DaisyUI component classes loaded from CDN
- All API calls through `api(path, opts)` in `public/js/api.js`; it checks `res.ok` and throws on error
- DOM rendering: full rebuild pattern (re-render entire list from `tasks[]` array) — never patch incrementally
- UI states: loading (skeletons), empty, error with retry, plus search-empty and filter-empty
- Dialogs use native `<dialog>` (`showModal`/`close`), Esc closes, focus returns to the trigger
- XSS prevention: `esc(s)` via DOM textContent before innerHTML; `escAttr()` for attributes
- Keep `data-testid` attributes on interactive elements used by Playwright tests

## When Writing Tests
- Server: `node:test` + `node:assert` (built-in, no Jest)
- Client: `@playwright/test` in `test/client/`, API mocked with `page.route` in the real response format
- Naming: `test/db.test.js` for db layer, `test/api.test.js` for HTTP layer, `test/client/*.spec.js` for UI
- `npm test` runs both suites; a server test DB lives at `data/e2e.db` and is removed by global setup

## Agent Environment (OpenCode)
- Rules live in this `AGENTS.md`; OpenCode loads it automatically for the project.
- Skills live in `.opencode/skills/<name>/SKILL.md`. The `taskflow-verify` skill runs
  the verification runner — load it (skill tool) when asked to verify/check the app.
- Verification runner: `bash scripts/verify.sh` (runs `npm test` + live server smoke test).
- MCP: `opencode.json` starts the local `taskflow` server (`mcp/taskflow-server.mjs`),
  which exposes the read-only `task_summary` tool. Use it to inspect the app's tasks.
- Hook: `.opencode/plugins/taskflow-check.js` runs `npm test` after edits to `src/`,
  `public/`, `test/`, `mcp/`, `scripts/` or `server.js` and appends the result — treat
  a `FAIL` line in the tool output as unfinished work.

## Definition of Done
A task is complete only when ALL pass:
1. `npm test` exits 0 with zero failures
2. `node server.js` starts and responds on :3000
3. `curl http://localhost:3000/` returns HTML
4. `curl http://localhost:3000/api/tasks` returns valid JSON array

## Boundaries
- ✅ Always: Use prepared SQL statements, wrap async routes, test before commit
- ⚠️ Ask first: Adding npm dependencies, changing DB schema, modifying server.js structure
- 🚫 Never: Commit node_modules/ or .env, skip test failures to declare done, use string interpolation in SQL, add TypeScript/build-step/framework

## Escalation Rules
- If `npm test` fails after 3 fix attempts: stop, show full test output, ask for direction
- If `npm install` fails: check Node.js version (need >=18), check build tools (better-sqlite3 needs native compilation)
- If port 3000 is in use: use `PORT=3001 npm start`
- Never: delete package-lock.json to resolve errors, force push, or skip verification steps