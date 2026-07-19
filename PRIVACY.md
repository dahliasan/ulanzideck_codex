# Privacy

This plugin is local-first.

## What it reads

- macOS/Linux path: `~/.codex/auth.json` (created by `codex login`)
- Fields used: `tokens.access_token`, `tokens.refresh_token`, `tokens.account_id`

## What it sends

- `GET https://chatgpt.com/backend-api/wham/usage` with the ChatGPT access token (and account id header when present)
- On auth failure: `POST https://auth.openai.com/oauth/token` with the refresh token to obtain a new access token

## What it stores

- Ulanzi action settings only (optional accent color)
- On successful OAuth refresh, updated tokens are written back to `~/.codex/auth.json` so Codex CLI stays in sync

## What it does not do

- No telemetry or analytics
- No third-party servers other than OpenAI/ChatGPT
- Does not use API-key billing mode; ChatGPT subscription login only
