// ─────────────────────────────────────────────────────────────
// config.example.js  —  Template for your credentials.
// Copy this file to config.js and fill in your values.
// config.js is listed in .gitignore and will never be committed.
// ─────────────────────────────────────────────────────────────
module.exports = {
  port: 3000,           // HTTP port the admin panel listens on

  // ── Panel login credentials ─────────────────────────────────
  // Change these before running the panel on any network!
  admin: {
    username: 'admin',
    password: 'CabalAdmin2024!',
  },
  sessionSecret: 'change-this-to-a-random-string-minimum-32-chars',

  // ── MSSQL connection ────────────────────────────────────────
  // You can also change these from the DB Connection page in the panel.
  // Changes are saved to db.json (also gitignored).
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
