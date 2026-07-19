# Marketplace publishing

Two channels. Ship **Community Store** first (fast), then the official Ulanzi Studio Marketplace when ready.

## A. Ulanzi Community Store (primary)

Docs: [PUBLISHING.md](https://github.com/narlei/ulanzicommunitystore/blob/main/PUBLISHING.md)

### Checklist

1. Repo is **public**: `https://github.com/dahliasan/ulanzideck_codex`
2. Root contains `com.codex.usage.ulanziPlugin/manifest.json` + optional `store.json`
3. GitHub Release `vX.Y.Z` includes asset **`com.codex.usage.ulanziPlugin.zip`**
   - Trigger: bump `Version` in `manifest.json` on `main` (workflow), or `make package` + `gh release create`
4. Submit repo URL at https://ulanzicommunitystore.narlei.com/#publish  
   (or desktop app **Send plugin**)
5. Merge the generated PR into `narlei/ulanzicommunitystore`  
   Registry file shape: `registry/plugins/dahliasan__ulanzideck_codex.json` → `{ "repo": "dahliasan/ulanzideck_codex" }`
6. After merge, add the store badge to the README

Manual registry PR fallback:

```json
{ "repo": "dahliasan/ulanzideck_codex" }
```

## B. Official Ulanzi Studio Marketplace

Official SDK / store publishing lives with Ulanzi:

- SDK: https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK
- Submit through Ulanzi Studio’s developer / marketplace flow (account + review)

Community Store does **not** replace the official marketplace — you can list on both. Use Community Store while iterating; submit to official when the plugin is stable and you want discovery inside Ulanzi Studio’s built-in store.

### Official submission tips

- Keep `manifest.json` UUIDs stable forever (`com.dahliasan.codexusage.plugin`)
- Ship signed/versioned ZIPs matching the plugin folder name
- Include screenshots (`resources/banner*.png`) and a clear privacy note (this repo’s `PRIVACY.md`)
- Expect review turnaround; respond to packaging / permission questions (reads local `auth.json`, network to ChatGPT only)

## Release workflow in this repo

On `main`, when `com.codex.usage.ulanziPlugin/manifest.json` changes:

1. CI reads `Version`
2. Builds `dist/com.codex.usage.ulanziPlugin.zip` via `make package`
3. Creates GitHub Release `v$Version` with that ZIP (if it does not already exist)

Local dry-run:

```bash
make test
make package
ls -la dist/
```
