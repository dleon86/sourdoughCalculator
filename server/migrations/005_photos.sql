-- Photos belong to a bake. The file itself lives in storage (Blob in the
-- cloud, uploads/ locally) under storage_key.
CREATE TABLE photos (
  id           SERIAL PRIMARY KEY,
  bake_id      INTEGER NOT NULL REFERENCES bakes(id) ON DELETE CASCADE,
  storage_key  TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  width        INTEGER,
  height       INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX photos_bake_id_idx ON photos (bake_id, id);
