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
const fs      = require('fs');
const session = require('express-session');
// config.js is optional — on cloud deployments (Railway etc.) it won't exist.
// All values can be supplied via environment variables instead.
let config;
try {
  config = require('./config');
} catch {
  config = { port: 3000, admin: {}, mssql: { options: { trustServerCertificate: true, encrypt: false } } };
}

// Environment variables override config.js values.
if (process.env.PORT)             config.port                = parseInt(process.env.PORT);
if (process.env.SESSION_SECRET)   config.sessionSecret       = process.env.SESSION_SECRET;
if (process.env.ADMIN_USERNAME) { config.admin ??= {};       config.admin.username = process.env.ADMIN_USERNAME; }
if (process.env.ADMIN_PASSWORD) { config.admin ??= {};       config.admin.password = process.env.ADMIN_PASSWORD; }
if (process.env.DB_SERVER)        config.mssql.server        = process.env.DB_SERVER;
if (process.env.DB_PORT)          config.mssql.port          = parseInt(process.env.DB_PORT);
if (process.env.DB_USER)          config.mssql.user          = process.env.DB_USER;
if (process.env.DB_PASSWORD)      config.mssql.password      = process.env.DB_PASSWORD;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: config.sessionSecret || 'cabal-admin-panel-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// Load db.json if it exists — overrides config.js MSSQL settings
const DB_CONFIG_FILE = path.join(__dirname, 'db.json');
(function loadDbOverride() {
  try {
    if (fs.existsSync(DB_CONFIG_FILE)) {
      const ov = JSON.parse(fs.readFileSync(DB_CONFIG_FILE, 'utf8'));
      config.mssql = { ...config.mssql, ...ov };
      console.log('[Config] DB overrides loaded from db.json');
    }
  } catch (e) {
    console.warn('[Config] Could not load db.json:', e.message);
  }
})();

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

// ── Auth guard ────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ── Routes: System (public) ───────────────────────────────────────────────────

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

// ── Routes: Auth (public) ─────────────────────────────────────────────────────

app.get('/api/auth/me', (req, res) => {
  res.json({
    authenticated: !!req.session?.authenticated,
    username:      req.session?.username ?? null,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!config.admin?.username || !config.admin?.password)
    return res.status(500).json({ error: 'Admin credentials not set in config.js' });
  if (username === config.admin.username && password === config.admin.password) {
    req.session.authenticated = true;
    req.session.username      = username;
    return res.json({ success: true, username });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

// ── All routes below this line require a valid session ────────────────────────
app.use('/api', requireAuth);

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

// ── Routes: Characters ────────────────────────────────────────────────────────

/**
 * GET /api/characters/search?name=xxx
 * Searches for an active character by name in Server01.cabal_character_table.
 */
app.get('/api/characters/search', wrap(async (req, res) => {
  const name = (req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Missing ?name= parameter' });

  const result = await db().request()
    .input('name', sql.VarChar(64), name)
    .query(`
      SELECT TOP 1
        CharacterIdx, AccountID, Name, Class, Level, Exp,
        Alz, MapIndex, MapX, MapY, SlotIndex,
        StillOnline, CreateTime, LastConnectTime, DeleteState
      FROM   [Server01].dbo.cabal_character_table
      WHERE  Name = @name AND DeleteState = 0
    `);

  if (!result.recordset.length)
    return res.status(404).json({ error: `Character "${name}" not found` });

  res.json(result.recordset[0]);
}));

/**
 * PUT /api/characters/:charnum/level
 * Body: { level: number }  — resets Exp to 0.
 */
app.put('/api/characters/:charnum/level', wrap(async (req, res) => {
  const charnum = parseInt(req.params.charnum, 10);
  const level   = parseInt(req.body.level,    10);

  if (isNaN(charnum) || isNaN(level))
    return res.status(400).json({ error: 'Invalid charnum or level' });
  if (level < 1 || level > 200)
    return res.status(400).json({ error: 'Level must be 1–200' });

  await db().request()
    .input('charnum', sql.Int, charnum)
    .input('level',   sql.Int, level)
    .query(`
      UPDATE [Server01].dbo.cabal_character_table
      SET    Level = @level, Exp = 0
      WHERE  CharacterIdx = @charnum
    `);

  res.json({ success: true });
}));

/**
 * PUT /api/characters/:charnum/alz
 * Body: { alz: number }
 */
app.put('/api/characters/:charnum/alz', wrap(async (req, res) => {
  const charnum = parseInt(req.params.charnum, 10);
  const alz     = parseInt(req.body.alz,       10);

  if (isNaN(charnum) || isNaN(alz))
    return res.status(400).json({ error: 'Invalid charnum or alz' });
  if (alz < 0 || alz > 2_000_000_000)
    return res.status(400).json({ error: 'Alz must be 0–2,000,000,000' });

  await db().request()
    .input('charnum', sql.Int,    charnum)
    .input('alz',     sql.BigInt, alz)
    .query(`
      UPDATE [Server01].dbo.cabal_character_table
      SET    Alz = @alz
      WHERE  CharacterIdx = @charnum
    `);

  res.json({ success: true });
}));

/**
 * PUT /api/characters/:charnum/warp
 * Body: { mapIndex, x, y }
 */
app.put('/api/characters/:charnum/warp', wrap(async (req, res) => {
  const charnum  = parseInt(req.params.charnum, 10);
  const mapIndex = parseInt(req.body.mapIndex,  10);
  const x        = parseInt(req.body.x,         10);
  const y        = parseInt(req.body.y,         10);

  if (isNaN(charnum) || isNaN(mapIndex) || isNaN(x) || isNaN(y))
    return res.status(400).json({ error: 'Invalid parameters' });

  await db().request()
    .input('charnum',  sql.Int, charnum)
    .input('mapIndex', sql.Int, mapIndex)
    .input('x',        sql.Int, x)
    .input('y',        sql.Int, y)
    .query(`
      UPDATE [Server01].dbo.cabal_character_table
      SET    MapIndex = @mapIndex, MapX = @x, MapY = @y
      WHERE  CharacterIdx = @charnum
    `);

  res.json({ success: true });
}));

// ── Routes: Items (inventory inspector) ──────────────────────────────────────

/**
 * GET /api/characters/:charnum/items
 * Returns item counts per slot category from Server01.cabal_item_table.
 */
app.get('/api/characters/:charnum/items', wrap(async (req, res) => {
  const charnum = parseInt(req.params.charnum, 10);
  if (isNaN(charnum)) return res.status(400).json({ error: 'Invalid charnum' });

  try {
    const result = await db().request()
      .input('charnum', sql.Int, charnum)
      .query(`
        SELECT
          SUM(CASE WHEN SlotIndex BETWEEN 0   AND 71  THEN 1 ELSE 0 END) AS inventoryCount,
          SUM(CASE WHEN SlotIndex BETWEEN 72  AND 143 THEN 1 ELSE 0 END) AS warehouseCount,
          SUM(CASE WHEN SlotIndex BETWEEN 144 AND 152 THEN 1 ELSE 0 END) AS equippedCount,
          COUNT(*) AS totalCount
        FROM [Server01].dbo.cabal_item_table
        WHERE CharacterIdx = @charnum
      `);
    res.json(result.recordset[0] ?? { inventoryCount: 0, warehouseCount: 0, equippedCount: 0, totalCount: 0 });
  } catch {
    res.json({ inventoryCount: 0, warehouseCount: 0, equippedCount: 0, totalCount: 0 });
  }
}));

// ── Routes: Premium ───────────────────────────────────────────────────────────

/**
 * GET /api/accounts/:usernum/premium
 * Returns premium status and expiry for the given account.
 */
app.get('/api/accounts/:usernum/premium', wrap(async (req, res) => {
  const usernum = parseInt(req.params.usernum, 10);
  if (isNaN(usernum)) return res.status(400).json({ error: 'Invalid usernum' });

  try {
    const result = await db().request()
      .input('usernum', sql.Int, usernum)
      .query(`
        SELECT TOP 1 *
        FROM   [Account].dbo.cabal_premium_table
        WHERE  UserNum = @usernum
        ORDER  BY PeriodDate DESC
      `);

    const row      = result.recordset[0] ?? null;
    const isActive = row && new Date(row.PeriodDate) > new Date();
    res.json({ hasPremium: !!isActive, info: row });
  } catch {
    res.json({ hasPremium: false, info: null });
  }
}));

/**
 * POST /api/accounts/:usernum/premium
 * Body: { action: 'add'|'remove', days?: number }
 * add: extends existing premium (from today if expired) or creates a new row.
 */
app.post('/api/accounts/:usernum/premium', wrap(async (req, res) => {
  const usernum = parseInt(req.params.usernum, 10);
  const { action, days } = req.body;

  if (isNaN(usernum)) return res.status(400).json({ error: 'Invalid usernum' });
  if (!['add', 'remove'].includes(action))
    return res.status(400).json({ error: 'action must be "add" or "remove"' });

  if (action === 'remove') {
    await db().request()
      .input('usernum', sql.Int, usernum)
      .query(`DELETE FROM [Account].dbo.cabal_premium_table WHERE UserNum = @usernum`);
    return res.json({ success: true });
  }

  const daysNum = parseInt(days, 10);
  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365)
    return res.status(400).json({ error: 'days must be 1–365' });

  await db().request()
    .input('usernum', sql.Int, usernum)
    .input('days',    sql.Int, daysNum)
    .query(`
      IF EXISTS (SELECT 1 FROM [Account].dbo.cabal_premium_table WHERE UserNum = @usernum)
        UPDATE [Account].dbo.cabal_premium_table
        SET    PeriodDate = CASE
                 WHEN PeriodDate > GETDATE()
                 THEN DATEADD(day, @days, PeriodDate)
                 ELSE DATEADD(day, @days, GETDATE())
               END
        WHERE  UserNum = @usernum
      ELSE BEGIN
        BEGIN TRY
          INSERT INTO [Account].dbo.cabal_premium_table
            (UserNum, ServiceType, PeriodDate, ReqDate)
          VALUES (@usernum, 1, DATEADD(day, @days, GETDATE()), GETDATE())
        END TRY
        BEGIN CATCH
          INSERT INTO [Account].dbo.cabal_premium_table
            (UserNum, ServiceType, PeriodDate)
          VALUES (@usernum, 1, DATEADD(day, @days, GETDATE()))
        END CATCH
      END
    `);

  res.json({ success: true });
}));

// ── Routes: Cash Shop (eCoin) ──────────────────────────────────────────────────

/**
 * GET /api/accounts/:usernum/ecoin
 * Returns Cash, CashBonus and CashTotal from CabalCash.dbo.CashAccount.
 */
app.get('/api/accounts/:usernum/ecoin', wrap(async (req, res) => {
  const usernum = parseInt(req.params.usernum, 10);
  if (isNaN(usernum)) return res.status(400).json({ error: 'Invalid usernum' });

  const result = await db().request()
    .input('usernum', sql.Int, usernum)
    .query(`
      SELECT TOP 1 Cash, CashBonus, CashTotal
      FROM   [CabalCash].dbo.CashAccount
      WHERE  UserNum = @usernum
    `);

  const row = result.recordset[0];
  res.json({
    cash:      row?.Cash      ?? 0,
    cashBonus: row?.CashBonus ?? 0,
    cashTotal: row?.CashTotal ?? 0,
  });
}));

/**
 * PUT /api/accounts/:usernum/ecoin
 * Body: { action: 'add'|'set', amount: number }
 * Only modifies Cash (paid). CashBonus is untouched.
 * CashTotal is always kept in sync as Cash + CashBonus.
 */
app.put('/api/accounts/:usernum/ecoin', wrap(async (req, res) => {
  const usernum = parseInt(req.params.usernum, 10);
  const { action } = req.body;
  const amount     = parseInt(req.body.amount, 10);

  if (isNaN(usernum))
    return res.status(400).json({ error: 'Invalid usernum' });
  if (!['add', 'set'].includes(action))
    return res.status(400).json({ error: 'action must be "add" or "set"' });
  if (isNaN(amount) || amount < 0)
    return res.status(400).json({ error: 'amount must be a non-negative integer' });

  if (action === 'add') {
    await db().request()
      .input('usernum', sql.Int, usernum)
      .input('amount',  sql.Int, amount)
      .query(`
        IF EXISTS (SELECT 1 FROM [CabalCash].dbo.CashAccount WHERE UserNum = @usernum)
          UPDATE [CabalCash].dbo.CashAccount
          SET    Cash           = Cash + @amount,
                 CashTotal      = Cash + @amount + CashBonus,
                 UpdateDateTime = GETDATE()
          WHERE  UserNum = @usernum
        ELSE
          INSERT INTO [CabalCash].dbo.CashAccount
            (UserNum, Cash, CashBonus, CashTotal, UpdateDateTime)
          VALUES
            (@usernum, @amount, 0, @amount, GETDATE())
      `);
  } else {
    await db().request()
      .input('usernum', sql.Int, usernum)
      .input('amount',  sql.Int, amount)
      .query(`
        IF EXISTS (SELECT 1 FROM [CabalCash].dbo.CashAccount WHERE UserNum = @usernum)
          UPDATE [CabalCash].dbo.CashAccount
          SET    Cash           = @amount,
                 CashTotal      = @amount + CashBonus,
                 UpdateDateTime = GETDATE()
          WHERE  UserNum = @usernum
        ELSE
          INSERT INTO [CabalCash].dbo.CashAccount
            (UserNum, Cash, CashBonus, CashTotal, UpdateDateTime)
          VALUES
            (@usernum, @amount, 0, @amount, GETDATE())
      `);
  }

  res.json({ success: true });
}));

// ── Routes: DB Configuration ──────────────────────────────────────────────────

/**
 * GET /api/db/config
 * Returns current connection settings — password is never returned.
 */
app.get('/api/db/config', (req, res) => {
  const { server, port, user, options } = config.mssql;
  res.json({ server, port, user, options, state: dbState });
});

/**
 * POST /api/db/config
 * Body: { server, port, user, password, trustServerCertificate, encrypt }
 * Writes to db.json then reconnects immediately.
 */
app.post('/api/db/config', wrap(async (req, res) => {
  const { server, port, user, password, trustServerCertificate, encrypt } = req.body;
  if (!server || !user || !password)
    return res.status(400).json({ error: 'server, user and password are required' });

  const newMssql = {
    server,
    port:     parseInt(port, 10) || 1433,
    user,
    password,
    options: {
      trustServerCertificate: trustServerCertificate !== false,
      encrypt:                !!encrypt,
    },
  };

  fs.writeFileSync(DB_CONFIG_FILE, JSON.stringify(newMssql, null, 2));
  config.mssql = newMssql;

  await connectDB();
  res.json({ success: true, state: dbState });
}));

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = config.port ?? 3000;

app.listen(PORT, () => {
  console.log(`[Server] Cabal Admin Panel → http://localhost:${PORT}`);
});

// Connect to DB after the HTTP server is already accepting requests,
// so the status endpoint works immediately (returning 'connecting').
connectDB();
