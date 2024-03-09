const pgp = require('pg-promise')();
const dbConfig = require('./config');

const db = pgp(dbConfig);

module.exports = db;