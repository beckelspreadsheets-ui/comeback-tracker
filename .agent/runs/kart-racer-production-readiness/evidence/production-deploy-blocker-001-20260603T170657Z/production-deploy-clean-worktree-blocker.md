# Production Deploy Clean-Worktree Blocker

Captured: 2026-06-03T17:06:57Z

Status: blocked before production direct upload.

Reason: the owner-approved release path requires a clean release branch/worktree before production deployment. After committing kart-racer preview deployment proof at `15e9fb8`, the only remaining dirty paths are unrelated `AnimatedShowcaseDesigns/` files, which are outside the kart-racer release scope.

Post-commit dirty paths:

- `AnimatedShowcaseDesigns/index.html`
- `AnimatedShowcaseDesigns/v3-preview.html`
- `AnimatedShowcaseDesigns/.agent/GOALS.md`
- `AnimatedShowcaseDesigns/.agent/runs/showcase-v3-live/GOAL.md`
- `AnimatedShowcaseDesigns/.agent/runs/showcase-v3-live/evidence/pricing-research-20260603.md`
- `AnimatedShowcaseDesigns/.agent/runs/showcase-v3-live/implementation-notes.html`

Decision needed from owner/release owner:

- Commit/include the `AnimatedShowcaseDesigns/` changes on this branch.
- Leave them uncommitted and pause production deployment until they are handled elsewhere.
- Move/stash/handle them outside this kart-racer release branch, then resume production deployment from a clean worktree.

No production upload, production smoke, Cloudflare rollback proof, monitoring/version proof, or final sign-off was attempted after this blocker was confirmed.
