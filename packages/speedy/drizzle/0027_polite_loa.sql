-- Переносим существующие избранные гифки в единую таблицу favorites (kind='gif')
-- до удаления старой таблицы. payload собираем в форме GifFavoritePayload.
INSERT INTO "favorites" ("id", "user_id", "kind", "ref_key", "payload", "created_at")
SELECT
  "id",
  "user_id",
  'gif',
  "gif_url",
  jsonb_build_object(
    'gifUrl', "gif_url",
    'mp4Url', "mp4_url",
    'previewUrl', "preview_url",
    'width', "width",
    'height', "height",
    'title', "title"
  ),
  "created_at"
FROM "gif_favorites"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DROP TABLE "gif_favorites" CASCADE;
