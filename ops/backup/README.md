# Бэкапы КакДела

Ежесуточно делаем `pg_dump` базы и зеркалим оба MinIO-bucket'а. Хранится локально с ротацией; off-site копия — опциональный шаг через `rsync` или `aws s3 sync`.

## Что входит в снимок

| Файл                                  | Содержимое                                           |
| ------------------------------------- | ---------------------------------------------------- |
| `/backups/pg-<TS>.sql.gz`              | Полный дамп postgres (`pg_dump --clean --if-exists`) |
| `/backups/minio-<TS>/kakdela/`         | Все attachments (avatars, files, snapshots)          |
| `/backups/minio-<TS>/kakdela-emoji/`   | Custom emoji                                          |

`TS` — UTC timestamp `YYYYMMDD-HHMMSSZ`. Дамп postgres сжимается gzip'ом, MinIO копируется «как есть» (там и так уже сжатые форматы — png/webm/jpeg).

## Регулярный бэкап (cron в контейнере)

Сервис `backup` в `docker-compose.prod.yml` собирается из `ops/backup/Dockerfile` (alpine + pg client + mc + dcron + rsync) и запускает `kd-backup` каждый день в **04:00 UTC**.

```bash
docker compose -f docker-compose.prod.yml up -d backup
docker compose -f docker-compose.prod.yml logs -f backup     # смотри запуски
```

## Ручной запуск

Из контейнера:
```bash
docker compose -f docker-compose.prod.yml exec backup kd-backup
```

Из репозитория, через админский CLI:
```bash
pnpm big-cheese backup
```

`big-cheese` использует `docker compose exec` под капотом — удобно перед опасными миграциями.

## Восстановление

```bash
# Список доступных снимков:
docker compose -f docker-compose.prod.yml exec backup kd-restore --help

# Восстановить конкретный:
docker compose -f docker-compose.prod.yml exec backup \
    kd-restore pg-20260523-040000Z.sql.gz

# Только база, без файлов:
docker compose -f docker-compose.prod.yml exec backup \
    kd-restore pg-20260523-040000Z.sql.gz --skip-minio
```

Скрипт спросит подтверждение (`YES`), потом:
1. Через `psql` восстанавливает postgres (дамп сам дропает таблицы — `--clean --if-exists` в `pg_dump`).
2. `mc mirror --remove` восстанавливает оба bucket'а в точное состояние снимка (всё, чего нет в бэкапе — удаляется).

**Перед restore'ом** сделай свежий бэкап текущего состояния — иначе откатиться от неудачного восстановления будет неоткуда.

## Ротация

Контролируется `BACKUP_RETENTION_DAYS` (default `14`). Скрипт удаляет всё в `/backups`, старше указанного срока — и `pg-*.sql.gz`, и каталоги `minio-*/`. Если хочешь долгое хранение — настрой off-site, где собственная политика ротации.

## Off-site

В `.env` добавь:
```
OFFSITE_RSYNC_TARGET=user@nas.local:/data/kakdela/
```
После каждого успешного бэкапа `backup.sh` сделает `rsync -avz --delete-after $BACKUP_DIR/ $OFFSITE_RSYNC_TARGET/`.

Для ssh-ключа раскомментируй volume в `docker-compose.prod.yml`:
```yaml
- ./ops/backup/id_ed25519:/root/.ssh/id_ed25519:ro
```
Никогда не коммить приватный ключ в репо — добавь `ops/backup/id_*` в `.gitignore`.

Альтернативы off-site:
- **AWS S3 / Backblaze B2**: замени rsync на `aws s3 sync $BACKUP_DIR s3://my-offsite-bucket/kakdela/` (поставь `aws-cli` или используй уже установленный `mc` с alias на удалённый bucket).
- **Restic / Borg** — если хочешь дедупликацию и шифрование. Обёрткой над текущим `backup.sh` это вписывается без проблем.

## Что не покрыто

- **Point-in-time recovery** (WAL archiving): для 15–20 друзей overkill, потеря ≤ 24 ч приемлема.
- **Шифрование локального снимка**: если volume на отдельном диске с FDE — достаточно. Иначе оборачивай `pg_dump` в `gpg --symmetric` перед записью.
- **Восстановление в чужой инстанс**: скрипт ориентирован на тот же compose-стек. Для миграции на другое железо — подправь PGHOST/S3_ENDPOINT через env-vars.

## DoD-чеки

| # | Чек                                                         | Команда                                            |
| - | ----------------------------------------------------------- | -------------------------------------------------- |
| 1 | Бэкап создаётся                                              | `docker compose ... exec backup kd-backup`         |
| 2 | Restore поднимает чистую базу                                | `kd-restore pg-XXXX.sql.gz`                        |
| 3 | Ротация удаляет старое                                       | `find /backups -mtime +14`, после 14 дней пусто    |
| 4 | Cron работает                                                | `docker compose ... logs backup` — видно ежедневный запуск |
| 5 | Off-site документирован                                      | этот файл, секция «Off-site»                       |
