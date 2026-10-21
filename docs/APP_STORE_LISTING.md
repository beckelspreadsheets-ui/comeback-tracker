# Penguin Kart — App Store listing draft (2026-10-21)

Draft copy and form answers for App Store Connect, ready to paste once the
Showcase Designs developer account exists. Everything marked **OWNER** is his
call; the rest is a recommendation that matches what the game does today.
Character limits are Apple's.

## App information

| Field | Draft | Notes |
|---|---|---|
| Name (30) | **Penguin Kart** | OWNER: final name. Must be unique on the store; the bundle id `com.showcasedesigns.penguinkart` stays the same whatever the name. |
| Subtitle (30) | Drift, boost and race on ice | 28 characters. |
| Primary category | Games › Racing | |
| Secondary category | Games › Arcade | |
| Bundle ID | com.showcasedesigns.penguinkart | Permanent once the app record exists. |
| SKU | penguinkart-ios-1 | Internal only. |
| Copyright | © 2026 Showcase Designs | OWNER: the legal name Apple verifies. |
| Devices | iPhone and iPad, iOS 17.0+ | Owner decision 2026-10-21. |
| Price | Free | V1 has no purchases; the photo racer comes later with its own review. |

## Promotional text (170)

> Race a crew of penguins through a neon city and an arctic village. Drift for
> mini-turbos, throw snowballs and sardines, and chase your own ghost.

(145 characters. Can be changed any time without a new review.)

## Description (4,000)

> Penguin Kart is an arcade kart racer built for one thumb.
>
> Pick a racer and a kart, then take on two big tracks: Comeback City, a
> neon-lit sunset city of skyline towers and viaducts, and Penguin Village, an
> arctic run of ice bridges, frozen rivers and snowy hills.
>
> DRIFT AND BOOST
> Flick into a corner to drift. Your sparks charge blue, gold, then purple.
> Let go for a mini-turbo. Nail the rocket start, tuck into a rival's
> slipstream, and hit the boost pads for a burst of speed.
>
> ITEMS
> Grab item boxes for snowballs, ice shards, rocket sardines, fish bones,
> blizzards, an ice shield and more. Hold an item behind you to block the
> next hit.
>
> WAYS TO PLAY
> • Grand Prix: race the whole cup for points and a trophy
> • Single Race: one track, your pick
> • Time Trial: race the clock and your own ghost
> • Three speed classes: 50cc, 100cc and 150cc
>
> CONTROLS YOUR WAY
> Drag to steer, flick to drift, tap to throw, or use the big on-screen
> buttons. Turn on motion steering to tilt your phone. Game controllers work
> too.
>
> NO ADS. NO TRACKING.
> No account, no ads and no data collection. Your best times and ghosts stay
> on your device, and the game plays offline.

## Keywords (100)

`kart,racing,racer,drift,arcade,penguin,go kart,cart,race,offline,neon,arctic,time trial,cup`

(91 characters, comma separated with no spaces after commas. Apple ignores
words already in the name.)

## URLs

| Field | URL | Notes |
|---|---|---|
| Support URL | https://comeback-city-kart.pages.dev/support.html | Ships with the fonts/pages work; needs a PRODUCTION deploy of the kart site (OWNER's word) before submission. |
| Privacy Policy URL | https://comeback-city-kart.pages.dev/privacy.html | Same. |
| Marketing URL | (optional) | Could be the Showcase Designs site. |

## Age rating questionnaire (recommended answers)

| Question | Answer | Why |
|---|---|---|
| Cartoon or fantasy violence | None | Items spin karts out; nobody is hurt or damaged. OWNER: if Apple's reviewer disagrees, "Infrequent/Mild" moves the rating to 9+. |
| Realistic violence, horror, profanity, mature themes, sexual content, drugs, alcohol, tobacco | None | |
| Simulated gambling / contests | None | The trackside boards avoid betting and odds on purpose. |
| Medical / treatment info | None | |
| Unrestricted web access | No | The game never opens a browser. |
| User-generated content | No | V1. The photo racer will change this answer when it ships. |
| Messaging / chat | No | |
| In-app purchases | No | V1. |

Expected rating: **4+**.

Bitcoin imagery (coins on the track, a "Block Reward" kart, slogan boards)
is decoration only. The app does not buy, sell, mine or display prices of any
cryptocurrency, so the crypto rules in guideline 3.1.5 do not apply.

## App privacy ("nutrition label")

- Data collection: **No, we do not collect data from this app.**
- Tracking: none.
- Inside the iOS app the game makes no network requests at all once the
  fonts are bundled (the Google Fonts requests are what the fonts/pages work
  removes).

## Notes for App Review

> No account or sign-in is needed. Tap the screen to start. On the first
> launch a How to Race guide explains the touch controls (drag to steer, flick
> to drift, tap to use an item). Races take about two minutes; the pause
> button is at the top of the screen.

## Screenshots

Landscape, captured by `node scripts/app-store-screenshots.mjs` after
`npm run build:kart`:

| Device class | Pixel size | Count |
|---|---|---|
| iPhone 6.9" | 2868 × 1320 | 3–10 (Apple scales these down for smaller iPhones) |
| iPad 13" | 2752 × 2064 | 3–10 |

Suggested order: race setup with a character on the stage, the start grid, a
drift through Comeback City, Penguin Village, items in use. OWNER picks the
final set.

## TestFlight (Phase 3 — the fun check)

Paste into App Store Connect › TestFlight once the first build is uploaded.
External testers (the group) need Beta App Review once; internal testers
(up to 100 people on the team) do not.

**Beta App Description (4,000):**

> Penguin Kart is an arcade kart racer starring a crew of penguin characters.
> Race a neon city and an arctic village, drift for mini-turbos, throw items,
> and chase your own ghost in Time Trial. This beta is about one thing: is it
> fair and fun on your phone or iPad?

**Feedback email:** andrew@showcase-designs.com (owner confirmed 2026-10-21)

**What to Test (build 1):**

> 1. Your very first race (it starts at 50cc). Where did you finish? Was
>    anything confusing before or during it?
> 2. Touch controls: drag to steer, flick to drift, tap to use an item. Does
>    anything fight you or trigger by accident?
> 3. Play ten races in a row without closing the app. Tell us if it ever
>    reloads, freezes, goes black or loses sound.
> 4. Take a call or use Siri mid-race, then come back: does the sound return?
> 5. Pause › Performance shows the frame rate. If either track stutters,
>    send a screenshot of that readout with your phone model.

**Beta App Review contact:** OWNER — name, phone (the business line
(520) 222-9941 is on the Showcase Designs site), email. Sign-in required: No.

## Still needed from the owner

1. The final app name (and whether "Penguin Kart" is free on the store).
2. ~~The icon~~ — done 2026-10-21: pick A, Seth Penguin on the arctic ice
   (65fee406); a painted polish of it is queued on ElevenLabs.
3. Written permission from each ordinal holder whose character is in the game
   (template and log: docs/LIKENESS_PERMISSION.md).
4. Music: the in-game beds are rendered by our own script (clean). "Vice On
   Ice" (MiniMax free demo, 2026-08-16, unclear terms) is only on the TRAILER;
   owner chose 2026-10-21 to replace it with an ElevenLabs track, together
   with new in-game beds — waiting on the ElevenLabs connector being
   re-authorised. ElevenLabs markets Eleven Music as cleared for commercial
   use on paid plans; OWNER: confirm the account's plan says so before
   release, and keep the generation receipts.
5. A production deploy of the kart site so the support and privacy URLs are
   live.
