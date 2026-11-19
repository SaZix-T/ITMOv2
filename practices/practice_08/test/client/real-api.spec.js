const { test, expect } = require('@playwright/test');

test.describe('основной сценарий с настоящим API', () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get('/api/tasks');
    const tasks = await response.json();

    for (const task of tasks) {
      await request.delete(`/api/tasks/${task.id}`);
    }
  });

  test('создание, выполнение, сохранение после перезагрузки и удаление', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('state-empty')).toBeVisible();
    await expect(page.getByTestId('empty-title')).toHaveText('Задач пока нет');

    await page.getByTestId('new-task').click();
    await page.getByTestId('field-title').fill('Сдать практику 8');
    await page.getByTestId('field-description').fill('Показать работу с настоящим API');
    await page.getByTestId('field-due').fill('2026-12-01');
    await page.getByTestId('dialog-submit').click();

    await expect(page.getByTestId('toast-text')).toHaveText('Задача создана');
    await expect(page.getByTestId('task-dialog')).toBeHidden();

    const card = page.locator('.task-card').filter({ hasText: 'Сдать практику 8' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Показать работу с настоящим API');
    await expect(page.getByTestId('stat-total')).toHaveText('1');

    await card.locator('.checkbox').check();
    await expect(card).toHaveClass(/is-done/);

    await page.reload();

    const reloaded = page.locator('.task-card').filter({ hasText: 'Сдать практику 8' });
    await expect(reloaded).toBeVisible();
    await expect(reloaded).toHaveClass(/is-done/);
    await expect(reloaded.locator('.checkbox')).toBeChecked();

    await reloaded.getByRole('button', { name: 'Удалить' }).click();
    await page.getByTestId('confirm-delete').click();

    await expect(page.getByTestId('state-empty')).toBeVisible();
    await expect(page.locator('.task-card')).toHaveCount(0);
  });
});
