// Every migration, in order. Names keep their original .sql form because
// that's what's recorded in schema_migrations. Add new ones at the end.
import m001 from './001_init.js';
import m002 from './002_flour_basis.js';
import m003 from './003_starters.js';
import m004 from './004_bake_timer.js';
import m005 from './005_photos.js';

export default [
  ['001_init.sql', m001],
  ['002_flour_basis.sql', m002],
  ['003_starters.sql', m003],
  ['004_bake_timer.sql', m004],
  ['005_photos.sql', m005],
];
