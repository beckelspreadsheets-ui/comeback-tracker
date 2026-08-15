# Release push — credits, app shell, money. The systematic plan.

**Written 2026-08-15 after the trailer nights.** This is the working queue for
getting Penguin Kart (name still pending — owner's call) from "preview build the
group loves" to "released thing that can earn." Work it top to bottom.

---

## STATE (verified, not recollection)

- **Branch `aaa-kart-ci`**, head `3609d12a` (PV mean speed measured) on top of
  `c25295bb` (free-body autoplay driver — the P7 blocker is dead: probe finishes
  every race, 0 rescues, rails untouched, all 16 gates green). Deployed to
  https://aaa-preview.comeback-city-kart.pages.dev and byte-verified.
- **Trailer package** lives in `tmp/trailer-ai/` (untracked) + the owner's hub
  artifact: https://claude.ai/code/artifact/c8532141-1aae-4334-b0be-70092352efd7
  - `penguin-kart-trailer-16x9-v3.mp4` — current best: flicker-fixed cut with
    the MiniMax "Neon Circuit" synthwave track. v2.1 (old music) kept for A/B.
  - `penguin-kart-teaser-9x16.mp4` (v2) — two-penguin opener, native vertical
    title card; still has OLD music, needs the re-score.
  - 4K master is still v1 — re-render LAST, after music + portraits lock.
  - 15 Seedance clips, 6 char intros (Seth v2 = running/happy), 26 stills,
    six 4K hero portraits, 6 raw prop GLBs in `lifts/`.
- **Gameplay captures** (5 verified webms): `tmp/trailer-captures/`.
- **Higgsfield: ~412 credits, EXPIRE 2026-08-17.** Seedance 2.0 is the
  workhorse (2.5 = omni_reference mode, 5x slower, not worth it).
- **Music pipeline is FREE and solved:** MiniMax-Music3 HF Space via
  gradio_client. Track 1 landed; "Vice On Ice" fusion prompt is written and
  quota-blocked until ~08:00 2026-08-15 (anonymous ZeroGPU ≈ one 60s take/24h;
  a free HF token = many takes; owner drops it at `~/.hf-token`, never in chat).
- **Owner calls pending:** Lifoladen portrait A/B (strut vs coin throne), Seth
  portrait A/B (leap vs sprint) — both in the hub top section; the NAME;
  difficulty / engine-audio / freebody drive verdicts; `?perf=1` device readings.

---

## P0 — BEFORE THE CREDITS DIE (finish by Aug 17)

Order matters: music first (free), then credit spends, 4K absolutely last.

1. **Lock the music.** Fire `mmx-gen-fusion.py` ("Vice On Ice" — Miami opens,
   freezes over mid-track, worlds collide finale) when quota resets or the
   HF token appears at `~/.hf-token`. Two more authored variants if takes are
   cheap: "Heatwave/Whiteout" (starts icy, melts to Miami) and "Palm Trees on
   Ice" (one hybrid groove). Owner picks vs "Neon Circuit".
   **Cut so the freeze-over lands on the Penguin Village flyover beat.**
2. **Portrait winners** (owner A/B in hub) → swap into `heroes-4k` set (4K
   upscale, 2cr each) → re-roll the matching intro clips from winners
   (~54cr each, Seedance 2.0, 9:16 6s).
3. **iOS app art kit** (~20cr of nano_banana stills): 1024 app icon (penguin +
   kart mark, no text), iOS splash/launch screens both orientations, 6-10
   App Store screenshots dressed from key art + real gameplay frames.
4. **Finish the W5 prop stockpile** (90cr): shield bubble, blizzard cloud,
   avalanche marker — concept still (1:1, gray studio bg, "NO penguins") →
   `image_to_3d` with `should_texture: true` → `tmp/trailer-ai/lifts/`.
5. **Re-score the teaser** with the chosen track (free, ffmpeg only).
6. **Final 4K master** of the locked trailer via `upscale_video`
   (topaz, 2160p, ~48cr). LAST spend.
7. **Burn the remainder on the FPS project** (releases later, but credits die):
   concept stills for its look/mood + 1-2 Seedance mood clips. Ask the owner
   for the FPS one-liner brief first.

## P1 — RELEASE BLOCKER: THE iOS APP SHELL (Capacitor)

Fullscreen-on-iPhone cannot be done from Safari (proven during K3 — the
fullscreen attempts were removed as iOS thrash). Capacitor was already the
agreed path. The game STAYS web-first; the app is a shell around the same build.

1. Scaffold Capacitor in the repo (own directory, e.g. `ios-shell/`), pointed
   at `dist-kart` output. Do NOT restructure the web build.
2. iOS project config: landscape-only orientation lock, status bar hidden,
   `UIRequiresFullScreen`, black background behind the webview, no bounce.
3. Decide served-vs-bundled: bundling `dist-kart` in the app is offline-capable
   and review-friendly; remote-URL shells get rejected. Bundle, and keep the
   service worker OUT of the shell (double-caching).
4. Verify on the owner's actual iPhone: launch → landscape → race → audio
   works after first touch (iOS audio unlock), TILT controls still behave.
5. Apple Developer account ($99/yr, owner's Apple ID) → TestFlight build for
   the group → App Store submission.
6. **Review landmine, decided now:** no in-app purchases at launch. The app
   ships free with everything unlocked. Digital-goods sales happen on the WEB
   (see P2) so Apple's 15-30% IAP cut and crypto-payment rules never apply.
   Do not mention purchasable content in the app build or its store listing.

## P2 — REVENUE (build after P1 ships; spec now)

1. **PFP → playable 3D racer (the flagship).** The pipeline is already proven
   by hand (image → multi-view sheet → Meshy lift → diet → orientation lab →
   likeness check → roster slot). Productize:
   - Web-only flow: upload PFP → pay (crypto-friendly processor and/or Stripe)
     → job queue runs the generation chain → likeness gate → skin appears on
     the buyer's account. COGS ≈ $0.50-1/character; price $5-10.
   - **Ordinal holder gating:** the 100 penguin holders get theirs free or
     discounted (wallet-signature verification). That's collection utility —
     the crypto-native revenue story, and the group's actual incentive.
   - The iOS shell reads the same account entitlements; it sells nothing.
2. **Rewarded ads, later, at scale.** Right model for a kart game: opt-in
   rewarded video (2x coins for a race / kart trial unlock) wired into the
   existing coin economy — never interstitials mid-flow. Only worth wiring
   once daily traffic is real; revisit at first traction numbers.
3. Cosmetics runway (post-PFP): kart skins, drift-trail colors, horn sounds —
   same web-entitlement rail.

---

## TRAPS (carried forward — each cost real time)

- Deploy ONLY with `npm run deploy:kart:preview` after `npx wrangler whoami`
  shows Showcasedesigns (`9f01a1b3…`); verify origin twice against
  `dist-kart/assets` sizes (Pages propagation race serves index.html at 200).
- JS gzip 500.72/520 KiB. Build before `test:bundle:kart`. Audit-only code
  behind `import.meta.env.DEV`.
- Never `gltf-transform optimize`; raw lifts need diet + orientation lab
  before any in-game use. Never `git add -A`. Don't touch the quarantine stash.
- MiniMax Space: pass state as **dict** (json string → "Describe the song
  first"), guidance ≤ 4.0, anonymous quota ≈ 1 take/day, token at `~/.hf-token`.
- Seedance: 2.0, ~8 concurrent max (429 = wait), house-preset interception →
  resubmit with `declined_preset_id`; identity can smear for the first ~1s of
  a clip — trim in the edit before re-rolling.
- Likeness license gate (§2.2 roadmap): owner opt-in ON RECORD (2026-08-13)
  for the game's own 6 roster renders only. Raw ordinal PNGs still need
  per-asset opt-in. NO generic penguins in generated content, ever.
- A Playwright red at load1 ≥ 7 is suspect, but look at a frame before
  blaming load.

---

## PROMPT FOR THE FRESH CONTEXT

> Continue the Penguin Kart release push in
> /Users/andrewferguson/Downloads/comeback-tracker, branch `aaa-kart-ci`.
> Read `docs/RELEASE_PUSH_PLAN.md` FIRST — it is the authoritative queue.
> Higgsfield credits (~412) EXPIRE 2026-08-17: work P0 top-to-bottom first
> (music lock → portrait winners + intros → iOS app art → prop lifts →
> teaser re-score → 4K last → FPS tail-burn). Then P1, the Capacitor iOS
> shell — the game stays web-first, the app sells nothing.
> The owner's asset hub artifact and pending A/B picks are linked in the plan.
> He wants AskUserQuestion, two or three items a round.
