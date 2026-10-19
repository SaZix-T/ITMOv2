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
});