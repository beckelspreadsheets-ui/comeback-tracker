# Track Design

All tracks are 3 laps and use three route layers: ground, air, and hybrid. Coordinates use the source 1024x768 route space from `src/game/raceTracks.js`.

## Tide Pier

Theme: coastal fishing village at golden hour.

Difficulty: Beginner.

Signature item: Anchor Drop.

Layout map:

```text
Market cliffs -> lighthouse loop
      \          X bridge crossing         air: harbor + beam
       \       /   \                       hybrid: pier launch -> island -> beach
Start -> fish market -> pier jump -> beach return
```

Route points:

```text
(146,584) (116,438) (220,292) (420,206) (598,284) (474,414)
(644,528) (850,430) (912,238) (758,156) (600,282) (704,638) (430,658)
```

Item boxes:

| Layer | Count | Progress |
| --- | ---: | --- |
| Ground | 6 | 0.08, 0.18, 0.32, 0.48, 0.68, 0.88 |
| Air | 4 | 0.21, 0.39, 0.57, 0.79 |
| Hybrid | 2 rare | 0.63, 0.735 |

Hazards:

| Type | Progress | Vehicle | Notes |
| --- | ---: | --- | --- |
| fishCart | 0.17 | kart | Sliding cart knockback |
| laundry | 0.27 | kart | Short blind effect |
| lighthouseBeam | 0.43 | plane | 3-second blind effect |
| seagulls | 0.61 | plane | Spin-out flock |
| crabTrap | 0.84 | kart | Slow trap |
| boatTraffic | 0.72 | both | Timed under-pier crossing |
| wet | 0.36 | kart | Rising tide slow zone |

Vehicle integration:

| System | Placement |
| --- | --- |
| Switch pads | pier launch to plane, island hover, beach landing to kart, lap-three flood plane pad |
| Vehicle zones | fish-market kart-only, harbor air-only, lap-three flooded shortcuts |
| Vehicle lock | island flight lock from 0.58 to 0.75 |

Dynamic events:

| Trigger | Event |
| --- | --- |
| Lap 2 | Tide hazard pulse |
| Lap 3 | Flooded ground and shortcut zones activate |
| Every 18s | Boat traffic hazard pulse |

AI notes:

Captain Brine uses `dock-bell` when in second place to trigger seagulls. Other rivals stay mostly on the ground route and use safer lines.

## Static Storm Plateau

Theme: floating mesa islands above a thunderstorm.

Difficulty: Expert.

Signature item: Lightning Rod.

Layout map:

```text
Mesa A -- broken bridge -- storm-eye spire -- mesa B
   \             air lightning corridor       /
    \        hybrid tornado skim route       /
     \----------- rope bridge return --------/
```

Route points:

```text
(132,524) (188,286) (344,142) (526,186) (684,112) (884,248)
(782,420) (914,596) (654,668) (512,534) (306,658)
```

Item boxes:

| Layer | Count | Progress |
| --- | ---: | --- |
| Ground | 4 | 0.12, 0.26, 0.48, 0.82 |
| Air | 6 | 0.16, 0.28, 0.40, 0.58, 0.74, 0.90 |
| Hybrid | 3 rare | 0.45, 0.50, 0.55 |

Hazards:

| Type | Progress | Vehicle | Notes |
| --- | ---: | --- | --- |
| lightning | 0.22, 0.50, 0.78 | both | Beat-timed spin hazards |
| tornado | 0.42, 0.64 | both | Pulls karts, boosts planes |
| bridgeCollapse | 0.25 | kart | Forces plane when active |
| staticCharge | 0.58 | both | Switch lock for 5 seconds |
| windGust | 0.72 | plane | Timed knockback |

Vehicle integration:

| System | Placement |
| --- | --- |
| Switch pads | bridge plane pad, mesa kart pad, storm-eye plane pad |
| Vehicle zones | lightning corridor plane-only, static charge penalty, lap-three collapsed bridge |
| Vehicle locks | static-charge lock, storm-eye lock |

Dynamic events:

| Trigger | Event |
| --- | --- |
| Lap 2 | Faster lightning pulse |
| Lap 3 | Bridge collapse zone activates |
| Every 12s | Storm-eye lightning strike |

AI notes:

Volt uses `static-bait` to trigger static charge when the player follows closely. AI weighting favors the air route even with higher risk.

## Magnet Mine Descent

Theme: abandoned magnetic ore mine descending into a drill chamber.

Difficulty: Intermediate.

Signature item: Polarity Swap.

Layout map:

```text
Upper ore spiral -> wall-drive strip -> mine-cart crossing
        \                 inverted plane section
         \---- shaft drop / drill shortcut ---- bottom chamber
```

Route points:

```text
(146,292) (298,156) (536,124) (764,210) (860,388) (742,552)
(548,638) (334,604) (214,462) (354,336) (548,286) (664,394)
(560,508) (410,468)
```

Item boxes:

| Layer | Count | Progress |
| --- | ---: | --- |
| Ground | 5 | 0.12, 0.26, 0.44, 0.62, 0.82 |
| Air | 3 | 0.20, 0.52, 0.74 |
| Hybrid | 2 rare | 0.68, 0.72 |

Hazards:

| Type | Progress | Vehicle | Notes |
| --- | ---: | --- | --- |
| mineCart | 0.18 | both | Rail crossing knockback |
| magneticSpike | 0.34 | kart | Slow effect |
| pulseZone | 0.48 | both | Control flip |
| stalactite | 0.58 | both | Timed spin hazard |
| polarityStrip | 0.22, 0.50 | kart | Sets polarity |
| polarityGate | 0.70, 0.86 | both | Requires matching polarity |

Vehicle integration:

| System | Placement |
| --- | --- |
| Switch pads | wall kart pad, inversion plane pad, drill hover pad, bottom kart pad |
| Vehicle zones | wall-drive kart-only, inverted plane section, drill shortcut open zone |
| Vehicle locks | inverted plane lock, drill shortcut lock |

Dynamic events:

| Trigger | Event |
| --- | --- |
| Lap 2 | Drill shortcut opens |
| Every 20s | Polarity strips and gates rotate |
| Every 16s | Stalactite drop pulse |

AI notes:

Drill uses `early-drill` when behind to trigger mine hazards early. AI weighting favors ground/polarity routes and uses air mostly for shortcuts.

