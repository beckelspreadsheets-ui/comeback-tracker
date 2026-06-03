# Secret Content Scan - Redacted Finding Summary

Timestamp: 2026-06-03T15:52:44Z

## Raw scan handling

A broad content scan found real local FatSecret credential values in ignored local environment files. The raw scan log was deleted immediately because it contained credential values and must not be committed as evidence.

## Credible secret findings

| Path | Finding | Git handling |
| --- | --- | --- |
| `.dev.vars` | Local FatSecret credential values are present. | Ignored by `.gitignore`; not tracked; do not stage. |
| `.env.local` | Local FatSecret credential values are present. | Ignored by `.gitignore`; not tracked; do not stage. |

## False-positive / non-secret findings

| Path | Finding | Review result |
| --- | --- | --- |
| `wrangler.toml` | Filename matched the secret filename scan. | Tracked config file contains project/build metadata only; no credential values observed. |
| `functions/api/fatsecret/_shared.js` | Environment variable names for FatSecret bindings. | Code references only; no credential values observed. |
| `scripts/**` and `docs/**` | Environment variable names and smoke-test placeholder strings. | Documentation/test placeholders only; no credential values observed. |
| `.wrangler/tmp/**` | Wrangler-generated local bundle and source map included environment variable names and local paths. | Ignored local build cache; do not stage. |

## Release handling

- Do not stage `.dev.vars`, `.env.local`, or `.wrangler/`.
- Run a sanitized scan over committable files before staging.
- After staging, run a staged-content secret check before commit.
