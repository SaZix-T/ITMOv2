const BASE_TASKS = [
  {
    id: 1,
    title: 'Сдать лабораторную по ИИ',
    description: 'Практика 8: новый фронтенд и клиентские тесты',
    completed: 0,
    due_date: '2026-11-21',
    created_at: '2026-11-18 10:12:00',
    updated_at: '2026-11-18 10:12:00',
  },
  {
    id: 2,
    title: 'Подготовить доклад по физкультуре',
    description: 'Слайды и текст в Typst, проверить шапку',
    completed: 0,
    due_date: '2026-11-24',
    created_at: '2026-11-17 18:40:00',
    updated_at: '2026-11-17 18:40:00',
  },
  {
    id: 3,
    title: 'Разобрать конспект по матанализу',
    description: 'Пределы и непрерывность, задачи 1-14',
    completed: 0,
    due_date: '2026-11-19',
    created_at: '2026-11-16 09:05:00',
    updated_at: '2026-11-16 09:05:00',
  },
  {
    id: 4,
    title: 'Заполнить БГД по осознанному потреблению',
    description: 'Категории, цифры и сокращения',
    completed: 1,
    due_date: '2026-11-12',
    created_at: '2026-11-10 20:30:00',
    updated_at: '2026-11-10 20:30:00',
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Подменяет API TaskFlow поведением, совпадающим с настоящим сервером:
 * тот же формат объектов, те же статусы, поиск по title/description.
 */
async function mockTaskApi(page, options = {}) {
  const tasks = clone(options.tasks ?? BASE_TASKS);
  const calls = [];
  let nextId = Math.max(0, ...tasks.map((task) => task.id)) + 1;
  let getFailuresLeft = options.getFailures ?? 0;
  let postErrorLeft = options.postError ? (options.postErrorOnce ? 1 : Infinity) : 0;

  const fulfill = (route, status, body) => route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/tasks**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    let body = null;

    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }

    calls.push({ method, path: url.pathname + url.search, body });

    if (method === 'GET') {
      if (getFailuresLeft > 0) {
        getFailuresLeft -= 1;
        return fulfill(route, 500, { error: 'Database is locked' });
      }

      if (options.getDelay) {
        await new Promise((resolve) => setTimeout(resolve, options.getDelay));
      }

      const query = (url.searchParams.get('q') || '').trim().toLowerCase();
      const result = query
        ? tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query))
        : tasks;

      return fulfill(route, 200, clone(result));
    }

    if (method === 'POST') {
      if (options.postDelay) {
        await new Promise((resolve) => setTimeout(resolve, options.postDelay));
      }

      if (options.postError && postErrorLeft > 0) {
        postErrorLeft -= 1;
        return fulfill(route, 500, { error: options.postError });
      }

      if (!body || !String(body.title || '').trim()) {
        return fulfill(route, 400, { error: 'Title is required' });
      }

      const created = {
        id: nextId,
        title: String(body.title).trim(),
        description: String(body.description || '').trim(),
        completed: 0,
        due_date: body.due_date || null,
        created_at: nowStamp(),
        updated_at: nowStamp(),
      };
      nextId += 1;
      tasks.unshift(created);

      return fulfill(route, 201, clone(created));
    }

    const id = Number(url.pathname.split('/').pop());
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return fulfill(route, 404, { error: 'Task not found' });
    }

    if (method === 'PUT') {
      if (options.putError) {
        return fulfill(route, options.putError.status, { error: options.putError.message });
      }

      const updated = { ...tasks[index], ...body, updated_at: nowStamp() };

      if (body.completed !== undefined) {
        updated.completed = body.completed ? 1 : 0;
      }

      tasks[index] = updated;
      return fulfill(route, 200, clone(updated));
    }

    if (method === 'DELETE') {
      if (options.deleteError) {
        return fulfill(route, options.deleteError.status, { error: options.deleteError.message });
      }

      tasks.splice(index, 1);
      return fulfill(route, 200, { ok: true });
    }

    return fulfill(route, 405, { error: 'Method not allowed' });
  });

  return { calls, tasks };
}

function countCalls(calls, method) {
  return calls.filter((call) => call.method === method).length;
}

module.exports = { BASE_TASKS, mockTaskApi, countCalls };
