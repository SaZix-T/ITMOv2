const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'test.db');

before(() => { try { fs.unlinkSync(DB_PATH); } catch {} });
after(() => { try { fs.unlinkSync(DB_PATH); } catch {} });

describe('db', () => {
  let db;
  before(() => {
    db = require('../src/db')(DB_PATH);
  });

  it('creates tasks table', () => {
    const row = db.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").get();
    assert.ok(row, 'tasks table should exist');
  });

  it('add returns new task with id', () => {
    const task = db.add({ title: 'Test task', description: 'desc' });
    assert.ok(task.id > 0);
    assert.strictEqual(task.title, 'Test task');
    assert.strictEqual(task.completed, 0);
  });

  it('all returns tasks', () => {
    const tasks = db.all();
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.length >= 1);
  });

  it('getById returns correct task', () => {
    const created = db.add({ title: 'Find me' });
    const found = db.getById(created.id);
    assert.strictEqual(found.title, 'Find me');
  });

  it('update modifies fields', () => {
    const created = db.add({ title: 'Old title' });
    const updated = db.update(created.id, { title: 'New title', completed: 1 });
    assert.strictEqual(updated.title, 'New title');
    assert.strictEqual(updated.completed, 1);
  });

  it('remove deletes task', () => {
    const created = db.add({ title: 'Delete me' });
    const result = db.remove(created.id);
    assert.strictEqual(result, true);
    assert.strictEqual(db.getById(created.id), null);
  });

  it('search finds by title', () => {
    db.add({ title: 'Buy groceries' });
    db.add({ title: 'Buy milk' });
    db.add({ title: 'Walk dog' });
    const results = db.search('buy');
    assert.strictEqual(results.length, 2);
  });

  it('add supports due_date', () => {
    const task = db.add({ title: 'Deadline task', due_date: '2026-12-31' });
    assert.strictEqual(task.due_date, '2026-12-31');
  });

  it('add defaults due_date to null', () => {
    const task = db.add({ title: 'No date' });
    assert.strictEqual(task.due_date, null);
  });

  it('update can set due_date', () => {
    const created = db.add({ title: 'Set date later' });
    const updated = db.update(created.id, { due_date: '2026-06-15' });
    assert.strictEqual(updated.due_date, '2026-06-15');
  });

  it('update can clear due_date', () => {
    const created = db.add({ title: 'Clear date', due_date: '2026-01-01' });
    const updated = db.update(created.id, { due_date: null });
    assert.strictEqual(updated.due_date, null);
  });

  it('add defaults priority to 1', () => {
    const task = db.add({ title: 'Default priority' });
    assert.strictEqual(task.priority, 1);
  });

  it('add stores explicit priority', () => {
    const task = db.add({ title: 'Priority task', priority: 3 });
    assert.strictEqual(task.priority, 3);
  });

  it('add accepts both boundary priorities', () => {
    assert.strictEqual(db.add({ title: 'Lowest', priority: 1 }).priority, 1);
    assert.strictEqual(db.add({ title: 'Highest', priority: 4 }).priority, 4);
  });

  it('add normalizes out-of-range priority to 1', () => {
    assert.strictEqual(db.add({ title: 'Bad priority', priority: 9 }).priority, 1);
    assert.strictEqual(db.add({ title: 'Bad type', priority: 'high' }).priority, 1);
  });

  it('update changes priority and keeps other fields', () => {
    const created = db.add({ title: 'Set priority later', description: 'keep me' });
    const updated = db.update(created.id, { priority: 4 });
    assert.strictEqual(updated.priority, 4);
    assert.strictEqual(updated.title, 'Set priority later');
    assert.strictEqual(updated.description, 'keep me');
  });

  it('completed toggle does not change priority', () => {
    const created = db.add({ title: 'Toggle me', priority: 2 });
    const done = db.update(created.id, { completed: 1 });
    assert.strictEqual(done.completed, 1);
    assert.strictEqual(done.priority, 2);
    const undone = db.update(created.id, { completed: 0 });
    assert.strictEqual(undone.priority, 2);
  });

  it('reads legacy row without priority as 1', () => {
    const info = db.db.prepare('INSERT INTO tasks (title) VALUES (?)').run('Legacy row');
    assert.strictEqual(db.getById(info.lastInsertRowid).priority, 1);
    assert.strictEqual(db.search('Legacy')[0].priority, 1);
  });

  it('reads invalid stored priority as 1', () => {
    const created = db.add({ title: 'Corrupted priority', priority: 2 });
    db.db.prepare('UPDATE tasks SET priority = 99 WHERE id = ?').run(created.id);
    assert.strictEqual(db.getById(created.id).priority, 1);
    assert.strictEqual(db.all().find((t) => t.id === created.id).priority, 1);
  });

  it('completing a task records completed_at', () => {
    const created = db.add({ title: 'Completion stamp' });
    assert.strictEqual(created.completed_at, null);
    const done = db.update(created.id, { completed: 1 });
    assert.strictEqual(done.completed, 1);
    assert.ok(done.completed_at, 'completed_at should be set');
  });

  it('uncompleting a task clears completed_at', () => {
    const created = db.add({ title: 'Undo completion' });
    db.update(created.id, { completed: 1 });
    const undone = db.update(created.id, { completed: 0 });
    assert.strictEqual(undone.completed, 0);
    assert.strictEqual(undone.completed_at, null);
  });

  it('editing other fields keeps completed_at', () => {
    const created = db.add({ title: 'Keep stamp' });
    const done = db.update(created.id, { completed: 1 });
    const edited = db.update(created.id, { title: 'Renamed', priority: 3 });
    assert.strictEqual(edited.completed_at, done.completed_at);
  });

  it('statsCompleted returns 30 continuous days', () => {
    const stats = db.statsCompleted();
    assert.strictEqual(stats.daily.length, 30);
    for (let i = 1; i < stats.daily.length; i++) {
      const prev = new Date(stats.daily[i - 1].date + 'T12:00:00');
      const next = new Date(stats.daily[i].date + 'T12:00:00');
      assert.strictEqual(next.getTime() - prev.getTime(), 86400000);
    }
    assert.strictEqual(stats.last30Days, stats.daily.reduce((sum, d) => sum + d.count, 0));
    assert.strictEqual(stats.last7Days, stats.daily.slice(-7).reduce((sum, d) => sum + d.count, 0));
    assert.strictEqual(stats.today, stats.daily[29].count);
    assert.strictEqual(stats.yesterday, stats.daily[28].count);
  });

  it('counts a task completed today', () => {
    const before = db.statsCompleted();
    const task = db.add({ title: 'Done today' });
    db.update(task.id, { completed: 1 });
    const after = db.statsCompleted();
    assert.strictEqual(after.today, before.today + 1);
    assert.strictEqual(after.last7Days, before.last7Days + 1);
    assert.strictEqual(after.last30Days, before.last30Days + 1);
  });

  it('removes an uncompleted task from stats', () => {
    const task = db.add({ title: 'Toggle stats' });
    db.update(task.id, { completed: 1 });
    const before = db.statsCompleted();
    db.update(task.id, { completed: 0 });
    const after = db.statsCompleted();
    assert.strictEqual(after.today, before.today - 1);
    assert.strictEqual(after.last30Days, before.last30Days - 1);
  });

  it('places completions into yesterday, 7-day and 30-day windows', () => {
    const makeDone = (title, daysAgo) => {
      const task = db.add({ title });
      db.update(task.id, { completed: 1 });
      db.db.prepare("UPDATE tasks SET completed_at = datetime('now', ?) WHERE id = ?")
        .run(`-${daysAgo} days`, task.id);
      return task;
    };
    const base = db.statsCompleted();
    makeDone('Yesterday done', 1);
    makeDone('Three days ago done', 3);
    makeDone('Ten days ago done', 10);
    makeDone('Forty days ago done', 40);
    const stats = db.statsCompleted();

    assert.strictEqual(stats.today, base.today);
    assert.strictEqual(stats.yesterday, base.yesterday + 1);
    assert.strictEqual(stats.last7Days, base.last7Days + 2);
    assert.strictEqual(stats.last30Days, base.last30Days + 3);

    const seriesTotal = stats.daily.reduce((sum, d) => sum + d.count, 0);
    assert.strictEqual(seriesTotal, stats.last30Days);
  });

  it('excludes tasks completed before the 30-day window', () => {
    const before = db.statsCompleted();
    const task = db.add({ title: 'Old completion' });
    db.update(task.id, { completed: 1 });
    db.db.prepare("UPDATE tasks SET completed_at = datetime('now', '-40 days') WHERE id = ?").run(task.id);
    const after = db.statsCompleted();
    assert.strictEqual(after.last30Days, before.last30Days);
    assert.strictEqual(after.last7Days, before.last7Days);
    assert.strictEqual(after.today, before.today);
    assert.strictEqual(after.yesterday, before.yesterday);
  });

  it('backfills completed_at from updated_at for legacy completed rows', () => {
    const tmpPath = path.join(__dirname, '..', 'data', 'test-backfill.db');
    try { fs.unlinkSync(tmpPath); } catch {}
    const first = require('../src/db')(tmpPath);
    first.db.prepare(
      "INSERT INTO tasks (title, completed, updated_at) VALUES ('Legacy done', 1, '2026-10-20 09:00:00')"
    ).run();
    const second = require('../src/db')(tmpPath);
    const row = second.db.prepare('SELECT completed_at FROM tasks WHERE title = ?').get('Legacy done');
    assert.strictEqual(row.completed_at, '2026-10-20 09:00:00');
    second.db.close();
    first.db.close();
    try { fs.unlinkSync(tmpPath); } catch {}
  });
});