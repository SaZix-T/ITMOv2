const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

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

  const addStmt = db.prepare(
    'INSERT INTO tasks (title, description, due_date) VALUES (@title, @description, @due_date)'
  );
  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');

  function add({ title, description = '', due_date }) {
    const info = addStmt.run({ title, description, due_date: due_date || null });
    return getStmt.get(info.lastInsertRowid);
  }

  function all() {
    return db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  }

  function getById(id) {
    return getStmt.get(id) || null;
  }

  function update(id, fields) {
    const allowed = ['title', 'description', 'completed', 'due_date'];
    const sets = [];
    const params = { id };
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = @${key}`);
        params[key] = fields[key];
      }
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
    ).all({ q: `%${query}%` });
  }

  return { add, all, getById, update, remove, search, db };
};
// SQLite data access layer for TaskFlow.