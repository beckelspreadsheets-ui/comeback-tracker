# Staged Secret Check Summary

Timestamp: 2026-06-03T15:52:44Z

## Staged filename check

Result: pass.

- `staged-secret-filename-scan.log` has `0` lines.
- `staged-ignored-secret-files-check.log` has `0` lines.
- `.dev.vars`, `.env.local`, and `.wrangler/` are not staged.

## Staged token-pattern check

Result: pass with one reviewed false positive.

- `staged-secret-token-scan.log` has `1` line.
- The only hit is the literal release-safety scanner pattern for a private-key marker in `scripts/release-artifact-safety-test.mjs`.
- No staged private key, Cloudflare token, GitHub token, Slack token, OpenAI-style `sk-` token, Google API key, or AWS access key value was observed by the staged token-pattern scan.

## Release handling

Proceed to commit only with ignored local credential files unstaged. Re-run release artifact safety before deploy.
