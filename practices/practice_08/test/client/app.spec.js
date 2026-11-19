const { test, expect } = require('@playwright/test');
const { BASE_TASKS, mockTaskApi, countCalls } = require('./helpers');

async function openApp(page, options) {
  const api = await mockTaskApi(page, options);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  return api;
}

function cardWith(page, title) {
  return page.locator('.task-card').filter({ hasText: title });
}

test.describe('список задач', () => {
  test('показывает карточки, счётчики и выполненные задачи', async ({ page }) => {
    await openApp(page);

    await expect(page.getByTestId('state-list')).toBeVisible();
    await expect(page.locator('.task-card')).toHaveCount(4);
    await expect(page.getByText('Сдать лабораторную по ИИ')).toBeVisible();
    await expect(page.getByText('Пределы и непрерывность, задачи 1-14')).toBeVisible();

    await expect(page.getByTestId('stat-total')).toHaveText('4');
    await expect(page.getByTestId('stat-active')).toHaveText('3');
    await expect(page.getByTestId('stat-done')).toHaveText('1');

    await expect(page.getByTestId('filter-all')).toContainText('4');
    await expect(page.getByTestId('filter-active')).toContainText('3');
    await expect(page.getByTestId('filter-done')).toContainText('1');

    const done = page.locator('.task-card.is-done');
    await expect(done).toHaveCount(1);
    await expect(done.locator('.task-title')).toHaveCSS('text-decoration-line', 'line-through');
    await expect(done.locator('.checkbox')).toBeChecked();
  });

  test('показывает загрузку, пока сервер не ответил', async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await mockTaskApi(page, { getDelay: 1500 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('state-loading')).toBeVisible();
    await expect(page.locator('.skeleton-card')).toHaveCount(3);
    await expect(page.getByTestId('state-list')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('state-loading')).toBeHidden();
  });

  test('показывает пустой список на пустой базе', async ({ page }) => {
    await openApp(page, { tasks: [] });

    await expect(page.getByTestId('state-empty')).toBeVisible();
    await expect(page.getByTestId('empty-title')).toHaveText('Задач пока нет');
    await expect(page.getByTestId('empty-action')).toHaveText('Новая задача');
    await expect(page.getByTestId('stat-total')).toHaveText('0');
  });

  test('показывает ошибку загрузки и повторяет запрос по кнопке', async ({ page }) => {
    const api = await openApp(page, { getFailures: 1 });

    await expect(page.getByTestId('state-error')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('Сервер не ответил');
    await expect(page.getByTestId('retry')).toBeVisible();

    await page.getByTestId('retry').click();

    await expect(page.getByTestId('state-list')).toBeVisible();
    await expect(page.locator('.task-card')).toHaveCount(4);
    expect(countCalls(api.calls, 'GET')).toBe(2);
  });
});

test.describe('создание задачи', () => {
  test('открывает диалог, создаёт задачу и показывает её первой', async ({ page }) => {
    const api = await openApp(page);

    await page.getByTestId('new-task').click();
    await expect(page.getByTestId('dialog-title')).toHaveText('Новая задача');
    await expect(page.getByTestId('field-title')).toBeFocused();

    await page.getByTestId('field-title').fill('Проверить клиентские тесты');
    await page.getByTestId('field-description').fill('Прогнать весь набор перед сдачей');
    await page.getByTestId('field-due').fill('2026-11-30');
    await page.getByTestId('dialog-submit').click();

    await expect(page.getByTestId('toast-text')).toHaveText('Задача создана');
    await expect(page.getByTestId('toast')).toBeVisible();
    await expect(page.getByTestId('task-dialog')).toBeHidden();

    const created = cardWith(page, 'Проверить клиентские тесты');
    await expect(created).toBeVisible();
    await expect(created).toContainText('Прогнать весь набор перед сдачей');
    await expect(created).toContainText('30 ноя');
    await expect(page.locator('.task-card').first()).toContainText('Проверить клиентские тесты');
    await expect(page.getByTestId('stat-total')).toHaveText('5');

    const post = api.calls.find((call) => call.method === 'POST');
    expect(post.body).toEqual({
      title: 'Проверить клиентские тесты',
      description: 'Прогнать весь набор перед сдачей',
      due_date: '2026-11-30',
    });
  });

  test('не отправляет форму с пустым названием и показывает ошибку поля', async ({ page }) => {
    const api = await openApp(page);

    await page.getByTestId('new-task').click();
    await page.getByTestId('field-title').fill('   ');
    await page.getByTestId('dialog-submit').click();

    await expect(page.getByTestId('title-error')).toBeVisible();
    await expect(page.getByTestId('title-error')).toHaveText('Введите название задачи');
    await expect(page.getByTestId('field-title')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('task-dialog')).toBeVisible();
    expect(countCalls(api.calls, 'POST')).toBe(0);

    await page.getByTestId('field-title').fill('Название появилось');
    await expect(page.getByTestId('title-error')).toBeHidden();
    await expect(page.getByTestId('field-title')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('двойной клик и повторный Enter не создают второй запрос', async ({ page }) => {
    const api = await openApp(page, { postDelay: 700 });

    await page.getByTestId('new-task').click();
    await page.getByTestId('field-title').fill('Одна задача — один запрос');
    await page.getByTestId('dialog-submit').click();

    await expect(page.getByTestId('dialog-submit')).toBeDisabled();
    await expect(page.getByTestId('dialog-submit')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('dialog-submit')).toHaveText('Сохраняю…');

    await page.evaluate(() => {
      document.getElementById('task-form').dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
      document.getElementById('task-form').dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    });

    await expect(page.getByTestId('toast-text')).toHaveText('Задача создана');
    expect(countCalls(api.calls, 'POST')).toBe(1);
    await expect(page.locator('.task-card')).toHaveCount(5);
  });

  test('при ошибке сервера сохраняет введённые данные и даёт повторить', async ({ page }) => {
    const api = await openApp(page, { postError: 'Не удалось записать задачу', postErrorOnce: true });

    await page.getByTestId('new-task').click();
    await page.getByTestId('field-title').fill('Задача, которая сначала упала');
    await page.getByTestId('dialog-submit').click();

    await expect(page.getByTestId('dialog-error')).toBeVisible();
    await expect(page.getByTestId('dialog-error')).toContainText('Не удалось записать задачу');
    await expect(page.getByTestId('task-dialog')).toBeVisible();
    await expect(page.getByTestId('field-title')).toHaveValue('Задача, которая сначала упала');
    await expect(page.getByTestId('dialog-submit')).toBeEnabled();
    await expect(page.getByTestId('toast')).toBeHidden();

    await page.getByTestId('dialog-submit').click();

    await expect(page.getByTestId('toast-text')).toHaveText('Задача создана');
    await expect(page.getByTestId('task-dialog')).toBeHidden();
    await expect(cardWith(page, 'Задача, которая сначала упала')).toBeVisible();
    expect(countCalls(api.calls, 'POST')).toBe(2);
  });
});

test.describe('изменение и удаление', () => {
  test('отмечает задачу выполненной и обновляет счётчики', async ({ page }) => {
    const api = await openApp(page);
    const card = cardWith(page, 'Сдать лабораторную по ИИ');

    await card.locator('.checkbox').click();

    await expect(card).toHaveClass(/is-done/);
    await expect(card.locator('.checkbox')).toBeChecked();
    await expect(card.locator('.task-title')).toHaveCSS('text-decoration-line', 'line-through');
    await expect(page.getByTestId('stat-done')).toHaveText('2');
    await expect(page.getByTestId('stat-active')).toHaveText('2');

    const put = api.calls.find((call) => call.method === 'PUT');
    expect(put.path).toBe('/api/tasks/1');
    expect(put.body).toEqual({ completed: 1 });
  });

  test('подтверждает удаление и убирает карточку', async ({ page }) => {
    const api = await openApp(page);
    const card = cardWith(page, 'Сдать лабораторную по ИИ');

    await card.getByRole('button', { name: 'Удалить' }).click();
    await expect(page.getByTestId('confirm-text')).toContainText('Сдать лабораторную по ИИ');
    await expect(page.getByTestId('confirm-dialog')).toBeVisible();

    await page.getByTestId('confirm-cancel').click();
    await expect(page.getByTestId('confirm-dialog')).toBeHidden();
    expect(countCalls(api.calls, 'DELETE')).toBe(0);
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Удалить' }).click();
    await page.getByTestId('confirm-delete').click();

    await expect(card).toHaveCount(0);
    await expect(page.locator('.task-card')).toHaveCount(3);
    expect(countCalls(api.calls, 'DELETE')).toBe(1);
    await expect(page.getByTestId('toast-text')).toHaveText('Задача удалена');
  });

  test('сообщает, если задачу уже удалили на сервере', async ({ page }) => {
    await openApp(page, { putError: { status: 404, message: 'Task not found' } });
    const card = cardWith(page, 'Сдать лабораторную по ИИ');

    await card.locator('.checkbox').click();

    await expect(page.getByTestId('toast-text')).toHaveText('Задача уже удалена');
    await expect(page.getByTestId('toast')).toHaveClass(/is-danger/);
    await expect(card).toHaveCount(0);
    await expect(page.locator('.task-card')).toHaveCount(3);
  });
});

test.describe('поиск и фильтры', () => {
  test('ищет по запросу и показывает пустой результат с отменой поиска', async ({ page }) => {
    const api = await openApp(page);

    await page.getByTestId('search').fill('матан');
    await expect(page.locator('.task-card')).toHaveCount(1);
    await expect(page.locator('.task-card')).toContainText('Разобрать конспект по матанализу');

    const searchCall = api.calls.find((call) => call.path.includes('?q='));
    expect(decodeURIComponent(searchCall.path)).toContain('q=матан');

    await page.getByTestId('search').fill('абракадабра');
    await expect(page.getByTestId('empty-title')).toHaveText('Ничего не нашлось');
    await expect(page.getByTestId('empty-action')).toHaveText('Сбросить поиск');

    await page.getByTestId('empty-action').click();
    await expect(page.getByTestId('search')).toHaveValue('');
    await expect(page.locator('.task-card')).toHaveCount(4);
  });

  test('переключает фильтры и объясняет пустую выборку', async ({ page }) => {
    await openApp(page, { tasks: BASE_TASKS.filter((task) => !task.completed) });

    await page.getByTestId('filter-active').click();
    await expect(page.locator('.task-card')).toHaveCount(3);
    await expect(page.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('filter-done').click();
    await expect(page.getByTestId('empty-title')).toHaveText('Здесь пока пусто');
    await expect(page.getByTestId('empty-action')).toHaveText('Показать все');

    await page.getByTestId('empty-action').click();
    await expect(page.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.task-card')).toHaveCount(3);
  });
});

test.describe('клавиатура и фокус', () => {
  test('диалог открывается с клавиатуры, закрывается по Esc и возвращает фокус', async ({ page }) => {
    await openApp(page);
    const newTask = page.getByTestId('new-task');

    await newTask.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('task-dialog')).toBeVisible();
    await expect(page.getByTestId('field-title')).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('task-dialog')).toBeHidden();
    await expect(newTask).toBeFocused();
  });

  test('у кнопок виден фокус при навигации Tab', async ({ page }) => {
    await openApp(page);

    await page.getByTestId('search').focus();
    await page.keyboard.press('Tab');

    const newTask = page.getByTestId('new-task');
    await expect(newTask).toBeFocused();

    const outline = await newTask.evaluate((node) => {
      const style = getComputedStyle(node);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });

    expect(outline.style).not.toBe('none');
    expect(outline.width).toBe('2px');
  });
});

test.describe('узкий экран', () => {
  test('карточки и диалог остаются читаемыми на 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await page.waitForLoadState('load');

    await expect(page.locator('.task-card')).toHaveCount(4);
    await expect(cardWith(page, 'Сдать лабораторную по ИИ').getByRole('button', { name: 'Изменить' })).toBeVisible();

    const overflow = await page.evaluate(() => (
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByTestId('new-task').click();
    const box = await page.getByTestId('task-dialog').boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
  });
});
