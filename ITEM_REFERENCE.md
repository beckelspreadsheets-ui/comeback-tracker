# Item Reference

The item system is registry-driven in `src/game/raceItems.js`. Every item includes category, target type, vehicle restriction, track restriction, duration, cooldown, rarity, and feedback cue ids.

The active Three.js browser playtest verifies each track signature item activates in-game and that item boxes, banana upgrades, rare pickup state, and the one-use second slot are exercised during runtime.

## Roster

| Item | Category | Target | Vehicle | Track | Duration | Balance Notes |
| --- | --- | --- | --- | --- | ---: | --- |
| Turbo Can | self-buff | self | both | universal | 0.95 | Basic speed option and banked item. |
| Guard Shell | setup | self | both | universal | 5.2 | Defensive answer to hazards and contact. |
| Pulse Rocket | projectile | single opponent | both | universal | 0 | Reliable catch-up hit plus small boost. |
| Oil Slick | trap | area | kart | universal | 9 | Simple kart trap. |
| Bubble Trap | trap | area | both | universal | 10 | Floating trap for mixed vehicle routes. |
| Switch Bolt | vehicle-state | single opponent | both | universal | 2.8 | Forces a rival into a different vehicle and briefly locks them. |
| Lift Jammer | vehicle-state | all opponents | plane | universal | 4.5 | Punishes planes on air-heavy tracks. |
| Hazard Bell | environmental | area | both | universal | 0 | Triggers the nearest armed environmental hazard. |
| Decoy Crate | setup | area | both | universal | 12 | Fake box trap for greedy lines. |
| Ghost Replay | setup | self | both | universal | 5.5 | Racing-line assist and short boost. |
| Banana Magnet | self-buff | self | both | universal | 6 | Converts banana economy into recovery/upgrade fuel. |
| Star Shield | self-buff | self | both | universal | 4.2 | Rare invincibility for high-risk shortcuts. |
| Tide Horn | environmental | area | both | universal | 0 | General remote event trigger. |
| Boardwalk Grip | self-buff | self | kart | neon-tide-pier | 5.6 | Legacy Tide Pier item retained for old results/data compatibility. |
| War Horn | environmental | all opponents | both | giants-wakeway | 2.4 | Legacy Wakeway item retained for old results/data compatibility. |
| Phase Key | environmental | self | both | orbital-relay | 4.8 | Legacy Relay item retained for old results/data compatibility. |
| Anchor Drop | trap | area | kart | tide-pier | 15 | Tide Pier signature. Drags the next opponent backward. |
| Lightning Rod | environmental | self | both | static-storm-plateau | 8 | Storm Plateau signature. Redirects next lightning hit to the leader. |
| Polarity Swap | vehicle-state | all opponents | both | magnet-mine-descent | 3 | Mine signature. Reverses opponent polarity and disrupts gates/walls. |

## Banana Economy

Bananas persist across the active race state and are no longer lap-reset. The player can spend:

| Cost | Effect |
| ---: | --- |
| 3 | Upgrade the currently held item by one tier, up to tier 3. |
| 5 | Guarantee a rare item on the next pickup. |
| 8 | Arm a one-use second item slot. |

On hit, the player loses up to 3 bananas. Dropped bananas scatter onto the track and can be recollected. Banana Magnet pulls both placed and dropped bananas.

## Feedback

Item definitions include activation, hit, and expiration cue ids. The active runtime plays lightweight WebAudio activation/hit cues and keeps the ids available for richer sound assets later.
