import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_AUTH_PATH = path.join(os.homedir(), '.codex', 'auth.json');
const USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const TOKEN_URL = 'https://auth.openai.com/oauth/token';
// Codex CLI ChatGPT OAuth client (device-code / ChatGPT login).
const OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const FETCH_TIMEOUT_MS = 15_000;
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const FIVE_HOUR_MAX_SECONDS = 24 * 60 * 60;
const WEEKLY_MIN_SECONDS = 3 * 24 * 60 * 60;

export const ErrorKind = Object.freeze({
  NO_TOKEN: 'NO_TOKEN',
  AUTH: 'AUTH',
  NETWORK: 'NETWORK',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN: 'UNKNOWN',
});

let _lastRefreshAttempt = 0;

function resolveAuthPath(authPath) {
  if (!authPath || typeof authPath !== 'string' || !authPath.trim()) return DEFAULT_AUTH_PATH;
  let p = authPath.trim();
  if (p === '~') p = os.homedir();
  else if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2));
  return path.resolve(p);
}

function readAuthFile(authPath) {
  const file = resolveAuthPath(authPath);
  if (!fs.existsSync(file)) return null;
  try {
    return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return null;
  }
}

function writeAuthFile(file, data) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function extractTokens(auth) {
  const tokens = auth?.tokens || {};
  const access = typeof tokens.access_token === 'string' ? tokens.access_token : null;
  const refresh = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : null;
  const accountId = typeof tokens.account_id === 'string' ? tokens.account_id : null;
  return { access, refresh, accountId };
}

async function refreshAccessToken(authPath, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - _lastRefreshAttempt < REFRESH_COOLDOWN_MS) return false;
  _lastRefreshAttempt = now;

  const loaded = readAuthFile(authPath);
  if (!loaded) return false;
  const { refresh } = extractTokens(loaded.data);
  if (!refresh) return false;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh,
    client_id: OAUTH_CLIENT_ID,
  });

  let resp;
  try {
    resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
  } catch {
    return false;
  }

  if (!resp.ok) return false;

  let payload;
  try {
    payload = await resp.json();
  } catch {
    return false;
  }

  if (!payload?.access_token) return false;

  const next = {
    ...loaded.data,
    last_refresh: new Date().toISOString(),
    tokens: {
      ...(loaded.data.tokens || {}),
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || refresh,
      id_token: payload.id_token || loaded.data.tokens?.id_token,
      account_id: loaded.data.tokens?.account_id,
    },
  };

  try {
    writeAuthFile(loaded.file, next);
  } catch {
    // Still usable in-memory for this process even if disk write fails.
  }
  return true;
}

function pctFromUsedPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n / 100));
}

function epochFromReset(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const resetAt = Number(raw.reset_at);
  if (Number.isFinite(resetAt) && resetAt > 0) {
    // ChatGPT returns unix seconds; guard against ms accidentally.
    return resetAt > 1e12 ? Math.floor(resetAt / 1000) : resetAt;
  }
  const after = Number(raw.reset_after_seconds);
  if (Number.isFinite(after) && after >= 0) {
    return Math.floor(Date.now() / 1000) + Math.floor(after);
  }
  return null;
}

export function classifyRateLimitWindows(rateLimit) {
  const result = { fiveHour: null, weekly: null };
  for (const raw of [rateLimit?.primary_window, rateLimit?.secondary_window]) {
    if (!raw || typeof raw !== 'object') continue;
    const seconds = Number(raw.limit_window_seconds || 0);
    if (seconds > 0 && seconds <= FIVE_HOUR_MAX_SECONDS && !result.fiveHour) {
      result.fiveHour = raw;
    } else if (seconds >= WEEKLY_MIN_SECONDS && !result.weekly) {
      result.weekly = raw;
    }
  }
  return result;
}

function windowStatus(raw, rateLimit) {
  if (!raw) return 'unavailable';
  if (rateLimit?.limit_reached === true && Number(raw.used_percent) >= 100) return 'rejected';
  return 'allowed';
}

function mapUsagePayload(payload) {
  const rateLimit = payload?.rate_limit || {};
  const windows = classifyRateLimitWindows(rateLimit);
  return {
    util5h: pctFromUsedPercent(windows.fiveHour?.used_percent),
    reset5h: epochFromReset(windows.fiveHour),
    status5h: windowStatus(windows.fiveHour, rateLimit),
    util7d: pctFromUsedPercent(windows.weekly?.used_percent),
    reset7d: epochFromReset(windows.weekly),
    status7d: windowStatus(windows.weekly, rateLimit),
    unifiedStatus: rateLimit.allowed === false ? 'rejected' : 'allowed',
    planType: payload?.plan_type || null,
    fetchedAt: Math.floor(Date.now() / 1000),
  };
}

async function requestUsage(accessToken, accountId, signal) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'User-Agent': 'codex-cli',
  };
  if (accountId) headers['ChatGPT-Account-Id'] = accountId;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(USAGE_URL, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchUsage({ signal, _retried, force, authPath } = {}) {
  const loaded = readAuthFile(authPath);
  if (!loaded) {
    return { ok: false, kind: ErrorKind.NO_TOKEN, message: 'No ~/.codex/auth.json (run codex login)' };
  }

  let { access, accountId } = extractTokens(loaded.data);
  if (!access) {
    return { ok: false, kind: ErrorKind.NO_TOKEN, message: 'Codex auth.json missing access_token' };
  }

  let resp;
  try {
    resp = await requestUsage(access, accountId, signal);
  } catch (e) {
    const message = signal?.aborted || e?.name === 'AbortError'
      ? `timeout after ${FETCH_TIMEOUT_MS}ms`
      : (e?.message || 'fetch failed');
    return { ok: false, kind: ErrorKind.NETWORK, message };
  }

  if (resp.status === 401 || resp.status === 403) {
    if (!_retried) {
      const refreshed = await refreshAccessToken(authPath, { force: !!force });
      if (refreshed) {
        return fetchUsage({ signal, _retried: true, force, authPath });
      }
    }
    return { ok: false, kind: ErrorKind.AUTH, message: `HTTP ${resp.status}` };
  }

  if (resp.status === 429) {
    return { ok: false, kind: ErrorKind.RATE_LIMITED, message: 'HTTP 429' };
  }

  if (!resp.ok) {
    return { ok: false, kind: ErrorKind.UNKNOWN, message: `HTTP ${resp.status}` };
  }

  let payload;
  try {
    payload = await resp.json();
  } catch {
    return { ok: false, kind: ErrorKind.UNKNOWN, message: 'invalid JSON from usage API' };
  }

  const data = mapUsagePayload(payload);
  if (data.util5h === null && data.util7d === null) {
    return { ok: false, kind: ErrorKind.UNKNOWN, message: 'rate-limit windows missing', data };
  }
  return { ok: true, data };
}

export function formatReset(epochSec) {
  if (!epochSec) return '';
  const diff = epochSec - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'now';
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(diff / 3600);
  if (h < 48) return `${h}h`;
  const d = Math.round(diff / 86400);
  return `${d}d`;
}

// Test helpers
export const _internal = {
  DEFAULT_AUTH_PATH,
  mapUsagePayload,
  pctFromUsedPercent,
  epochFromReset,
  resolveAuthPath,
};
