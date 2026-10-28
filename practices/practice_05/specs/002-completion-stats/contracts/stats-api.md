# API Contract: статистика выполнений

**Feature**: `002-completion-stats` | **Base**: `/api/stats`

## GET /api/stats/completed

Возвращает сводку выполнений и дневной ряд за последние 30 календарных дней. Только чтение, данные задач не изменяются.

Ответ `200 application/json`:

```json
{
  "today": 2,
  "yesterday": 1,
  "last7Days": 5,
  "last30Days": 12,
  "daily": [
    { "date": "2026-09-28", "count": 0 },
    { "date": "2026-09-29", "count": 2 }
  ]
}
```

Правила контракта:
- `daily` содержит ровно 30 элементов, отсортированных от старой даты к сегодняшней.
- Даты в формате `YYYY-MM-DD`, локальная дата сервера.
- Пропущенные дни присутствуют с `count: 0`.
- `today` = `daily[29].count`, `yesterday` = `daily[28].count`.
- `last7Days` = сумма `daily[23..29]`, `last30Days` = сумма всех 30 элементов.
- Все значения — целые неотрицательные числа.

Ошибки:
- `500 {"error":"..."}` — внутренняя ошибка чтения БД; обработчик подключён к общему error middleware.

## Изменения существующего контракта задач

- `PUT /api/tasks/:id` с `completed: 1` дополнительно фиксирует момент выполнения; с `completed: 0` — очищает его.
- `POST /api/tasks` момент выполнения не задаёт (новая задача всегда не выполнена).
- Остальные поля и статусы не меняются; добавление `completed_at` — аддитивное изменение ответа.

## Примеры проверки

```bash
curl -s localhost:3000/api/stats/completed | head -c 200
curl -s -X PUT localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' -d '{"completed":1}'
curl -s localhost:3000/api/stats/completed   # today увеличился на 1
curl -s -X PUT localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' -d '{"completed":0}'
curl -s localhost:3000/api/stats/completed   # today уменьшился на 1
```
