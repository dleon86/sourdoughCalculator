from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database connection configuration
DB_HOST = "localhost"
DB_NAME = "sourdough_recipes"
DB_USER = "sourdough_user"
DB_PASS = "your_password"

def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    return conn

@app.route('/api/recipes', methods=['POST'])
def add_recipe():
    data = request.json
    final_mass = data.get('finalMass')
    hydration = data.get('hydration')
    salt_percent = data.get('saltPercent')
    starter_percent = data.get('starterPercent')
    flour_types = data.get('flourTypes')  # Should be a list
    flour_masses = data.get('flourMasses')  # Should be a list
    water_mass = data.get('waterMass')
    salt_mass = data.get('saltMass')
    starter_mass = data.get('starterMass')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO recipes (final_mass, hydration, salt_percent, starter_percent, flour_types, flour_masses, water_mass, salt_mass, starter_mass)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
        """,
        (
            final_mass,
            hydration,
            salt_percent,
            starter_percent,
            json.dumps(flour_types),
            json.dumps(flour_masses),
            water_mass,
            salt_mass,
            starter_mass
        )
    )
    recipe_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Recipe added", "id": recipe_id}), 201

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM recipes ORDER BY date_time DESC;")
    recipes = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(recipes), 200

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM recipes WHERE id = %s;", (recipe_id,))
    recipe = cursor.fetchone()
    cursor.close()
    conn.close()
    if recipe:
        return jsonify(recipe), 200
    else:
        return jsonify({"message": "Recipe not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)

