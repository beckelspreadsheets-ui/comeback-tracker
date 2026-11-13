# Penguin Kart — App Store readiness audit (2026-11-09 / 10)

Independent audit of the kart game before App Store preparation. Run on
`classic-handling` at `b8c432f9` plus the two uncommitted game edits found in
the working tree (the per-version, per-class rival pace table). All builds and
tests ran in an isolated copy outside the repository. Apple requirements were
checked against Apple's own pages on 2026-11-09.

Fixes for the confirmed bugs marked **FIXED** below are on branch
`audit-fixes-2026-11-09` (one commit each). Nothing was deployed, signed,
merged or published.

## 1. Readiness verdict

**Not ready for TestFlight or the App Store yet; close on engineering, blocked
on owner-side items.** The game builds, passes its whole gate battery, compiles
for iOS against the iOS 27.2 SDK and runs a full race inside the app shell in
the iPhone and iPad simulators. What stands between it and TestFlight is the
Apple account, written likeness permissions, rights evidence for some
generated assets, an iPad windowing decision, and a short list of App Review
requirements (privacy link in the app, live privacy/support pages). No physical
iPhone or iPad has run the game, so performance, heat, audio interruptions and
touch feel on a device are all unverified.

## 2. Evidence classes

| Class | What was run | What it does and does not prove |
|---|---|---|
| Node gates | 12 headless suites (spline, laps, wrong-way, off-road, autoplay, classic-handling, minimap, track visuals, ground clearance, select models, audio samples, kart regressions) | Logic and geometry. No rendering. |
| Desktop Chromium (Playwright, headless, ANGLE) | Full battery browser gates; 20 autoplay races (3 tracks × 3 handlings × 50/150cc, plus 100cc on Penguin Village); menu and HUD walks at 844×390, 667×375, 1366×1024 and 683×1024 with touch emulation | Behaviour and layout. **Not** performance: machine load was 10–120 throughout. No safe areas. |
| Desktop WebKit (Playwright) | Menu and HUD walk at phone and iPad sizes | Closest engine to the app's WKWebView available on a desktop. No page errors. Not iOS. |
| Xcode compile | Unsigned Release build for a generic iOS device, Xcode 27.2 / iOS 27.2 SDK | The project compiles and bundles (22 MB app, privacy manifests present). Not signing, not upload validation. |
| iOS Simulator (iOS 27.2) | iPhone 18 Pro and iPad Pro 13-inch: launch, intro, setup, autoplay race from `capacitor://localhost` | Asset loading, WebGL2, layout with real safe areas. **Not** performance (Mac GPU), not touch feel, not audio (no touch was injected). Race and setup were reached with a scratch-only script injected into the simulator bundle; the repository was not changed for it. |
| Physical iPhone / iPad | **None** | Everything device-specific is unverified. |

## 3. Commands and results

All in the isolated copy, Node 22.22.2.

| Command | Result |
|---|---|
| `npm run build:kart` | Pass. 129 files, 17.3 MiB; JS 1,732 KiB raw. |
| `node scripts/kart-gate-battery.mjs` (original tree + uncommitted edits) | **17/17 pass** |
| same, after the first batch of fixes | **17/17 pass** |
| same, after the safe-area fix | **17/17 pass** |
| `test:kart:soak` (inside the battery) | 10 races, heap 25.1 → 26.1 MiB, 1 live WebGL context, 2 retained |
| `test:kart:context-loss` (inside the battery) | Pass: pauses, explains, recovers |
| `xcodebuild … -sdk iphoneos -configuration Release CODE_SIGNING_ALLOWED=NO build` | BUILD SUCCEEDED |
| `xcodebuild … -sdk iphonesimulator … build` + `simctl install/launch` | Runs on iPhone 18 Pro and iPad Pro 13-inch simulators |

Coverage gaps in the existing gates:
- No browser gate races **Satoshi Summit** or either **Classic** handling (soak
  alternates the two older tracks; the playable proof is Assisted only).
- No lap test drove the **dare-ramp shortcut** (which is how finding G1 lived).
- `test:race` still exercises the retired engine, not the shipping race.
- `test:lifecycle` and `test:accessibility` target the workout tracker.
- Nothing tests the app shell (`capacitor://`), safe areas, or iPad windows.

## 4. Play results (autoplay driver, one run each, desktop Chromium)

The autoplay is a fixed policy and a stronger, steadier driver than a newcomer
on Assisted, and a cautious one on Classic. Single runs; treat as direction,
not as tuned numbers.

| Track | Assisted 50cc | Classic 64 50cc | Classic Mix 50cc | Assisted 150cc | Classic 64 150cc | Classic Mix 150cc |
|---|---|---|---|---|---|---|
| Comeback City | 1st, led 95%, won by 28.7 s | 1st, led 96% | 4th, led 41% | 1st, led 11% | 6th, never led | 6th, never led |
| Penguin Village | 1st, led 94% | 1st, led 95% | 6th, never led | — | 6th, never led | 6th, never led |
| Satoshi Summit | 1st, led 94% | 1st, led 97% | 5th, led 7% | 1st, led 90% | 6th, never led | 6th, never led |

Penguin Village 100cc: Classic 64 1st (led 93%), Classic Mix 6th (never led).
All 20 races finished, with 0 rescues, 0 page errors and correct lap counts.
Race length: about 140 s on Assisted, 170–180 s on Classic at 50cc.

## 5. Findings

Priority: **B** release blocker · **T** fix before TestFlight · **P** fix
before public release · **O** optional. "Sim" = iOS Simulator, "Chromium" /
"WebKit" = desktop browser emulation.

### Release and store

| Pri | Finding | Evidence | Impact | Proposed fix | Acceptance test | Effort / depends on |
|---|---|---|---|---|---|---|
| B | No Apple Developer Program membership; nothing can be signed for TestFlight | docs/APPLE_ENROLLMENT.md Track B; Apple enrolment page (legal entity, D-U-N-S, domain email, $99) | No TestFlight, no submission | Owner enrols Showcase Designs | App Store Connect opens for the team | Owner; D-U-N-S can take days |
| B | Privacy and support URLs serve the game, not the pages | `curl https://comeback-city-kart.pages.dev/privacy.html` and `/support.html` return the 1,836-byte game index (production is still the July build) | Guideline 2.1(a) requires functional URLs; 5.1.1(i) requires a privacy policy URL | Production deploy of the kart site (owner's word), or host both pages elsewhere | Both URLs return the policy and support text | Small; owner decision on production |
| B | No privacy policy link inside the app | No link to `privacy.html` anywhere in `src/kart` or the race UI; the page is in the bundle | Guideline 5.1.1(i): link required in the app "in an easily accessible manner" | Add Privacy and Support links to the setup screen and the pause menu, opening the bundled pages | Link visible and opens the policy in the simulator | Small |
| B | iPad: full-screen opt-out is ignored when built with the iOS 27 SDK, and a tall window turns the game sideways | `ios/App/App/Info.plist` sets `UIRequiresFullScreen`; Apple TN3192 (ignored from iOS 27 SDK); Chromium 683×1024 walk shows the race rotated 90° (`ipadsplit-07-race-3s.png`) | On iPad the app can be resized or split; a narrow window shows a sideways game | Decide: iPhone-only for V1, or support resizing (drop the soft rotation in the app, letterbox to landscape, add `UISceneSizeRestrictions` / `prefersInterfaceOrientationLocked`) | iPad simulator with Stage Manager: no sideways frame at any window size | Medium; owner decision (see questions) |
| B | Stale web bundle inside the iOS project | `ios/App/App/public` dated Oct 21: no Satoshi Summit, no Classic handling | Archiving without a sync ships an old game | `npm run ios:sync` immediately before every archive; add a check that the bundle hash matches `dist-kart` | Bundle index hash equals the fresh build's | Small |
| T | Build number, signing team and archive not yet exercised | `project.pbxproj`: `MARKETING_VERSION 1.0`, `CURRENT_PROJECT_VERSION 1`, automatic signing, no team | First upload path untested | After enrolment: set team, archive, Validate App, upload | Build appears in TestFlight | Small; depends on enrolment |
| T | App Review metadata still drafts | docs/APP_STORE_LISTING.md | Submission cannot be completed | Fill age rating (new questionnaire incl. social-media, and from Nov 16 shared-location / dating questions: all "No"), content rights declaration, EU trader status, export compliance | App Store Connect shows no missing fields | Small; depends on enrolment |
| T | Age-rating reasoning is inaccurate | Listing says the boards "avoid betting and odds on purpose", but craps, blackjack and odds-board props ship on Penguin Village (`ComebackCityThreeKartRace.jsx:2717-2734`) | 2.3.6 requires honest answers; props are decorative, not playable | Either remove the three props or keep "None" for simulated gambling with accurate reasoning (nothing is wagered) | Listing text matches the game | Small; owner decision |
| T | Store screenshots have visible faults | Roster shot is cropped mid-scroll top and bottom; drift shot shows the lap bar through "1/3"; all predate Satoshi Summit in the cup and Classic handling | Weak first impression; 2.3.3 wants the app in use | Re-shoot after the HUD fixes; consider an iPhone-only set if iPad is dropped | Six clean shots at Apple's sizes | Small |
| P | Debug surface reachable by a reviewer | "Show performance stats" in the pause menu (`ComebackCityThreeKartRace.jsx:~15040`); `window.__comebackCityKartTelemetry` written every frame; ~35 URL flags (web only) | New guideline 2.5.19 (Oct 2026) bans hidden or undocumented features; the perf toggle looks unfinished | Hide the perf toggle behind a build flag or long-press; mention it in review notes if kept; gate telemetry | Pause menu shows three buttons in a release build | Small |
| P | Branding is mixed | Intro eyebrow "Comeback City", setup "Comeback City Grand Prix", page description "(beta)", manifest "(beta)" | Reads unfinished; name mismatch with the listing | One name everywhere; drop "(beta)" for release | No "Comeback City" as the game's name; no "(beta)" | Small; owner decision on the final name |
| P | No credits or licences screen; build strips third-party notices | No "Copyright"/"License" text in `dist-kart/assets/*.js`; no credits UI | MIT/ISC notices (three, React, lucide, workbox, Capacitor) must be retained; the permission template promises holders an in-game credit | Credits screen: holders, licences, fonts | Screen reachable from the menu | Small-medium |
| P | `baked-spike.glb` (1.58 MB) ships but is only reachable by a URL flag | `public-kart/baked-spike.glb`; `?bakedSpike=1` | 9% of the bundle for a lab asset; dormant content | Remove from the kart build | File absent from `dist-kart` | Small |
| P | Service worker, `_headers`, `_redirects` and manifest ship inside the app | compiled `App.app/public/` | Harmless (registration is skipped natively) but dead weight | Exclude from the native copy | Not in the app bundle | Small |
| O | Accessibility Nutrition Labels, Game Center, product-page creative assets | Apple: optional today | — | Decide later | — | — |

### Gameplay

| Pri | Finding | Evidence | Impact | Proposed fix | Acceptance test | Effort / depends on |
|---|---|---|---|---|---|---|
| T · **FIXED** (G1) | Dare-ramp shortcut did not count toward the lap | Reproduced: failed jump on Comeback City, lap 2 awarded at progress 0.041 against a grid at 0.010, place dropped at launch. Code: flight branch never added to `cumulativeProgress` | Every jump cost the player 0.03–0.06 of a lap; laps and the finish were awarded late | Accumulate flown distance; record the ghost; reseat the free body on landing | After the fix the lap is awarded at 0.011 (measured) | Done: `bf41d7db`. Classic landing half is unverified in play |
| T · **FIXED** | Position badge read "8TH" through the countdown of a six-kart race | Screenshot `comeback-city-assisted-50-0grid.png`; telemetry position 8 with 5 rivals | Wrong on every start | Seed from the seated field | Badge reads 6th on the grid | Done: `b0300ede` |
| T · **FIXED** | Classic Mix hit cost six coins; the guide says three | `spinOutPlayer` plus the generic spin-start loss | Rule and telemetry disagreed with the guide | Skip the generic loss on Mix | Mix hit with 10 coins leaves 7 | Done: `99b0f62b` (read from code, not driven) |
| T · **FIXED** | Best times and ghosts shared across handlings and classes | Keys were `<track>[:mirror]` only | A Classic 150cc ghost became the Assisted target | Classic saves under `<track>@<handling>-<class>`; Assisted keeps its key | New cases in `test-kart-mirror` pass | Done: `0c9f9752` |
| T | Classic rival pace is not balanced between the two versions | Section 4: Classic 64 at 50cc and 100cc wins leading 93–97%; Classic Mix at 50cc and 100cc finishes 4th–6th. Table: `classicHandling.js` `CLASSIC_RIVALS.pace` (mk64 0.78 / 0.84 / 1, mix 0.90 / 0.94 / 1) | The stated target is mid-pack at 50cc; one version is a procession, the other is at the back | Re-tune with the difficulty probe, several runs per cell: raise mk64 50/100cc, lower mix slightly; then a human check | Autoplay finishes 2nd–4th at 50cc on all three tracks, both versions | Medium; step 5 of docs/CLASSIC_HANDLING.md |
| T | Assisted is still a procession for a steady driver | Section 4: 50cc won by 28.7 s leading 95%; Summit 150cc led 90% | The owner's original complaint; default mode for new players | Owner call: keep Assisted easy for newcomers and steer people to Classic, or tighten 100/150cc rivals | Owner feel check | Owner decision |
| P | Dare ramp cannot be cleared without a boost and punishes a touch | Shortcut `minSpeed: 238`; unboosted top speed measured 230–233; a failed launch is a 1.8 s spin | Newcomers who drift onto the ramp spin out without knowing why | Coach tip on first approach, or a visible "boost needed" marker | First-time players in the group stop reporting it | Small; design call |
| P | Items have no hit immunity | Item hits only require `spinTimer <= 0` (`ComebackCityThreeKartRace.jsx:~12304-12349`) | Chain spin-outs possible the frame a spin ends | Short post-spin grace for item hits | Two fish bones in a row: the second does not spin | Small; design call |
| P | Controller on a touch device keeps auto-throttle and the touch scheme | `autoThrottle` follows touch, not the active device; menus are not pad-navigable | Controller users on iPhone get the wrong controls; the guide says "A gas" | Clear auto-throttle while a pad is active; pad focus for menus | Controller in the simulator: A accelerates | Medium |
| P | Reduced motion: OS setting ignored, and the hidden flag slows the game 14% | `kartLocalStore.js:128-137`; `dt` × 0.86 when set | Accessibility gap; slowed times | Seed from `prefers-reduced-motion`, add a setting, drop the time scale | iOS Reduce Motion on: no shake, same lap times | Small-medium; owner call on the time scale |
| P | No menu mute and no settings screen | Mute exists only in the race HUD | Menu music cannot be silenced without starting a race | Mute on the setup screen; later a small settings sheet | Mute toggle on the menu persists | Small |
| O · **FIXED** | Holding R restarted repeatedly; held keys stuck after focus loss | Key handlers | Keyboard only | Ignore repeat; clear on blur | — | Done: `dd9fdfbc` |
| O · **FIXED** | Resume available while the 3D view is lost | Pause panel | Player could drive blind | Disable Resume until restored | Context-loss gate still passes | Done: `b3d294f4` |
| O · **FIXED** | Intro named "Blue Speed", a rival players never see | `KartApp.jsx` | Reads unfinished | Reworded | — | Done: `c944350c` |
| O | In-progress Grand Prix is lost if the app is closed | Cup state is memory-only | Minor frustration | Persist the cup | Kill and relaunch mid-cup resumes | Small |

### Presentation and layout

| Pri | Finding | Evidence | Impact | Proposed fix | Acceptance test | Effort / depends on |
|---|---|---|---|---|---|---|
| T · **FIXED** | Whole game inset between two black bars on notched iPhones; HUD and buttons inset twice | Sim iPhone 18 Pro: canvas at x=62, width 750 of 874 (`iphone18pro-06-race.png`); body padding 62 px each side | About 14% of the screen lost on every notched iPhone | Kart build no longer pads `<body>`; setup and podium pad themselves | Sim after fix: canvas 0–874, HUD clear of the island (`fixed-iphone-race.png`) | Done: `7b0b30ac` |
| T | Lap chip: the progress bar draws through "1/3" on phones | Chromium, WebKit and Sim phone captures; also in the store drift shot | Lap count hard to read in every phone race | Move the bar below the text or shorten the chip text | "1/3" fully legible at 844×390 | Small |
| T | Setup screen is about seven screens tall on a phone, with Start at the bottom | Scroll height 2,775 px in a 390 px viewport; the first screen shows only the title and the kart stage | New players must scroll past everything to race | Sticky Start button; collapse pickers into rows or tabs on short screens | Start visible without scrolling at 844×390 | Medium |
| P | HUD and touch buttons do not scale on iPad | Sim iPad Pro 13: chips about 90 px wide in a 1,376 px window; buttons about 100 px | Small targets and tiny text on a large screen | Scale HUD and controls by viewport size | Buttons at least 9 mm on a 13-inch iPad | Small-medium |
| P | Gap readout overlaps the "POSITION" label at the finish | `comeback-city-assisted-50-finish.png` ("-28.7S" over the label) | Cosmetic | Reposition the gap | No overlap at 1280×720 and 844×390 | Small |
| P | "Classic 64: Rock the stick for boosts" shown on touch devices | Setup screen handling card | There is no stick on a phone | Touch wording on touch devices | Card reads correctly on a phone | Small |
| P | Known open visual items, still open | Code review: HIT! popup and lap banner share the same band; Summit uses Comeback City's menu backdrop; 11-kart picker leaves a short last row; moon disc and Summit backdrop belt (not reproduced visually) | Polish | As listed in docs/RESUME_HERE.md | Visual check | Small each |
| O | WebGL error flood in Chromium | Every race: `GL_INVALID_OPERATION: glBlitFramebuffer: Depth/stencil buffer format combination not allowed for blit`, then "too many errors" | None seen in WebKit or the simulator; may hide a wasted blit | Trace the depth blit in the post chain | Clean console in Chromium | Small-medium |

### Reliability, performance, lifecycle

| Pri | Finding | Evidence | Impact | Proposed fix | Acceptance test | Effort / depends on |
|---|---|---|---|---|---|---|
| T | Cold launch showed a blank dark screen for 50–75 s on first launch in a fresh simulator | Twice on iPhone 18 Pro, once on iPad Pro 13 (no "WebView loaded" in the console until then); later launches about 15–20 s. The Mac was loaded | If a device behaves the same, reviewers see a dead app; there is no spinner between the launch screen and the first paint | Measure on a device first. If slow: keep the launch storyboard up until first paint (Capacitor SplashScreen plugin), show a static first frame in `index.html` | Device: first screen within 3 s of launch | Depends on a device |
| T | Race start blocks the main thread | Sim: first race frame 8.4 s of work on the first build (later 0.6 s); RESUME_HERE measured 0.6–2 s on desktop | Long "Get ready" card; watchdog risk on old phones | Measure on device; async shader compile if needed | Device: card under 3 s on an iPhone 12-class phone | Depends on a device |
| T | Frame rate, heat and battery on a device are unmeasured | No device; all desktop timing invalid at load 10–120; simulator 55–60 fps is the Mac's GPU | The Phase 3 bar (30 fps p95 on iPhone 12 class) is unproven; 2.4.2 covers heat and battery | Owner's phone via Track A, Pause › Performance | p95 ≥ 30 fps on both older tracks and Summit | Depends on a device |
| T | Audio in the app is unverified | Simulator autoplay involves no touch, so audio never started; interruption handling read from code only | Sound after a call or Siri is a stated TestFlight check | Device test; simulator with manual taps | Music and SFX play; sound returns after an interruption | Depends on a device |
| P | All progress lives in WKWebView localStorage | Key inventory in the code review | iOS can purge web storage; coins, paints, unlocks and ghosts would be lost with no backup | Mirror wallet, paints and unlocks to Capacitor Preferences | Clear website data: progress survives | Medium |
| P | Tilt steering can read "on" after relaunch with no permission | `cc-kart-tilt` re-adds the listener; permission is only requested from the toggle (inferred) | Tilt appears on but does nothing | Show off until tapped in a new session | Enable tilt, kill, relaunch: toggle reads off or works | Small; needs a device |
| P | No test covers the app shell | Section 3 | Regressions in `capacitor://` loading or safe areas go unseen | A simulator smoke script (build, install, launch, screenshot, console check) | Script passes on iPhone and iPad simulators | Medium |
| O | Per-frame costs from the September audit remain | Coin instance buffer every frame; telemetry every frame; 3072² shadow map on desktop; eager load of 23 GLBs | Headroom on older phones | As in docs/GAME_AUDIT.md C7–C10 | Device frame time | Medium |
| O | About 40% of `src/game` is unreachable from the kart entry; the race effect is ~3,840 lines | Import walk; `ComebackCityThreeKartRace.jsx` | Maintenance cost, not a player issue | As in docs/GAME_AUDIT.md D11–D13 | — | Large |

Checked and found sound: lap counting (cannot be farmed backwards), wrong-way,
rescue, no permanent stuck state on Classic, pause on backgrounding including
mid-countdown, finish and cup tie-breaks, WebGL context loss recovery, memory
across ten races, offline operation in the app (all assets are local; the web
service worker is correctly skipped natively), and the network inventory: **no
off-origin requests, no analytics, no third-party SDKs**. That supports the
"No, we do not collect data" privacy answer.

## 6. Rights and permissions (separate from technical defects)

| Pri | Item | Evidence | What is missing |
|---|---|---|---|
| B | No holder permission on file for any of the six roster characters | docs/LIKENESS_PERMISSION.md log is empty; the only approvals in the repo are the owner's | Written yes from each holder; Seth Penguin's must cover the app icon and store page |
| B | A seventh likeness ships and is not in the permission doc | "outplayasians" walks across the Penguin Village finish holding a "BITCOIN IS DEAD" sign (`models/pv-tribute/outplayasians-crosser.glb`, `penguinVillage.js:513`) | Written yes covering that role and sign, or removal; add to the doc |
| B | Three shipped models were made on Tripo free credits | `crrt-bunny.glb`, `seth-penguin.glb`, `hero-kart-tripo.glb`; the manifest says free credits carry commercial rights, docs/RELEASE_V1_PLAN.md says they leave rights with Tripo | Confirm the terms; regenerate on paid credits or get Tripo's written OK |
| T | Four models have no generator or tier recorded | `tclow-penguin.glb`, `mizzle.glb`, `layer23-penguin.glb`, `ice-sled.glb` | Tool, account tier, date |
| T | ElevenLabs music receipts do not prove a licence | docs/music-receipts: prompt, model, time, song id only | Invoice or plan screenshot for 2026-10-22 and a saved copy of the terms |
| T | Higgsfield / Meshy generations: plan tier at generation not recorded; five kart job ids missing | Asset manifest | Tier evidence, job ids; copy provenance JSON out of `tmp/` |
| T | "Classic 64" label and the `mk64` key | Setup screen and How to Race; key in shipped JS and saved setting | Rename (guidelines 4.1(c), 5.2.1). Other games' names appear only in source comments, which the build strips, but the repository is public |
| P | Decompilation process is documented but not provably clean-room | docs/CLASSIC_HANDLING.md says the decomp was read; no symbols, tables or code were found copied | Record who read and who implemented; remove decomp references from shipped identifiers |
| P | "Penguin Kart" name not checked | Listing marks it owner-pending | Store availability and trademark search |
| P | Sources unrecorded for menu backdrops and the icon background | `select/menu-backdrop-*.webp`, icon art | Provenance entries |
| — | Clean | Fonts (OFL, licences shipped), Kenney item box (CC0), SFX and engine loops (own scripts), barrier slogans (no brands), "Vice On Ice" is not in the app or `store/` | Keep the old trailer cuts out of any upload |

Stale docs to correct: docs/APP_STORE_LISTING.md and docs/RELEASE_V1_PLAN.md
still say the music beds are "rendered by our own script"; they are ElevenLabs
tracks since 2026-10-22. docs/race-ip-provenance-audit.md predates most
generated assets.

## 7. Apple requirements checked (official sources, 2026-11-09)

Full table with URLs and quotes: see the appendix. The ones that change the
plan:

- **Toolchain:** uploads need Xcode 26+ / iOS 26 SDK today; from April 2027 the
  iOS 27 SDK. Xcode 27.2 satisfies both.
  (developer.apple.com/news/upcoming-requirements/)
- **iPad:** `UIRequiresFullScreen` is deprecated and ignored when built with
  the iOS 27 SDK (TN3192).
- **Launch screen** is validated at upload (TN3208); the key is present.
- **Privacy:** a policy link is required in App Store Connect and in the app
  (5.1.1(i)); "collect" means transmitting off the device, so local saves do not
  count (app-privacy-details); Capacitor is on Apple's named SDK list and ships
  its own privacy manifest (present in the compiled app).
- **Age rating:** tiers are now 4+ / 9+ / 13+ / 16+ / 18+; new questions for
  social media (required since September 2026) and shared location / dating
  (from November 16, 2026).
- **Guidelines to watch:** 2.1(a), 2.3.3, 2.3.7 (no other apps' names in
  metadata), 2.5.19 (no hidden or dormant features, new October 2026), 4.1,
  4.2, 5.2.1 / 5.2.2 (third-party content and proof on request). 3.1.1 and
  3.1.5 do not bite in V1: nothing is sold and the coins are earned, not
  bought; say so in the review notes.
- **TestFlight:** 100 internal testers, 10,000 external, first external build
  needs review, builds expire after 90 days.
- **Declarations:** export compliance (key already set), content rights, EU
  trader status.

Not verifiable from Apple's pages: whether web device-motion in a WKWebView
needs `NSMotionUsageDescription`; whether age-assurance APIs are mandatory for
this app in Texas and similar states; which single iPhone screenshot size is
strictly mandatory.

## 8. Historical issues rechecked

| Item | Status now |
|---|---|
| Xcode licence not accepted | **Resolved** (`xcodebuild -license check` passes; builds run) |
| Simulator builds blocked | **Resolved** (iOS 27.2 runtime installed 2026-11-10 with the owner's OK) |
| Check models, meshopt and audio load from `capacitor://` | Models and meshopt **confirmed in the simulator**; audio unverified |
| GAME_AUDIT A3 (projectile offset), A4 (place validation) | Fixed |
| GAME_AUDIT B5, C7–C10, D11–D13 | Still open (D13 larger) |
| RESUME_HERE small visual bugs (moon, Summit belt, HIT! overlap, Summit backdrop, short picker row) | Still open |
| Bundle 90 bytes over the JS budget | Resolved by the owner's raise to 560 KiB; bundle gate passes |
| Classic step 5 rival pace | Table present but unbalanced (section 4) |
| Firm drift flick feel check, trailer take, ElevenLabs key deletion | Still owner-side |

## 9. Fixes made on `audit-fixes-2026-11-09`

Owner authorised (2026-11-09) fixing confirmed bugs locally and pushing the
branch; no deploys, signing changes or merges.

| Commit | Fix |
|---|---|
| `45de2929` | The uncommitted pace-table edits, carried over unchanged as WIP so they reach GitHub |
| `bf41d7db` | Dare-ramp shortcut counts toward the lap |
| `b0300ede` | Grid position badge |
| `99b0f62b` | Classic Mix coin loss |
| `0c9f9752` | Records and ghosts per handling and class |
| `dd9fdfbc` | Held keys and R repeat |
| `b3d294f4` | Resume waits for the 3D view |
| `c944350c` | Intro copy |
| `627bdb69` | Gate for the rival pace table |
| `7b0b30ac` | Safe-area double inset on notched iPhones |

## 10. Implementation sequence

1. **Owner, now (longest lead):** Apple enrolment (D-U-N-S), likeness
   messages to all seven holders, Tripo / ElevenLabs / Higgsfield evidence.
2. **Device first look (Track A, free):** put the fix branch on the owner's
   iPhone; record cold launch time, race-start card time, fps, audio and
   interruption behaviour, tilt, touch feel.
3. **Before TestFlight (engineering, about 3–5 days):** iPad decision and its
   work; privacy and support links in the app; lap chip; sticky Start;
   Classic rival re-tune; rename "Classic 64"; perf toggle hidden; branding;
   whatever the device look turns up (launch splash, shader compile).
4. **TestFlight internal, then the group:** the Phase 3 fun check.
5. **Before public release:** credits and licences screen; remove dormant
   assets; reduced motion; menu mute; iPad HUD scale; progress backup;
   controller scheme; new screenshots; production deploy of the pages;
   App Store Connect answers.
6. **Later:** per-frame costs, dead code, monolith split, simulator smoke gate.

## 11. Remaining validation gaps

- Any physical iPhone or iPad: performance, heat, battery, audio, call and
  Siri interruptions, background and resume, tilt permission, touch feel,
  haptics, cold launch time, memory-pressure context loss.
- iPad Stage Manager / split view in the simulator (could not be driven from
  the command line; emulated with a narrow browser window).
- Classic landing after the dare ramp, Classic Mix coin loss and item
  chain-hits in real play (read from code).
- Signing, archive validation, upload, TestFlight processing.
- Human play: every race here was the autoplay driver or scripted keys.
- Vendor terms (Tripo, ElevenLabs, Higgsfield, Meshy) were not fetched.
- Web offline mode (the service worker is not registered on localhost).

## 12. Owner decisions (answered 2026-11-10)

| # | Question | Decision | What it changes |
|---|---|---|---|
| 1 | iPad in V1? | **iPhone only first** | Set the target to iPhone (`TARGETED_DEVICE_FAMILY = 1`, drop the iPad orientation key and `UIRequiresFullScreen`), iPhone screenshots only, support page says iPhone. The iPad blocker in section 5 becomes a later-update item. This replaces the 2026-10-21 "iPhone AND iPad" call. |
| 2 | "outplayasians" finish-line walker | **Stays.** Owner: the holder is a friend who is never selling that ordinal | Still needs the same written yes as the other six, covering the walking-obstacle role and the "BITCOIN IS DEAD" sign; added to docs/LIKENESS_PERMISSION.md. |
| 3 | "Classic 64" name | **"Retro"**; "Classic Mix" stays | Rename the label, guide and coach text, and the `mk64` key / `?handling=` value / saved setting to `retro`, migrating the saved value. |
| 4 | Casino props | **Keep; fix the note** | Correct the age-rating reasoning in docs/APP_STORE_LISTING.md: decorative, nothing is wagered or playable. |
| 5 | Assisted difficulty | **50cc stays easy; tighten 100cc and 150cc** | Raise Assisted rival pace at 100/150cc with the difficulty probe (several runs per track), then an owner feel check. |
| 6 | Tripo free-credit models | **Owner asked whether they can be rebuilt in Blender by script instead** | Yes, and that route is clean on rights (our own work). Blender is installed on the office Mac. Trial: rebuild the hero kart first (hard surfaces suit scripting), then Seth Penguin, and compare side by side on one approval page before replacing anything. Likeness quality for the characters is the risk, not rights. Awaiting the owner's go. |
| 7 | Name and "(beta)" | **Penguin Kart; keep "(beta)" on the web build** | "Penguin Kart" everywhere as the game's name ("Comeback City" only as a track); "(beta)" stays on the web until the App Store release and comes out of the store build. Name availability on the store still to be checked. |
| 8 | Production deploy | **Not now.** A proper website once everything is ready | The privacy and support URLs stay a submission blocker until that site exists; the in-app links can point at the bundled pages meanwhile. |

## 13. Work done after the decisions (2026-11-10)

Owner authorised (2026-11-10, question tool): implement the decisions, carry
on down the fix plan, run the Blender trial, push. Still no deploy, signing
change or merge. Tables above are left as written on 2026-11-09; this section
says what has changed since.

| Commit | Change | Checked how |
|---|---|---|
| `31fbe672` | iPhone-only target; iPad keys and `UIRequiresFullScreen` removed | Simulator build passes; built app's `UIDeviceFamily` is `[1]` |
| `87ef0797` | Age-rating note describes the casino props accurately | Read |
| `70c88e9d` | "Classic 64" is "Retro"; key `mk64` is `retro`; old saved choices and links still open it | New cases in the classic gate |
| `9a86c53d` | Lap count readable on phones (icons no longer push "1/3" onto the bar) | Phone-size Chromium capture |
| `587bd7f4` | Performance button only in test builds (`npm run ios:sync:test`) or with `?perf=` on the web | Pause menu shows Resume / Restart / Quit |
| `98537ad1` | Start Race pinned to the bottom of the setup screen | Visible without scrolling at 844×390, 667×375, 1280×720; iPhone simulator |
| `c0001aa3` | Privacy, Support and Credits links on the setup screen; new bundled credits page with the licence notices | Chromium walk to each page and back; privacy page opens inside the app in the simulator |
| `613c1cb5` | Menus say "Penguin Kart" | Simulator capture |
| `79861629` | Blender trial: scripts, two GLBs, renders (`scripts/blender/scripted-models/`) | Not loaded by the game; comparison page https://claude.ai/artifact/NY8hRucuBSpp1GS1KLw4QV |
| `1ece025d` | Assisted rivals: 100cc 0.95 → 1.02, 150cc 1 → 1.05 | Autoplay, all three tracks: was 1st in 8 of 9; now 2nd, 2nd, 4th at 100cc and 2nd, 2nd, 3rd at 150cc |
| `daa646b6` | `baked-spike.glb` and its `?bakedSpike=1` loader removed (1.58 MB) | Gate battery |
| `0a09029e` | Classic rival pace re-tuned: Retro 0.94 / 0.89 / 1, Mix 0.89 / 0.88 / 1 | Autoplay table in docs/CLASSIC_HANDLING.md; one run per value |

Gate battery: 17/17 at `daa646b6` (isolated copy). The Classic pace commit
after it changes one table and passes the classic gate; the full battery was
not re-run on it.

**Findings now closed:** privacy link in the app; iPad windowing (deferred by
the iPhone-only decision); age-rating note; "Classic 64" name; lap chip;
setup screen Start; performance toggle; mixed branding in the menus; credits
and licence notices; `baked-spike.glb`; Classic balance and Assisted
difficulty (both pending a human feel check).

**Still open before TestFlight:** Apple enrolment; written permission from
the seven holders; rights evidence for Tripo / ElevenLabs / Higgsfield /
Meshy assets (the Blender route covers the Tripo ones if the owner accepts
the look); live privacy and support URLs (waits for the website); a first
run on a physical iPhone; `npm run ios:sync` before any archive; new store
screenshots (the HUD and menus changed).

**Not verified in this round:**
- Tuning used the autoplay driver, one run per value. It does not drift for
  boosts, so a person will do better than it. The owner has to feel 100cc and
  150cc on Assisted and 50cc on Retro and Classic Mix.
- Holder credit lines on the credits page are a placeholder until permission
  is logged.
- The credits page says the music was made with ElevenLabs, from the audit's
  reading of docs/music-receipts; the owner should confirm the wording.
- The scripted kart and Seth have not been loaded in the game. CRRT Bunny,
  the third Tripo model, has not been started.
- "(beta)" is still in the web manifest and page description, by decision.

## 14. Follow-up (2026-11-11)

Owner answers (question tool): the tuning is **not played yet** and has to be
judged on a real phone, so no pace value changed. Go-ahead for a free
Personal Team phone build, more rounds on Seth, and the scripted kart in the
game.

| Commit | Change | Checked how |
|---|---|---|
| `cc4ec8d1` | Scripted hero kart behind `?heroKart=scripted`, dev server and `VITE_KART_TRIAL_MODELS=1` builds only; 22 draws down to 5 | Desktop Chromium race on Comeback City: loads, fits, driver seated, four wheels spin, fronts steer, exhaust at the tail, no console errors. Store build has neither the file nor the switch. Gate battery 17/17 (isolated copy) |
| `be1675eb` | Scripted Seth, second set of rounds | Blender renders only; comparison page updated |

Phone build: `npm run ios:sync:test` in an isolated copy, bundle id switched
to `com.showcasedesigns.penguinkart.dev` there only (not committed), Debug
build for the iPhone 18 Pro simulator passes, project opened in Xcode for the
owner to pick his Personal Team and press Run. **Nothing has run on a real
iPhone yet.**

Not verified: the scripted kart on a phone, on rivals, with a bought paint or
on the select screen; its brake lamps under braking; scripted Seth in the
game. From the chase camera the scripted kart is plainer than the Tripo one.

### Before-release items built on 2026-11-11

Owner answers (question tool): drop the reduced-motion slowdown; build menu
mute and reduced motion, the controller scheme, progress backup and the
iPhone screenshots.

| Commit | Change | Checked how |
|---|---|---|
| `a919c995` | Setup screen: Sound and Reduce motion switches; the device's Reduce Motion setting decides until the player picks; the 14% race slowdown under reduced motion is gone | Phone-size Chromium: both switches save and survive a reload; emulated Reduce Motion turns it on. Race speed parity is from the code (one line), not timed |
| `3bf6638f` | Controller: on a touch session the pad takes over and A / right trigger is the gas; d-pad or stick moves a focus ring in the menus, pause menu and results, A presses, Start presses the main button | Unit cases in the gamepad test. Chromium with a simulated pad: touch-only 249 km/h by itself; after a pad press 0 km/h with no gas for 5 s; 231 km/h after 4 s of A; pause menu Resume by pad; Start on the pad starts the race. **No real controller, no iPhone** |
| `8f6b27d4` | Coins, paints, the Mirror unlock and records mirrored to the app's preferences (`@capacitor/preferences`) and restored at launch; privacy manifest declares UserDefaults `CA92.1` | New unit test. iPhone 18 Pro simulator: web data deleted and a 4321-coin copy seeded, launch, copy removed with the simulator off, relaunch: the app wrote 4321 back. Not tested: iOS itself purging storage, a real device |
| `cf40e6b1` | Haptics reach the native plugin (the app's bridge has no `registerPlugin`, so every pulse had been falling back to `navigator.vibrate`, which iOS ignores) | Bridge shape read on screen in the simulator (`registerPlugin` undefined, `nativePromise` a function). **Not felt on a device** |
| `5dd2a06e` | Screenshot script shoots the iPhone 6.9-inch set only | Nine shots at 2868 x 1320 in `tmp/app-store/iphone-6.9/` (not committed) |

Gate battery: 17/17 at `5dd2a06e` (isolated copy); the quick battery passed
before each commit.

Screenshot faults still visible: `01-race-setup` has a dark stage with Start
over the kart; `01b-roster` is still cut at the top and bottom with the sixth
racer under Start; `07-drift-sparks` shows almost no sparks. The seven race
shots are clean and the lap count reads "1/3".

Controller menu focus moves by position on screen and can jump oddly on the
long setup page; the pinned Start is reached with the pad's Start button.
The two setup switches sit at the very bottom of that page.

Left from section 10 item 5: iPad HUD scale (deferred with iPad), production
deploy of the pages and App Store Connect answers (owner), and an inventory of
any other dormant assets (only `baked-spike.glb` and the trial kart were
checked).

## 15. Evening follow-up (2026-11-11)

Owner asked for four jobs to run while the phone test waits: fix the store
screenshots, a full unused-asset inventory, start CRRT Bunny, and the kart's
rear view plus Seth in the game. Still nothing on a real iPhone.

### Built

| Change | How it was checked |
|---|---|
| Setup stage: a front light, so the kart and driver are no longer a silhouette (the track sun and rim both sit behind the rig) | Desktop Chromium at phone size, before and after frames |
| Screenshots: setup shot scrolled so the stage sits above the pinned Start; roster shot shows the heading and both rows; drift shot stepped frame by frame to the release flash | Looked at all three at 2868 x 1320 in tmp/app-store/iphone-6.9 |
| Scripted kart: rear detail (tail lip, twin exhausts, slatted panel, plate, bigger tail lights) | Blender renders; chase-camera frames in a desktop dev race |
| Scripted CRRT Bunny, first version (`build_bunny.py`) | Blender renders against the current model; desktop dev race |
| `?drivers=scripted` loads scripted Seth and Bunny in the race, dev and trial builds only | Desktop dev race, no console errors; store build has no scripted file or string |

### Unused-content inventory (store build at 5ea11a8c)

Done by a read-only sweep of a fresh `npm run build:kart` (129 files, about
16 MB) plus a headless race per track. Two findings were re-checked by hand
after the sweep (the perf button string and the two extra files are in
`dist-kart`); the rest is the sweep's report and has not been re-checked.

Clean: no network calls off the app's own files, no analytics, no payment
code, no `eval` or remote scripts. Every character, kart, track, item, mode,
class and handling is reachable from the menus. All 39 models and all audio
are used. Nothing from the fitness tracker is copied (`publicDir` is
`public-kart`).

Findings, most important first:

| # | Finding | Risk | Suggested fix |
|---|---|---|---|
| 1 | About 50 QA URL switches ship in the store bundle (`giveItem`, `itemShowcase`, `freebody`, `playableAutoplay`, `mirror=1`, the `post*` and `*Lab` families, and more). Not reachable in the installed app: no URL scheme, no universal links, no `@capacitor/app`, no address bar. Reachable on the web. | Medium | One build flag in front of all of them, on for web and test builds, off for the store build |
| 2 | The pause-menu performance button is hidden, not removed: its code and the `devicePerfProbe` chunk (2 KB) are in the store bundle and `?perf` shows it. Section 13's "a store build has no button" is true on screen only. | Medium | Gate the import behind `VITE_KART_PERF_TOGGLE` |
| 3 | `cc-near-v2.webp` (154 KB) is only used under `?ccSkyline=v2` | Medium | Remove the file and the switch |
| 4 | Seven `window.__*` debug hooks are set in every store race | Low | Same flag as 1 (the gates and screenshot script read some of them, so they need the flag on) |
| 5 | Penguin Village scenery includes craps, blackjack and odds-board props | Medium for the age rating | Owner: answer the rating questions to match, or swap the props |
| 6 | "(beta)" in the page description and web manifest | Low to medium | Drop it |
| 7 | An HTML comment in `index.kart.html` says "owner-pending PLACEHOLDER name" | Low | Delete the comment |
| 8 | PWA and Cloudflare files are copied into the iOS app and never loaded there (`sw.js`, workbox, manifest, icons, `_headers`, `_redirects`; about 195 KB) | Low | Leave them out of the iOS copy |
| 9 | The coin chip uses the bitcoin glyph and the store is called a wallet; karts are named Cold Wallet and Sat Stacker. No wallet, token or chain code exists. | Low to medium | Owner: a review note that coins are play-only, or a neutral coin glyph |
| 10 | A stale `baked-spike.glb` name in the service-worker cache rule; two rival seat names that can never be used | Low | Tidy |

Not covered by the sweep: what flags the real store build is made with (no
`.env` file was read), the built `.ipa`, anything inside the model files,
the native plugin code, and behaviour on a device.

### Fixed later on 2026-11-11 (owner chose: strip test switches, drop unused files)

There is now a **store build**: `npm run ios:sync` builds with
`VITE_KART_STORE=1` (`npm run build:kart:store`). The web build, the dev
server, the gates and the screenshot script are unchanged.

| Finding | What the store build does | How it was checked |
|---|---|---|
| 1 QA switches | The page address is wiped to a bare path before anything reads it (`src/game/race/storeBuild.js`, imported first by `src/kart/main.jsx`), so no switch can act, including ones added later | Store build in desktop Chromium, opened with `?playableAutoplay=1&giveItem=rocket&perf=1&mirror=1&track=penguin-village#race`: address became `/`, the menu showed, Mirror stayed locked. Unit test `scripts/test-kart-store-build.mjs` |
| 4 debug hooks | None of the seven `window.__*` hooks is set (kept in `ios:sync:test`, whose performance readout reads them) | Same run: no hooks on `window` on the menu or 15 s into a race, no console errors, no failed requests |
| 2 perf button | Not asked for and not removed: the code is still in the bundle. With the address wiped, `?perf` can no longer show it | Same run: no button in the pause menu |
| 3 unused skyline | `cc-near-v2.webp` and the `?ccSkyline` switch are deleted from every build | Not in `dist-kart`; `scripts/backdrops/cc_skyline_plate.py` can remake it |
| 8 web-only files | No service worker, workbox or manifest is generated; `_headers`, `_redirects` and the three install icons are removed from the output | Store `dist-kart`: 119 files against 129 |

Later still (owner: "finish inventory leftovers"): finding 2 is now fixed
properly, the plain store build has no button code and no readout chunk
(`PERF_READOUT` in `src/game/race/perfToggle.js`; the test variant and the
web build keep both), and 6 and 7 are done ("(beta)" and the placeholder
comment are gone).

Left as it was: 10 (tidy). 5 and 9 are answered in
the review notes (docs/APP_STORE_LISTING.md): the owner keeps the casino
props and the ₿ coin look.

Caution: after `npm run ios:sync`, `dist-kart` holds a store build with no
service worker or Pages config. Run `npm run build:kart` again before any
web deploy.

In the iPhone 18 Pro simulator the `ios:sync:test` variant of the store
build installs, launches and shows the How to Race screen (2026-11-11); no
race was driven there.

Dress rehearsal (2026-11-11, desktop Chromium, phone-size touch context,
the `ios:sync:test` bundle, real taps and no URL switches, clean storage):
the intro shows once; the Sound and Reduce motion switches survive a
reload; a Single Race at 50cc Assisted ran start to finish on all three
tracks with nobody steering (6th each time); the pause menu opened and
resumed; coins went 0, 17, 27, 57 and were still 57 after a reload; no
console errors, no failed requests.

The same evening the owner's iPhone 18 Pro Max got the `ios:sync:test`
build at 3ea0712f (built and installed from the command line with the
owner's Personal Team and the `.dev` bundle id, from
`~/PenguinKart-PhoneBuild`). The install command reported success; what it
does on the phone is the owner's test. Not tested: the plain `ios:sync`
store build inside the app.

## 16. First phone feedback and new icon (2026-11-12 and 2026-11-13)

### What the owner reported

First play on the real iPhone (store-test build at 3ea0712f): steering was
"SUPER hard", tilt "turned way too fast", and the owner is not used to tilt.
The karts in the three script-built concept pictures looked "so cheap".

### Changes

| Commit | Change | Checked how |
|---|---|---|
| `13392836` | Tilt: the roll is folded into -90..90 so a phone held near upright cannot flip the reading to full lock; full lock 24 to 36 degrees, dead zone 3 to 4, 70 ms smoothing. Maths in `src/game/race/tiltSteer.js` | New unit test `scripts/test-kart-tilt-steer.mjs`; gate battery 17/17 |
| `7919e53e` | The firm drift flick is the default; `?driftFlick=firm` is gone | Gate battery 17/17 on the next commit's state |
| `e752bddb` | Thumb drag for full lock 64 to 96 px, curve 1.3 | Gate battery 17/17 |
| `9b78f51b` | New app icon and web icons from a Blender Cycles render (white kart); render script added | **Pushed before the gate result was read. Its message says 17/17, which was false: the image budget failed (2.825 MiB against 2.5 MiB) and the browser gates were skipped** |
| `1bf64308` | Web icons reduced to 256-colour PNGs (about 770 KB to 235 KB); corrects the commit above | Gate battery 17/17 |

The upright-flip cause of the tilt problem is a diagnosis from the code. It
was not reproduced on a device.

Section 15's inventory finding 10: the stale `baked-spike.glb` name is out
of the service-worker cache rule. The two unused rival seats (`Red Line`,
`Silver Arrow` in `RIVALS` and `RIVAL_PERSONALITIES`) are left in place on
purpose: they are tuned seats waiting for a seventh and eighth character,
and with six characters they are never reached.

### Artwork route

Higgsfield had 0 credits and the ElevenLabs connector has no
image-generation permission (still refused after the owner reconnected it),
so the artwork was built and rendered entirely by script in Blender. Two
takes were made (purple and white); the owner picked the white kart and
prefers the purple take's Seth. The script-built Seth from the model trial
has a black stripe down the forehead that the real Seth does not have; it
must not be used in any picture.

The wide render is 2688 x 1242. The iPhone screenshot set is 2868 x 1320 and
the iPad set is 2752 x 2064, so a lead store picture needs its own render or
crop at those sizes.

### Not tested

Nothing in this section has been felt or seen on a real device: steering
feel, tilt direction, the icon on the home screen. Installs only reported
success. The Safari address was checked from the Mac only.

## Appendix: Apple sources (checked 2026-11-09)

| Topic | Source |
|---|---|
| Upload toolchain and deadlines | https://developer.apple.com/news/upcoming-requirements/ · https://developer.apple.com/app-store/submitting/ |
| Launch screen validation | https://developer.apple.com/documentation/technotes/tn3208-preparing-your-apps-launch-screen-to-meet-app-store-requirements |
| `UIRequiresFullScreen` | https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key |
| Enrolment | https://developer.apple.com/programs/enroll/ · https://developer.apple.com/support/compare-memberships/ |
| Distribution and upload | https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases · https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds |
| Bundle ID permanence | https://developer.apple.com/help/app-store-connect/reference/app-information |
| TestFlight | https://developer.apple.com/testflight/ · https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview |
| App privacy | https://developer.apple.com/app-store/app-privacy-details/ · https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy |
| Privacy manifests, named SDKs | https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api · https://developer.apple.com/support/third-party-SDK-requirements/ |
| Device motion in WKWebView | https://developer.apple.com/documentation/webkit/wkuidelegate/webview(_:requestdeviceorientationandmotionpermissionfor:initiatedbyframe:decisionhandler:) |
| Age ratings | https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions · https://developer.apple.com/news/?id=ks775ehf · https://developer.apple.com/news/?id=tlur8uvi · https://developer.apple.com/news/?id=yxkh08us |
| Review guidelines (rev. 2026-10-16) | https://developer.apple.com/app-store/review/guidelines/ · https://developer.apple.com/news/?id=92th7e5i |
| Screenshots | https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications |
| Export compliance | https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations |
| EU trader status | https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements |
| Small Business Program | https://developer.apple.com/app-store/small-business-program/ |

Apple's pages were read through a text-extraction tool; spot-check any quote
before relying on it.
