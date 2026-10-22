CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    final_mass FLOAT NOT NULL,
    hydration FLOAT NOT NULL,
    salt_percent FLOAT NOT NULL,
    starter_percent FLOAT NOT NULL,
    flour_types JSONB NOT NULL,
    flour_masses JSONB NOT NULL,
    water_mass FLOAT NOT NULL,
    salt_mass FLOAT NOT NULL,
    starter_mass FLOAT NOT NULL
); 