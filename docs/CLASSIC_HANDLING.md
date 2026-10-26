# Classic handling — branch `classic-handling` (2026-10-26)

Owner, 2026-10-26: the game is "perfect besides driving mechanics being a bit
too easy"; he wants it closer to Mario Kart 64 (pointing at the
n64decomp/mk64 decompilation) and to try ideas from other decompiled racers
(the Awesome Decomp Games list). His calls, via AskUserQuestion:

- **Too easy:** corners, boosts, mistakes and rivals — all four.
- **A setting, not a replacement:** Assisted (today's rails game, unchanged and
  the default for new players) vs Classic.
- **Two Classic versions to compare:** `mk64` (MK64's rules) and `mix` (the
  same base plus ideas from the other games). "I want to see the m64 vs the
  other side so lets do two versions."
- **Mini-turbo:** build both MK64 stick rocks and CTR timed taps; he picks.
- **Extra ideas for `mix`:** hits cost coins (Diddy Kong Racing / Super Mario
  Kart), timed ramp tricks (Mario Kart Wii), hang-time boosts (CTR).
- **First:** free steering.

Try it: `?handling=mk64` or `?handling=mix` on any build of this branch
(`?handling=assisted` forces today's game). Code: `src/game/race/classicHandling.js`,
`src/game/race/handlingMode.js`, the Classic branches in the monolith's player
update, `classicAutoplayInput` in `src/game/race/autoplayDriver.js`. Gate:
`npm run test:classic-handling` (in the quick battery).

## The rule for borrowing from decompiled games

The decomps are their publishers' copyrighted code rebuilt by fans, and this
game is going to the App Store. We take **behaviour, never code**: an agent
reads the decomp and writes down how the game plays in plain English; the
implementation is written from that description, in this engine, in this
game's own units, tuned against these tracks. No function, structure or
table is carried over. The descriptions below are ours.

## Why Assisted is easy (measured 2026-10-26)

- **Rails.** Steering moves the kart across the lane; the spline carries it
  round every bend. A node sim of a kart that never steers still finished
  every lap, 6-13 s slower.
- **Turning is free.** Steering drag (22 u/s²) is below the throttle (118), and
  speed is clamped at the cap, so full lock costs nothing.
- **Drift runs itself.** Charge is time held (0.45 / 0.95 / 1.6 s); any button in
  the air is a trick boost.
- **No run-off, soft walls.** The lane is clamped at 0.95; a wall is a 330 u/s²
  scrape down to 45.
- **Speed class only changes the rivals.** The player's kart is identical at 50,
  100 and 150cc, and at 50cc (the default) the field is 10% slower than you.
- **Cheap mistakes.** ~1.3 s per item hit, then 2.4 s of contact immunity;
  0 to top speed in 1.9 s.
- **Rocket start reward does nothing:** it only raises the cap, which a kart
  starting from 0 cannot reach in time.

## How MK64 drives (our summary of the decomp's behaviour)

- Logic runs at 60 ticks/s. Top speed rises with engine class (roughly
  0.88 / 1.0 / 1.08 at 50 / 100 / 150cc); acceleration has a long tail, ~4-5 s
  to 95%.
- Steering is quadratic in the stick, about 90-105 deg/s at full lock above a
  crawl, smoothed so the wheel takes ~0.25 s to follow the stick.
- Hard turns bleed speed; past the grip limit the kart slides wide and the
  slip angle costs thrust (~1% per degree).
- Hop, steer during the hop, keep the button held: a power slide. The stick
  sets how tight it is. Mini-turbo: rock the stick outward (~0.3 s the first
  time, ~0.13 s after) and back in; two rocks turn the smoke orange; release
  for ~0.5 s of extra thrust (~+14%). Holding outward too long resets it.
- Rocket start: one fresh press in a window of ~0.13 s before green; revving
  high too early wobbles you for ~2.3 s.
- Grass / sand / dirt cut top speed to ~0.70; falling off costs 3-5 s.
- Walls send back half the speed you carried into them, cost a lot of engine,
  and end a slide.
- Bananas wobble you first; braking at the right moment saves the spin.
- CPUs behind the leader speed up ~9%; far ahead they coast.

## What Classic does today (step 1: free steering)

All in `CLASSIC` (classicHandling.js), each number with its reason beside it:

| | Assisted | Classic |
|---|---|---|
| Steering | moves the lane | turns the nose; yaw = stick² × 2.6 → 1.55 rad/s by speed |
| Grip | none needed | 280 u/s²: full lock at top speed washes wide, ~3/4 lock holds |
| Speed | flat 118 u/s² to a hard cap, 1.9 s | thrust fades as 1-(v/top)², 0 to 95% in 2.75 s |
| Turning cost | none at the cap | full lock settles ~8% slower; slip costs ~1%/deg |
| Power slide | lane-rate arc | travel swings 0.45 / 0.95 / 2.1 rad/s (out / centred / in), ~10% slower |
| Run-off | unreachable | past the kerb: top speed x0.71, grip x0.6 |
| Barrier | lane clamp + scrape | real wall at the barrier's inner face: half the incoming speed bounces, square hits lose most of it, >11.5 deg ends the slide + 0.18 s stun |

Measured by `test:classic-handling` (centreline autoplay, two laps): Comeback
City 55.5 / 54.7 s, Penguin Village 53.5 / 51.7 s, Satoshi Summit 52.3 / 51.1 s
against a 49-51 s lap at flat top speed; 0 rescues. A kart that never steers
covers 67-76% of a lap in 90 s and finishes none. In the real race (Comeback
City, ?handling=mk64, autoplay) it averaged 219 u/s with 2 wall hits in 40 s.

Steering sign: positive steer is the player's right, which decreases heading.
The August `?freebody=1` model (freeBodyKart.js) has it the other way round —
pressing right there turns left — and its contact shove adds lateral velocity
against the shove. Classic does neither; the August path is left as it was.

## Next steps (one commit each)

1. ~~Free steering: the Classic model, walls, run-off, power slide.~~
2. Mini-turbos: `mk64` = stick rocks; `mix` = CTR timed taps (both phones and pads).
3. Rocket start that works (both versions) — the reward bug is in Assisted too.
4. Mistakes: costlier hits, shorter immunity, banana brake-save.
5. Rivals: player speed by class (MK64 ratios), rubber band that pushes back.
6. `mix` extras: hits drop coins, timed ramp tricks, hang-time boosts.
7. The Handling switch on the setup screen (saved per device).

Preview deploys of this branch go to their own Pages alias
(`classic-handling`), never to aaa-preview or production.
