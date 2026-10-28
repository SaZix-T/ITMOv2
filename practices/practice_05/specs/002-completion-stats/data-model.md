# Data Model: Статистика выполненных задач

**Feature**: `002-completion-stats` | **Date**: 2026-10-27

## Сущность Task (расширение)

| Поле | Тип | Ограничения | Изменение |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | без изменений |
| title | TEXT | NOT NULL | без изменений |
| description | TEXT | DEFAULT '' | без изменений |
| completed | INTEGER | DEFAULT 0 | без изменений |
| due_date | TEXT | DEFAULT NULL | без изменений |
| priority | INTEGER | NOT NULL DEFAULT 1 | без изменений (фича 001) |
| created_at | TEXT | DEFAULT datetime('now') | без изменений |
| updated_at | TEXT | DEFAULT datetime('now') | без изменений |
| **completed_at** | **TEXT** | **DEFAULT NULL, UTC `YYYY-MM-DD HH:MM:SS`** | **новое поле** |

### Правила

- `completed_at` заполняется `datetime('now')` (UTC) в момент перехода `completed` из 0 в 1.
- При переходе `1 → 0` поле очищается (`NULL`) — задача выпадает из статистики.
- Поле обновляется только вместе с `completed`: обычное редактирование названия/описания/приоритета его не трогает.
- Для строк, уже выполненных до миграции, значение проставляется из `updated_at` один раз (`WHERE completed = 1 AND completed_at IS NULL`).
- Поле не отдаётся обязательно в API списка задач, но присутствует в ответе (колонка `SELECT *`), что позволяет отлаживать статистику.

## Производная сущность: дневной ряд

Не хранится. Вычисляется SQL-запросом:

```text
SELECT date(completed_at, 'localtime') AS day, COUNT(*) AS count
FROM tasks
WHERE completed = 1
  AND completed_at IS NOT NULL
  AND date(completed_at, 'localtime') >= date('now', 'localtime', '-29 days')
GROUP BY day
```

Сервер дополняет ряд до ровно 30 календарных дней (от `-29` до `0`), вставляя нули для пропущенных дат.

## Производная сущность: StatsSummary

| Поле | Тип | Смысл |
|---|---|---|
| today | integer | количество выполнений за текущую локальную дату |
| yesterday | integer | за предыдущую локальную дату |
| last7Days | integer | сумма за 7 календарных дней включая сегодня |
| last30Days | integer | сумма за 30 календарных дней включая сегодня |
| daily | array<{date, count}> | 30 элементов от старого к новому, без пропусков |

Инварианты:
- `last7Days` = сумма последних 7 элементов `daily`.
- `last30Days` = сумма всех элементов `daily`.
- `today` = последний элемент `daily`, `yesterday` = предпоследний.
- Все значения — неотрицательные целые.

## Границы периода

| Период | Включает | SQL-условие |
|---|---|---|
| Сегодня | текущая локальная дата | `date(completed_at,'localtime') = date('now','localtime')` |
| Вчера | предыдущая локальная дата | `= date('now','localtime','-1 day')` |
| 7 дней | сегодня и 6 предыдущих | `>= date('now','localtime','-6 days')` |
| 30 дней | сегодня и 29 предыдущих | `>= date('now','localtime','-29 days')` |

Задача, выполненная 30+ дней назад, не попадает ни в один показатель и ни в один столбец.
