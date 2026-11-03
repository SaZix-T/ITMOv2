# TaskFlow — практика 5: spec-driven development

Проект перенесён из `practice_04` и расширен двумя фичами, добавленными по процессу Spec-Driven Development с фреймворком **GitHub Spec Kit 1.2.3** (интеграция `opencode`). Обоснование выбора фреймворка, использованные команды и ход работы — в [REPORT.md](./REPORT.md).

## Что добавлено

1. **Приоритеты задач** (`specs/001-priority-flags/`): приоритет 1–4 у каждой задачи, иконка флажка цветом приоритета (1 серый, 2 синий, 3 оранжевый, 4 красный), меню выбора по клику на флажок.
2. **Статистика выполнений** (`specs/002-completion-stats/`): вкладка Statistics с четырьмя показателями (сегодня, вчера, 7 дней, 30 дней) и двумя SVG-графиками по дням.

## Запуск

```bash
npm install
npm start          # http://localhost:3000
npm test           # node:test, unit + API
bash scripts/verify.sh   # тесты + живой сервер на скретч-порту
```

## API

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/tasks` | список задач (порядок по `created_at DESC`) |
| GET | `/api/tasks?q=` | поиск по названию и описанию |
| POST | `/api/tasks` | создание задачи, `priority` 1–4 (по умолчанию 1) |
| PUT | `/api/tasks/:id` | обновление полей, включая `priority` и `completed` |
| DELETE | `/api/tasks/:id` | удаление задачи |
| GET | `/api/stats/completed` | сводка выполнений и дневной ряд за 30 дней |

`completed_at` фиксируется при отметке задачи выполненной и очищается при снятии отметки; статистика группирует выполнение по локальной календарной дате.

## Артефакты спецификаций

```text
specs/001-priority-flags/    spec.md, plan.md, research.md, data-model.md, quickstart.md,
                             contracts/tasks-api.md, checklists/requirements.md, tasks.md
specs/002-completion-stats/  spec.md, plan.md, research.md, data-model.md, quickstart.md,
                             contracts/stats-api.md, checklists/requirements.md, tasks.md
.specify/memory/constitution.md   принципы проекта (Spec Kit constitution)
```
