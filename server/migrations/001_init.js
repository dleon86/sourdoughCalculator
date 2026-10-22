// Migration 001_init.sql. Kept as a JS module so the cloud bundler includes it.
export default /* sql */ `
-- A recipe stores only the inputs of a formula. Gram weights are always
-- derived from these (see public/js/calc.js), so they can never drift.
CREATE TABLE recipes (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  notes             TEXT NOT NULL DEFAULT '',
  dough_mass        DOUBLE PRECISION NOT NULL CHECK (dough_mass > 0),
  hydration         DOUBLE PRECISION NOT NULL CHECK (hydration >= 0),
  salt_pct          DOUBLE PRECISION NOT NULL CHECK (salt_pct >= 0),
  starter_pct       DOUBLE PRECISION NOT NULL CHECK (starter_pct >= 0),
  starter_hydration DOUBLE PRECISION NOT NULL DEFAULT 100 CHECK (starter_hydration >= 0),
  flours            JSONB NOT NULL,              -- [{ "name": "Bread flour", "pct": 80 }, ...]
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A bake keeps a snapshot of the formula it used, so editing or deleting
-- a recipe later never rewrites history.
CREATE TABLE bakes (
  id            SERIAL PRIMARY KEY,
  recipe_id     INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  formula       JSONB NOT NULL,
  baked_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  bulk_minutes  INTEGER CHECK (bulk_minutes >= 0),
  proof_minutes INTEGER CHECK (proof_minutes >= 0),
  cold_proof    BOOLEAN NOT NULL DEFAULT false,
  room_temp     DOUBLE PRECISION,
  oven_temp     DOUBLE PRECISION,
  temp_unit     CHAR(1) NOT NULL DEFAULT 'F' CHECK (temp_unit IN ('F', 'C')),
  bake_minutes  INTEGER CHECK (bake_minutes >= 0),
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bakes_baked_on_idx ON bakes (baked_on DESC);
CREATE INDEX bakes_recipe_id_idx ON bakes (recipe_id);
`;
