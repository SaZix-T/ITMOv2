const { Router } = require('express');

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
    const due_date = req.body.due_date;
    const task = db.add({ title: title.trim(), description: (req.body.description || '').trim(), due_date });
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
