# CURRENT_PHASE

> Этот файл обновляется руками каждый раз, когда мы переходим к новой фазе или серии задач.
> Claude Code читает его, чтобы понимать «где мы сейчас» и не предлагать фичи из будущего.

## ✅ Фаза 0 — Фундамент — **ЗАВЕРШЕНА**

Монорепо, docker-compose, `/healthz`, Tauri-окно, ginzu-типы, drizzle-миграция — всё готово.

## ✅ Фаза 1 — Текстовый дом — **ЗАВЕРШЕНА**

Auth, инвайты, сервер, каналы, сообщения, WebSocket real-time, шелл, markdown, presence, переключение тем — всё готово.

## ✅ Фаза 2 — Голос — **ЗАВЕРШЕНА**

Guido (LiveKit-токены), `/api/voice/*` эндпоинты, webhook participant_joined/left, клиентский useVoiceRoom + UI голосового канала, push-to-talk, active speaker, корректный teardown — всё готово.

## ✅ Фаза 3 — Демонстрация экрана — **ЗАВЕРШЕНА** ⭐ MVP достигнут

Screen share через LiveKit: кнопка «демо», grid layout с тайлами, bitrate-настройки (auto / 1080p30 / 720p30), скриншот кадра → MinIO → ephemeral чат, корректный teardown. T-050a (захват системного звука на Win10/11) — код готов, статус ждёт ручного прогона (см. ARCHITECTURE.md §3.5).

## ✅ Фаза 4 — Социалка — **ЗАВЕРШЕНА**

Reactions, replies, edit/delete, attachments (T-063 — с magic-bytes валидацией), DM (T-064 — отдельная dm_channels таблица, hot-attach по WS), Inbox с упоминаниями (T-065 — `mentions` таблица + `mention-extractor`, auto-mark-read через IntersectionObserver), поиск через postgres tsvector + GIN (T-066), профиль участника как модалка с avatar-cropper и сменой пароля (T-068). **T-067 (Web Push) — пропущен**, доделается отдельно: для self-host'а на 15-20 друзей менее критично, чем threads.

---

## Сейчас: **Фаза 5 — Полировка**

### Цель фазы

Превратить «работает» в «приятно». Threads для длинных обсуждений, custom emoji, видео с камеры, бэкапы и аудит-лог для админа. После этой фазы продукт ощущается законченным.

### Статус задач фазы 5 (актуализировано 2026-05-24 после аудита)

- [x] T-080 — Threads: schema (`parentChannelId`/`parentMessageId`/`archivedAt`), backend routes, ThreadPanel sidebar, ThreadBadge на parent сообщении, hot-attach по WS.
- [x] T-081 — Custom emoji: server-scope, upload PNG/GIF (magic-bytes + ≤256KB + ≤128×128), `:name:` shortcode в markdown, picker tab «Сервер», EmojiManagement в settings.
- [x] T-082 — Аудит-лог: таблица `audit_log`, `routes/audit.ts`, `AuditLog.tsx` в server settings, инфраструктура для записи действий.
- [x] T-083 — Multi-server UI: `POST /servers`, CreateServerModal, JoinServerModal, ServerRail кнопка «+», InviteManagement, GeneralSettings (rename/leave/delete), **WelcomeScreen** (post-auth hub, переехал из T-013).
- [x] T-084 — Бэкапы: `ops/backup/` с backup.sh + restore.sh + Dockerfile + cron @ 04:00 UTC, pg_dump.gz + MinIO mirror + ротация 14 дней, off-site rsync опционально.
- [x] T-085 — Шумоподавление: noiseSettings store (persist), VoiceSettings toggle, useNoiseSuppressionSync через MediaTrackConstraints (не WASM — упрощено для MVP, см. карточку T-085).
- [x] T-086 — Native OS notifications + tray: `lib/host/notify.ts` + `lib/host/tray.ts`, Tauri tray icon + badge, debounce 60s на канал, click → focus + jump.
- [ ] T-067 — Web Push: пропущен intentionally (карточка сама говорит «можно пропустить для desktop»).

### Дополнительные задачи (добавлены 2026-05-24 после аудита фаз 1-4)

- [ ] T-087 — Звонок и демо экрана в DM: action-кнопки в DmScreen, voice room `dm-${id}`, IncomingCall toast, decline/cancel.
- [ ] T-088 — DM welcome card («начало переписки с <name>, вы оба в <X>, <Y>») при пустом DM.
- [ ] T-089 — Профиль: timezone + about (расширение `users`, рендер в ProfileModal с «МСК · 11:24»).
- [ ] T-090 — Кастомные роли: per-server теги с цветами (`server_roles` + `member_role_assignments`), pills в профиле, admin-UI. **Большая фича — обсудить с юзером, нужна ли вообще для 15-20 друзей.**
- [ ] T-091 — Search filters UI: channel / author / date sidebar. Backend уже принимает параметры (T-066).
- [ ] T-092 — Toast-система: `lib/toast.ts` через sonner или самописный, замена `console.error` + `window.confirm` на toast с undo.

### Заметка: «видео с камеры»

В предыдущей версии этого файла T-082 был ошибочно записан как «Видео с камеры». Реальная карточка `tasks/T-082.md` — это аудит-лог. Если функционал camera-track в голосовом канале нужен — он логически попадает в T-087 (DM voice + video) или может быть выделен отдельной задачей T-093.

### Чего НЕ делаем в этой фазе

- Friends list / friend requests — мы all-friends-by-default, не нужны.
- Discovery / server listing — не маркетплейс.
- E2EE — overkill для self-host друзей, ломает поиск и превью.
- AutoMod, аналитика, server insights, Activities — out forever.

### Что прочесть Claude Code перед задачей

1. `ARCHITECTURE.md` §12 (Фаза 5 roadmap, если ещё нет — добавить), §5 (data flow), §6 (DB schema)
2. `.claude/CONVENTIONS.md`
3. Эту страницу
4. Карточку задачи `tasks/T-XXX.md`
5. Файлы из «Files in scope» в карточке

---

## Следующая фаза

Нет — Фаза 5 финальная. После неё проект уходит в режим «поддержки и эволюции под фактическое использование».
