# Иконки приложения

Положи сюда `app-icon.png` (1024×1024) и сгенерируй полный набор:

```bash
cd packages/polly
pnpm tauri icon path/to/app-icon.png
```

Это создаст:
- `32x32.png`, `128x128.png`, `128x128@2x.png` (для Linux)
- `icon.icns` (для macOS)
- `icon.ico` (для Windows)
- иконки для всех вариантов Windows-инсталлятора (Square*, StoreLogo)

До этого момента `pnpm tauri build` будет ругаться — но `pnpm tauri dev` обычно стартует и без них (показывает дефолтную).
