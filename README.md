# Cabal Admin Panel

A modern web-based replacement for the old **Bega Admin Tool**, built with Node.js + Express + vanilla JS.

Dark theme (Discord/Linear aesthetic) · MSSQL via `mssql` · Single-page frontend · No build step required.

---

## Folder Structure

```
cabal-admin-panel/
├── server.js            # Express server + all API routes
├── config.js            # ⚠️  DB credentials (gitignored — see config.example.js)
├── config.example.js    # Template — copy to config.js and fill in your values
├── package.json
├── .gitignore
├── public/
│   ├── index.html       # Single-page HTML shell
│   ├── style.css        # Dark theme CSS (CSS variables, no framework)
│   └── app.js           # Frontend JS (vanilla, no framework)
└── README.md
```

> **Adding new features**: create a new `routes/characters.js`, export a function that accepts `app` and `db`, then call it from `server.js`.  The frontend just needs a new `page-xxx` div in `index.html` and corresponding JS in `app.js`.

---

## Prerequisites

- **Node.js** ≥ 18
- A running **MSSQL** instance with the standard Cabal database schema
  (`Account` database containing `cabal_auth_table`, `cabal_blockuser_table`)
- The `sa` (or equivalent) login must have read/write access to the `Account` database

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit the credentials file
cp config.example.js config.js
# → edit config.js: set server IP, port, user, password

# 3. Start the server
node server.js

# 4. Open in your browser
open http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev   # uses nodemon
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/status` | Live DB ping — returns `{ state: 'connected'\|'error'\|'connecting' }` |
| `GET`  | `/api/accounts/search?id=xxx` | Fetch account + ban status by login ID |
| `PUT`  | `/api/accounts/:usernum/authtype` | Update AuthType (GM level) · body: `{ authType: number }` |
| `PUT`  | `/api/accounts/:usernum/forcelogout` | Set Login = 0 (clear online flag) |
| `POST` | `/api/accounts/create` | Create account · body: `{ id, password }` |
| `POST` | `/api/accounts/:usernum/ban` | Ban or unban · body: `{ action: 'ban'\|'unban', reason?, limitDate? }` |

---

## Database Notes

### cabal_auth_table (Account DB)

| Column | Type | Notes |
|--------|------|-------|
| UserNum | int PK | Auto-incremented account ID |
| ID | varchar | Login name (searched by the panel) |
| Password | varbinary | Hashed/raw password — the panel never reads or displays it |
| Login | int | `1` = currently online, `0` = offline |
| AuthType | int | GM level: `0` = player, higher values = GM/admin |
| LastIp | char | Last login IP |
| Email | varchar | Account email |
| UserName | varchar | In-game display name |
| createDate | datetime | Account creation timestamp |
| LoginCounter | int | Total successful logins |

### cabal_blockuser_table (Account DB)

The panel expects at minimum: `UserNum`, `LimitDate`, `Reason`.  
If your schema includes `ReqGmCode` (standard Cabal build), it will be set to `'ADMIN'` on ban.

### Account Creation

The panel first tries the stored procedure **`cabal_tool_registerAccount`** with parameters `@szAccountID` / `@szPassword`.  
If the SP does not exist it falls back to a direct `INSERT` with `CONVERT(VARBINARY(MAX), @password)`.  
**Important**: the direct-insert password encoding may differ from your server's login verification. Use the SP whenever possible.

---

## AuthType / GM Levels

The panel uses these labels by default (edit `authLabel()` in `public/app.js` to match your server):

| AuthType | Label |
|----------|-------|
| 0 | Player |
| 1 | Junior GM |
| 2 | GM |
| 3 | Senior GM |
| 99 | Developer |
| 100 | Admin |

---

## Roadmap (Coming Soon sections)

- **Characters** — browse characters in `Server01.dbo.cabal_character_table`
- **Items** — give / remove items via `Server01.dbo.cabal_item_*` tables
- **Premium** — manage premium time in `Account.dbo.cabal_premium_table`
- **Cash Shop** — edit cash shop items and prices
