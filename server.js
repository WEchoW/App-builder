'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// server.js — Cabal Admin Panel backend
//
// Architecture: one Express app, one shared mssql connection pool.
// All routes are in this file for v1.  When features grow, extract each
// section into its own routes/accounts.js, routes/characters.js, etc. and
// require() them here.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const sql     = require('mssql');
const path    = require('path');
const config  = require('./config');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Database pool ─────────────────────────────────────────────────────────────

let pool    = null;
let dbState = 'connecting';   // 'connecting' | 'connected' | 'error'

async function connectDB() {
  dbState = 'connecting';
  try {
    if (pool) await pool.close().catch(() => {});
    pool = await new sql.ConnectionPool(config.mssql).connect();
    dbState = 'connected';
    console.log('[DB] Connected to', config.mssql.server);

    pool.on('error', err => {
      console.error('[DB] Pool error:', err.message);
      dbState = 'error';
      setTimeout(connectDB, 10_000);
    });
  } catch (err) {
    dbState = 'error';
    console.error('[DB] Connection failed:', err.message, '— retrying in 10s');
    setTimeout(connectDB, 10_000);
  }
}

/** Return the live pool or throw a 503 that our wrap() converts to JSON. */
function db() {
  if (!pool) {
    const err = new Error('Database is not connected yet — check server logs');
    err.status = 503;
    throw err;
  }
  return pool;
}

// ── Route helper ──────────────────────────────────────────────────────────────

/**
 * Wraps an async route handler so any thrown error becomes a JSON response.
 * Express 4 does not catch async errors automatically.
 */
const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(err => {
    const status = typeof err.status === 'number' ? err.status : 500;
    console.error(`[API] ${req.method} ${req.path} →`, err.message);
    res.status(status).json({ error: err.message });
  });

// ── Routes: System ────────────────────────────────────────────────────────────

/**
 * GET /api/status
 * Performs a live SELECT 1 ping so the frontend status dot is always accurate.
 */
app.get('/api/status', wrap(async (req, res) => {
  if (!pool) return res.json({ state: dbState });
  try {
    await pool.request().query('SELECT 1 AS ping');
    res.json({ state: 'connected' });
  } catch {
    res.json({ state: 'error' });
  }
}));

// ── Routes: Accounts ──────────────────────────────────────────────────────────

/**
 * GET /api/accounts/search?id=xxx
 * Looks up one account by login ID.  Also checks cabal_blockuser_table.
 * The Password column is intentionally excluded.
 */
app.get('/api/accounts/search', wrap(async (req, res) => {
  const id = (req.query.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' });

  const result = await db().request()
    .input('id', sql.VarChar(64), id)
    .query(`
      SELECT UserNum, ID, AuthType, Login, LastIp, Email,
             UserName, createDate, LoginCounter
      FROM   [Account].dbo.cabal_auth_table
      WHERE  ID = @id
    `);

  if (!result.recordset.length)
    return res.status(404).json({ error: `Account "${id}" not found` });

  const acc = result.recordset[0];

  // Check ban status.  Wrapped in try/catch in case cabal_blockuser_table
  // doesn't exist on this particular server build.
  try {
    const ban = await db().request()
      .input('usernum', sql.Int, acc.UserNum)
      .query(`
        SELECT TOP 1 *
        FROM   [Account].dbo.cabal_blockuser_table
        WHERE  UserNum = @usernum
      `);
    acc.isBanned = ban.recordset.length > 0;
    acc.banInfo  = ban.recordset[0] ?? null;
  } catch {
    acc.isBanned = false;
    acc.banInfo  = null;
  }

  res.json(acc);
}));

/**
 * PUT /api/accounts/:usernum/authtype
 * Updates the AuthType (GM level) for one account.
 */
app.put('/api/accounts/:usernum/authtype', wrap(async (req, res) => {
  const usernum  = parseInt(req.params.usernum, 10);
  const authType = parseInt(req.body.authType,  10);

  if (isNaN(usernum) || isNaN(authType))
    return res.status(400).json({ error: 'Invalid usernum or authType' });
  if (authType < 0 || authType > 100)
    return res.status(400).json({ error: 'authType must be 0–100' });

  await db().request()
    .input('usernum',  sql.Int, usernum)
    .input('authType', sql.Int, authType)
    .query(`
      UPDATE [Account].dbo.cabal_auth_table
      SET    AuthType = @authType
      WHERE  UserNum  = @usernum
    `);

  res.json({ success: true });
}));

/**
 * PUT /api/accounts/:usernum/forcelogout
 * Clears the Login flag (sets Login = 0).  The game server will see the
 * account as offline on its next tick / session check.
 */
app.put('/api/accounts/:usernum/forcelogout', wrap(async (req, res) => {
  const usernum = parseInt(req.params.usernum, 10);
  if (isNaN(usernum)) return res.status(400).json({ error: 'Invalid usernum' });

  await db().request()
    .input('usernum', sql.Int, usernum)
    .query(`
      UPDATE [Account].dbo.cabal_auth_table
      SET    Login = 0
      WHERE  UserNum = @usernum
    `);

  res.json({ success: true });
}));

/**
 * POST /api/accounts/create
 * Creates a new account.  Tries cabal_tool_registerAccount SP first;
 * falls back to a direct INSERT if the SP doesn't exist on this build.
 *
 * NOTE: The direct INSERT converts the password to VARBINARY(MAX) with
 * CONVERT().  Depending on your server's login verification this may or
 * may not match — use the SP whenever possible.
 */
app.post('/api/accounts/create', wrap(async (req, res) => {
  const id       = (req.body.id || '').trim();
  const password = req.body.password || '';

  if (!id || !password)
    return res.status(400).json({ error: 'id and password are required' });
  if (id.length < 4 || id.length > 20)
    return res.status(400).json({ error: 'ID must be 4–20 characters' });

  // Duplicate check
  const exists = await db().request()
    .input('id', sql.VarChar(64), id)
    .query(`SELECT UserNum FROM [Account].dbo.cabal_auth_table WHERE ID = @id`);
  if (exists.recordset.length)
    return res.status(409).json({ error: `Account "${id}" already exists` });

  // ① Try the standard Cabal stored procedure
  try {
    await db().request()
      .input('szAccountID', sql.VarChar(64),  id)
      .input('szPassword',  sql.VarChar(128), password)
      .execute('[Account].dbo.cabal_tool_registerAccount');
    return res.json({ success: true, method: 'stored_procedure' });
  } catch (spErr) {
    // Re-throw real SP errors; only fall through if SP simply doesn't exist
    const notFound = /Cannot find|Could not find|not find/i.test(spErr.message);
    if (!notFound) throw spErr;
  }

  // ② Direct INSERT fallback
  await db().request()
    .input('id',       sql.VarChar(64),  id)
    .input('password', sql.VarChar(128), password)
    .query(`
      INSERT INTO [Account].dbo.cabal_auth_table
        (ID, Password, Login, AuthType, LastIp, Email, UserName, createDate, LoginCounter)
      VALUES
        (@id, CONVERT(VARBINARY(MAX), @password),
         0, 0, '', '', @id, GETDATE(), 0)
    `);
  res.json({ success: true, method: 'direct_insert' });
}));

/**
 * POST /api/accounts/:usernum/ban
 * Body: { action: 'ban'|'unban', reason?: string, limitDate?: 'YYYY-MM-DD' }
 *
 * The ban INSERT uses a TRY/CATCH at the SQL level to handle servers whose
 * cabal_blockuser_table has a mandatory ReqGmCode column vs those that don't.
 */
app.post('/api/accounts/:usernum/ban', wrap(async (req, res) => {
  const usernum  = parseInt(req.params.usernum, 10);
  const { action, reason = 'Banned by admin', limitDate } = req.body;

  if (isNaN(usernum))
    return res.status(400).json({ error: 'Invalid usernum' });
  if (!['ban', 'unban'].includes(action))
    return res.status(400).json({ error: 'action must be "ban" or "unban"' });

  if (action === 'unban') {
    await db().request()
      .input('usernum', sql.Int, usernum)
      .query(`DELETE FROM [Account].dbo.cabal_blockuser_table WHERE UserNum = @usernum`);
  } else {
    const limit = limitDate ? new Date(limitDate) : new Date('2099-12-31T00:00:00');

    await db().request()
      .input('usernum',   sql.Int,          usernum)
      .input('reason',    sql.VarChar(256),  reason)
      .input('limitDate', sql.DateTime,      limit)
      .query(`
        -- Upsert: update existing ban or insert a new one
        IF EXISTS (
          SELECT 1 FROM [Account].dbo.cabal_blockuser_table WHERE UserNum = @usernum
        )
          UPDATE [Account].dbo.cabal_blockuser_table
          SET    LimitDate = @limitDate, Reason = @reason
          WHERE  UserNum   = @usernum
        ELSE BEGIN
          -- Try with ReqGmCode (standard Cabal schema)
          BEGIN TRY
            INSERT INTO [Account].dbo.cabal_blockuser_table
              (UserNum, LimitDate, Reason, ReqGmCode)
            VALUES
              (@usernum, @limitDate, @reason, 'ADMIN')
          END TRY
          BEGIN CATCH
            -- Fallback for builds without ReqGmCode column
            INSERT INTO [Account].dbo.cabal_blockuser_table
              (UserNum, LimitDate, Reason)
            VALUES
              (@usernum, @limitDate, @reason)
          END CATCH
        END
      `);
  }

  res.json({ success: true });
}));

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = config.port ?? 3000;

app.listen(PORT, () => {
  console.log(`[Server] Cabal Admin Panel → http://localhost:${PORT}`);
});

// Connect to DB after the HTTP server is already accepting requests,
// so the status endpoint works immediately (returning 'connecting').
connectDB();
