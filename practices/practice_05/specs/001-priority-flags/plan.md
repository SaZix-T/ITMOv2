# Implementation Plan: Приоритеты задач

**Branch**: `001-priority-flags` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-priority-flags/spec.md`

## Summary

Добавить задачам приоритет 1–4: новая колонка `priority` в существующей таблице `tasks`, валидация значения на входе API, иконка флажка в карточке задачи, окрашенная в цвет приоритета (1 серый, 2 синий, 3 оранжевый, 4 красный), и меню из четырёх вариантов по нажатию на флажок. Технически это расширение существующих слоёв без новых зависимостей: миграция — идемпотентный `ALTER TABLE` в `src/db.js` (как уже сделано для `due_date`), HTTP-валидация — в `src/routes/tasks.js`, UI — полная перерисовка списка в `public/app.js` с CSS-переменными цвета в `public/style.css`.

## Technical Context

**Language/Version**: JavaScript (ES2020), Node.js 24.11.0 локально (требование проекта — >= 18)

**Primary Dependencies**: Express 4.21, better-sqlite3 11.6 — существующие; новых зависимостей нет

**Storage**: SQLite (файл `data/taskflow.db`, WAL), слой доступа — `src/db.js`

**Testing**: встроенный `node:test` + `node:assert`, тесты `test/db.test.js` и `test/api.test.js`

**Target Platform**: локальный веб-сервер macOS/Linux, браузер с поддержкой ES2020

**Project Type**: web-service с серверным API и статическим SPA без сборки

**Performance Goals**: без изменений — список личных задач (десятки-сотни записей); смена приоритета укладывается в один PUT-запрос

**Constraints**: без новых npm-зависимостей, без сборки и TS, без фронтенд-фреймворка; существующие тесты и поведение API не должны сломаться

**Scale/Scope**: 1 пользователь, 1 таблица, 4 значения приоритета, изменения в 4 файлах кода и 2 файлах тестов

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Проверка | Статус |
|---|---|---|
| I. Слоистая архитектура, SQL только в `db.js` | `priority` добавляется в подготовленные запросы `src/db.js`; маршрут только валидирует и передаёт поле | PASS |
| II. Явная валидация и `{ error }` | `priority` проверяется на 400 в POST и PUT, ответы в едином формате | PASS |
| III. Ванильный фронтенд, `api()`, полная перерисовка, `esc()` | меню и флажок — часть `render()`, сохранение через `api()`, подписи экранируются | PASS |
| IV. Тесты — условие готовности | добавлены unit- и API-тесты на приоритет; `npm test` обязателен перед завершением | PASS |
| V. Простота, идемпотентная миграция, без новых зависимостей | `ALTER TABLE ... ADD COLUMN priority INTEGER NOT NULL DEFAULT 1` в `try/catch`; зависимостей не добавлено | PASS |

Нарушений нет, раздел Complexity Tracking не заполняется.

## Project Structure

### Documentation (this feature)

```text
specs/001-priority-flags/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/tasks-api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
server.js                     # без изменений
src/db.js                     # миграция priority, нормализация, allowed-поля update
src/routes/tasks.js           # валидация priority в POST/PUT
public/index.html             # без изменений
public/app.js                 # флажок, меню, обработчики, состояние openPriorityId
public/style.css              # --prio-1..4, .priority-flag, .priority-menu
test/db.test.js               # unit-тесты приоритета
test/api.test.js              # контрактные тесты API приоритета
```

**Structure Decision**: используется существующая структура TaskFlow (single project: Express + `public/`), новые каталоги не создаются. Все изменения локализованы в слое данных, маршруте и статике клиента.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Нарушений конституции нет.
