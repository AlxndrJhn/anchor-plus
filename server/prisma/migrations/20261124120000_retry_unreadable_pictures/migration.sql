-- Pictures with small JPEG flaws (from some scanner apps) couldn't be read
-- before; they're decoded leniently now, so read them again. Picture search
-- marked them with an empty vector; the text reader failed on the same ones.
UPDATE "NoteAttachment" a
SET "textReadAt" = NULL
FROM "PictureEmbedding" e
WHERE e."attachmentId" = a."id"
  AND length(e."vector") = 0
  AND a."text" IS NULL;

DELETE FROM "PictureEmbedding" WHERE length("vector") = 0;
