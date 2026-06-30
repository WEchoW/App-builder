// ─────────────────────────────────────────────────────────────
// config.example.js  —  Template for your DB credentials.
// Copy this file to config.js and fill in your values.
// config.js is listed in .gitignore and will never be committed.
// ─────────────────────────────────────────────────────────────
module.exports = {
  port: 3000,           // HTTP port the admin panel listens on
  mssql: {
    server:   'YOUR_SQL_SERVER_IP',
    port:     1433,
    user:     'sa',
    password: 'YOUR_PASSWORD',
    options: {
      trustServerCertificate: true,
      encrypt: false,
    },
  },
};
