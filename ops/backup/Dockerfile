# Backup-контейнер: pg_dump (postgres 17 client) + mc + dcron + rsync.
# Запускается сервисом `backup` в docker-compose.prod.yml.
#
# Базируемся на postgres:17-alpine — у него уже есть pg_dump/psql той же
# версии, что и сервер, и набор переменных PG*. Сверху докладываем
# mc (binary), dcron, rsync.

FROM postgres:17-alpine

ARG MC_VERSION=RELEASE.2025-01-17T23-25-50Z

RUN apk add --no-cache \
        dcron \
        rsync \
        bash \
        gzip \
        ca-certificates \
        curl \
 && curl -fsSL "https://dl.min.io/client/mc/release/linux-amd64/archive/mc.${MC_VERSION}" -o /usr/local/bin/mc \
 && chmod +x /usr/local/bin/mc \
 && apk del curl

# Скрипты монтируются как volume в prod-compose. Копируем их в образ
# тоже — чтобы `docker run` работал из коробки без bind-mount'а.
COPY backup.sh  /usr/local/bin/kd-backup
COPY restore.sh /usr/local/bin/kd-restore
RUN chmod +x /usr/local/bin/kd-backup /usr/local/bin/kd-restore

# Cron-задача: каждый день в 04:00 UTC. Лог редиректим в stdout пида 1
# (cron), чтобы `docker logs backup` показывал, как идут запуски.
RUN mkdir -p /etc/crontabs \
 && printf '0 4 * * * /usr/local/bin/kd-backup >> /proc/1/fd/1 2>&1\n' \
    > /etc/crontabs/root \
 && chmod 0600 /etc/crontabs/root

# postgres-image ставит свой entrypoint, который инициализирует кластер;
# нам этого не нужно — мы только клиент. Сбрасываем оба.
ENTRYPOINT []
CMD ["crond", "-f", "-l", "8", "-L", "/dev/stdout"]
