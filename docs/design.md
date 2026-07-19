# Design — Ulanzi Codex Usage

Standalone Ulanzi Deck plugin mirroring [narlei/ulanzideck_claude](https://github.com/narlei/ulanzideck_claude).

- **Auth:** `~/.codex/auth.json` ChatGPT login; OAuth refresh via `auth.openai.com/oauth/token`
- **Usage:** `GET chatgpt.com/backend-api/wham/usage`
- **Windows:** classify by `limit_window_seconds` (≤24h → 5h, ≥3d → weekly)
- **UI:** same gauge thresholds/poll loop as Claude; Codex mark from openai/agents.md
- **Scope:** default account only; optional accent color
