# DEMO — как показывать на защите (OpenCode)

Всё уже настроено и проверено. Запускай OpenCode **из каталога `practices/practice_04`** —
тогда подхватятся и `opencode.json`, и `AGENTS.md`, и `.opencode/skills`, и плагин.

```
cd "/Users/sazix/Desktop/ITMO/Vs Code/Ai/ITMOv2/practices/practice_04"
```

Модель для демо (бесплатная): `opencode/mimo-v2.6-flash-free`.

---

## 0. Что где лежит (карта для защиты)

| Требование ДЗ | Файл | Что показывает |
|---|---|---|
| Правила агента (`AGENTS.md`) | `AGENTS.md` | OpenCode читает его автоматически |
| Skill | `.opencode/skills/taskflow-verify/SKILL.md` | загрузка по требованию через `skill` tool |
| MCP-конфигурация | `opencode.json` | секция `mcp.taskflow` (local, stdio) |
| Свой MCP-сервер | `mcp/taskflow-server.mjs` | один tool `task_summary` |
| Hook (автопроверка) | `.opencode/plugins/taskflow-check.js` | `npm test` после правки source-файла |
| Runner | `scripts/verify.sh` | `npm test` + живой smoke-test сервера |
| Рефлексия | `reflection.md` | — |

Проверить, что OpenCode всё видит:

```
opencode debug config          # покажет mcp.taskflow и плагин в plugin_origins
opencode mcp list              # должен написать: taskflow  connected
```

---

## 1. Средa: правила + skill + MCP (один запуск)

```
opencode run --model opencode/mimo-v2.6-flash-free \
  "Use the taskflow MCP server's task_summary tool with status=overdue. Then load the skill named taskflow-verify with the skill tool. Do not edit any files."
```

Ожидаемый вывод (проверено):

```
⚙ taskflow_task_summary {"status":"overdue"}
→ Skill "taskflow-verify"
```

Что это доказывает: агент **вызвал MCP tool** и **загрузил skill**; правила он берёт из
`AGENTS.md` (он в контексте всегда). Здесь же можно объяснить, зачем подключения:
MCP даёт доступ к данным приложения, skill — процедуру проверки.

---

## 2. Свой MCP: успешный и ошибочный вход

### Вариант А — MCP Inspector (веб-UI, как просили)

```
npx @modelcontextprotocol/inspector node mcp/taskflow-server.mjs
```

Открой http://localhost:6274 → **Connect** → вкладка **Tools** → `task_summary` → **Run**.
- `status = overdue` → список просроченных задач (успешный сценарий);
- очисти аргумент или впиши `status = pending` → ответ с `isError: true` и текстом
  `Invalid status "pending". Allowed values: all, active, completed, overdue.`

### Вариант Б — тот же Inspector, но в консоли (быстро и воспроизводимо)

```
# список инструментов
npx -y @modelcontextprotocol/inspector --cli node mcp/taskflow-server.mjs --method tools/list

# успешный вызов
npx -y @modelcontextprotocol/inspector --cli node mcp/taskflow-server.mjs \
  --method tools/call --tool-name task_summary --tool-arg status=all

# ошибочный вход: неизвестный статус
npx -y @modelcontextprotocol/inspector --cli node mcp/taskflow-server.mjs \
  --method tools/call --tool-name task_summary --tool-arg status=pending
```

Второй сценарий ошибки — когда базы ещё нет:

```
npx -y @modelcontextprotocol/inspector --cli node mcp/taskflow-server.mjs \
  -e TASKFLOW_DB_PATH=/nonexistent/nope.db \
  --method tools/call --tool-name task_summary --tool-arg status=all
# -> isError:true: "Cannot read the TaskFlow database at ... Start the app once with `npm start` ..."
```

---

## 3. Hook: автопроверка после правки

Попроси агента поправить любой файл в `src/`:

```
opencode run --model opencode/mimo-v2.6-flash-free \
  "Append a comment line to src/db.js with the edit tool."
```

В выводе правки появится строка от хука:

```
[taskflow-check] npm test: PASS (25 passed, 0 failed)
```

Если тесты красные — там будет `FAIL` и хвост вывода. Это и есть «автопроверка после
правки, результат возвращается агенту».

---

## 4. Runner и Skill отдельно (для пункта «запуск и проверенный результат»)

```
bash scripts/verify.sh
```

Ожидаемо:

```
PASS  npm test
PASS  GET /api/tasks returns a JSON array
PASS  GET / returns HTML
VERIFY: OK
```

---

## 5. Что сказать про дизайн (ответ на «зачем»)

- **Почему MCP read-only?** Агенту нужны данные приложения, но не право их портить.
- **Почему один tool, а не десять?** Больше инструментов = больше токенов в контексте;
  один полезный закрывает задачу (в README курса прямо сказано: количество подключений
  само по себе баллов не добавляет).
- **Почему hook только на source-путях?** Гонять тесты на правке `README.md` бессмысленно;
  ограничение зоны = меньше шума и времени.
- **Почему `directory`, а не `worktree`?** `worktree` — корень git-репозитория, там нет
  `package.json`; команду надо запускать в каталоге проекта.

## Заготовленный ответ на вопрос «а ошибки были?»

Да: первая версия хука брала `worktree || directory`, из-за чего `npm test` уходил в корень
репозитория и падал с `ENOENT …/ITMOv2/package.json`. Это видно в истории — исправлено на
`directory || worktree`, после чего хук стабильно пишет `PASS (25 passed, 0 failed)`.
