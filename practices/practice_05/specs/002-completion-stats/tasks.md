---
description: "Task list for 002-completion-stats"
---

# Tasks: Статистика выполненных задач

**Input**: Design documents from `/specs/002-completion-stats/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/stats-api.md

**Tests**: обязательны — принцип IV конституции TaskFlow.

**Organization**: задачи по историям; каждая история проверяема отдельно.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1, US2, US3
- Точные пути файлов в описании

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: подтвердить зелёную базовую линию перед второй фичей

- [x] T001 Прогнать `npm test` и зафиксировать 39 pass / 0 fail

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: хранение момента выполнения и серверная агрегация

**⚠️ CRITICAL**: без этого не работает ни одна история

- [x] T002 Добавить `completed_at TEXT DEFAULT NULL`, идемпотентную миграцию и backfill `UPDATE tasks SET completed_at = updated_at WHERE completed = 1 AND completed_at IS NULL` в `src/db.js`
- [x] T003 Фиксировать `completed_at` в `update()`: при `completed: 1` — `datetime('now')`, при `completed: 0` — `NULL`, не затрагивая другие поля, в `src/db.js` (зависит от T002)
- [x] T004 Реализовать `statsCompleted()`: один `GROUP BY date(completed_at,'localtime')` по окну 30 дней, заполнение пропущенных дней нулями, расчёт `today`/`yesterday`/`last7Days`/`last30Days` в `src/db.js` (зависит от T002)
- [x] T005 Создать роутер `GET /completed` в `src/routes/stats.js` и подключить его как `/api/stats` в `server.js` (зависит от T004)

**Checkpoint**: `curl /api/stats/completed` отдаёт 30-дневный ряд и четыре числа

---

## Phase 3: User Story 1 - Вкладка статистики с четырьмя показателями (Priority: P1) 🎯 MVP

**Goal**: переключение вкладок и четыре показателя на экране

**Independent Test**: выполнить две задачи, открыть Statistics, увидеть 2/0/2/2 и вернуться к списку без потери состояния

### Tests for User Story 1

- [x] T006 [P] [US1] API-тест: `GET /api/stats/completed` возвращает 200, четыре целых поля и `daily` длиной 30 в `test/api.test.js`

### Implementation for User Story 1

- [x] T007 [US1] Разметка вкладок `Tasks`/`Statistics` с `role="tab"`/`aria-selected` и два контейнера представлений в `public/index.html`
- [x] T008 [US1] Состояние `currentView`, `switchView()`, загрузка статистики при открытии вкладки, состояния loading/error/empty в `public/app.js`
- [x] T009 [US1] Стили вкладок, карточек показателей и сетки в `public/style.css`

**Checkpoint**: US1 проверяется вручную по шагам 1–3 quickstart

---

## Phase 4: User Story 2 - Графики распределения (Priority: P2)

**Goal**: два SVG-графика: 7 дней по дням, 30 дней по дням

**Independent Test**: подставить в БД выполнения на разные дни и сверить суммы столбцов с показателями

### Implementation for User Story 2

- [x] T010 [P] [US2] Функция `barChartHTML(series, options)`: SVG-столбцы с подписями дат, значениями над столбцами, `role="img"` и `aria-label` в `public/app.js`
- [x] T011 [US2] Отрисовка двух графиков в `renderStats()`: последние 7 дней и все 30 дней, защита от деления на ноль и минимальная высота столбца в `public/app.js` (зависит от T010)
- [x] T012 [US2] Стили графиков: оси, подписи, hover-подсветка столбца в `public/style.css`

**Checkpoint**: сумма столбцов равна показателю «7 дней» и «30 дней»

---

## Phase 5: User Story 3 - Корректный учёт момента выполнения (Priority: P3)

**Goal**: статистика следует за фактическим временем выполнения и его отменой

**Independent Test**: выполнить, снять отметку, выполнить снова — показатели меняются на ±1

### Tests for User Story 3

- [x] T013 [P] [US3] Unit-тесты `statsCompleted()`: выполнение «сегодня», «вчера» (`-1 day`), 3 дня назад, 10 дней назад, 40 дней назад (вне окна); снятие отметки выводит задачу из статистики в `test/db.test.js`
- [x] T014 [P] [US3] API-тест: `PUT completed:1` увеличивает `today` на 1, `PUT completed:0` уменьшает на 1 в `test/api.test.js`

### Implementation for User Story 3

- [x] T015 [US3] Убедиться, что обычное редактирование задачи (title/description/priority/due_date) не меняет `completed_at`, и покрыть это тестом в `test/db.test.js` (зависит от T003)

**Checkpoint**: все три истории работают совместно

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T016 [P] Обновить `README.md`: описать вкладку статистики и окно 30 дней
- [x] T017 Прогнать `npm test` (все тесты, включая 39 прежних) — 0 падений
- [x] T018 Прогнать `bash scripts/verify.sh` — `VERIFY: OK`
- [x] T019 Пройти ручные сценарии из `quickstart.md` (вкладки, графики, снятие отметки, ошибка загрузки)
- [x] T020 Отметить задачи в этом файле и сверить реализацию со спекой (`/speckit.converge`)

---

## Dependencies & Execution Order

- **Setup** → **Foundational** (блокирует истории) → **US1** → **US2** → **US3** → **Polish**
- T002 → T003, T002 → T004 → T005 последовательны (общий `src/db.js`)
- T006, T010, T013, T014, T016 — параллельны (разные файлы)
- T008 зависит от T007; T011 зависит от T010; T012 — только CSS

## Parallel Opportunities

- T006 и T007/T009 — разные файлы
- T013/T014 (тесты в двух разных файлах) можно писать одновременно
- T016–T019 выполняются после кода

## Implementation Strategy

### MVP First

1. Setup + Foundational → эндпоинт работает
2. US1 → числа на вкладке (MVP)
3. US2 → графики
4. US3 → корректность учёта и регрессия

## Notes

- Не ослаблять существующие тесты
- Даты в тестах формировать относительно `now`, чтобы не зависеть от календаря
- Проверять суммы столбцов и показателей вместе
