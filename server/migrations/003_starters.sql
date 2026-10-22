-- Starters and their feedings. A feeding is "rising" until peaked_at is
-- set, and the time from fed_at to peaked_at is the activity measure the
-- tracker charts against temperature.
CREATE TABLE starters (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  flour      TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  archived   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedings (
  id          SERIAL PRIMARY KEY,
  starter_id  INTEGER NOT NULL REFERENCES starters(id) ON DELETE CASCADE,
  fed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  seed_g      DOUBLE PRECISION CHECK (seed_g >= 0),   -- starter kept
  flour_g     DOUBLE PRECISION CHECK (flour_g >= 0),
  water_g     DOUBLE PRECISION CHECK (water_g >= 0),
  temp        DOUBLE PRECISION,
  temp_unit   CHAR(1) NOT NULL DEFAULT 'F' CHECK (temp_unit IN ('F', 'C')),
  in_warmer   BOOLEAN NOT NULL DEFAULT false,
  peaked_at   TIMESTAMPTZ CHECK (peaked_at IS NULL OR peaked_at > fed_at),
  rise_pct    DOUBLE PRECISION CHECK (rise_pct >= 0),  -- growth: 100 = doubled
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX feedings_starter_fed_idx ON feedings (starter_id, fed_at DESC);

ALTER TABLE bakes ADD COLUMN starter_id INTEGER REFERENCES starters(id) ON DELETE SET NULL;
