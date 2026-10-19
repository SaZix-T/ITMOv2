const express = require('express');
const path = require('path');
const createDb = require('./src/db');
const tasksRouter = require('./src/routes/tasks');
const errorHandler = require('./src/middleware/error');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'taskflow.db');

const app = express();
const db = createDb(DB_PATH);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/tasks', tasksRouter(db));
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`TaskFlow running on http://localhost:${PORT}`);
});

module.exports = server;