-- Bake-day timer. An 'active' bake is in progress; events are the steps
-- tapped on the timer: [{ "type": "mix", "at": "2026-10-21T14:05:00Z" }, ...].
-- Timings (bulk, proof, bake) are worked out from these when it finishes.
ALTER TABLE bakes
  ADD COLUMN status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('active', 'done')),
  ADD COLUMN events JSONB NOT NULL DEFAULT '[]';

CREATE INDEX bakes_active_idx ON bakes (status) WHERE status = 'active';
