---
description: "Task list for 001-priority-flags"
---

# Tasks: Приоритеты задач

**Input**: Design documents from `/specs/001-priority-flags/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tasks-api.md

**Tests**: включены обязательно — конституция TaskFlow (принцип IV) требует тестов как условия готовности.

**Organization**: задачи сгруппированы по пользовательским историям, чтобы каждую можно было проверить отдельно.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно выполнять параллельно (другие файлы, нет зависимостей)
- **[Story]**: к какой истории относится задача (US1, US2, US3)
- В описании указан точный путь файла

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: подтвердить, что скопированный проект в исходном состоянии зелёный

- [x] T001 Прогнать `npm test` в корне проекта и зафиксировать базовую линию (ожидается 25 pass, 0 fail)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: схема данных и контракт API, без которых не работает ни одна история

**⚠️ CRITICAL**: истории не начинаются, пока фаза не завершена

- [x] T002 Добавить колонку `priority INTEGER NOT NULL DEFAULT 1` идемпотентной миграцией, константу допустимых значений, `normalizePriority`, поддержку `priority` в `add()` и в списке разрешённых полей `update()` в `src/db.js`
- [x] T003 Добавить валидацию `priority` (целое 1–4) в POST и PUT с ответом `400 {"error":"Priority must be an integer from 1 to 4"}` в `src/routes/tasks.js` (зависит от T002)
- [x] T004 [P] Добавить CSS-переменные `--prio-1..--prio-4` и базовые классы `.priority-flag`, `.priority-menu` в `public/style.css`

**Checkpoint**: API принимает и возвращает приоритет; цвета описаны в стилях

---

## Phase 3: User Story 1 - Назначение приоритета через меню флажка (Priority: P1) 🎯 MVP

**Goal**: пользователь открывает меню по клику на флажок и назначает приоритет 1–4

**Independent Test**: нажать флажок задачи, выбрать `High`, увидеть оранжевый флажок и значение 3 после перезагрузки страницы

### Tests for User Story 1

> **NOTE: сначала тесты, затем реализация**

- [x] T005 [P] [US1] Unit-тесты `add()`/`update()` для `priority`: значение по умолчанию 1, явные 1 и 4, изменение через update, `updated_at` меняется в `test/db.test.js`
- [x] T006 [P] [US1] API-тесты: POST с `priority: 3` возвращает 201 и 3; PUT `{"priority": 4}` меняет значение; PUT `{"priority": 5}` и `{"priority": "high"}` дают 400 и не меняют сохранённое значение в `test/api.test.js`

### Implementation for User Story 1

- [x] T007 [US1] Добавить состояние `openPriorityId`, кнопку-флажок в `taskHTML()` и меню из четырёх вариантов в `public/app.js`
- [x] T008 [US1] Реализовать `setPriority(id, value)`: PUT через `api()`, блокировка повторных кликов, закрытие меню, полная перерисовка через `loadTasks()` в `public/app.js` (зависит от T007)
- [x] T009 [US1] Закрывать меню по клику вне `.priority-menu` и по `Escape`, не меняя приоритет, в `public/app.js` (зависит от T007)

**Checkpoint**: US1 работает и проверяется независимо от US2/US3

---

## Phase 4: User Story 2 - Цветовая индикация приоритета (Priority: P2)

**Goal**: флажок окрашен по приоритету: 1 серый, 2 синий, 3 оранжевый, 4 красный — и у выполненных задач тоже

**Independent Test**: четыре задачи с приоритетами 1–4 показывают четыре разных цвета; после отметки выполненной цвет не меняется

### Implementation for User Story 2

- [x] T010 [P] [US2] Разметка флажка: инлайновый SVG с `fill: currentColor`, атрибут `data-priority`, `aria-label` и `title` с названием приоритета в `public/app.js`
- [x] T011 [US2] Правила `.priority-flag[data-priority="1..4"] { color: var(--prio-N) }`, подсветка активного варианта в меню, отсутствие `opacity` для выполненных задач в `public/style.css`
- [x] T012 [US2] Проверить, что цвет не приглушается правилом `.task-item.completed` и что флажок фокусируется клавиатурой (`:focus-visible`) в `public/style.css`

**Checkpoint**: US2 проверяема визуально на четырёх задачах

---

## Phase 5: User Story 3 - Сохранение и совместимость со старыми задачами (Priority: P3)

**Goal**: приоритет переживает перезапуск, а задачи без поля показываются с приоритетом 1

**Independent Test**: перезапустить приложение и увидеть сохранённый приоритет; открыть старую задачу и увидеть 1

### Tests for User Story 3

- [x] T013 [P] [US3] Unit-тест на чтение задачи с `NULL` и с некорректным `priority` (прямой `UPDATE` в тестовой БД) — ожидается 1 и отсутствие исключения в `test/db.test.js`

### Implementation for User Story 3

- [x] T014 [US3] Нормализация значения в `normalizePriority` на всех путях чтения (`all`, `getById`, `search`, `add`, `update`) в `src/db.js` (зависит от T002)
- [x] T015 [US3] Проверить сохранение приоритета после перезапуска сервера и после перезагрузки страницы по шагам `quickstart.md`

**Checkpoint**: все три истории работают независимо и вместе

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T016 [P] Обновить `README.md`: описать поле приоритета и способы его изменения
- [x] T017 Прогнать `npm test` (все тесты, включая прежние 25) и добиться 0 падений
- [x] T018 Прогнать `bash scripts/verify.sh` и получить `VERIFY: OK`
- [x] T019 Пройти ручные сценарии интерфейса из `quickstart.md` (меню, цвета, Esc, выполненные задачи, поиск)
- [x] T020 Отметить выполненные задачи в этом файле и сверить спеку с реализацией (`/speckit.converge`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: без зависимостей
- **Foundational (Phase 2)**: после Setup; блокирует все истории
- **User Stories (Phase 3–5)**: после Foundational; внутри идут в порядке P1 → P2 → P3
- **Polish**: после всех историй

### User Story Dependencies

- **US1 (P1)**: зависит только от Foundational
- **US2 (P2)**: зависит от Foundational; разметку флажка (T010) удобно делать после T007, но история проверяема отдельно по цветам
- **US3 (P3)**: зависит от Foundational; нормализация (T014) не ломает US1/US2

### Within Each User Story

- Тесты пишутся и падают до реализации
- Слой данных до маршрута, маршрут до UI
- История считается готовой только после `npm test` без падений

### Parallel Opportunities

- T004, T005, T006, T010, T013, T016 — разные файлы, могут идти параллельно
- T002 → T003 и T002 → T014 последовательны (один файл `src/db.js`)
- T007 → T008/T009 последовательны (один файл `public/app.js`)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 — назначение приоритета
4. **STOP and VALIDATE**: ручная проверка меню и `npm test`

### Incremental Delivery

1. Setup + Foundational → API уже умеет хранить приоритет
2. US1 → назначение через меню (MVP)
3. US2 → цветовая индикация
4. US3 → сохранение и совместимость
5. Polish → verify.sh и quickstart

---

## Notes

- [P] = разные файлы, нет зависимостей
- Метка [Story] связывает задачу со спецификацией
- Не ослаблять существующие тесты ради зелёного прогона
- Останавливаться на чекпоинтах и проверять историю отдельно
