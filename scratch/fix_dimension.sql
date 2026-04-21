ALTER TABLE parties DROP COLUMN embeddings;
ALTER TABLE parties ADD COLUMN embeddings vector(768);
