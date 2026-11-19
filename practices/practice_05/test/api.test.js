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

  it('POST defaults priority to 1', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Default priority task' }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual((await res.json()).priority, 1);
  });

  it('POST accepts priority from 1 to 4', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Urgent task', priority: 4 }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual((await res.json()).priority, 4);
  });

  it('POST rejects priority outside 1..4', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Invalid priority', priority: 5 }),
    });
    assert.strictEqual(res.status, 400);
    assert.match((await res.json()).error, /priority/i);
  });

  it('POST rejects explicit null priority', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Null priority', priority: null }),
    });
    assert.strictEqual(res.status, 400);
    assert.match((await res.json()).error, /priority/i);
  });

  it('PUT updates priority', async () => {
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Priority update', priority: 1 }),
    });
    const created = await create.json();
    const res = await fetch(`${BASE}/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 3 }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).priority, 3);
  });

  it('PUT rejects invalid priority and keeps stored value', async () => {
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Keep priority', priority: 2 }),
    });
    const created = await create.json();

    const bad = await fetch(`${BASE}/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'high' }),
    });
    assert.strictEqual(bad.status, 400);

    const after = await fetch(`${BASE}/${created.id}`);
    assert.strictEqual((await after.json()).priority, 2);
  });

  it('priority change does not reorder the list', async () => {
    await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Order A', priority: 1 }),
    });
    await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Order B', priority: 1 }),
    });
    const before = await (await fetch(BASE)).json();
    const target = before[0];
    await fetch(`${BASE}/${target.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 4 }),
    });
    const after = await (await fetch(BASE)).json();
    assert.deepStrictEqual(after.map((t) => t.id), before.map((t) => t.id));
  });

  it('GET /api/stats/completed returns summary and 30 days', async () => {
    const res = await fetch(`${BASE.replace('/tasks', '/stats')}/completed`);
    assert.strictEqual(res.status, 200);
    const stats = await res.json();
    assert.strictEqual(typeof stats.today, 'number');
    assert.strictEqual(typeof stats.yesterday, 'number');
    assert.strictEqual(typeof stats.last7Days, 'number');
    assert.strictEqual(typeof stats.last30Days, 'number');
    assert.strictEqual(stats.daily.length, 30);
    assert.strictEqual(stats.today, stats.daily[29].count);
    assert.strictEqual(stats.yesterday, stats.daily[28].count);
    assert.strictEqual(stats.last7Days, stats.daily.slice(-7).reduce((sum, d) => sum + d.count, 0));
    assert.strictEqual(stats.last30Days, stats.daily.reduce((sum, d) => sum + d.count, 0));
  });

  it('completing a task increments stats, uncompleting decrements', async () => {
    const statsUrl = `${BASE.replace('/tasks', '/stats')}/completed`;
    const create = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Stats toggle' }),
    });
    const task = await create.json();
    const before = await (await fetch(statsUrl)).json();

    await fetch(`${BASE}/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: 1 }),
    });
    const afterDone = await (await fetch(statsUrl)).json();
    assert.strictEqual(afterDone.today, before.today + 1);

    await fetch(`${BASE}/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: 0 }),
    });
    const afterUndone = await (await fetch(statsUrl)).json();
    assert.strictEqual(afterUndone.today, before.today);
  });
});