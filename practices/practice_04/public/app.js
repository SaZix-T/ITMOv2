let tasks = [];
let editingId = null;

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-desc');
const dueInput = document.getElementById('task-due');
const taskList = document.getElementById('task-list');
const searchInput = document.getElementById('search');

function taskHTML(t) {
  const completed = t.completed ? 'completed' : '';
  const date = new Date(t.created_at + 'Z').toLocaleDateString();
  const isEditing = editingId === t.id;

  if (isEditing) {
    return `
      <div class="task-item ${completed}">
        <div class="task-body">
          <input class="edit-input" id="edit-title-${t.id}" value="${esc(t.title)}" placeholder="Title">
          <input class="edit-input" id="edit-desc-${t.id}" value="${esc(t.description || '')}" placeholder="Description">
          <input type="date" class="edit-input" id="edit-due-${t.id}" value="${t.due_date || ''}">
          <button onclick="saveEdit(${t.id})">Save</button>
          <button onclick="cancelEdit()">Cancel</button>
        </div>
      </div>`;
  }

  return `
    <div class="task-item ${completed}">
      <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${t.id}, this.checked)">
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
        ${t.due_date ? `<div class="task-due">📅 ${t.due_date}</div>` : ''}
        <div class="task-meta">${date}</div>
      </div>
      <div class="task-actions">
        <button onclick="startEdit(${t.id})">Edit</button>
        <button class="danger" onclick="deleteTask(${t.id})">Delete</button>
      </div>
    </div>`;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function render() {
  if (!tasks.length) {
    taskList.innerHTML = '<p id="empty-state">No tasks yet. Add one above!</p>';
  } else {
    taskList.innerHTML = tasks.map(taskHTML).join('');
  }
}

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function loadTasks(q = '') {
  taskList.innerHTML = '<p id="loading">Loading...</p>';
  try {
    const url = q ? `/api/tasks?q=${encodeURIComponent(q)}` : '/api/tasks';
    tasks = await api(url);
    render();
  } catch (err) {
    taskList.innerHTML = `<p id="error-state">Error: ${esc(err.message)}</p>`;
  }
}

async function addTask(title, description, due_date) {
  await api('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, due_date }),
  });
  await loadTasks(searchInput.value);
}

async function toggleTask(id, completed) {
  await api(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: completed ? 1 : 0 }),
  });
  await loadTasks(searchInput.value);
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await api(`/api/tasks/${id}`, { method: 'DELETE' });
  await loadTasks(searchInput.value);
}

function startEdit(id) {
  editingId = id;
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

async function saveEdit(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const description = document.getElementById(`edit-desc-${id}`).value.trim();
  const due_date = document.getElementById(`edit-due-${id}`).value;
  if (!title) return;
  await api(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, due_date }),
  });
  editingId = null;
  await loadTasks(searchInput.value);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  await addTask(title, descInput.value.trim(), dueInput.value);
  titleInput.value = '';
  descInput.value = '';
  dueInput.value = '';
  titleInput.focus();
});

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadTasks(searchInput.value), 300);
});

loadTasks();

