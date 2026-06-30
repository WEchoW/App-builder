/* ═══════════════════════════════════════════════════════════════
   app.js — Cabal Admin Panel frontend
   Vanilla JS, no frameworks.  All API calls go through api().
   To add a new feature: add handler functions + wire up elements.
═══════════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────────
/** The account currently displayed in the result card. */
let currentAccount = null;

// ── API helper ────────────────────────────────────────────────
/**
 * Thin fetch wrapper.
 * Throws an Error with the server's { error } message on non-2xx responses.
 *
 * @param {string} method  GET | POST | PUT | DELETE
 * @param {string} path    e.g. '/accounts/search?id=foo'
 * @param {object|null} body  JSON body (for POST/PUT)
 */
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res  = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Toast notifications ───────────────────────────────────────
const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} ms   Auto-dismiss after this many milliseconds
 */
function toast(message, type = 'success', ms = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${TOAST_ICONS[type] ?? '•'}</span><span>${message}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => el.remove(), 200);
  }, ms);
}

// ── Button loading state ──────────────────────────────────────
function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = '…';
    btn.disabled = true;
  } else {
    if (btn.dataset.origText) btn.textContent = btn.dataset.origText;
    btn.disabled = false;
  }
}

// ── Formatters ────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Human-readable label for an AuthType value.
 * Add more entries here as needed for your server's GM hierarchy.
 */
function authLabel(level) {
  const map = {
    0:   'Player',
    1:   'Junior GM',
    2:   'GM',
    3:   'Senior GM',
    99:  'Developer',
    100: 'Admin',
  };
  return map[level] ?? `GM Level ${level}`;
}

// ═══════════════════════════════════════════════════════════════
// DB STATUS POLLING
// ═══════════════════════════════════════════════════════════════
const $dot  = document.getElementById('status-dot');
const $text = document.getElementById('status-text');

const STATE_LABELS = {
  connected:  'Connected',
  error:      'DB Error',
  connecting: 'Connecting…',
};

async function pollStatus() {
  try {
    const { state } = await fetch('/api/status').then(r => r.json());
    $dot.className  = `status-dot ${state}`;
    $text.textContent = STATE_LABELS[state] ?? state;
  } catch {
    $dot.className  = 'status-dot error';
    $text.textContent = 'Server unreachable';
  }
}

pollStatus();
setInterval(pollStatus, 20_000);   // re-check every 20 s

// ═══════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    if (item.classList.contains('disabled')) return;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    const pageId = `page-${item.dataset.page}`;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
  });
});

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS — SEARCH
// ═══════════════════════════════════════════════════════════════

/** Show or hide the online-account warning banner. */
function syncWarningBanner() {
  const banner = document.getElementById('online-warning');
  if (currentAccount?.Login === 1) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

async function searchAccount() {
  const id = document.getElementById('search-input').value.trim();
  if (!id) { toast('Enter an account ID to search', 'warning'); return; }

  const btn = document.getElementById('search-btn');
  setLoading(btn, true);
  try {
    const acc = await api('GET', `/accounts/search?id=${encodeURIComponent(id)}`);
    currentAccount = acc;
    renderAccountCard(acc);
    syncWarningBanner();
  } catch (err) {
    toast(err.message, 'error');
    document.getElementById('account-card').classList.remove('visible');
    currentAccount = null;
  } finally {
    setLoading(btn, false);
  }
}

// Enter key in search field
document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchAccount();
});
document.getElementById('search-btn').addEventListener('click', searchAccount);

// ── Render account card ───────────────────────────────────────
function renderAccountCard(acc) {
  // Header
  document.getElementById('acc-name').textContent          = acc.ID;
  document.getElementById('acc-usernum').textContent       = `#${acc.UserNum}`;
  document.getElementById('acc-username-label').textContent = acc.UserName || acc.ID;

  // Online / offline badge
  document.getElementById('acc-status').innerHTML = acc.Login
    ? '<span class="badge online">● Online</span>'
    : '<span class="badge offline">○ Offline</span>';

  // Ban badge + button label
  const banBadge = document.getElementById('acc-ban-badge');
  const banBtn   = document.getElementById('ban-btn');
  if (acc.isBanned) {
    banBadge.innerHTML    = '<span class="badge banned">🔒 Banned</span>';
    banBtn.textContent    = 'Unblock';
    banBtn.className      = 'btn btn-success btn-sm';
    banBtn.dataset.action = 'unban';
  } else {
    banBadge.innerHTML    = '<span class="badge acc-ok">✓ Active</span>';
    banBtn.textContent    = 'Ban Account';
    banBtn.className      = 'btn btn-danger btn-sm';
    banBtn.dataset.action = 'ban';
  }

  // Info grid
  const level = acc.AuthType ?? 0;
  document.getElementById('acc-authtype').innerHTML = level > 0
    ? `<span class="badge gm">⭐ ${authLabel(level)} (${level})</span>`
    : `<span class="badge player">${authLabel(level)}</span>`;

  document.getElementById('acc-lastip').textContent  = acc.LastIp  || '—';
  document.getElementById('acc-email').textContent   = acc.Email   || '—';
  document.getElementById('acc-created').textContent = fmtDate(acc.createDate);
  document.getElementById('acc-logins').textContent  = acc.LoginCounter ?? '—';

  // Pre-fill the GM level input with current value
  document.getElementById('gm-level-input').value = level;

  // Reveal the card
  document.getElementById('account-card').classList.add('visible');
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS — SET AUTHTYPE (GM LEVEL)
// ═══════════════════════════════════════════════════════════════
document.getElementById('set-gm-btn').addEventListener('click', async () => {
  if (!currentAccount) return;

  const level = parseInt(document.getElementById('gm-level-input').value, 10);
  if (isNaN(level) || level < 0 || level > 100) {
    toast('AuthType must be a number between 0 and 100', 'warning');
    return;
  }

  // Warn admin if account is online before making the change
  if (currentAccount.Login === 1) {
    openConfirmModal(
      '⚠️ Account is Online',
      `"${currentAccount.ID}" is currently logged in. The AuthType will be updated in the ` +
      `database immediately, but it may not take effect in-game until the player relogs. Continue?`,
      () => applyAuthType(level)
    );
  } else {
    await applyAuthType(level);
  }
});

async function applyAuthType(level) {
  const btn = document.getElementById('set-gm-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/accounts/${currentAccount.UserNum}/authtype`, { authType: level });
    currentAccount.AuthType = level;
    renderAccountCard(currentAccount);
    toast(`AuthType set to ${level} — ${authLabel(level)}`);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS — FORCE LOGOUT
// ═══════════════════════════════════════════════════════════════
document.getElementById('force-logout-btn').addEventListener('click', () => {
  if (!currentAccount) return;

  if (currentAccount.Login !== 1) {
    toast('Account is already offline', 'warning');
    return;
  }

  openConfirmModal(
    'Force Logout',
    `Clear the Login flag for "${currentAccount.ID}"? The database will mark the account as ` +
    `offline immediately. The game session may take a moment to fully expire.`,
    doForceLogout
  );
});

async function doForceLogout() {
  const btn = document.getElementById('force-logout-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/accounts/${currentAccount.UserNum}/forcelogout`);
    currentAccount.Login = 0;
    renderAccountCard(currentAccount);
    syncWarningBanner();
    toast(`Login flag cleared for "${currentAccount.ID}"`);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS — BAN / UNBAN
// ═══════════════════════════════════════════════════════════════
document.getElementById('ban-btn').addEventListener('click', () => {
  if (!currentAccount) return;
  const action = document.getElementById('ban-btn').dataset.action;

  if (action === 'unban') {
    openConfirmModal(
      'Unblock Account',
      `Remove the ban for "${currentAccount.ID}"? The player will be able to log in immediately.`,
      () => executeBan('unban')
    );
  } else {
    // Open the ban details modal
    document.getElementById('ban-reason-input').value = '';
    document.getElementById('ban-date-input').value   = '';
    // Set minimum selectable date to today
    document.getElementById('ban-date-input').min =
      new Date().toISOString().split('T')[0];
    document.getElementById('ban-modal').classList.add('open');
  }
});

// Confirm inside ban modal
document.getElementById('ban-confirm-btn').addEventListener('click', () => {
  const reason    = document.getElementById('ban-reason-input').value.trim() || 'Banned by admin';
  const limitDate = document.getElementById('ban-date-input').value;
  closeBanModal();

  // Extra warning if account is online
  if (currentAccount.Login === 1) {
    openConfirmModal(
      '⚠️ Account is Online',
      `"${currentAccount.ID}" is currently online. The ban will be written to the database now ` +
      `but the player will not be immediately kicked. Use Force Logout after banning.`,
      () => executeBan('ban', reason, limitDate)
    );
  } else {
    executeBan('ban', reason, limitDate);
  }
});

document.getElementById('ban-cancel-btn').addEventListener('click', closeBanModal);

function closeBanModal() {
  document.getElementById('ban-modal').classList.remove('open');
}

async function executeBan(action, reason = '', limitDate = '') {
  const btn = document.getElementById('ban-btn');
  setLoading(btn, true);
  try {
    await api('POST', `/accounts/${currentAccount.UserNum}/ban`, { action, reason, limitDate });
    currentAccount.isBanned = (action === 'ban');
    renderAccountCard(currentAccount);
    toast(
      action === 'ban'
        ? `"${currentAccount.ID}" has been banned`
        : `"${currentAccount.ID}" has been unblocked`
    );
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS — CREATE
// ═══════════════════════════════════════════════════════════════
document.getElementById('create-account-form').addEventListener('submit', async e => {
  e.preventDefault();

  const id      = document.getElementById('new-id').value.trim();
  const pw      = document.getElementById('new-password').value;
  const pwConf  = document.getElementById('new-password-confirm').value;

  if (!id || !pw) { toast('Fill in all fields', 'warning'); return; }
  if (id.length < 4) { toast('ID must be at least 4 characters', 'warning'); return; }
  if (pw !== pwConf) { toast('Passwords do not match', 'error'); return; }

  const btn = document.getElementById('create-btn');
  setLoading(btn, true);
  try {
    const result = await api('POST', '/accounts/create', { id, password: pw });
    const via = result.method === 'stored_procedure'
      ? 'cabal_tool_registerAccount SP'
      : 'direct INSERT';
    toast(`Account "${id}" created via ${via}`);
    e.target.reset();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ═══════════════════════════════════════════════════════════════
// GENERIC CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════
let confirmCallback = null;

function openConfirmModal(title, body, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-body').textContent  = body;
  confirmCallback = onConfirm;
  document.getElementById('confirm-modal').classList.add('open');
}

document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
  document.getElementById('confirm-modal').classList.remove('open');
  if (typeof confirmCallback === 'function') {
    await confirmCallback();
    confirmCallback = null;
  }
});

document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.remove('open');
  confirmCallback = null;
});

// Close any modal by clicking the dark overlay behind it
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ═══════════════════════════════════════════════════════════════
// CHARACTERS — lookup tables
// ═══════════════════════════════════════════════════════════════
const CLASS_LABELS = {
  1: 'Warrior', 2: 'Blader', 4: 'Wizard',
  8: 'Force Archer', 16: 'Force Shielder', 32: 'Force Blader',
};
const CLASS_ICONS = {
  1: '🗡️', 2: '🔪', 4: '🔮', 8: '🏹', 16: '🛡️', 32: '⚡',
};
const MAP_LABELS = {
  1: 'Green Despair',   2: 'Bloody Ice',         3: 'Swamp of Tranquility',
  4: 'Fort. Ruina',     5: 'Pontus Ferrum',       6: 'Desert Scream',
  7: 'Lake in Dusk',    8: 'Tower of Undead',    42: 'Port Lux',
};

function classLabel(c) { return CLASS_LABELS[c] ?? `Class ${c}`; }
function classIcon(c)  { return CLASS_ICONS[c]  ?? '⚔️'; }
function mapLabel(m)   { return MAP_LABELS[m]   ?? `Map ${m}`; }
function fmtNum(n)     { return n == null ? '—' : Number(n).toLocaleString(); }

// ═══════════════════════════════════════════════════════════════
// CHARACTERS — SEARCH
// ═══════════════════════════════════════════════════════════════
let currentCharacter = null;

async function searchCharacter() {
  const name = document.getElementById('char-search-input').value.trim();
  if (!name) { toast('Enter a character name', 'warning'); return; }

  const btn = document.getElementById('char-search-btn');
  setLoading(btn, true);
  try {
    const char = await api('GET', `/characters/search?name=${encodeURIComponent(name)}`);
    currentCharacter = char;
    renderCharCard(char);
  } catch (err) {
    toast(err.message, 'error');
    document.getElementById('char-card').classList.remove('visible');
    currentCharacter = null;
  } finally {
    setLoading(btn, false);
  }
}

document.getElementById('char-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchCharacter();
});
document.getElementById('char-search-btn').addEventListener('click', searchCharacter);

function renderCharCard(char) {
  document.getElementById('char-avatar').textContent  = classIcon(char.Class);
  document.getElementById('char-name').textContent    = char.Name;
  document.getElementById('char-idx').textContent     = `#${char.CharacterIdx}`;
  document.getElementById('char-account').textContent = char.AccountID || '—';

  document.getElementById('char-online-badge').innerHTML = char.StillOnline
    ? '<span class="badge online">● Online</span>'
    : '<span class="badge offline">○ Offline</span>';
  document.getElementById('char-class-badge').innerHTML =
    `<span class="badge gm">${classLabel(char.Class)}</span>`;

  document.getElementById('char-level').textContent      = char.Level ?? '—';
  document.getElementById('char-exp').textContent        = fmtNum(char.Exp);
  document.getElementById('char-alz').textContent        = fmtNum(char.Alz);
  document.getElementById('char-map').textContent        =
    `${mapLabel(char.MapIndex)} (${char.MapX ?? '?'}, ${char.MapY ?? '?'})`;
  document.getElementById('char-honor').textContent      = fmtNum(char.HonorPoint);
  document.getElementById('char-last-login').textContent = fmtDate(char.LastConnectTime);

  document.getElementById('char-level-input').value = char.Level ?? 1;
  document.getElementById('char-alz-input').value   = char.Alz   ?? 0;

  document.getElementById('char-card').classList.add('visible');
}

// ── Set Level ──────────────────────────────────────────────────
document.getElementById('char-set-level-btn').addEventListener('click', () => {
  if (!currentCharacter) return;
  const level = parseInt(document.getElementById('char-level-input').value, 10);
  if (isNaN(level) || level < 1 || level > 200) {
    toast('Level must be 1–200', 'warning'); return;
  }

  openConfirmModal(
    'Set Character Level',
    `Set "${currentCharacter.Name}" to level ${level}? Experience will be reset to 0.`,
    async () => {
      const btn = document.getElementById('char-set-level-btn');
      setLoading(btn, true);
      try {
        await api('PUT', `/characters/${currentCharacter.CharacterIdx}/level`, { level });
        currentCharacter.Level = level;
        currentCharacter.Exp   = 0;
        renderCharCard(currentCharacter);
        toast(`${currentCharacter.Name} is now level ${level}`);
      } catch (err) { toast(err.message, 'error'); }
      finally { setLoading(btn, false); }
    }
  );
});

// ── Set Alz ────────────────────────────────────────────────────
document.getElementById('char-set-alz-btn').addEventListener('click', async () => {
  if (!currentCharacter) return;
  const alz = parseInt(document.getElementById('char-alz-input').value, 10);
  if (isNaN(alz) || alz < 0 || alz > 2_000_000_000) {
    toast('Alz must be 0–2,000,000,000', 'warning'); return;
  }
  const btn = document.getElementById('char-set-alz-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/characters/${currentCharacter.CharacterIdx}/alz`, { alz });
    currentCharacter.Alz = alz;
    renderCharCard(currentCharacter);
    toast(`Alz set to ${fmtNum(alz)}`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
});

// ── Warp modal ─────────────────────────────────────────────────
document.getElementById('char-warp-btn').addEventListener('click', () => {
  if (!currentCharacter) return;
  document.getElementById('warp-preset').value    = '';
  document.getElementById('warp-map-input').value = currentCharacter.MapIndex ?? '';
  document.getElementById('warp-x-input').value   = currentCharacter.MapX    ?? '';
  document.getElementById('warp-y-input').value   = currentCharacter.MapY    ?? '';
  document.getElementById('warp-modal').classList.add('open');
});

document.getElementById('warp-preset').addEventListener('change', e => {
  const val = e.target.value;
  if (!val) return;
  const [map, x, y] = val.split(',');
  document.getElementById('warp-map-input').value = map;
  document.getElementById('warp-x-input').value   = x;
  document.getElementById('warp-y-input').value   = y;
});

document.getElementById('warp-cancel-btn').addEventListener('click', () => {
  document.getElementById('warp-modal').classList.remove('open');
});

document.getElementById('warp-confirm-btn').addEventListener('click', async () => {
  if (!currentCharacter) return;
  const mapIndex = parseInt(document.getElementById('warp-map-input').value, 10);
  const x        = parseInt(document.getElementById('warp-x-input').value,   10);
  const y        = parseInt(document.getElementById('warp-y-input').value,   10);

  if (isNaN(mapIndex) || isNaN(x) || isNaN(y)) {
    toast('Enter valid map index and coordinates', 'warning'); return;
  }

  document.getElementById('warp-modal').classList.remove('open');
  const btn = document.getElementById('char-warp-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/characters/${currentCharacter.CharacterIdx}/warp`, { mapIndex, x, y });
    currentCharacter.MapIndex = mapIndex;
    currentCharacter.MapX     = x;
    currentCharacter.MapY     = y;
    renderCharCard(currentCharacter);
    toast(`${currentCharacter.Name} warped to ${mapLabel(mapIndex)} (${x}, ${y})`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
});

// ═══════════════════════════════════════════════════════════════
// ITEMS — CHARACTER INVENTORY INSPECTOR
// ═══════════════════════════════════════════════════════════════
let currentItemChar = null;

async function searchItemChar() {
  const name = document.getElementById('item-char-search-input').value.trim();
  if (!name) { toast('Enter a character name', 'warning'); return; }

  const btn = document.getElementById('item-char-search-btn');
  setLoading(btn, true);
  try {
    const char  = await api('GET', `/characters/search?name=${encodeURIComponent(name)}`);
    const items = await api('GET', `/characters/${char.CharacterIdx}/items`);
    currentItemChar = { ...char, items };
    renderItemCard(char, items);
  } catch (err) {
    toast(err.message, 'error');
    document.getElementById('item-card').classList.remove('visible');
    currentItemChar = null;
  } finally {
    setLoading(btn, false);
  }
}

document.getElementById('item-char-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchItemChar();
});
document.getElementById('item-char-search-btn').addEventListener('click', searchItemChar);

function renderItemCard(char, items) {
  document.getElementById('item-char-name').textContent  = char.Name;
  document.getElementById('item-char-class').textContent = classLabel(char.Class);
  document.getElementById('item-char-level').textContent = `Lv. ${char.Level ?? '—'}`;

  document.getElementById('item-inventory-count').textContent  = items.inventoryCount  ?? 0;
  document.getElementById('item-equipped-count').textContent   = items.equippedCount   ?? 0;
  document.getElementById('item-warehouse-count').textContent  = items.warehouseCount  ?? 0;
  document.getElementById('item-total-count').textContent      = items.totalCount      ?? 0;

  document.getElementById('item-alz-display').textContent = fmtNum(char.Alz);
  document.getElementById('item-alz-amount').value        = 0;
  document.getElementById('item-card').classList.add('visible');
}

document.getElementById('item-add-alz-btn').addEventListener('click', async () => {
  if (!currentItemChar) return;
  const amount = parseInt(document.getElementById('item-alz-amount').value, 10);
  if (isNaN(amount) || amount <= 0) { toast('Enter a positive amount', 'warning'); return; }

  const newAlz = (Number(currentItemChar.Alz) || 0) + amount;
  if (newAlz > 2_000_000_000) { toast('Would exceed 2,000,000,000 alz cap', 'warning'); return; }

  const btn = document.getElementById('item-add-alz-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/characters/${currentItemChar.CharacterIdx}/alz`, { alz: newAlz });
    currentItemChar.Alz = newAlz;
    document.getElementById('item-alz-display').textContent = fmtNum(newAlz);
    toast(`Added ${fmtNum(amount)} alz — new balance: ${fmtNum(newAlz)}`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
});

document.getElementById('item-set-alz-btn').addEventListener('click', async () => {
  if (!currentItemChar) return;
  const alz = parseInt(document.getElementById('item-alz-amount').value, 10);
  if (isNaN(alz) || alz < 0 || alz > 2_000_000_000) {
    toast('Alz must be 0–2,000,000,000', 'warning'); return;
  }
  const btn = document.getElementById('item-set-alz-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/characters/${currentItemChar.CharacterIdx}/alz`, { alz });
    currentItemChar.Alz = alz;
    document.getElementById('item-alz-display').textContent = fmtNum(alz);
    toast(`Alz set to ${fmtNum(alz)}`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
});

// ═══════════════════════════════════════════════════════════════
// PREMIUM — SEARCH + MANAGE
// ═══════════════════════════════════════════════════════════════
let currentPremAcc = null;

async function searchPremAccount() {
  const id = document.getElementById('prem-search-input').value.trim();
  if (!id) { toast('Enter an account ID', 'warning'); return; }

  const btn = document.getElementById('prem-search-btn');
  setLoading(btn, true);
  try {
    const acc  = await api('GET', `/accounts/search?id=${encodeURIComponent(id)}`);
    const prem = await api('GET', `/accounts/${acc.UserNum}/premium`);
    currentPremAcc = { ...acc, premium: prem };
    renderPremCard(acc, prem);
  } catch (err) {
    toast(err.message, 'error');
    document.getElementById('prem-card').classList.remove('visible');
    currentPremAcc = null;
  } finally {
    setLoading(btn, false);
  }
}

document.getElementById('prem-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchPremAccount();
});
document.getElementById('prem-search-btn').addEventListener('click', searchPremAccount);

function renderPremCard(acc, prem) {
  document.getElementById('prem-acc-name').textContent    = acc.ID;
  document.getElementById('prem-acc-usernum').textContent = `#${acc.UserNum}`;

  const badge = document.getElementById('prem-status-badge');
  if (prem.hasPremium) {
    badge.innerHTML = '<span class="badge gm">💎 Premium Active</span>';
    document.getElementById('prem-status-text').textContent = 'Active';
  } else {
    badge.innerHTML = '<span class="badge offline">○ No Premium</span>';
    document.getElementById('prem-status-text').textContent = 'Inactive';
  }

  document.getElementById('prem-expiry').textContent   = prem.info?.PeriodDate ? fmtDate(prem.info.PeriodDate) : '—';
  document.getElementById('prem-type').textContent     = prem.info?.ServiceType != null ? `Type ${prem.info.ServiceType}` : '—';
  document.getElementById('prem-req-date').textContent = prem.info?.ReqDate ? fmtDate(prem.info.ReqDate) : '—';

  document.getElementById('prem-days-input').value = 30;
  document.getElementById('prem-card').classList.add('visible');
}

document.getElementById('prem-add-btn').addEventListener('click', async () => {
  if (!currentPremAcc) return;
  const days = parseInt(document.getElementById('prem-days-input').value, 10);
  if (isNaN(days) || days < 1 || days > 365) {
    toast('Days must be 1–365', 'warning'); return;
  }
  const btn = document.getElementById('prem-add-btn');
  setLoading(btn, true);
  try {
    await api('POST', `/accounts/${currentPremAcc.UserNum}/premium`, { action: 'add', days });
    const prem = await api('GET', `/accounts/${currentPremAcc.UserNum}/premium`);
    currentPremAcc.premium = prem;
    renderPremCard(currentPremAcc, prem);
    toast(`Added ${days} day(s) of premium to "${currentPremAcc.ID}"`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
});

document.getElementById('prem-remove-btn').addEventListener('click', () => {
  if (!currentPremAcc) return;
  openConfirmModal(
    'Remove Premium',
    `Remove all premium from "${currentPremAcc.ID}"? The player will lose premium status immediately.`,
    async () => {
      const btn = document.getElementById('prem-remove-btn');
      setLoading(btn, true);
      try {
        await api('POST', `/accounts/${currentPremAcc.UserNum}/premium`, { action: 'remove' });
        const prem = await api('GET', `/accounts/${currentPremAcc.UserNum}/premium`);
        currentPremAcc.premium = prem;
        renderPremCard(currentPremAcc, prem);
        toast(`Premium removed from "${currentPremAcc.ID}"`);
      } catch (err) { toast(err.message, 'error'); }
      finally { setLoading(btn, false); }
    }
  );
});

// ═══════════════════════════════════════════════════════════════
// CASH SHOP — ECOIN BALANCE
// ═══════════════════════════════════════════════════════════════
let currentEcoinAcc = null;

async function searchEcoinAccount() {
  const id = document.getElementById('ecoin-search-input').value.trim();
  if (!id) { toast('Enter an account ID', 'warning'); return; }

  const btn = document.getElementById('ecoin-search-btn');
  setLoading(btn, true);
  try {
    const acc   = await api('GET', `/accounts/search?id=${encodeURIComponent(id)}`);
    const ecoin = await api('GET', `/accounts/${acc.UserNum}/ecoin`);
    currentEcoinAcc = { ...acc, ecoin };
    renderEcoinCard(acc, ecoin);
  } catch (err) {
    toast(err.message, 'error');
    document.getElementById('ecoin-card').classList.remove('visible');
    currentEcoinAcc = null;
  } finally {
    setLoading(btn, false);
  }
}

document.getElementById('ecoin-search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchEcoinAccount();
});
document.getElementById('ecoin-search-btn').addEventListener('click', searchEcoinAccount);

function renderEcoinCard(acc, ecoin) {
  document.getElementById('ecoin-acc-name').textContent    = acc.ID;
  document.getElementById('ecoin-acc-usernum').textContent = `#${acc.UserNum}`;
  document.getElementById('ecoin-cash').textContent        = (ecoin.cash      ?? 0).toLocaleString();
  document.getElementById('ecoin-bonus').textContent       = (ecoin.cashBonus ?? 0).toLocaleString();
  document.getElementById('ecoin-total').textContent       = (ecoin.cashTotal ?? 0).toLocaleString();
  document.getElementById('ecoin-amount-input').value      = 0;
  document.getElementById('ecoin-card').classList.add('visible');
}

function refreshEcoinDisplay(ecoin) {
  document.getElementById('ecoin-cash').textContent  = (ecoin.cash      ?? 0).toLocaleString();
  document.getElementById('ecoin-bonus').textContent = (ecoin.cashBonus ?? 0).toLocaleString();
  document.getElementById('ecoin-total').textContent = (ecoin.cashTotal ?? 0).toLocaleString();
}

document.getElementById('ecoin-add-btn').addEventListener('click', async () => {
  if (!currentEcoinAcc) return;
  const amount = parseInt(document.getElementById('ecoin-amount-input').value, 10);
  if (isNaN(amount) || amount <= 0) { toast('Enter a positive amount', 'warning'); return; }

  const btn = document.getElementById('ecoin-add-btn');
  setLoading(btn, true);
  try {
    await api('PUT', `/accounts/${currentEcoinAcc.UserNum}/ecoin`, { action: 'add', amount });
    const ecoin = await api('GET', `/accounts/${currentEcoinAcc.UserNum}/ecoin`);
    currentEcoinAcc.ecoin = ecoin;
    refreshEcoinDisplay(ecoin);
    toast(`Added ${amount.toLocaleString()} Cash to "${currentEcoinAcc.ID}" — Total: ${(ecoin.cashTotal ?? 0).toLocaleString()}`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setLoading(btn, false); }
});

document.getElementById('ecoin-set-btn').addEventListener('click', () => {
  if (!currentEcoinAcc) return;
  const amount = parseInt(document.getElementById('ecoin-amount-input').value, 10);
  if (isNaN(amount) || amount < 0) { toast('Amount must be 0 or more', 'warning'); return; }

  openConfirmModal(
    'Set Cash Balance',
    `Set "${currentEcoinAcc.ID}"'s Cash (paid) to ${amount.toLocaleString()}? CashBonus stays unchanged.`,
    async () => {
      const btn = document.getElementById('ecoin-set-btn');
      setLoading(btn, true);
      try {
        await api('PUT', `/accounts/${currentEcoinAcc.UserNum}/ecoin`, { action: 'set', amount });
        const ecoin = await api('GET', `/accounts/${currentEcoinAcc.UserNum}/ecoin`);
        currentEcoinAcc.ecoin = ecoin;
        refreshEcoinDisplay(ecoin);
        toast(`Cash set to ${amount.toLocaleString()} for "${currentEcoinAcc.ID}"`);
      } catch (err) { toast(err.message, 'error'); }
      finally { setLoading(btn, false); }
    }
  );
});
