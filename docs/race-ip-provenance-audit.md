# Comeback City Kart Racer IP And Asset Provenance Audit

Status: owner/product-design provenance decisions recorded; final pre-release scan still required
Date: 2026-06-02
Source PRD: `docs/comeback-city-kart-racer-prd.md`

## Scope

This audit covers the current race implementation surface:

- `src/game/ArcadeRace3D.jsx`
- `src/game/race/**`
- `src/game/raceTracks.js`
- `src/game/raceItems.js`
- `src/game/raceHazards.js`
- `src/game/raceProgression.js`
- `src/assets/game/asset-manifest.json`
- binary files under `src/assets/game/**`

The goal is to support the PRD boundary: the race may use kart-racer genre expectations for feel and readability, but it must not copy Nintendo characters, tracks, item designs, icons, UI layouts, sounds, music, names, screenshots, or branded visual assets.

Owner decision recorded on 2026-06-01: production bitmap assets must be custom ChatGPT Image Gen outputs, repo-native/code-native/procedural assets are allowed, and external stock/game assets are not approved. Genre-familiar arcade kart-racer UI patterns and readability are allowed, but exact/protected UI, trade dress, characters, logos, sounds, item shapes, tracks, screenshots, names, or protected assets are not approved for copying. Owner confirmed on 2026-06-01 that every current bitmap listed in `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-006-20260601T205430Z/owner-decision-intake-006.md` was made with ChatGPT Image Gen for this project. Owner approved the original ChatGPT Image Gen 2 screenshot for V1 layout/measurement reference use and passed protected-similarity review for current screenshots/captures on 2026-06-02.

## Current Findings

| Area | Current evidence | Status |
| --- | --- | --- |
| Live race binary image use | No `.png`, `.jpg`, `.webp`, `.svg`, or asset import was found in `src/game/ArcadeRace3D.jsx` or `src/game/race/**`. The live race render path appears procedural Three.js geometry/materials. | Low current runtime asset risk |
| Live race audio use | `src/game/race/raceAudio.js` creates WebAudio oscillators and gains in code. No sampled `.mp3`, `.wav`, or `.ogg` files were found in the race runtime. | Low current sampled-audio risk |
| Asset manifest | `src/assets/game/asset-manifest.json` records generated/project-owned claims for generated district facades, plaza measurement JSON, procedural scene files, and a legacy generated race backdrop. The current hash inventory below fingerprints every file under `src/assets/game`. | Inventory exists, but not owner/legal sign-off |
| Repository binary assets | `src/assets/game` contains generated district facade PNGs, legacy race backdrop PNGs, a skyline backdrop PNG, plaza measurement JSON, and the asset manifest. These are not imported by the live race runtime, but they remain in the repo and need provenance retained before ship. Exact bitmap inventory was confirmed by the owner in intake 007 as ChatGPT Image Gen output for this project, and owner protected-similarity review for current captures passed in intake 008. | Source and current similarity review confirmed; final pre-release scan required |
| Static reference usage | `src/assets/game/plaza-reference-spec.json` records the repo-local owner-supplied reference path `src/assets/game/reference/comeback-city-original-reference.png`. The reference bitmap is bundled for composition/QA evidence only and is not used as a live `/#race` background. Owner approved reference-derived plaza measurement data for V1 layout/measurement scope on 2026-06-02. | Owner reference and measurement scope approved; retain composition-only use |
| Prohibited string scan | A targeted scan for Nintendo/Mario-character and track-name terms in `src/game`, `src/assets/game`, and `scripts/race-*` returned no matches. PRD/planning docs intentionally contain these terms only to define the IP boundary. | No source-code name hit found in this scan |
| Item naming | Owner delegated research and final V1 direction on 2026-06-01. Player-facing names were changed from `Guard Shell`, `Star Shield`, `Banana Magnet`, and `Oil Slick` to `Guard Gel`, `Comeback Surge`, `Fuel Magnet`, and `Slick Gel`; feedback cue ids changed from `star-*` to `surge-*`. Internal keys remain implementation details to preserve tested mechanics. Owner protected-similarity review passed for current screenshots/captures on 2026-06-02. | Player-facing naming risk reduced; current screenshots/captures approved |
| Track names | Current track names are `Comeback City Grand Prix`, `Tide Pier`, `Static Storm Plateau`, and `Magnet Mine Descent`. No obvious prohibited branded track names were found in the scan. | Current scan clear |
| Hazard names | Current hazards are generic/environmental names such as `wet`, `pulseZone`, `laser`, `mineCart`, `gate`, `fishCart`, `laundry`, `lighthouseBeam`, `crabTrap`, `boatTraffic`, `lightning`, `tornado`, and `polarityGate`. | Current scan clear |
| UI/HUD composition | No direct protected UI reference has been approved for production use. The owner approved genre-familiar arcade kart-racer readability without copying exact/protected UI, and on 2026-06-02 stated the current/final screenshots and captures do not look like Mario Kart much at all. | Current protected-similarity review passed; repeat if UI materially changes |

## Binary Asset Inventory

| File | Size | Current observed role | Provenance state |
| --- | ---: | --- | --- |
| `src/assets/game/city-skyline-backdrop.png` | `1,721,609` bytes | Repository image asset; not found imported by live race runtime in current scan. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/comeback-city-race-backdrop.png` | `1,820,097` bytes | Legacy/generated race backdrop; not found imported by live race runtime in current scan. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/comeback-city-race-backdrop-v2.png` | `2,021,818` bytes | Imported by `src/game/comebackCityVisuals.jsx`; manifest describes it as a legacy generated visual reference retained for audit only. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/generated/district-facade-clinic.png` | `177,467` bytes | Generated facade decal used by `src/game/ComebackCityScene3D.jsx`, not live race runtime. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/generated/district-facade-food.png` | `168,932` bytes | Generated facade decal used by `src/game/ComebackCityScene3D.jsx`, not live race runtime. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/generated/district-facade-garage.png` | `171,597` bytes | Generated facade decal used by `src/game/ComebackCityScene3D.jsx`, not live race runtime. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/generated/district-facade-gym.png` | `174,886` bytes | Generated facade decal used by `src/game/ComebackCityScene3D.jsx`, not live race runtime. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/generated/district-facade-lab.png` | `162,561` bytes | Generated facade decal used by `src/game/ComebackCityScene3D.jsx`, not live race runtime. | Owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |
| `src/assets/game/reference/comeback-city-original-reference.png` | `2,519,471` bytes | Owner-supplied original ChatGPT Image Gen reference screenshot used by visual verification and composition target docs; not a live `/#race` background. | Owner supplied on 2026-06-01; SHA-256 recorded in intake 005; owner confirmed ChatGPT Image Gen output for this project on 2026-06-01 |

## Owner Confirmation

The owner confirmed on 2026-06-01 that every bitmap listed in `.agent/runs/kart-racer-production-readiness/evidence/owner-decision-intake-006-20260601T205430Z/owner-decision-intake-006.md` was generated with ChatGPT Image Gen for this project.

On 2026-06-02, the owner approved the original ChatGPT Image Gen 2 screenshot for V1 layout/measurement reference scope, allowed additional project-specific ChatGPT Image Gen 2 detail assets if needed, and passed protected-similarity review for current screenshots/captures.

## Current Asset Hash Inventory

These hashes identify the exact files present under `src/assets/game` during this audit. They do not prove ownership by themselves; they make later provenance review and diff checks concrete.

| File | Bytes | SHA-256 | Current import status |
| --- | ---: | --- | --- |
| `src/assets/game/asset-manifest.json` | `4,430` | `5565ce747fdb8da97b9baba3b82e04c4e9880e5529995d82dd763ba0da457d4b` | Referenced by telemetry/course metadata. |
| `src/assets/game/city-skyline-backdrop.png` | `1,721,609` | `dc508f525df9b35545ff089d45f99fbcdb59ff5521ae97a6a83b5901ecfd5e29` | No current import found in `src/game/**`. |
| `src/assets/game/comeback-city-race-backdrop-v2.png` | `2,021,818` | `8c70437666a3cf663825e76146e7959318f916dbde7d7b239311e8ef126b7337` | Imported by `src/game/comebackCityVisuals.jsx`; not imported by live race runtime. |
| `src/assets/game/comeback-city-race-backdrop.png` | `1,820,097` | `62cea42d130b464fb2de217f40adf452e35f26a0c60d5ee55ae3fa028c38a68b` | No current import found in `src/game/**`. |
| `src/assets/game/generated/district-facade-clinic.png` | `177,467` | `e90b4a6d11c43e00ad1df79df253602324b4e99c9e738705997a9a1eed6a20e8` | Imported by `src/game/ComebackCityScene3D.jsx`; not imported by live race runtime. |
| `src/assets/game/generated/district-facade-food.png` | `168,932` | `0283fd16bf46ed03d526e37263ca8a878f1fde4cdbb05cfedb30384b29973e8e` | Imported by `src/game/ComebackCityScene3D.jsx`; not imported by live race runtime. |
| `src/assets/game/generated/district-facade-garage.png` | `171,597` | `0e2fc4e26c73b400c390c3e7a83c9a777197a154360fefcbb58ed0ef884ecd89` | Imported by `src/game/ComebackCityScene3D.jsx`; not imported by live race runtime. |
| `src/assets/game/generated/district-facade-gym.png` | `174,886` | `4364962300beef0f12a5965aaea3dffee174ef2290cdf56965dd2f758df64fe4` | Imported by `src/game/ComebackCityScene3D.jsx`; not imported by live race runtime. |
| `src/assets/game/generated/district-facade-lab.png` | `162,561` | `1d18f94b444ca1f4eb0454232920abb67073300170f818483b7de3a072909ad4` | Imported by `src/game/ComebackCityScene3D.jsx`; not imported by live race runtime. |
| `src/assets/game/plaza-reference-spec.json` | `6,928` | `ac045f57840100e9ec37a0b5e4658ccb9dc0df6d2f525b59a6ff737c96f72019` | Imported by `src/game/ComebackCityScene3D.jsx`; reference measurement data, not a bitmap. |
| `src/assets/game/plaza-scene-shapes.json` | `2,714,410` | `2c304cae5d3b6e844555f8168faa81a2d785e547a2d5b3131206ebc554a0301d` | Imported by `src/game/ComebackCityScene3D.jsx`; measured geometry/color data, not a bitmap. |
| `src/assets/game/reference/comeback-city-original-reference.png` | `2,519,471` | `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55` | Used by `scripts/visual-reference-checks.mjs` as the owner-approved reference; not imported by live race runtime. |

## Current Import Findings

Live race runtime:

- `src/game/ArcadeRace3D.jsx` and `src/game/race/**` do not import binary images or sampled audio.
- `src/game/race/raceAudio.js` uses `AudioContext` oscillator nodes for generated cues and ambient tones.

Other game surfaces:

- `src/game/comebackCityVisuals.jsx` imports `comeback-city-race-backdrop-v2.png`.
- `src/game/ComebackCityScene3D.jsx` imports plaza measurement JSON plus the five generated facade PNGs.
- `src/game/raceTelemetry.js` and `src/game/courseV2.js` reference `/src/assets/game/asset-manifest.json` as metadata.

## Final Pre-Release Scan

Scan run: 2026-06-17T19:13:21Z by AI-side Phase 5 automation.

### Scan commands

```sh
rg -n "assets/game|\.png|\.jpg|\.jpeg|\.webp|\.svg|new Audio|AudioContext|oscillator|createOscillator|fetch\(" src/game/ArcadeRace3D.jsx src/game/RaceScreen.jsx src/game/race src/game/raceTracks.js src/game/raceItems.js src/game/raceHazards.js src/game/city3dAssets.js src/assets/game/asset-manifest.json
rg -n "Mario|Nintendo|Luigi|Peach|Bowser|Yoshi|Koopa|Toad|Mushroom|Banana Peel|Blue Shell|Red Shell|Green Shell|Rainbow Road|Princess|Donkey|Wario|Waluigi" src/game src/assets/game scripts/race-*
rg -n "import .*assets/game|from '../assets/game|from '../../assets/game|url\(|src/assets/game" src/game src/App.jsx src/main.jsx src/index.css src/game/*.css
find src/assets/game -maxdepth 3 -type f -print | sort | while IFS= read -r f; do printf '%s\t%s\t%s\n' "$f" "$(wc -c < "$f" | tr -d ' ')" "$(shasum -a 256 "$f" | cut -d ' ' -f 1)"; done
```

### Findings

| Area | Result | Notes |
|---|---|---|
| Live race runtime binary images | Reviewed | Current V2 race runtime is `src/game/ComebackCityThreeKartRace.jsx`. It imports Kenney Toy Car Kit CC0 GLB models + palette PNG (license included), owner-generated Tripo avatar/kart GLBs, and generated district facade PNGs. No unlicensed external bitmaps or sampled audio are imported. |
| Sampled audio | Clear | `src/game/race/raceAudio.js` continues to use WebAudio oscillators; no `.mp3`/`.wav`/`.ogg` imports found in race runtime. |
| Protected terms in source | Clear after edit | One code comment in `src/game/ComebackCityThreeKartRace.jsx` previously read "Mario-Kart-style chase camera"; rephrased to "Arcade chase camera" on 2026-06-17. Remaining matches are only in planning/art-direction docs that define the IP boundary. |
| New assets since last audit | Documented | Added `src/assets/game/select/*.png` to `src/assets/game/asset-manifest.json`; these are in-repo renders from the real GLB roster models via `scripts/select-portraits-capture.mjs`. |
| Asset inventory hashes | Fingerprinted | Full file/hash/size list recorded in scan evidence (see `.agent/runs/kart-racer-production-readiness/evidence/phase5-automation-2026-06-17/ip-scan.log`). |

### Risks retained

- `src/game/ComebackCityKartRace.jsx` (legacy V1 renderer) still imports generated race sprites and a legacy backdrop. It is not the current live `/#race` runtime, but remains in the repo. All imported bitmaps are project-owned/generated.
- Kenney Toy Car Kit is CC0/public domain and correctly attributed in `src/assets/game/models/toy-car-kit/License.txt`.

## Required Before V1 Sign-Off

1. Final scan before PR that the live race route still does not import unreviewed binary images or sampled audio. ✅ Completed 2026-06-17; see Final Pre-Release Scan above.
2. If new ChatGPT Image Gen 2 assets are generated after this audit, add them to the inventory, fingerprint them, and repeat owner protected-similarity review before release.
3. Keep the owner-selected `RACE-001` visual target as composition/layout reference only, not copied production art.
4. Re-run the protected-term/source scan after final item, HUD, audio, and track changes.

## Suggested Follow-Up Changes

These are not required to keep the current planning work valid, but they would reduce review risk:

| Risk | Suggested change |
| --- | --- |
| `Guard Shell` overlaps familiar kart-racer item language | Done for player-facing V1: renamed to `Guard Gel`. |
| `Star Shield` overlaps familiar invincibility language | Done for player-facing V1: renamed to `Comeback Surge` and cues changed to `surge-*`. |
| `Banana Magnet` and banana pickups overlap kart-racer item vocabulary | Done for player-facing V1: renamed to `Fuel Magnet` with fuel-token copy; internal implementation keys remain for tested mechanics. |
| `Oil Slick` overlaps generic racing trap language | Done for player-facing V1: renamed to `Slick Gel`. |
| Legacy race backdrop PNGs remain in repo | Remove unused files or retain a clearly documented provenance/usage note if they are needed for visual audits. |

## Commands Used

```sh
rg -n "assets/game|\\.png|\\.jpg|\\.jpeg|\\.webp|\\.svg|new Audio|AudioContext|oscillator|createOscillator|fetch\\(" src/game/ArcadeRace3D.jsx src/game/RaceScreen.jsx src/game/race src/game/raceTracks.js src/game/raceItems.js src/game/raceHazards.js src/game/city3dAssets.js src/assets/game/asset-manifest.json
find src/assets/game -type f -maxdepth 3 -exec sh -c 'for f; do printf "%s\\t%s bytes\\n" "$f" "$(wc -c < "$f")"; done' sh {} +
rg -n "Mario|Nintendo|Luigi|Peach|Bowser|Yoshi|Koopa|Toad|Mushroom|Banana Peel|Blue Shell|Red Shell|Green Shell|Rainbow Road|Princess|Donkey|Wario|Waluigi" src/game src/assets/game docs/race-*.md docs/comeback-city-kart-racer-prd.md scripts/race-*
rg -n "import .*assets/game|from '../assets/game|from '../../assets/game|url\\(|src/assets/game" src/game src/App.jsx src/main.jsx src/index.css src/game/*.css
find src/assets/game -maxdepth 3 -type f -print | sort | while IFS= read -r f; do printf '%s\\t%s\\t%s\\n' "$f" "$(wc -c < "$f" | tr -d ' ')" "$(shasum -a 256 "$f" | cut -d ' ' -f 1)"; done
```
