
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// --- DATABASE CONNECTION ---
// TODO: Please replace the placeholder values below with your actual
// PostgreSQL database credentials.
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'breadlog',
  password: process.env.PGPASSWORD,
  port: 5432,
});

// API endpoint to save a recipe
app.post('/api/recipes', async (req, res) => {
  const {
    final_mass,
    hydration,
    salt_percent,
    starter_percent,
    flour_types,
    flour_masses,
    water_mass,
    salt_mass,
    starter_mass,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO recipes (
        final_mass, hydration, salt_percent, starter_percent,
        flour_types, flour_masses, water_mass, salt_mass, starter_mass
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        final_mass,
        hydration,
        salt_percent,
        starter_percent,
        JSON.stringify(flour_types),
        JSON.stringify(flour_masses),
        water_mass,
        salt_mass,
        starter_mass,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
