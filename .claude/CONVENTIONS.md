# CONVENTIONS

Эти правила Claude Code должен соблюдать **во всех** задачах. Если задача противоречит соглашениям — задача неправа, поправь её.

## Языки и стек

- **TypeScript везде** (никакого .js в /src/, кроме конфигов сборки).
- **Strict mode** включён, `noUncheckedIndexedAccess: true`. Если хочется обойти — пиши комментарий «почему».
- **Backend**: Node 20+, Fastify v5, drizzle-orm, zod для валидации.
- **Frontend**: React 19, Vite, Tailwind, TanStack Query, Zustand, react-router 7.
- **Desktop shell**: Tauri 2. Всё Rust-специфичное живёт **только** в `packages/polly/src-tauri/`. Не зависеть на Tauri API из бизнес-кода — изоляция через `packages/polly/src/lib/host/` (заглушки для web-dev, реальные вызовы для Tauri).
- **Shared types**: всё, что пересекает границу client ↔ server, описывается в `@kakdela/ginzu`.

## Naming

- Файлы: `kebab-case.ts`, компоненты React — `PascalCase.tsx`.
- Переменные/функции: `camelCase`. Константы: `SCREAMING_SNAKE_CASE`.
- Типы и интерфейсы: `PascalCase`, без префикса `I`. Префикс `T` только для дженериков.
- **Таблицы БД и колонки**: `snake_case` (postgres convention).
- **JSON-поля API**: `camelCase`. Преобразование делается в drizzle-mapper'е или Zod-схеме.
- Кодовые имена сервисов (`speedy`, `polly`, ...) живут только в `package.json#name` и названиях директорий. **В коде**, env-переменных, таблицах и UI — обычные слова (`backend`, `client`, `voice`).

## Импорты

- Абсолютные импорты через `@kakdela/*` для cross-package.
- Внутри пакета — относительные `./` и `../`. Не «глубже» двух `../` — это сигнал, что код стоит вынести.
- Группировка: stdlib → внешние → `@kakdela/*` → относительные. Между группами — пустая строка.

## Структура endpoints (speedy)

```
packages/speedy/src/routes/<area>.ts
```

Каждый файл регистрирует Fastify-плагин. Один route файл — одна предметная область (`auth.ts`, `messages.ts`, `voice.ts`).

Шаблон:
```ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const messagesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/channels/:channelId/messages', {
    schema: {
      params: z.object({ channelId: z.string().uuid() }),
      querystring: z.object({ before: z.string().uuid().optional(), limit: z.number().int().max(100).default(50) }),
      response: { 200: z.object({ messages: z.array(MessageSchema), nextCursor: z.string().uuid().nullable() }) },
    },
  }, async (req) => {
    // ...
  })
}
```

## Ошибки

- Никогда не возвращай голый `500`. Любая ошибка должна стать `{ error: { code, message } }` через `app.setErrorHandler`.
- Коды ошибок — kebab-case: `'message-not-found'`, `'rate-limited'`, `'invalid-credentials'`.
- На клиенте — TanStack Query показывает toast с `error.message`. Не свой парсер на каждый запрос.

## Дизайн-токены

- Цвета **никогда** не пиши хардкодом в компонентах. Используй CSS-переменные из `tokens.css` или Tailwind-классы `bg-kd-panel`, `text-kd-textSoft` и т. д.
- Шрифты: `--kd-font` (Inter) для текста, `--kd-mono` (JetBrains Mono) для технических подписей (времена, размеры, IDs).
- Радиус по умолчанию `--kd-radius` (6 px). Не «закругляй на глаз».

## WebSocket

- Все сообщения — JSON, поле `t` = тип события (см. `@kakdela/ginzu/ws-events`).
- Никаких бинарных кадров — простота важнее.
- Подключение через `/ws?token=<jwt>` или (лучше) первым сообщением `{t:'hello',token}`.

## Безопасность

- Пароли — argon2id (пакет `@node-rs/argon2`, не `bcryptjs`).
- JWT-секреты — из env, минимум 64 hex символа.
- Контент-валидация — Zod на каждом эндпоинте.
- Файлы — magic-byte проверка (`file-type` пакет), не только MIME из заголовка.
- Markdown — рендер через `markdown-it` + санитизация DOMPurify. **Никогда** `dangerouslySetInnerHTML` без санитизации.

## Тесты

- Не гонимся за coverage. Тесты пишем для:
  - бизнес-правил (перенос прав, лимиты, инварианты);
  - WebSocket-протокола (можно ли спровоцировать рассинхрон);
  - WebRTC-флоу (join/leave/screen share вручную с чек-листом).
- Vitest для unit, Playwright для e2e (опционально, когда дойдём до фазы 5).

## Коммиты

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- В теле коммита: ссылка на задачу `T-042`, что сделано, что **намеренно** не сделано.
- Один коммит — одна логическая штука. PR может содержать несколько коммитов.

## Что точно нельзя

- ❌ Локальное состояние авторизации в Zustand. JWT — только в OS keychain через Tauri / httpOnly cookie в web-варианте.
- ❌ Эмодзи в логах сервера. Логи парсятся, эмодзи ломают грепы.
- ❌ Использовать moment.js — берём `date-fns`.
- ❌ Создавать Redux. У нас TanStack Query + Zustand, этого хватает с запасом.
- ❌ Тащить UI-киты (MUI, Chakra, shadcn). Дизайн уникальный, компоненты пишем сами по `designs/`.
