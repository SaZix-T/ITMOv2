# API Contract: приоритет задачи

**Feature**: `001-priority-flags` | **Base**: `/api/tasks`

Контракт расширяет существующее API: все прежние поля и статусы сохраняются, добавляется поле `priority`.

## Task object (ответ API)

```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "",
  "completed": 0,
  "due_date": null,
  "created_at": "2026-10-27 11:42:10",
  "updated_at": "2026-10-27 11:42:10",
  "priority": 1
}
```

Правила:
- `priority` — целое 1–4, всегда присутствует в ответе.
- Порядок элементов в `GET /api/tasks` не меняется: `created_at DESC`.
- `search` (`GET /api/tasks?q=`) возвращает те же поля; поиск по приоритету не выполняется.

## POST /api/tasks

Создание задачи.

Тело (JSON):

| Поле | Тип | Обязательное | Правило |
|---|---|---|---|
| title | string | да | непустое после trim |
| description | string | нет | по умолчанию `""` |
| due_date | string \| null | нет | ISO-дата или `null` |
| priority | integer | нет | 1–4; по умолчанию 1 |

Ответы:
- `201` — созданная задача с `priority`.
- `400 {"error":"Title is required"}` — пустой title.
- `400 {"error":"Priority must be an integer from 1 to 4"}` — `priority` не в диапазоне, не целое или не число.

## PUT /api/tasks/:id

Обновление задачи. Любое подмножество полей, включая `priority`.

Пример: `{"priority": 4}` → `200` с задачей, где `priority = 4`, `updated_at` обновлён.

Ответы:
- `200` — обновлённая задача.
- `400 {"error":"Priority must be an integer from 1 to 4"}` — некорректное значение; сохранённый приоритет не меняется.
- `404 {"error":"Task not found"}` — задача отсутствует.

## GET /api/tasks/:id

`200` — задача с `priority`; `404 {"error":"Task not found"}` — нет такой задачи.

## DELETE /api/tasks/:id

Без изменений: `200 {"ok":true}` либо `404`.

## Границы значений приоритета

| Вход | Результат |
|---|---|
| `1`, `2`, `3`, `4` (число) | принимается |
| `"3"` (строка с числом из формы) | приводится к числу и принимается |
| `0`, `5`, `-1`, `2.5`, `"high"`, `null`, `` (пусто) | `400`, значение не меняется |
| поле отсутствует в PUT | приоритет не меняется |
