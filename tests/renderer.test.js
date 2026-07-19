import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  renderUsage,
  renderUnavailable,
  renderNoToken,
  renderLoading,
} from '../com.codex.usage.ulanziPlugin/plugin/renderer.js';

describe('renderer', () => {
  it('returns svg data urls', () => {
    for (const url of [
      renderUsage({ label: '5h', util: 0.42, reset: '4h' }),
      renderUnavailable({ label: '5h' }),
      renderNoToken({ label: 'Weekly' }),
      renderLoading({ label: '5h' }),
    ]) {
      assert.match(url, /^data:image\/svg\+xml;base64,/);
      const b64 = url.slice('data:image/svg+xml;base64,'.length);
      const svg = Buffer.from(b64, 'base64').toString('utf8');
      assert.match(svg, /<svg /);
    }
  });

  it('embeds the Codex mark path on usage tiles', () => {
    const url = renderUsage({ label: 'Weekly', util: 0.07, reset: '5d' });
    const svg = Buffer.from(url.split(',')[1], 'base64').toString('utf8');
    assert.match(svg, /M8\.33301 5\.79411/);
    assert.match(svg, /7%/);
    assert.match(svg, /Reset in 5d/);
  });
});
