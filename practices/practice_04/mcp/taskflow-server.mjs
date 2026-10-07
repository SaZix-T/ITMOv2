#!/usr/bin/env node
// TaskFlow MCP server (stdio).
//
// Exposes ONE read-only tool, `task_summary`, that reports the state of the
// TaskFlow SQLite database. Read-only on purpose: the agent inspects app data,
// it cannot corrupt it.
//
// Protocol rules this file must respect (stdio transport):
//   - stdout is the JSON-RPC channel -> never console.log here.
//   - diagnostics go to stderr only -> console.error.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = process.env.TASKFLOW_DB_PATH
  ? path.resolve(process.env.TASKFLOW_DB_PATH)
  : path.join(ROOT, 'data', 'taskflow.db');

const STATUSES = ['all', 'active', 'completed', 'overdue'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Opens the DB read-only. Throws a coded error if the file is absent.
function readTasks() {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare('SELECT id, title, completed, due_date, created_at FROM tasks ORDER BY created_at DESC')
      .all();
  } finally {
    db.close();
  }
}

function buildReport(status) {
  let tasks;
  try {
    tasks = readTasks();
  } catch (err) {
    // Error path #1: the database file was never created.
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text:
            `Cannot read the TaskFlow database at ${DB_PATH} (${err.code || err.message}). ` +
            'Start the app once with `npm start` so the file is created, or set TASKFLOW_DB_PATH.',
        },
      ],
    };
  }

  const today = todayISO();
  const overdue = (t) => !t.completed && !!t.due_date && t.due_date < today;

  const counts = {
    total: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => !!t.completed).length,
    overdue: tasks.filter(overdue).length,
  };

  const selected = tasks
    .filter((t) => {
      if (status === 'active') return !t.completed;
      if (status === 'completed') return !!t.completed;
      if (status === 'overdue') return overdue(t);
      return true;
    })
    .slice(0, 20);

  const lines = [
    `TaskFlow database: ${DB_PATH}`,
    `total ${counts.total} | active ${counts.active} | completed ${counts.completed} | overdue ${counts.overdue}`,
    `filter="${status}" -> ${selected.length} shown (max 20):`,
    ...selected.map(
      (t) =>
        `  - #${t.id} [${t.completed ? 'x' : ' '}] ${t.title}` +
        (t.due_date ? ` (due ${t.due_date})` : ''),
    ),
  ];
  if (selected.length === 0) lines.push('  (no matching tasks)');

  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

const server = new McpServer({ name: 'taskflow', version: '1.0.0' });

server.registerTool(
  'task_summary',
  {
    title: 'TaskFlow task summary',
    description:
      'Read the TaskFlow SQLite database and report task counts (total/active/completed/overdue) ' +
      'plus the matching tasks. Optional filter status: "all" | "active" | "completed" | "overdue". ' +
      'Use it to inspect the running app\'s data without opening SQLite by hand.',
    inputSchema: {
      status: z
        .string()
        .optional()
        .describe('Filter: all | active | completed | overdue (default: all)'),
    },
  },
  async ({ status }) => {
    const normalized = (status ?? 'all').trim().toLowerCase();

    // Error path #2: caller passed an unknown filter value.
    if (!STATUSES.includes(normalized)) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Invalid status "${status}". Allowed values: ${STATUSES.join(', ')}.`,
          },
        ],
      };
    }

    return buildReport(normalized);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr only — stdout is reserved for JSON-RPC frames.
console.error(`[taskflow-mcp] ready (db: ${fs.existsSync(DB_PATH) ? DB_PATH : DB_PATH + ' — not created yet'})`);
