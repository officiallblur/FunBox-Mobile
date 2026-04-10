require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not defined. Create a local .env file or set DATABASE_URL in your environment.');
}

const sql = postgres(connectionString);

module.exports = sql;
