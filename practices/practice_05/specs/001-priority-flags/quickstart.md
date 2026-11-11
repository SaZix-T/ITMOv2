# Quickstart: проверка приоритетов задач

**Feature**: `001-priority-flags`

## Автоматическая проверка

```bash
npm test          # unit + API тесты, включая новые проверки priority
bash scripts/verify.sh   # тесты + живой сервер на скретч-порту и скретч-БД
```

Ожидаемо: `npm test` завершается с кодом 0, `verify.sh` печатает `VERIFY: OK`.

## Ручная проверка API

```bash
npm start &                                    # http://localhost:3000
curl -s -X POST localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Priority check","priority":3}'
curl -s -X PUT localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' -d '{"priority":4}'
curl -s -X PUT localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' -d '{"priority":5}'   # 400, приоритет остаётся 4
curl -s localhost:3000/api/tasks/1                          # priority = 4
```

## Ручная проверка интерфейса

1. Открыть `http://localhost:3000`. У каждой задачи слева от названия виден серый флажок (приоритет 1).
2. Нажать флажок — открывается меню из четырёх подписанных вариантов (Low/Medium/High/Critical), каждый окрашен своим цветом.
3. Выбрать `High` — меню закрывается, флажок становится оранжевым, значение сохраняется после `Cmd+R`.
4. Выбрать `Critical` — флажок красный; отметить задачу выполненной — флажок остаётся красным, текст зачёркивается.
5. Открыть меню и нажать `Esc` или кликнуть мимо — меню закрывается, приоритет не меняется.
6. Создать новую задачу — она получает серый флажок (приоритет 1).
7. Открыть задачу, созданную до фичи (старые данные) — флажок серый, список не падает.
8. Набрать поисковый запрос — состав и порядок результатов соответствуют прежнему поведению.

## Ожидаемые артефакты

```text
specs/001-priority-flags/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/tasks-api.md
├── checklists/requirements.md
└── tasks.md
```
