const { Router } = require('express');

const PRIORITY_ERROR = 'Priority must be an integer from 1 to 4';

function parsePriority(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 4) return null;
  return n;
}

module.exports = function tasksRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const { q } = req.query;
    const tasks = q ? db.search(q) : db.all();
    res.json(tasks);
  });

  router.get('/:id', (req, res) => {
    const task = db.getById(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  router.post('/', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    let priority;
    if (req.body.priority !== undefined) {
      priority = parsePriority(req.body.priority);
      if (priority === null) return res.status(400).json({ error: PRIORITY_ERROR });
    }
    const due_date = req.body.due_date;
    const task = db.add({ title: title.trim(), description: (req.body.description || '').trim(), due_date, priority });
    res.status(201).json(task);
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!db.getById(id)) return res.status(404).json({ error: 'Task not found' });
    const { title, description, completed, due_date } = req.body;
    const fields = {};
    if (title !== undefined) fields.title = title.trim();
    if (description !== undefined) fields.description = description.trim();
    if (completed !== undefined) fields.completed = completed ? 1 : 0;
    if (due_date !== undefined) fields.due_date = due_date || null;
    if (req.body.priority !== undefined) {
      const priority = parsePriority(req.body.priority);
      if (priority === null) return res.status(400).json({ error: PRIORITY_ERROR });
      fields.priority = priority;
    }
    res.json(db.update(id, fields));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!db.remove(id)) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  });

  return router;
};

// Привет
