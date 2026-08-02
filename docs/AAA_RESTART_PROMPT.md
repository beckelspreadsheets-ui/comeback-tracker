# AAA kart overhaul — restart prompt

Paste the block below after clearing context. Memory files
(`aaa-kart-overhaul`, `aaa-overhaul-tooling`, `multi-agent-wave-orchestration`)
carry the detail; this is the loop instruction.

---

```
/loop Drive the AAA kart overhaul to completion on branch aaa-kart-ci. Read tmp/aaa-plan/progress.json FIRST — it is the authoritative state. Waves 1-5 are committed and pushed (last commit d8630053); wave 6 is the only one left.

Each iteration: (1) CHECK LOAD with sysctl -n vm.loadavg — if load1 > 12 do NOT launch a wave or a local capture, just reschedule; the owner runs Godot/Codex and load above ~7 fakes proof reds on this repo. (2) If a wave workflow is in flight, do nothing and reschedule. (3) When a wave finishes: read its critic verdicts, verify the build is green (npm run build:kart then npm run test:bundle:kart — bundle measures the EXISTING dist so build first), commit honestly (state what still fails), republish the review sheet with node scripts/aaa-publish-review.mjs --label <captureLabel> --wave <N> --critics <criticsJson>, record the outcome in tmp/aaa-plan/progress.json, and push. (4) Launch the next wave as a Workflow authored to a scratchpad file and launched with scriptPath — backticks inside template literals break the parser. ALWAYS include the KNOWN TRAPS section (copy from the previous wave script: premultipliedAlpha/MultiplyBlending, unclamped additive shader lobes, vertex colours on shared vertices interpolating, per-second vs per-distance emission, flat PlaneGeometry having one normal, verifying "ships nothing" claims with grep, and checking a package OWNS the file its fix lives in).

WAVE 6 SCOPE, in this order:
  a. The arc-length/lane progress term MUST land FIRST. The monolith advances progress as speed/sampler.length with no lane term, so corner radius costs zero lap time and a longer track would just be more straight rail.
  b. Then track length. Measured: Comeback City centerline 2897u = 11.15s/lap = 33.5s race; a 45s lap needs x4.04. Lap count and speed are the WRONG levers. Keep the existing 13-16 authored beats when stretching — density is one beat per 0.70s and 4x length alone lands ~3s, i.e. MK8 pacing for free.
  c. Camera — the persistent floor at 4.3, rebuilt in wave 4 and still the lowest axis.
  d. HUD markup/structure (CSS is already at 8.0; the JSX was never restructured).
  e. Quality tiers so the phone build survives everything that grew.
  Also open: Penguin Village karts cast no shadow (diagnosed as the 12-degree key throwing the ribbon behind the kart, UNVERIFIED against a running build); rival value-spread capped at 0.247 by the shipped atlas (needs a new atlas cell, not a remap); fallback kart blackMat/tireMat/seatMat still lack rim:true.

STANDING RULES: never git add -A in a checkpoint (stage owned paths explicitly — an earlier -A swept 820 files and 530 binaries into history); aaa-kart-overhaul-full is LOCAL ONLY and must never be pushed; verify a failing package OWNS its files before another round; verify any "module ships nothing" claim with grep; treat critic regressions measured at load1 > 12 as suspect and re-measure when quiet. RESOLVED, do not relitigate: camera guard KEPT; Comeback City's grade is CONFIRMED GOOD and must not regress.

When wave 6 is done: run the full battery at load1 < 5 (build:kart, test:bundle:kart, test:kart-playable, test:race-proof, test:audio:kart), capture a final 18-frame set, run a final blind A/B against tmp/aaa-visual/baseline, and stop the loop with a summary. Never deploy the game. Never switch branches.
```

---

## Owner decisions still pending

- **Kart body picks** — https://comeback-kart-picks.pages.dev . Reply with numbers/names, then Meshy lifts fire at ~30cr each. Suggest 3 (that is how many racers share the one Kenney body and ship identical grey).
- **The remaining ~94 ordinal images** — pipeline is proven on the 3 on disk; the rest need art.
- **Whether to keep `.github/workflows/aaa-visual-capture.yml`** — it still shows red on some pushes because it only captures 2 of 9 marks per track under software rendering.
