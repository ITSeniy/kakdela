-- Полнотекстовый поиск по сообщениям (T-066).
-- Конфигурация 'russian' даёт нормальную морфологию для кириллицы; для
-- английского она тоже сработает (стеммер уберёт окончания, но не сделает
-- глупостей). STORED-генерация дешевле, чем триггер: postgres сам ведёт
-- консистентность колонки на INSERT/UPDATE.

ALTER TABLE "messages"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('russian', "content")) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_search_vector_idx"
  ON "messages" USING GIN ("search_vector");
