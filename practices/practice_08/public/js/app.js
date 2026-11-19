import { api } from './api.js';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const SERVER_MESSAGES = {
  'Title is required': 'Введите название задачи',
  'Task not found': 'Задача уже удалена',
};

const state = {
  tasks: [],
  query: '',
  filter: 'all',
  view: 'loading',
  submitting: false,
  editingId: null,
  deletingId: null,
  emptyAction: 'create',
  busy: new Set(),
  lastFocus: null,
  focus: null,
};

const el = {
  search: document.getElementById('search'),
  newTask: document.getElementById('new-task'),
  stats: {
    total: document.getElementById('stat-total'),
    active: document.getElementById('stat-active'),
    done: document.getElementById('stat-done'),
  },
  filters: Array.from(document.querySelectorAll('.filter')),
  counts: {
    all: document.querySelector('[data-count="all"]'),
    active: document.querySelector('[data-count="active"]'),
    done: document.querySelector('[data-count="done"]'),
  },
  toast: document.getElementById('toast'),
  toastText: document.getElementById('toast-text'),
  toastClose: document.getElementById('toast-close'),
  states: {
    loading: document.getElementById('state-loading'),
    error: document.getElementById('state-error'),
    empty: document.getElementById('state-empty'),
    list: document.getElementById('state-list'),
  },
  errorMessage: document.getElementById('error-message'),
  retry: document.getElementById('retry'),
  emptyTitle: document.getElementById('empty-title'),
  emptyText: document.getElementById('empty-text'),
  emptyAction: document.getElementById('empty-action'),
  list: document.getElementById('task-list'),
  dialog: document.getElementById('task-dialog'),
  dialogTitle: document.getElementById('dialog-title'),
  dialogSub: document.getElementById('dialog-sub'),
  form: document.getElementById('task-form'),
  title: document.getElementById('task-title'),
  description: document.getElementById('task-desc'),
  due: document.getElementById('task-due'),
  titleError: document.getElementById('title-error'),
  dialogError: document.getElementById('dialog-error'),
  dialogErrorTitle: document.getElementById('dialog-error-title'),
  dialogErrorText: document.getElementById('dialog-error-text'),
  submit: document.getElementById('dialog-submit'),
  cancel: document.getElementById('dialog-cancel'),
  confirmDialog: document.getElementById('confirm-dialog'),
  confirmText: document.getElementById('confirm-text'),
  confirmCancel: document.getElementById('confirm-cancel'),
  confirmDelete: document.getElementById('confirm-delete'),
};

let toastTimer = null;
let searchTimer = null;

function esc(value) {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

function escAttr(value) {
  return esc(value).replace(/"/g, '&quot;');
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

function formatCreated(timestamp) {
  const date = new Date(String(timestamp).replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function dueBadge(task) {
  if (!task.due_date) {
    return null;
  }

  const today = todayISO();

  if (task.due_date === today) {
    return { text: 'сегодня', className: 'is-today' };
  }

  if (task.due_date < today && !task.completed) {
    return { text: 'просрочено', className: 'is-overdue' };
  }

  return { text: formatDate(task.due_date), className: 'is-due' };
}

function humanError(error, fallback) {
  if (error && error.status === 404) {
    return SERVER_MESSAGES['Task not found'];
  }

  const message = error && error.message ? error.message : '';

  if (SERVER_MESSAGES[message]) {
    return SERVER_MESSAGES[message];
  }

  if (/Нет связи|Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Сервер не ответил. Проверьте соединение и попробуйте снова.';
  }

  return message || fallback;
}

function taskCard(task) {
  const done = Boolean(task.completed);
  const title = esc(task.title);
  const titleAttr = escAttr(task.title);
  const due = dueBadge(task);
  const created = formatCreated(task.created_at);
  const toggleLabel = done ? 'Вернуть задачу в работу' : 'Отметить задачу выполненной';

  return `
    <li class="task-card card${done ? ' is-done' : ''}" data-task-id="${task.id}">
      <div class="card-body">
        <div class="task-row">
          <label class="check-wrap">
            <input type="checkbox" class="checkbox checkbox-primary" data-action="toggle" data-id="${task.id}"
                   ${done ? 'checked' : ''} aria-label="${toggleLabel}: «${titleAttr}»">
          </label>
          <div class="task-text">
            <h3 class="task-title">${title}</h3>
            ${task.description ? `<p class="task-desc">${esc(task.description)}</p>` : ''}
            <div class="task-meta">
              ${due ? `<span class="badge meta-badge ${due.className}">срок <b>${due.text}</b></span>` : ''}
              <span class="badge meta-badge">создана <b>${created}</b></span>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-ghost btn-edit" type="button" data-action="edit" data-id="${task.id}">Изменить</button>
            <button class="btn btn-ghost btn-del" type="button" data-action="delete" data-id="${task.id}">Удалить</button>
          </div>
        </div>
      </div>
    </li>`;
}

function visibleTasks() {
  if (state.filter === 'active') {
    return state.tasks.filter((task) => !task.completed);
  }

  if (state.filter === 'done') {
    return state.tasks.filter((task) => task.completed);
  }

  return state.tasks;
}

function updateCounts() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.completed).length;

  el.stats.total.textContent = String(total);
  el.stats.active.textContent = String(total - done);
  el.stats.done.textContent = String(done);

  el.counts.all.textContent = String(total);
  el.counts.active.textContent = String(total - done);
  el.counts.done.textContent = String(done);
}

function showState(name) {
  Object.entries(el.states).forEach(([key, node]) => {
    node.hidden = key !== name;
  });

  if (name !== 'list') {
    el.list.innerHTML = '';
  }
}

function fillEmptyState() {
  if (state.query) {
    state.emptyAction = 'reset-search';
    el.emptyTitle.textContent = 'Ничего не нашлось';
    el.emptyText.textContent = 'Попробуйте другой запрос или сбросьте поиск.';
    el.emptyAction.textContent = 'Сбросить поиск';
    return;
  }

  if (state.filter !== 'all') {
    state.emptyAction = 'reset-filter';
    el.emptyTitle.textContent = 'Здесь пока пусто';
    el.emptyText.textContent = 'В этой выборке нет задач. Показать все?';
    el.emptyAction.textContent = 'Показать все';
    return;
  }

  state.emptyAction = 'create';
  el.emptyTitle.textContent = 'Задач пока нет';
  el.emptyText.textContent = 'Добавьте первую — она появится в этом списке.';
  el.emptyAction.textContent = 'Новая задача';
}

function restoreFocus() {
  const pending = state.focus;
  state.focus = null;

  if (!pending) {
    return;
  }

  const card = el.list.querySelector(`[data-task-id="${pending.id}"]`);

  if (!card) {
    return;
  }

  const target = pending.action === 'toggle'
    ? card.querySelector('.checkbox')
    : card.querySelector(`[data-action="${pending.action}"]`);

  if (target) {
    target.focus();
  }
}

function render() {
  updateCounts();
  el.filters.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
  });

  if (state.view === 'loading') {
    showState('loading');
    return;
  }

  if (state.view === 'error') {
    showState('error');
    return;
  }

  const tasks = visibleTasks();

  if (!tasks.length) {
    fillEmptyState();
    showState('empty');
    return;
  }

  el.list.innerHTML = tasks.map(taskCard).join('');
  showState('list');
  restoreFocus();
}

function showToast(message, kind = 'success') {
  el.toastText.textContent = message;
  el.toast.classList.toggle('is-danger', kind === 'error');
  el.toast.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
  clearTimeout(toastTimer);
  el.toast.hidden = true;
}

async function loadTasks({ showLoading = true } = {}) {
  if (showLoading) {
    state.view = 'loading';
    render();
  }

  el.list.setAttribute('aria-busy', 'true');

  try {
    const path = state.query ? `/api/tasks?q=${encodeURIComponent(state.query)}` : '/api/tasks';
    const tasks = await api(path);
    state.tasks = Array.isArray(tasks) ? tasks : [];
    state.view = 'list';
  } catch {
    state.tasks = [];
    state.view = 'error';
    el.errorMessage.textContent = 'Сервер не ответил. Проверьте соединение и попробуйте снова.';
  } finally {
    el.list.setAttribute('aria-busy', 'false');
    render();
  }
}

function restoreDialogFocus() {
  const target = state.lastFocus && state.lastFocus !== document.body && document.contains(state.lastFocus)
    ? state.lastFocus
    : el.newTask;

  requestAnimationFrame(() => {
    if (document.contains(target)) {
      target.focus();
    }
  });
}

function clearTitleError() {
  el.titleError.hidden = true;
  el.title.removeAttribute('aria-invalid');
}

function showTitleError() {
  el.titleError.hidden = false;
  el.title.setAttribute('aria-invalid', 'true');
  el.title.focus();
}

function clearDialogError() {
  el.dialogError.hidden = true;
}

function showDialogError(message) {
  el.dialogErrorTitle.textContent = 'Не удалось сохранить задачу';
  el.dialogErrorText.textContent = message;
  el.dialogError.hidden = false;
}

function setSubmitting(active) {
  state.submitting = active;
  el.submit.disabled = active;
  el.submit.setAttribute('aria-busy', String(active));
  el.title.disabled = active;
  el.description.disabled = active;
  el.due.disabled = active;
  el.cancel.disabled = active;
  el.submit.textContent = active
    ? 'Сохраняю…'
    : (state.editingId ? 'Сохранить изменения' : 'Создать задачу');
}

function openTaskDialog({ task = null } = {}) {
  state.editingId = task ? task.id : null;
  state.lastFocus = document.activeElement;
  el.form.reset();
  clearTitleError();
  clearDialogError();

  if (task) {
    el.dialogTitle.textContent = 'Изменить задачу';
    el.dialogSub.textContent = 'Можно изменить название, описание и срок.';
    el.title.value = task.title;
    el.description.value = task.description || '';
    el.due.value = task.due_date || '';
  } else {
    el.dialogTitle.textContent = 'Новая задача';
    el.dialogSub.textContent = 'Название обязательно, остальное можно заполнить позже.';
  }

  setSubmitting(false);
  el.dialog.showModal();
  requestAnimationFrame(() => el.title.focus());
}

function closeTaskDialog() {
  if (state.submitting) {
    return;
  }

  el.dialog.close();
}

async function submitTask(event) {
  event.preventDefault();

  if (state.submitting) {
    return;
  }

  const title = el.title.value.trim();

  if (!title) {
    showTitleError();
    return;
  }

  const payload = {
    title,
    description: el.description.value.trim(),
    due_date: el.due.value || null,
  };

  setSubmitting(true);
  clearDialogError();

  try {
    if (state.editingId) {
      const updated = await api(`/api/tasks/${state.editingId}`, { method: 'PUT', body: payload });
      const index = state.tasks.findIndex((task) => task.id === updated.id);

      if (index === -1) {
        state.tasks.unshift(updated);
      } else {
        state.tasks[index] = updated;
      }

      state.view = 'list';
      state.editingId = null;
      el.dialog.close();
      showToast('Изменения сохранены');
    } else {
      const created = await api('/api/tasks', { method: 'POST', body: payload });

      if (state.query) {
        el.search.value = '';
        state.query = '';
        await loadTasks({ showLoading: false });
      } else {
        state.tasks = [created, ...state.tasks.filter((task) => task.id !== created.id)];
      }

      state.filter = 'all';
      state.view = 'list';
      el.dialog.close();
      showToast('Задача создана');
    }

    render();
  } catch (error) {
    showDialogError(humanError(error, 'Проверьте соединение и попробуйте ещё раз.'));
  } finally {
    setSubmitting(false);
  }
}

function handleTaskError(error, taskId, fallback) {
  if (error && error.status === 404) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    state.view = 'list';
    render();
    showToast('Задача уже удалена', 'error');
    return;
  }

  showToast(humanError(error, fallback), 'error');
}

async function toggleTask(id, checkbox) {
  if (state.busy.has(id)) {
    return;
  }

  const completed = checkbox.checked ? 1 : 0;
  state.busy.add(id);
  checkbox.disabled = true;

  try {
    const updated = await api(`/api/tasks/${id}`, { method: 'PUT', body: { completed } });
    const index = state.tasks.findIndex((task) => task.id === updated.id);

    if (index !== -1) {
      state.tasks[index] = updated;
    }

    state.focus = { id, action: 'toggle' };
    state.view = 'list';
    render();
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    handleTaskError(error, id, 'Не удалось обновить задачу');
  } finally {
    state.busy.delete(id);
    checkbox.disabled = false;
  }
}

function askDelete(task) {
  state.deletingId = task.id;
  state.lastFocus = document.activeElement;
  el.confirmText.textContent = `«${task.title}» исчезнет из списка. Это действие нельзя отменить.`;
  el.confirmDialog.showModal();
  el.confirmCancel.focus();
}

async function confirmDelete() {
  const id = state.deletingId;

  if (!id) {
    return;
  }

  el.confirmDelete.disabled = true;

  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    state.tasks = state.tasks.filter((task) => task.id !== id);
    state.view = 'list';
    el.confirmDialog.close();
    render();
    showToast('Задача удалена');
  } catch (error) {
    if (error && error.status === 404) {
      state.tasks = state.tasks.filter((task) => task.id !== id);
      state.view = 'list';
      el.confirmDialog.close();
      render();
      showToast('Задача уже удалена', 'error');
    } else {
      el.confirmDialog.close();
      showToast(humanError(error, 'Не удалось удалить задачу'), 'error');
    }
  } finally {
    el.confirmDelete.disabled = false;
    state.deletingId = null;
  }
}

function setFilter(filter) {
  state.filter = filter;
  render();
}

el.newTask.addEventListener('click', () => openTaskDialog());
el.emptyAction.addEventListener('click', () => {
  if (state.emptyAction === 'reset-search') {
    el.search.value = '';
    state.query = '';
    loadTasks();
    return;
  }

  if (state.emptyAction === 'reset-filter') {
    setFilter('all');
    return;
  }

  openTaskDialog();
});

el.form.addEventListener('submit', submitTask);
el.cancel.addEventListener('click', closeTaskDialog);
el.dialog.addEventListener('click', (event) => {
  if (event.target === el.dialog) {
    closeTaskDialog();
  }
});
el.dialog.addEventListener('cancel', (event) => {
  if (state.submitting) {
    event.preventDefault();
  }
});
el.dialog.addEventListener('close', () => {
  if (state.submitting) {
    return;
  }

  setSubmitting(false);
  clearTitleError();
  clearDialogError();
  state.editingId = null;
  restoreDialogFocus();
});

el.title.addEventListener('input', () => {
  if (el.title.value.trim()) {
    clearTitleError();
  }
});

el.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = el.search.value.trim();
    loadTasks({ showLoading: !state.tasks.length });
  }, 300);
});

el.filters.forEach((button) => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});

el.list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');

  if (!button) {
    return;
  }

  const task = state.tasks.find((item) => item.id === Number(button.dataset.id));

  if (!task) {
    return;
  }

  if (button.dataset.action === 'edit') {
    openTaskDialog({ task });
  }

  if (button.dataset.action === 'delete') {
    askDelete(task);
  }
});

el.list.addEventListener('change', (event) => {
  const checkbox = event.target.closest('input[data-action="toggle"]');

  if (!checkbox) {
    return;
  }

  toggleTask(Number(checkbox.dataset.id), checkbox);
});

el.toastClose.addEventListener('click', hideToast);
el.retry.addEventListener('click', () => loadTasks());

el.confirmDialog.addEventListener('click', (event) => {
  if (event.target === el.confirmDialog) {
    el.confirmDialog.close();
  }
});
el.confirmDialog.addEventListener('close', () => {
  state.deletingId = null;
  restoreDialogFocus();
});
el.confirmCancel.addEventListener('click', () => el.confirmDialog.close());
el.confirmDelete.addEventListener('click', confirmDelete);

loadTasks();
