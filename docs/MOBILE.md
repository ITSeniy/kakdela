# Мобильный клиент (Android) — сборка и разработка

`polly` собирается под Android через Tauri 2 mobile. Мобильный клиент — это
**личный мессенджер 1:1** (cloud-DM, общие с desktop, + секретные чаты), а не
«мобильный Discord»: серверов, каналов, серверных голос-комнат и демо экрана на
мобиле нет. См. видение в `.claude/CURRENT_PHASE.md` (Фаза 6) и карточки
`tasks/T-100…T-103.md`.

---

## Разработка без устройства (`pnpm dev:web`)

Мобильный layout (`app/MobileShell.tsx`) можно проверять прямо в браузере **без
Android-тулчейна**:

```bash
pnpm dev:web        # http://localhost:1420
```

Выбор shell делает `app/useIsMobile.ts`: в web-режиме он смотрит на ширину окна
(`≤ 600px` → мобильный shell). Сузь окно браузера (или DevTools device toolbar) —
увидишь bottom-nav и single-column. На реальном Android/iOS shell включается по
платформе, независимо от размера.

---

## Нативная сборка — требования к окружению

> На текущей машине этот тулчейн **не установлен** (нет `ANDROID_HOME`, rust
> android-таргетов, `cargo-ndk`; JDK 25 вместо 17). До установки `tauri android
> init`/`build` запускать нельзя.

1. **JDK 17** (Temurin/Microsoft OpenJDK). Tauri/Gradle с JDK 25 не дружат —
   поставь именно 17 и проверь `java -version`.
2. **Android SDK + NDK** (через Android Studio или command-line tools). Выставь:
   - `ANDROID_HOME` (или `ANDROID_SDK_ROOT`) → путь к SDK,
   - `NDK_HOME` → `.../ndk/<version>`.
3. **Rust android-таргеты**:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```
4. **cargo-ndk**:
   ```bash
   cargo install cargo-ndk
   ```

---

## Инициализация и сборка

```bash
# один раз — генерит packages/polly/src-tauri/gen/android/
pnpm --filter @kakdela/polly tauri android init

# dev (горячая перезагрузка на эмуляторе/устройстве)
pnpm --filter @kakdela/polly tauri android dev

# сборка APK
pnpm --filter @kakdela/polly tauri android build
# → src-tauri/gen/android/app/build/outputs/apk/...
```

### Что нужно поправить в нативном коде при `init`

- **`src-tauri/src/lib.rs`** — точка входа `#[cfg_attr(mobile, tauri::mobile_entry_point)]`
  уже есть. Но блок `.setup()` с `TrayIconBuilder` и close-to-tray — **desktop-only**.
  Заверни его в `#[cfg(desktop)]`, иначе mobile-сборка не слинкуется (трея и
  именованного окна `main` на Android нет). Плагин `global-shortcut` уже под
  `#[cfg(desktop)]`.
- **`gen/android/.../AndroidManifest.xml`** — добавить permissions:
  `INTERNET`, `RECORD_AUDIO`, `CAMERA` (под голос/видео в DM, T-087).
- **getUserMedia в WebView** — главный риск голоса: Android System WebView требует
  обработки `onPermissionRequest` на нативной стороне. Проверить рано (DoD T-100).

### `gen/android` в git

Рекомендация: **закоммитить** `gen/android` (как и `gen/apple` у других Tauri-проектов) —
правки манифеста/Gradle тогда ревьюятся в diff'е. Альтернатива — `.gitignore` +
регенерация на CI; тогда патчи манифеста надо накатывать скриптом.

---

## JWT-хранилище на Android

Сейчас `lib/host/secrets.ts` — `sessionStorage` (+ httpOnly refresh-cookie для
 re-auth на холодный старт). На Android токен должен лежать в **Android Keystore**
(нативная команда или secure-storage плагин) — это часть T-100, нативная фаза,
делается вместе с `tauri android init`.
