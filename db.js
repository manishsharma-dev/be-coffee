// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  end: () => pool.end(),
};