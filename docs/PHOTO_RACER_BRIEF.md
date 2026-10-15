# Photo → racer: design brief (researched 2026-10-15; not legal advice)

> **Owner decisions later the same day override parts of this brief:** the 3D
> step is Tripo's pay-as-you-go API (no Meshy subscription), the price is
> $7.99 with a $4.99 founders' price, the concierge takes Stripe links and
> Lightning, and Apple enrolment is the Showcase Designs company account. See
> "Owner decisions 2026-10-15" in docs/RELEASE_V1_PLAN.md (Phase 5).

## Recommendation
1. **Payment: Apple in-app purchase everywhere, plus a web store for card and crypto.**
   - Sell a consumable "Racer Token" ($4.99) through StoreKit 2. The Small Business Program rate is 15%.
   - The Aug-15 plan ("the app sells nothing, the web does") fails rule 3.1.3(b). Web purchases may unlock in the app only "provided those items are also available as in-app purchases."
   - Web checkout: Stripe for cards; BTCPay over Lightning (0%) or OpenNode (~1%) for Bitcoin.
   - The app may link to the web store **only in the US storefront**. Apple charges 0% on those sales today; it has asked the court for 5% for small developers.
   - No crypto payments and no Ordinal-ownership checks inside the app (rule 3.1.1).
2. **Vendors: an OpenAI image model makes the 4-view sheet → Meshy multi-image-to-3D, called directly → our own diet.**
   - **Not Gemini.** Its API terms (2026-04-28) bar apps "likely to be accessed by individuals under the age of 18". OpenAI permits apps used by minors, with safeguards.
   - **Not Higgsfield.** Its public API has no Nano Banana Pro or 3D, and it takes a perpetual license on inputs.
   - Run a ~$18 bake-off first: Meshy vs Tripo vs Rodin vs Hunyuan (the last two via fal). Fallback: Tripo H3.1 ($0.30, signed webhooks).
3. **Moderation: screen before payment; the owner approves every racer at launch.**
   - Free OpenAI omni-moderation, plus an LLM check for children, celebrities and brand characters.
   - No face-recognition APIs: they create biometric-law exposure (Illinois BIPA, Texas CUBI).
4. **Price $4.99 against ≈$1.40 vendor cost including re-rolls.** That leaves ≈$2.85 margin after Apple's $0.75.
5. **MVP scope: PFPs, character art and pets; 18+ only; each racer private to its owner.**
   - Selfies wait for Phase 2. Meshy's terms forbid "personally identifiable information" in inputs (§2.2) and allow training on non-Enterprise data (§2.9).

## Pipeline architecture
**Client (shared web/iOS code)**
1. "Make my racer" tile → 18+ gate: Apple's Declared Age Range API on iOS (needs a small Swift plugin), date-of-birth confirmation on web.
2. System photo picker → downscale to ≤1536 px and strip EXIF/GPS.
3. Separate consent boxes, which give the explicit third-party-AI consent rule 5.1.2(i) requires:
   - Rights: "I own this image or have permission."
   - Processing: "Sent to OpenAI and Meshy; deleted within 30 days."
4. Server pre-screen (~5 s). Rejects never reach the paywall.
5. Disclaimer: "Every racer is hand-checked to make sure it looks good — usually ready within 24 h. If we can't make it, your token comes back."
6. In-app purchase, with `appAccountToken = playerId`.
7. "In the workshop" status card → the racer appears under My Racers, shown in live 3D.

**Server (a new Worker on the Showcasedesigns account)**
- **Hosting:** served on the kart's own hostname, so the web CSP (`connect-src 'self'`) stays unchanged. CORS allows `capacitor://localhost`.
- **API:**
  - Register, upload + screen, create order (verified with the App Store Server API).
  - My racers, GLB stream, delete my data.
  - Apple's server notifications: REFUND revokes the racer; CONSUMPTION_REQUEST is answered within 12 h.
- **D1:** players, uploads, orders, racers (GLB hash, driverYaw, driverHeight, status), token ledger, audit log.
- **R2:** `racer-uploads` (private, purged after 30 days) and `racer-models`.
- **Workflows, one run per order:**
  1. Sheet → crop → Meshy lift.
  2. Copy the GLB to R2 immediately (Meshy deletes API models after 3 days), then delete the Meshy task.
  3. Diet → automatic checks.
  4. `step.waitForEvent('review')` → deliver, re-roll or reject.
  - Vendor spend is capped at $3 per order.
- **Container:** a Cloudflare Container with Node, gltf-transform, meshoptimizer and sharp, ≈$0.001/job. Workers can't run meshopt's runtime WASM or sharp.
  - It ports `scripts/ordinal-sheet-crop.mjs`.
  - It ports `scripts/diet-kart-bodies.mjs` with its pass/fail gates: strip unused texture slots → weld → simplify 0.5/0.01 → 512 px JPEG → meshopt.
- **Meshy settings:** front view first (Lifoladen came out facing +Z, yaw 0). `should_texture:true`; `enable_pbr:false`, since the toon material reads only the base color. A seated-pose sheet prompt.
- **Owner approval UI:** `/admin` behind Cloudflare Access, reusing `verifyAccessJwt` from `functions/api/sync/_shared.js`.
  - Shows the photo, sheet and crops, the candidate seated in a real kart (`?previewRacer=`), a 4-angle strip, and triangle/KB counts.
  - Buttons: Approve (set yaw and height), Re-roll sheet, Re-roll 3D, Reject (token returned).

**Game code changes**
- **The roster is hard-coded at every layer:**
  - `KART_CHARACTERS`.
  - `characterByKey`, which falls back to the bunny.
  - The fixed-order `Promise.all` in `loadKartAssets`.
  - `SELECT_CHARACTER_MODELS`.
  - KartApp's check of the saved character.
- **New `src/kart/customRacers.js`:** owned racers, cached in IndexedDB and merged into the roster in its 5 importing files.
  - IndexedDB because the iOS app runs no service worker, and the existing cache rule only covers same-origin `/assets/*.glb`.
- **Load and mount:** load via `createGameGltfLoader()` into `mountDriverAvatar`, which already scales and centers.
  - Set `projectileSkin:'snowball'` and use the player seat only. That keeps custom racers out of Penguin March and the rival seats.
- **No bundle impact:** the current build is 16.8 MiB of a 22 MiB cap; the brief's "13 MiB" figure is stale.
- **iOS gaps:** Info.plist lacks camera and photo usage strings, and there is no `PrivacyInfo.xcprivacy`.

## Policy risks (ranked)
| # | Risk | Mitigation |
|---|---|---|
| 1 | Gemini's under-18 clause (Google can revoke the key) | OpenAI image model in the app |
| 2 | Rejection under 3.1.1/3.1.3(b) | In-app purchase everywhere; neutral US-only link; no crypto/NFT unlocks or redeem codes |
| 3 | Real-person photos: 5.1.2(i), Meshy §2.2/§2.9, Illinois BIPA / Texas CUBI | No selfies in the MVP. Phase 2 needs a vendor tier that doesn't train on uploads, a written biometric release and a published retention schedule |
| 4 | Minors: COPPA (child images count; compliance date 2026-04-22); Texas SB 2420 (reportedly enforceable since July 2026) | 18+ gate; reject photos of children |
| 5 | IP and likeness (5.2.1); owner pre-approval weakens DMCA safe harbor | Rights attestation; reject brands, characters (no Nintendo trade dress) and celebrities; DMCA agent ($6) |
| 6 | User-generated content rule 1.2 once others can see racers | Racers stay private; add report/block/contact before ghosts or leaderboards |
| 7 | Only Apple can refund | Consume the token only on approval |
| 8 | In-app account deletion (5.1.1(v)) | Purge R2, D1, vendor tasks and Sign in with Apple tokens |

## Cost model (per delivered racer)
| Item | Unit | Avg rolls | Cost |
|---|---|---|---|
| Pre-screen | ~$0.005 | 1 | $0.01 |
| Sheet (gpt-image-2 high, $0.21 at 1024²) | ~$0.25 | 1.5 | $0.38 |
| Meshy lift (30 credits; Premium = $40 for 3,000) | $0.40 ($0.60 on Pro) | 2.5 | $1.00 |
| Container + R2 | | | $0.01 |
| **Total** | | | **≈$1.40** (best case $0.65; capped at $3) |

- **In-app:** $4.99 − Apple's $0.75 = $4.24 net → ≈$2.85 margin.
- **Fixed costs:** Meshy $40/mo + Workers Paid $5/mo + Apple $99/yr. Break-even is ≈20 racers a month.
- **At $2.99** the net is ≈$1.10, too thin to absorb re-rolls.
- **Web sales:** Stripe takes ≈$0.44 on $4.99, only $0.31 less than Apple; Lightning costs 0%. You become merchant of record (tax, chargebacks), so the web store is for crypto buyers, not margin.

## Phased plan
**Phase 0 — concierge, start now (~5 dev-days).**
- Adults from the ordinals group order outside the app: BTCPay/Lightning, a Square invoice (Lightning 0% through 2026-12-31), or a Stripe Payment Link.
- Claude runs a `scripts/racer-forge` command with direct API keys: sheet → crop → Meshy → diet → turntable.
- Nano Banana Pro is defensible here because every customer is an adult. gpt-image-2 runs alongside it as the bake-off.
- The owner approves on the existing approval-sheet artifact. A claim link delivers the racer into the new loader.
- Measure re-roll rate, reject rate, cost and owner minutes per racer.
- **Owner provides:** Meshy plan, OpenAI and Gemini keys, R2/D1, payment receiving, price and scope calls.

**Phase 1 — self-serve iOS MVP (~3–4 weeks).**
- In-app purchase via `@revenuecat/purchases-capacitor` (supports Capacitor 8; free under $2.5k/month revenue) or `@capgo/native-purchases`.
- The server above, the admin queue, the 18+ gate, consent and delete.
- A privacy policy and retention schedule.
- Privacy label: "Photos or Videos", linked to the user, used for App Functionality.
- Privacy manifest and Info.plist usage strings.
- App Review notes plus a demo account.
- **Owner provides:**
  - Xcode license, Apple Developer Program, Paid Apps Agreement with tax and banking.
  - **Small Business Program enrollment before the first sale.**
  - The in-app purchase product, an App Store Server API key, Workers Paid, and a lawyer's review.

**Phase 2 — no waiting (~4–6 weeks, after ~100 owner decisions).**
- Auto-approve once an LLM judge agrees with the owner ≥95% of the time in shadow mode; the owner then samples 10%.
- A US-only web checkout link, plus Sign in with Apple accounts shared by web and app.
- Ordinal-holder perks redeemed on the web only.
- Selfie mode, public racers with full 1.2 tooling, and push notifications.
- **Owner provides:** Stripe and BTCPay accounts, a Sign in with Apple Services ID, an APNs key.

**Unverified:**
- gpt-image-2's wide-sheet cost, and its quality against Nano Banana Pro.
- Meshy's latency, and whether its credits roll over.
- Tripo's training terms.
- Whether a US app may skip in-app purchase when it links out.
- Supreme Court timing (case accepted 2026-06-30; no argument date yet).
- Whether a Capacitor plugin for Declared Age Range exists.

## Key sources (page date, else accessed 2026-10-15)
- **Apple:** App Review Guidelines (2026-06-08) · developer.apple.com/news/?id=ey6d8onl, the 5.1.2(i) change (2025-11-13)
- **Courts:** Ninth Circuit No. 25-2935 (2025-12-11) · Supreme Court docket 25-1311 · MacRumors on Apple's fee proposal (2026-08-13)
- **Vendor terms:** ai.google.dev/gemini-api/terms (2026-04-28) · OpenAI under-18 API guidance · meshy.ai/terms-of-use (2026-09-19) · docs.meshy.ai pricing and asset retention
- **Cloudflare:** Workflows events docs · Containers pricing (2026-10-05)
- **Law and payments:** SCOTUSblog on Texas SB 2420 (2026-07-06) · RevenueCat pricing
