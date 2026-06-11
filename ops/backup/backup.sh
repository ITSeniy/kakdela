#!/usr/bin/env bash
#
# Ежесуточный бэкап КакДела: pg_dump + sync MinIO.
# Запускается из контейнера `backup` (docker-compose.prod.yml) или вручную
# через `pnpm big-cheese backup` (см. packages/big-cheese/src/index.ts).
#
# ВАЖНО: скрипт ожидает, что postgres и minio достижимы по DNS внутри
# compose-сети (`postgres:5432`, `minio:9000`). Если запускаешь снаружи
# compose — переопредели через PGHOST / S3_ENDPOINT.
#
# Переменные окружения:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE  — для pg_dump
#   S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_EMOJI_BUCKET
#   BACKUP_DIR        — куда складывать (def. /backups)
#   RETENTION_DAYS    — сколько суток хранить (def. 14)
#   OFFSITE_RSYNC_TARGET  — опционально, `user@host:/path`. Если задано,
#                           rsync копирует BACKUP_DIR туда после успешного
#                           локального бэкапа.

set -euo pipefail

TS=$(date -u +%Y%m%d-%H%M%SZ)
BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${RETENTION_DAYS:-14}

PGHOST=${PGHOST:-postgres}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-kakdela}
PGDATABASE=${PGDATABASE:-kakdela}

S3_ENDPOINT=${S3_ENDPOINT:-http://minio:9000}
S3_BUCKET=${S3_BUCKET:-kakdela}
S3_EMOJI_BUCKET=${S3_EMOJI_BUCKET:-kakdela-emoji}

log() { echo "[backup $(date -u +%H:%M:%S)] $*"; }

mkdir -p "$BACKUP_DIR"

# ───── 1. Postgres dump ─────
PG_FILE="$BACKUP_DIR/pg-$TS.sql.gz"
log "dumping postgres → $PG_FILE"
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" \
    --no-owner --no-privileges --clean --if-exists \
    "$PGDATABASE" \
  | gzip -9 > "$PG_FILE"

# sanity-check: pg_dump может молча упасть если pipe сломался; проверяем,
# что файл не пустой и весит хоть что-то осмысленное (минимум 1 KB сырого
# `psql` header'а).
if [ ! -s "$PG_FILE" ] || [ "$(stat -c%s "$PG_FILE")" -lt 1024 ]; then
  log "ERROR: dump file is suspiciously small, aborting"
  rm -f "$PG_FILE"
  exit 1
fi

# ───── 2. MinIO mirror ─────
MINIO_DIR="$BACKUP_DIR/minio-$TS"
log "mirroring minio → $MINIO_DIR"
mkdir -p "$MINIO_DIR"

# `mc` принимает alias через ENV-vars MC_HOST_<alias>=<scheme>://AK:SK@host.
# Это удобнее, чем `mc alias set`, который пишет в ~/.mc/config.json.
S3_SCHEME=http
S3_NETLOC=${S3_ENDPOINT#http://}
case "$S3_ENDPOINT" in
  https://*) S3_SCHEME=https; S3_NETLOC=${S3_ENDPOINT#https://} ;;
esac
export MC_HOST_src="${S3_SCHEME}://${S3_ACCESS_KEY}:${S3_SECRET_KEY}@${S3_NETLOC}"
mc mirror --overwrite --quiet "src/$S3_BUCKET"       "$MINIO_DIR/$S3_BUCKET"       || log "warn: main bucket mirror partial"
mc mirror --overwrite --quiet "src/$S3_EMOJI_BUCKET" "$MINIO_DIR/$S3_EMOJI_BUCKET" || log "warn: emoji bucket mirror partial"

# ───── 3. Ротация ─────
# Простое правило: удаляем всё старше RETENTION_DAYS суток.
log "rotating: deleting items older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -maxdepth 1 -name "pg-*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -print -delete || true
find "$BACKUP_DIR" -maxdepth 1 -name "minio-*"     -type d -mtime "+$RETENTION_DAYS" -print -exec rm -rf {} + || true

# ───── 4. Off-site (опционально) ─────
if [ -n "${OFFSITE_RSYNC_TARGET:-}" ]; then
  log "rsyncing to off-site → $OFFSITE_RSYNC_TARGET"
  rsync -avz --delete-after \
    --exclude='*.tmp' \
    "$BACKUP_DIR/" "$OFFSITE_RSYNC_TARGET/"
else
  log "off-site disabled (set OFFSITE_RSYNC_TARGET to enable)"
fi

log "ok: $(du -sh "$PG_FILE" "$MINIO_DIR" | tr '\n' ' ')"
