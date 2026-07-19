# Codex Usage Plugin for Ulanzi Deck

Display your ChatGPT **Codex** subscription usage on your Ulanzi Deck — the Codex sibling of [Claude Code Usage](https://github.com/narlei/ulanzideck_claude).

## Features

- **5-Hour Rolling Limit** — usage in the current short window (when Codex reports one)
- **Weekly Limit** — usage across the weekly window
- Color-coded thresholds and reset countdown on the button
- Optional accent color stripe
- Reads `~/.codex/auth.json` (ChatGPT login) — no API key required
- Refreshes the ChatGPT access token automatically when it expires
- Polls every 5 minutes; click a button to force refresh

## Requirements

- Ulanzi Studio **3.0.11+**
- macOS 10.15+
- Codex CLI logged in with ChatGPT (`codex login`) so `~/.codex/auth.json` exists

## Install (developer)

```bash
make install   # sync to ~/Library/Application Support/Ulanzi/UlanziDeck/Plugins and restart Ulanzi Studio
make package   # build dist/com.codex.usage.ulanziPlugin.zip
make test      # unit tests
```

Or download a release ZIP and unpack it into the Ulanzi Deck Plugins folder.

## How it works

1. Reads the ChatGPT access token from `~/.codex/auth.json`
2. Calls `GET https://chatgpt.com/backend-api/wham/usage`
3. Maps `primary_window` / `secondary_window` by `limit_window_seconds` onto the 5h and Weekly buttons
4. On HTTP 401/403, refreshes via `https://auth.openai.com/oauth/token` and writes the new tokens back to `auth.json`

If a window is not present in the API response (common when the 5h window is inactive), that button shows **n/a**.

## Marketplace

### Ulanzi Community Store (recommended)

1. Publish a GitHub Release whose asset is `com.codex.usage.ulanziPlugin.zip` (this repo’s `make package` + release workflow does that when `manifest.json` version changes on `main`).
2. Submit the repo URL at [ulanzicommunitystore.narlei.com/#publish](https://ulanzicommunitystore.narlei.com/#publish) (or the desktop app’s **Send plugin** tab).
3. That opens a PR against [`narlei/ulanzicommunitystore`](https://github.com/narlei/ulanzicommunitystore) registry (`registry/plugins/dahliasan__ulanzideck_codex.json`). Once merged, the store lists the plugin and picks up future releases automatically.

See [MARKETPLACE.md](MARKETPLACE.md) for the official Ulanzi Studio Marketplace path and checklist.

## Privacy

Credentials never leave your machine except as a Bearer token to OpenAI/ChatGPT usage endpoints. See [PRIVACY.md](PRIVACY.md).

## Icons

Plugin and on-button marks use the Codex product icon from [`openai/agents.md` `public/logos/codex.svg`](https://github.com/openai/agents.md/blob/main/public/logos/codex.svg). Codex / OpenAI marks belong to OpenAI; this is an unofficial community plugin.

## License

MIT — layout and UX inspired by [narlei/ulanzideck_claude](https://github.com/narlei/ulanzideck_claude).

## Author

dahliasan
