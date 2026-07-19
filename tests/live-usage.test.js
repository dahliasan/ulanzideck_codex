// Live smoke test against local ~/.codex/auth.json (skipped if missing)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fetchUsage } from '../com.codex.usage.ulanziPlugin/plugin/usage-fetcher.js';

const authPath = path.join(os.homedir(), '.codex', 'auth.json');
const hasAuth = fs.existsSync(authPath);

describe('live Codex usage', { skip: !hasAuth }, () => {
  it('fetches usage for the logged-in ChatGPT account', async () => {
    const result = await fetchUsage({ force: true });
    assert.equal(result.ok, true, result.message || result.kind);
    assert.ok(result.data.util5h !== null || result.data.util7d !== null);
    assert.ok(typeof result.data.fetchedAt === 'number');
    console.log('live usage', {
      util5h: result.data.util5h,
      status5h: result.data.status5h,
      util7d: result.data.util7d,
      status7d: result.data.status7d,
      planType: result.data.planType,
    });
  });
});
