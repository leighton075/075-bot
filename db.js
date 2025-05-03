const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'admin',
    password: '53444866',
    database: 'steam-data',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();
