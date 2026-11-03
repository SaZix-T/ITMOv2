const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = function createDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      due_date TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT DEFAULT NULL');
  } catch {}

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 1');
  } catch {}

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN completed_at TEXT DEFAULT NULL');
  } catch {}

  db.prepare(
    'UPDATE tasks SET completed_at = updated_at WHERE completed = 1 AND completed_at IS NULL'
  ).run();

  const PRIORITIES = [1, 2, 3, 4];

  function normalizePriority(value) {
    const n = Number(value);
    return PRIORITIES.includes(n) ? n : 1;
  }

  function mapTask(row) {
    if (!row) return row;
    return { ...row, priority: normalizePriority(row.priority) };
  }

  const addStmt = db.prepare(
    'INSERT INTO tasks (title, description, due_date, priority) VALUES (@title, @description, @due_date, @priority)'
  );
  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');

  function add({ title, description = '', due_date, priority }) {
    const info = addStmt.run({
      title,
      description,
      due_date: due_date || null,
      priority: normalizePriority(priority),
    });
    return mapTask(getStmt.get(info.lastInsertRowid));
  }

  function all() {
    return db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all().map(mapTask);
  }

  function getById(id) {
    return mapTask(getStmt.get(id) || null);
  }

  function update(id, fields) {
    const allowed = ['title', 'description', 'due_date', 'priority'];
    const sets = [];
    const params = { id };
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = @${key}`);
        params[key] = key === 'priority' ? normalizePriority(fields[key]) : fields[key];
      }
    }
    if (fields.completed !== undefined) {
      const done = fields.completed ? 1 : 0;
      const current = getStmt.get(id);
      sets.push('completed = @completed');
      if (current && current.completed !== done) {
        sets.push(done ? "completed_at = datetime('now')" : 'completed_at = NULL');
      }
      params.completed = done;
    }
    if (sets.length === 0) return getById(id);
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`).run(params);
    return getById(id);
  }

  function remove(id) {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return info.changes > 0;
  }

  function search(query) {
    return db.prepare(
      'SELECT * FROM tasks WHERE title LIKE @q OR description LIKE @q ORDER BY created_at DESC'
    ).all({ q: `%${query}%` }).map(mapTask);
  }

  function statsCompleted(days = 30) {
    const since = `-${days - 1} days`;
    const rows = db.prepare(
      `SELECT date(completed_at, 'localtime') AS day, COUNT(*) AS count
       FROM tasks
       WHERE completed = 1
         AND completed_at IS NOT NULL
         AND date(completed_at, 'localtime') >= date('now', 'localtime', @since)
       GROUP BY day`
    ).all({ since });

    const counts = new Map(rows.map((row) => [row.day, row.count]));
    const daily = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    for (let offset = days - 1; offset >= 0; offset--) {
      const day = new Date(cursor);
      day.setDate(day.getDate() - offset);
      const key = localDateKey(day);
      daily.push({ date: key, count: counts.get(key) || 0 });
    }

    const sum = (series) => series.reduce((total, item) => total + item.count, 0);

    return {
      today: daily[daily.length - 1].count,
      yesterday: daily.length > 1 ? daily[daily.length - 2].count : 0,
      last7Days: sum(daily.slice(-7)),
      last30Days: sum(daily),
      daily,
    };
  }

  return { add, all, getById, update, remove, search, statsCompleted, db };
};
// SQLite data access layer for TaskFlow.