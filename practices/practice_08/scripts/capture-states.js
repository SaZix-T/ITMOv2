const { chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

const BASE = 'http://127.0.0.1:3201';
const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');

const TASKS = [
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

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('saved', name);
}

async function mock(page, handler) {
  await page.route('**/api/tasks**', handler);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await shot(page, '01-list');

  await page.getByTestId('new-task').click();
  await page.waitForTimeout(400);
  await shot(page, '02-dialog');

  await page.getByTestId('dialog-submit').click();
  await page.waitForTimeout(200);
  await shot(page, '03-validation');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page.getByTestId('new-task').click();
  await page.getByTestId('field-title').fill('Сдать макет ревьюверу');
  await page.getByTestId('field-description').fill('Открыть design/mockups/index.html и выбрать вариант');
  await page.getByTestId('field-due').fill('2026-11-28');
  await page.getByTestId('dialog-submit').click();
  await page.waitForTimeout(500);
  await shot(page, '04-success');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(BASE + '/', { waitUntil: 'load' });
  await mobile.waitForTimeout(900);
  await shot(mobile, '05-mobile');
  await mobile.close();

  const loading = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mock(loading, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TASKS) });
  });
  await loading.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await loading.waitForTimeout(500);
  await shot(loading, '06-loading');
  await loading.close();

  const empty = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mock(empty, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await empty.goto(BASE + '/', { waitUntil: 'load' });
  await empty.waitForTimeout(700);
  await shot(empty, '07-empty');
  await empty.close();

  const error = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mock(error, (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Database is locked' }),
  }));
  await error.goto(BASE + '/', { waitUntil: 'load' });
  await error.waitForTimeout(700);
  await shot(error, '08-error');
  await error.close();

  const search = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await search.goto(BASE + '/', { waitUntil: 'load' });
  await search.waitForTimeout(800);
  await search.getByTestId('search').fill('абракадабра');
  await search.waitForTimeout(700);
  await shot(search, '09-search-empty');
  await search.close();

  await browser.close();
})();
