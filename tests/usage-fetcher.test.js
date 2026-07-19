import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyRateLimitWindows,
  formatReset,
  _internal,
} from '../com.codex.usage.ulanziPlugin/plugin/usage-fetcher.js';

const { mapUsagePayload, pctFromUsedPercent, epochFromReset } = _internal;

describe('pctFromUsedPercent', () => {
  it('maps 0-100 to 0-1', () => {
    assert.equal(pctFromUsedPercent(0), 0);
    assert.equal(pctFromUsedPercent(7), 0.07);
    assert.equal(pctFromUsedPercent(100), 1);
  });

  it('clamps and rejects non-finite', () => {
    assert.equal(pctFromUsedPercent(150), 1);
    assert.equal(pctFromUsedPercent(-3), 0);
    assert.equal(pctFromUsedPercent('x'), null);
  });
});

describe('classifyRateLimitWindows', () => {
  it('maps weekly-only primary window', () => {
    const windows = classifyRateLimitWindows({
      primary_window: {
        used_percent: 7,
        limit_window_seconds: 604800,
        reset_after_seconds: 1000,
        reset_at: 1784959673,
      },
      secondary_window: null,
    });
    assert.equal(windows.fiveHour, null);
    assert.equal(windows.weekly.used_percent, 7);
  });

  it('maps 5h + weekly when both present', () => {
    const windows = classifyRateLimitWindows({
      primary_window: {
        used_percent: 42,
        limit_window_seconds: 18000,
        reset_after_seconds: 3600,
        reset_at: 1700003600,
      },
      secondary_window: {
        used_percent: 18,
        limit_window_seconds: 604800,
        reset_after_seconds: 200000,
        reset_at: 1700200000,
      },
    });
    assert.equal(windows.fiveHour.used_percent, 42);
    assert.equal(windows.weekly.used_percent, 18);
  });
});

describe('mapUsagePayload', () => {
  it('produces Claude-compatible fields for weekly-only', () => {
    const data = mapUsagePayload({
      plan_type: 'plus',
      rate_limit: {
        allowed: true,
        limit_reached: false,
        primary_window: {
          used_percent: 7,
          limit_window_seconds: 604800,
          reset_after_seconds: 483432,
          reset_at: 1784959673,
        },
        secondary_window: null,
      },
    });
    assert.equal(data.util5h, null);
    assert.equal(data.status5h, 'unavailable');
    assert.equal(data.util7d, 0.07);
    assert.equal(data.status7d, 'allowed');
    assert.equal(data.reset7d, 1784959673);
    assert.equal(data.planType, 'plus');
  });

  it('marks rejected when limit reached at 100%', () => {
    const data = mapUsagePayload({
      rate_limit: {
        allowed: false,
        limit_reached: true,
        primary_window: {
          used_percent: 100,
          limit_window_seconds: 18000,
          reset_after_seconds: 120,
          reset_at: 1700000120,
        },
        secondary_window: {
          used_percent: 55,
          limit_window_seconds: 604800,
          reset_after_seconds: 999,
          reset_at: 1700000999,
        },
      },
    });
    assert.equal(data.status5h, 'rejected');
    assert.equal(data.util5h, 1);
    assert.equal(data.util7d, 0.55);
  });
});

describe('epochFromReset', () => {
  it('prefers reset_at seconds', () => {
    assert.equal(epochFromReset({ reset_at: 1700000000, reset_after_seconds: 10 }), 1700000000);
  });

  it('falls back to reset_after_seconds', () => {
    const before = Math.floor(Date.now() / 1000);
    const got = epochFromReset({ reset_after_seconds: 60 });
    const after = Math.floor(Date.now() / 1000);
    assert.ok(got >= before + 60 && got <= after + 60);
  });
});

describe('formatReset', () => {
  it('formats minutes hours days', () => {
    const now = Math.floor(Date.now() / 1000);
    assert.equal(formatReset(now + 30), '1m');
    assert.equal(formatReset(now + 3600), '1h');
    assert.equal(formatReset(now + 3 * 86400), '3d');
    assert.equal(formatReset(now - 10), 'now');
    assert.equal(formatReset(null), '');
  });
});
