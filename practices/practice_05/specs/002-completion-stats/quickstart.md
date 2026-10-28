# Quickstart: проверка статистики выполнений

**Feature**: `002-completion-stats`

## Автоматическая проверка

```bash
npm test                # unit + API тесты статистики и прежние тесты
bash scripts/verify.sh  # тесты + живой сервер на скретч-порту
```

Ожидаемо: `npm test` — 0 падений, `verify.sh` — `VERIFY: OK`.

## Проверка API

```bash
npm start &
curl -s localhost:3000/api/stats/completed | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.today,r.yesterday,r.last7Days,r.last30Days,r.daily.length)})"
# ожидается: четыре числа и 30
```

Подготовка данных по дням (скретч-БД, не трогая рабочую):

```bash
PORT=3457 DB_PATH=./data/stats-demo.db node server.js &
curl -s -X POST localhost:3457/api/tasks -H 'Content-Type: application/json' -d '{"title":"done today"}'
curl -s -X PUT localhost:3457/api/tasks/1 -H 'Content-Type: application/json' -d '{"completed":1}'
curl -s localhost:3457/api/stats/completed
```

## Ручная проверка интерфейса

1. Открыть `http://localhost:3000`, создать 2 задачи, отметить обе выполненными.
2. Переключиться на вкладку «Statistics»: «Today» = 2, «Yesterday» = 0, «Last 7 days» = 2, «Last 30 days» = 2.
3. График «Last 7 days» содержит 7 столбцов, последний — ненулевой; график «Last 30 days» содержит 30 столбцов.
4. Вернуться на «Tasks»: список, приоритеты и поиск работают как раньше.
5. Снять отметку у одной задачи, снова открыть статистику: «Today» = 1.
6. Отметить задачу снова: «Today» = 2 (учитывается новое время выполнения).
7. Обновить страницу: статистика сохраняется (данные серверные).
8. Остановить сервер и открыть вкладку статистики: показывается ошибка с кнопкой «Retry», вкладка задач продолжает работать после запуска сервера.

## Ожидаемые артефакты

```text
specs/002-completion-stats/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/stats-api.md
├── checklists/requirements.md
└── tasks.md
```
