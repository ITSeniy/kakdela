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

> **Статус: проверено 2026-06-27.** Тулчейн установлен, APK собран и запущен на
> эмуляторе Pixel 10 Pro (x86_64). Конкретные пути ниже — с машины разработки.

Окружение, на котором собралось (важно: Gradle хочет JDK 17, а системный
`JAVA_HOME` может указывать на новее — выставляй инлайн при сборке):

```bash
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="$ANDROID_HOME/ndk/30.0.14904198"
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export PATH="$JAVA_HOME/bin:$PATH"
```

1. **JDK 17** (Temurin/Adoptium). Tauri/Gradle с JDK 21/25 спотыкаются — собирай
   именно под 17 (`java -version` должен показать 17 в той же оболочке).
2. **Android SDK + NDK** (Android Studio). NDK тут — `30.0.14904198`.
3. **Rust android-таргеты**:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```
4. **cargo-ndk** (`cargo install cargo-ndk`).
5. **protoc** (protobuf-компилятор) — нужен build-скриптам `libsignal-protocol`
   (секретные чаты, T-101). Без него `cargo check`/сборка падают с «Could not find
   `protoc`». Поставить: бинарь с github.com/protocolbuffers/protobuf/releases в
   каталог на PATH (напр. `~/bin/protoc.exe`), либо `choco install protoc`. Проверка:
   `protoc --version`.

Кросс-компиляция Rust под Android (sanity, без полной сборки APK):
```bash
cargo ndk -t x86_64 --platform 24 check   # NB: --platform, не -p (это --package)
```

---

## Инициализация и сборка

`gen/android` уже сгенерирован и закоммичен — `init` повторно не нужен.

```bash
# сборка под архитектуру эмулятора/устройства.
# ЭМУЛЯТОР на Windows x86 → x86_64; ФИЗ. устройство (телефон) → aarch64.
pnpm --filter @kakdela/polly exec tauri android build --debug --target x86_64
# APK → src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk

# dev (горячая перезагрузка)
pnpm --filter @kakdela/polly exec tauri android dev
```

Установка/запуск на эмуляторе (проверенный путь):

```bash
ADB="$ANDROID_HOME/platform-tools/adb.exe"
"$ANDROID_HOME/emulator/emulator.exe" -avd Pixel_10_Pro -no-snapshot &   # подождать boot
MSYS_NO_PATHCONV=1 "$ADB" install -r .../app-universal-debug.apk
"$ADB" shell monkey -p com.kakdela.polly -c android.intent.category.LAUNCHER 1
```

### Адрес backend'а с эмулятора

Клиент берёт базовый URL из `lib/serverUrl.ts`: явный `VITE_SPEEDY_URL` побеждает
всегда; иначе на Android (детект по userAgent) — `http://10.0.2.2:3001` (alias
loopback хоста изнутри эмулятора), на desktop/web — `http://localhost:3001`.
**Реальный телефон** не видит `10.0.2.2` — там адрес сервера задаётся через
`VITE_SPEEDY_URL` (LAN-IP/домен) при сборке APK. Backend должен слушать так,
чтобы быть достижимым с хоста (на `127.0.0.1`/`0.0.0.0` — ок, `10.0.2.2` → хостовый
loopback). Cleartext HTTP разрешён только в debug (`usesCleartextTraffic=true`).

### Грабли (наступили — записано, чтобы не повторять)

- **JAVA_HOME должен быть в Windows-форме.** `tauri android build` зовёт
  `gradlew.bat` (cmd), который НЕ понимает MSYS-путь `/c/Program Files/...` →
  «JAVA_HOME is set to an invalid directory». Экспортируй
  `JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"` (с `C:/`,
  не `/c/`). Прямой `./gradlew` (bash-скрипт) `/c/...` понимает — отсюда разное
  поведение. Если уже есть живой gradle-демон, `gradlew.bat` подключается к нему
  и ошибку не показывает; после `gradlew --stop` — всплывает.
- **`pnpm.bat` не найден в rustBuild-таске.** Gradle RustPlugin (`BuildTask.kt`)
  зовёт `pnpm`→`pnpm.exe`→`pnpm.cmd`→`pnpm.bat`; на Windows с pnpm-standalone есть
  только `pnpm.CMD`, и Java ProcessBuilder его не подхватывает. Воркэраунд: положить
  `pnpm.bat`-шим в каталог на PATH (напр. `~/bin`), форвардящий на
  `%LOCALAPPDATA%\pnpm\bin\pnpm.CMD`. Нужен только когда gradle собирает не-целевые
  ABI; при `--target x86_64` обычно не вызывается.

- **ABI должен совпадать с устройством.** Эмулятор на Windows — `x86_64` (даже если
  в `abilist` есть `arm64-v8a` через трансляцию). Собирай `--target x86_64` под
  эмулятор; arm64 APK либо не встанет, либо будет медленным. `ro.product.cpu.abi`
  показывает реальную ABI.
- **Debug-`.so` огромная (~150 МБ).** Unstripped Rust debug = весь вес APK. Если
  раздел `/data` эмулятора переполнен → `INSTALL_FAILED_INSUFFICIENT_STORAGE`.
  Лечится `-wipe-data` при старте эмулятора (сброс userdata, сам AVD цел) или
  release-сборкой (стрипает символы, но требует подписи). TODO: при желании
  ужать debug-`.so` через `strip`-профиль в Cargo.toml.
- **MSYS коверкает пути.** `adb shell df /data` и `adb install <path>` в Git Bash —
  с `MSYS_NO_PATHCONV=1`, иначе `/data` превращается в `C:/Program Files/...`.
- **JDK.** Системный `JAVA_HOME` может быть 21/25 — Gradle падает; экспортируй 17
  в оболочке сборки (см. блок выше).

### Сделано при `init` (зафиксировано в репо)

- **`src-tauri/src/lib.rs`** — десктопная обвязка (трей, меню, close-to-tray,
  global-shortcut) вынесена в `setup_desktop()` под `#[cfg(desktop)]`; команды
  `focus_main_window`/`set_tray_badge` на mobile — no-op. Иначе Android не
  линкуется (нет tray-icon и окна `main`). `cargo check` (desktop) — зелёный.
- **`AndroidManifest.xml`** — добавлены `RECORD_AUDIO`, `CAMERA` (+`uses-feature`
  необязательными) к уже бывшему `INTERNET`. Под голос/видео в DM (T-087).
- **getUserMedia в WebView** — главный риск голоса: Android System WebView требует
  обработки `onPermissionRequest` на нативной стороне. Проверить при T-087.

### `gen/android` в git

`gen/android` **закоммичен** (как `gen/apple` у других Tauri-проектов) — правки
манифеста/Gradle ревьюятся в diff'е. Вложенные `.gitignore` исключают `build/`,
`.gradle`, `local.properties`, `gen/.../generated/` — в репо только скаффолд (~42 файла).

---

## JWT-хранилище на Android

Сейчас `lib/host/secrets.ts` — `sessionStorage` (+ httpOnly refresh-cookie для
 re-auth на холодный старт). На Android токен должен лежать в **Android Keystore**
(нативная команда или secure-storage плагин) — это часть T-100, нативная фаза,
делается вместе с `tauri android init`.
