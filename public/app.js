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
