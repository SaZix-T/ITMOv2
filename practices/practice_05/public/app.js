let tasks = [];
let editingId = null;
let openPriorityId = null;
let savingPriority = false;

const PRIORITIES = [
  { value: 1, name: 'Low' },
  { value: 2, name: 'Medium' },
  { value: 3, name: 'High' },
  { value: 4, name: 'Critical' },
];

const FLAG_SVG = '<svg class="flag-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 3h11.5l-2.4 4.5 2.4 4.5H6z" fill="currentColor"></path><path d="M6 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-desc');
const dueInput = document.getElementById('task-due');
const taskList = document.getElementById('task-list');
const searchInput = document.getElementById('search');
const actionError = document.getElementById('action-error');
const tasksView = document.getElementById('tasks-view');
const statsView = document.getElementById('stats-view');
const statsContent = document.getElementById('stats-content');
const tabButtons = Array.from(document.querySelectorAll('.tab'));

let currentView = 'tasks';

function priorityName(value) {
  const found = PRIORITIES.find((p) => p.value === value);
  return found ? found.name : PRIORITIES[0].name;
}

function priorityLabel(value) {
  return `${value} · ${priorityName(value)}`;
}

function flagHTML(t) {
  const label = `Priority: ${priorityName(t.priority)} (${t.priority}). Change priority`;
  const expanded = openPriorityId === t.id ? 'true' : 'false';
  return `<button type="button" class="priority-flag" data-priority="${t.priority}" title="${esc(label)}" aria-label="${esc(label)}" aria-haspopup="menu" aria-expanded="${expanded}" onclick="togglePriorityMenu(${t.id})">${FLAG_SVG}</button>`;
}

function priorityMenuHTML(t) {
  const options = PRIORITIES.map((p) => {
    const active = p.value === t.priority ? ' active' : '';
    return `<button type="button" class="priority-option${active}" role="menuitem" data-value="${p.value}" onclick="setPriority(${t.id}, ${p.value})"><span class="priority-dot" data-priority="${p.value}"></span>${esc(priorityLabel(p.value))}</button>`;
  }).join('');
  return `<div class="priority-menu" role="menu" aria-label="Task priority">${options}</div>`;
}

function taskHTML(t) {
  const completed = t.completed ? 'completed' : '';
  const date = new Date(t.created_at + 'Z').toLocaleDateString();
  const isEditing = editingId === t.id;
  const menu = openPriorityId === t.id ? priorityMenuHTML(t) : '';

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
      ${flagHTML(t)}
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
      ${menu}
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

function showActionError(message) {
  actionError.textContent = message;
  actionError.hidden = false;
}

function clearActionError() {
  actionError.textContent = '';
  actionError.hidden = true;
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

function togglePriorityMenu(id) {
  openPriorityId = openPriorityId === id ? null : id;
  render();
}

function closePriorityMenu() {
  if (openPriorityId === null) return false;
  openPriorityId = null;
  render();
  return true;
}

async function setPriority(id, value) {
  openPriorityId = null;
  if (savingPriority) return;
  if (!PRIORITIES.some((p) => p.value === value)) return;
  savingPriority = true;
  clearActionError();
  try {
    await api(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: value }),
    });
    await loadTasks(searchInput.value);
  } catch (err) {
    showActionError(`Could not change priority: ${err.message}`);
    await loadTasks(searchInput.value);
  } finally {
    savingPriority = false;
  }
}

function startEdit(id) {
  editingId = id;
  openPriorityId = null;
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

document.addEventListener('click', (e) => {
  if (openPriorityId === null) return;
  if (e.target.closest && (e.target.closest('.priority-menu') || e.target.closest('.priority-flag'))) return;
  closePriorityMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && closePriorityMenu()) {
    e.preventDefault();
  }
});

function shortDate(dateKey) {
  return `${dateKey.slice(8, 10)}.${dateKey.slice(5, 7)}`;
}

function barChartHTML(series, { height = 150, slot = 100, barWidth = 48, dense = false, ariaLabel = 'Completed tasks per day' } = {}) {
  const axisSpace = 22;
  const topSpace = 18;
  const width = series.length * slot;
  const totalHeight = height + axisSpace + topSpace;
  const max = series.reduce((best, item) => Math.max(best, item.count), 0);
  const scale = (count) => (max === 0 ? 2 : Math.max(2, Math.round((count / max) * height)));

  const bars = series.map((item, index) => {
    const barHeight = scale(item.count);
    const x = index * slot + (slot - barWidth) / 2;
    const y = topSpace + height - barHeight;
    const showValue = !dense || item.count > 0;
    const showAxis = !dense || index % 5 === 0 || index === series.length - 1;
    const value = showValue
      ? `<text class="chart-value${dense ? ' chart-value-dense' : ''}" x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle">${item.count}</text>`
      : '';
    const axis = showAxis
      ? `<text class="chart-axis" x="${x + barWidth / 2}" y="${topSpace + height + 15}" text-anchor="middle">${esc(shortDate(item.date))}</text>`
      : '';
    const fill = item.count ? 'chart-bar-fill' : 'chart-bar-empty';
    return `<g class="chart-bar"><title>${esc(item.date)}: ${item.count}</title><rect class="${fill}" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3"></rect>${value}${axis}</g>`;
  }).join('');

  return `<svg class="bar-chart${dense ? ' bar-chart-dense' : ''}" viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="${esc(ariaLabel)}"><line class="chart-baseline" x1="0" y1="${topSpace + height}" x2="${width}" y2="${topSpace + height}"></line>${bars}</svg>`;
}

function statsHTML(data) {
  const cards = [
    { label: 'Today', value: data.today },
    { label: 'Yesterday', value: data.yesterday },
    { label: 'Last 7 days', value: data.last7Days },
    { label: 'Last 30 days', value: data.last30Days },
  ];
  const cardsHTML = cards.map((card) => `
    <div class="stat-card">
      <div class="stat-value">${card.value}</div>
      <div class="stat-label">${esc(card.label)}</div>
    </div>`).join('');

  const week = data.daily.slice(-7);
  const empty = data.last30Days === 0
    ? '<p id="stats-empty">No completed tasks in the last 30 days. Mark a task done and it will appear here.</p>'
    : '';

  return `
    <div class="stat-cards">${cardsHTML}</div>
    ${empty}
    <h2 class="chart-title">Last 7 days</h2>
    ${barChartHTML(week, { ariaLabel: 'Completed tasks per day for the last 7 days' })}
    <h2 class="chart-title">Last 30 days</h2>
    ${barChartHTML(data.daily, { height: 110, slot: 26, barWidth: 12, dense: true, ariaLabel: 'Completed tasks per day for the last 30 days' })}
  `;
}

async function loadStats() {
  statsContent.innerHTML = '<p id="stats-loading">Loading...</p>';
  try {
    const data = await api('/api/stats/completed');
    statsContent.innerHTML = statsHTML(data);
  } catch (err) {
    statsContent.innerHTML = `<p id="stats-error">Error: ${esc(err.message)}</p><button type="button" class="retry" onclick="loadStats()">Retry</button>`;
  }
}

function switchView(view) {
  currentView = view === 'stats' ? 'stats' : 'tasks';
  const showStats = currentView === 'stats';
  tasksView.hidden = showStats;
  statsView.hidden = !showStats;
  tabButtons.forEach((button) => {
    const active = button.dataset.view === currentView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  if (showStats) {
    loadStats();
  } else {
    render();
  }
}

loadTasks();
