# Карточки задач

50 задач в 6 фазах. Каждая карточка — самостоятельный промпт для Claude Code: открой, скопируй, вставь в новый чат.

В шапке каждой карточки — рекомендация по модели и уровню рассуждений:
- **Opus 4.7 · `high`** — архитектура, WebRTC, безопасность, сложные race conditions
- **Sonnet 4.6 · `medium`** — типовая фича по дизайну, CRUD-эндпоинты, UI компоненты
- **Haiku 4.5 · `low`** — boilerplate, переименования, конфиги

---

## Фаза 0 — Фундамент

Цель: скаффолд работает, инфра поднята, базовый /healthz отвечает, окно Tauri открывается.

| # | Что | Модель |
|---|-----|--------|
| T-001 | pnpm workspaces — проверка и достройка | Haiku |
| T-002 | docker-compose поднимается на чистой машине | Haiku |
| T-003 | Speedy — Fastify bootstrap + /healthz | Sonnet |
| T-004 | Polly — Tauri окно + Vite + Tailwind + темизация | Sonnet |
| T-005 | Ginzu — первые shared-типы | Haiku |
| T-006 | Francine — drizzle config + первая миграция | Sonnet |
| T-007 | Caddy reverse-proxy для dev (опционально) | Haiku |

---

## Фаза 1 — Текстовый дом

Цель: можно зарегистрироваться, войти, написать сообщение, увидеть его у собеседника realtime.

| # | Что | Модель |
|---|-----|--------|
| T-010 | Auth — register/login/refresh/me, argon2id, JWT | **Opus** |
| T-011 | Инвайт-коды | Sonnet |
| T-012 | Экран Auth (login / register) | Sonnet |
| T-013 | Экран Onboarding (ввод инвайт-кода) | Sonnet |
| T-014 | Дефолтный сервер при francine seed | Haiku |
| T-015 | REST — список серверов, детали, каналы | Sonnet |
| T-016 | REST — история сообщений (cursor) и отправка | Sonnet |
| T-017 | WS gateway — hello/ready, broadcast | **Opus** |
| T-018 | Главный шелл — рельса серверов + каналы + члены | Sonnet |
| T-019 | Экран Chat — composer и список сообщений | Sonnet |
| T-020 | Presence — online/offline через Redis | Sonnet |
| T-021 | Markdown в сообщениях | Sonnet |
| T-022 | Переключатель темы | Haiku |

---

## Фаза 2 — Голос ⭐ MVP

Цель: можно зайти в voice-канал, говорить и слышать других.

| # | Что | Модель |
|---|-----|--------|
| T-030 | Guido — выдача LiveKit-токенов | **Opus** |
| T-031 | POST /api/voice/:channelId/join | Sonnet |
| T-032 | LiveKit webhooks → WS broadcast | **Opus** |
| T-033 | Клиент — useVoiceRoom(channelId) | **Opus** |
| T-033a | Tauri — разрешение микрофона | Sonnet |
| T-034 | UI голосового канала (без screen share) | Sonnet |
| T-035 | Push-to-talk и voice-activated в настройках | Sonnet |
| T-036 | Active speaker highlight (полировка) | Haiku |
| T-037 | Корректный teardown WebRTC | **Opus** |

---

## Фаза 3 — Демонстрация экрана ⭐ MVP

Цель: можно показать свой экран всем в голосовом канале.

| # | Что | Модель |
|---|-----|--------|
| T-050 | setScreenShareEnabled + UI кнопка | **Opus** |
| T-050a | Захват системного звука — проверка Win10/11 | **Opus** |
| T-051 | Grid layout с screen-share tile'ами | Sonnet |
| T-052 | Quality presets (auto / 1080p30 / 720p30) | Sonnet |
| T-053 | Снапшот кадра демонстрации → в чат | Sonnet |
| T-054 | Стресс-тест — 5 одновременных демо | Sonnet |

**🎉 После T-054 — MVP завершён. Можно деплоить и звать друзей.**

---

## Фаза 4 — Уют

Цель: то, что превращает MVP в нормальный приятный мессенджер.

| # | Что | Модель |
|---|-----|--------|
| T-060 | Реакции на сообщения | Sonnet |
| T-061 | Replies (ответы на сообщения) | Sonnet |
| T-062 | Edit / delete своих сообщений | Sonnet |
| T-063 | Attachments — files & images | **Opus** |
| T-064 | DM — личные сообщения | Sonnet |
| T-065 | Inbox — упоминания и непрочитанные | Sonnet |
| T-066 | Поиск по сообщениям (tsvector) | Sonnet |
| T-067 | Web Push нотификации (опционально, лучше T-086) | Opus |
| T-068 | Профиль участника как модалка | Sonnet |

---

## Фаза 5 — После бега в проде

Цель: production-readiness, polish, фичи которые «было бы хорошо».

| # | Что | Модель |
|---|-----|--------|
| T-080 | Threads (треды-обсуждения) | **Opus** |
| T-081 | Custom emoji | Sonnet |
| T-082 | Аудит-лог | Sonnet |
| T-083 | Несколько серверов — создание/переключение | Sonnet |
| T-084 | Бэкап-скрипт + cron + восстановление | Sonnet |
| T-085 | Шумоподавление (RNNoise WASM) | **Opus** |
| T-086 | Системный трей + native notifications | Sonnet |

---

## Как пользоваться

1. Открой `tasks/T-XXX.md`.
2. Перед началом скажи Claude Code прочесть:
   - `ARCHITECTURE.md` (релевантные секции — указаны в карточке)
   - `.claude/CONVENTIONS.md` (всегда)
   - `.claude/CURRENT_PHASE.md` (обновляй вручную при переключении фаз)
3. Скопируй содержимое карточки как промпт.
4. По завершении — поставь галочки в чек-листе DoD прямо в файле, commit.
5. Если задача оказалась больше — раздроби, создай `T-XXX_part_a.md`, `T-XXX_part_b.md`.

---

## Зависимости между задачами

```
T-001 → T-002 → T-003,T-004,T-005,T-006 → T-007
                       ↓
                   T-010 (auth) → T-011 (invites) → T-012, T-013
                       ↓                                 ↓
                   T-014 (seed) → T-015 (servers REST) → T-018 (shell)
                                       ↓                       ↓
                                   T-016 (messages REST) → T-019 (chat UI)
                                       ↓                       ↓
                                   T-017 (WS) ←——————————————┘
                                       ↓
                                   T-020 (presence), T-021 (md), T-022 (theme)
                                       ↓
                              T-030 → T-031 → T-032 → T-033/T-033a → T-034 → T-035 → T-036 → T-037
                                                                              ↓
                                                          T-050/T-050a → T-051 → T-052 → T-053 → T-054 ⭐ MVP
                                                                              ↓
                              T-060, T-061, T-062, T-063, T-064, T-065, T-066, T-067, T-068
                                                                              ↓
                              T-080, T-081, T-082, T-083, T-084, T-085, T-086
```

Внутри одной фазы задачи в основном параллелизуемые, но если делаешь сам — лучше по порядку: каждая опирается на предыдущие концептуально.
