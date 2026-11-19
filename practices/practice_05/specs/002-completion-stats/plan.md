# Implementation Plan: Статистика выполненных задач

**Branch**: `002-completion-stats` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-completion-stats/spec.md`

## Summary

Добавить фиксацию момента выполнения (`completed_at`) и вкладку статистики с четырьмя показателями (сегодня, вчера, 7 дней, 30 дней) и двумя графиками. Сервер отдаёт `GET /api/stats/completed` с непрерывным дневным рядом за 30 дней; клиент рисует инлайновые SVG-столбцы, считая высоты от максимума ряда. Никаких новых зависимостей: SQL-агрегация в `src/db.js`, новый роутер `src/routes/stats.js`, вкладки и графики в `public/app.js` + `public/style.css`.

## Technical Context

**Language/Version**: JavaScript (ES2020), Node.js 24.11.0 локально (проект требует >= 18)

**Primary Dependencies**: Express 4.21, better-sqlite3 11.6 — существующие; новых нет

**Storage**: SQLite (`data/taskflow.db`, WAL), слой доступа `src/db.js`

**Testing**: `node:test` + `node:assert`; `test/db.test.js` (агрегация), `test/api.test.js` (эндпоинт)

**Target Platform**: локальный веб-сервер, браузер с ES2020 и SVG

**Project Type**: web-service + статический SPA без сборки

**Performance Goals**: ответ статистики — один SQL-запрос и ≤ 30 строк; отрисовка вкладки ≤ 1 с (SC-001)

**Constraints**: без новых зависимостей, без сборки, без фреймворков; существующий контракт `/api/tasks` только расширяется; даты — UTC в хранилище, локальные в группировке

**Scale/Scope**: 1 пользователь, до нескольких сотен задач, 30-дневное окно, изменения в 5 файлах кода и 2 файлах тестов

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Проверка | Статус |
|---|---|---|
| I. Слоистая архитектура, SQL только в `db.js` | агрегация и заполнение нулей — в `statsCompleted()`; `src/routes/stats.js` только сериализует | PASS |
| II. Явная валидация и `{ error }` | у эндпоинта нет входа; ошибки уходят в общий `error.js` с 500 и `{ error }` | PASS |
| III. Ванильный фронтенд, `api()`, полная перерисовка, `esc()` | вкладки и графики — строки в `renderStats()`, данные через `api()`, подписи через `esc()` | PASS |
| IV. Тесты — условие готовности | unit-тесты агрегации по дням, API-тест контракта, регрессия прежних 39 тестов | PASS |
| V. Простота, идемпотентная миграция, без новых зависимостей | `ALTER TABLE ... ADD COLUMN completed_at`, backfill `WHERE ... IS NULL`, SVG вместо библиотеки графиков | PASS |

Нарушений нет. Complexity Tracking не заполняется.

## Project Structure

### Documentation (this feature)

```text
specs/002-completion-stats/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/stats-api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
server.js                     # подключение statsRouter к /api/stats
src/db.js                     # колонка completed_at, фиксация при completed, statsCompleted()
src/routes/stats.js           # новый роутер GET /api/stats/completed
src/routes/tasks.js           # без изменений контракта (completed уже поддерживается)
public/index.html             # вкладки Tasks/Statistics, контейнер #stats-view
public/app.js                 # переключение вкладок, загрузка статистики, SVG-графики
public/style.css              # стили вкладок, карточек показателей, графиков
test/db.test.js               # агрегация по дням и границы окна
test/api.test.js              # контракт /api/stats/completed
```

**Structure Decision**: сохраняется текущая структура (single project, Express + `public/`). Новый файл только один — `src/routes/stats.js`, по образцу существующего `src/routes/tasks.js`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Нарушений конституции нет.
