const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const BASE = 'http://localhost:3456/api/tasks';

describe('API /api/tasks', () => {
  let server;

  before(async () => {
    process.env.PORT = '3456';
    process.env.DB_PATH = require('path').join(__dirname, '..', 'data', 'test-api.db');
    server = require('../server');
    await new Promise(r => setTimeout(r, 500));
  });

  after(() => {
    server.close();
    try { require('fs').unlinkSync(process.env.DB_PATH); } catch {}
  });

  it('POST /api/tasks creates task', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'API test' }),
    });
    assert.strictEqual(res.status, 201);
    const task = await res.json();
    assert.strictEqual(task.title, 'API test');
    assert.ok(task.id > 0);
  });

  it('POST /api/tasks rejects empty title', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  it('GET /api/tasks returns array', async () => {
    const res = await fetch(BASE);
    assert.strictEqual(res.status, 200);
    const tasks = await res.json();
    assert.ok(Array.isArray(tasks));
  });

  it('GET /api/tasks/:id returns task', async () => {
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Get me' }),
    });
    const created = await create.json();

    const res = await fetch(`${BASE}/${created.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).title, 'Get me');
  });

  it('GET /api/tasks/:id returns 404 for missing', async () => {
    const res = await fetch(`${BASE}/99999`);
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/tasks/:id updates task', async () => {
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Update me' }),
    });
    const created = await create.json();

    const res = await fetch(`${BASE}/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated', completed: 1 }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.title, 'Updated');
    assert.strictEqual(updated.completed, 1);
  });

  it('DELETE /api/tasks/:id removes task', async () => {
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Delete me' }),
    });
    const created = await create.json();

    const res = await fetch(`${BASE}/${created.id}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);

    const getRes = await fetch(`${BASE}/${created.id}`);
    assert.strictEqual(getRes.status, 404);
  });

  it('GET /api/tasks?q=... searches', async () => {
    await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unique search term' }),
    });

    const res = await fetch(`${BASE}?q=Unique`);
    assert.strictEqual(res.status, 200);
    const tasks = await res.json();
    assert.ok(tasks.length >= 1);
  });

  it('POST with due_date', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Dated task', due_date: '2026-10-15' }),
    });
    assert.strictEqual(res.status, 201);
    const task = await res.json();
    assert.strictEqual(task.due_date, '2026-10-15');
  });

  it('PUT updates due_date', async () => {
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Date update test' }),
    });
    const created = await create.json();
    const res = await fetch(`${BASE}/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: '2026-11-20' }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.due_date, '2026-11-20');
  });
});