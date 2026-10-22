// Entry point. Vercel imports the default export; locally we also listen.
import app from './server/app.js';
import { ready } from './server/db.js';

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  try {
    await ready();
  } catch (err) {
    console.error('Could not set up the database. Check the PG* values in .env.\n', err.message);
    process.exit(1);
  }
  app.listen(port, () => console.log(`Bread log running at http://localhost:${port}`));
}
