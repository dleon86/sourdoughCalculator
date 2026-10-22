// Migration 002_flour_basis.sql. Kept as a JS module so the cloud bundler includes it.
export default /* sql */ `
-- Recipes can start from a dough weight (the original mode) or from an
-- amount of flour on hand. dough_mass is still kept for listing.
ALTER TABLE recipes
  ADD COLUMN basis TEXT NOT NULL DEFAULT 'dough' CHECK (basis IN ('dough', 'flour')),
  ADD COLUMN flour_mass DOUBLE PRECISION CHECK (flour_mass > 0);
`;
