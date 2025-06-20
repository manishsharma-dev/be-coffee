// index.js
const express = require('express');
const db = require('./db');
require('dotenv').config();
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Express with PostgreSQL!');
});

// Coffee & PlaceLocation constructors
class PlaceLocation {
  constructor(id, name,address, city, latitude, longitude) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.city = city;
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

class Coffee {
  constructor(id, name, rating,type,notes, placeLocation) {
    this.id = id;
    this.name = name;
    this.rating = rating;
    this.type = type;
    this.notes = notes;
    this.placeLocation = placeLocation;
  }
}

// Sample route to test DB connection
app.get('/coffee', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.id AS coffee_id,
        c.name AS coffee_name,
        c.rating,
        c.type,
        c.notes,
        pl.id AS location_id,
        pl.name AS location_name,
        pl.address,
        pl.city,
        pl.latitude,
        pl.longitude
      FROM coffee c
      JOIN place_location pl ON c.location_id = pl.id
    `);
        
    const coffees = result.rows.map(row => {
      const placeLocation = new PlaceLocation(
        row.location_id,
        row.location_name,
        row.address,
        row.city,
        parseFloat(row.latitude),
        parseFloat(row.longitude)
      );
    
      let coffee = new Coffee(
        row.coffee_id,
        row.coffee_name,
        row.rating,
        row.type,
        row.notes,
        placeLocation
      );
      coffee = {
      ...coffee,
      place: placeLocation.name,
      location: {
        id: placeLocation.id,        
        address: placeLocation.address,
        city: placeLocation.city,
        latitude: placeLocation.latitude,
        longitude: placeLocation.longitude
      }
    }
    delete coffee.placeLocation;
      return coffee;
    });
    res.json(coffees);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.get('/coffee/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT
        c.id AS coffee_id,
        c.name AS coffee_name,
        c.rating,
        c.type,
        c.notes,
        pl.id AS location_id,
        pl.name AS location_name,
        pl.address,
        pl.city,
        pl.latitude,
        pl.longitude
      FROM coffee c
      JOIN place_location pl ON c.location_id = pl.id
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Coffee not found');
    }
    const row = result.rows[0];
    const placeLocation = new PlaceLocation(
      row.location_id,
      row.location_name,
      row.address,
      row.city,
      parseFloat(row.latitude),
      parseFloat(row.longitude)
    );
    let coffee = new Coffee(
      row.coffee_id,
      row.coffee_name,
      row.rating,
      row.type,
      row.notes,
      placeLocation
    );
    coffee = {
      ...coffee,
      place: placeLocation.name,
      location: {
        id: placeLocation.id,        
        address: placeLocation.address,
        city: placeLocation.city,
        latitude: placeLocation.latitude,
        longitude: placeLocation.longitude
      }
    }
    delete coffee.placeLocation;
    res.json(coffee);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.post('/coffee', async (req, res) => {
  const { name, place, rating, type, notes, location } = req.body;
  const client = await db.connect();
  try {

    await client.query('BEGIN');

    const locationResult = await client.query(
      `INSERT INTO place_location (name,address, city, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [place, location.address, location.city, location.latitude, location.longitude]
    );

    const locationId = locationResult.rows[0].id;

    const result = await client.query(
      'INSERT INTO coffee (name, rating, type, notes, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, rating, type, notes, locationId]
    );
    await client.query('COMMIT'); 
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send(err);
  } finally {
    client.release();
  }
});

app.put('/coffee/:id', async (req, res) => {
  const { id } = req.params;
  const { name, place, rating, type, notes, location } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const locationResult = await client.query(
      `UPDATE place_location
       SET name = $1, address = $2, city = $3, latitude = $4, longitude = $5
       WHERE id = $6`,
      [place, location.address, location.city, location.latitude, location.longitude, location.id]
    );

    const result = await client.query(
      'UPDATE coffee SET name = $1, rating = $2, type = $3, notes = $4 WHERE id = $5 RETURNING *',
      [name, rating, type, notes, id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send(err);
  } finally {
    client.release();
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});