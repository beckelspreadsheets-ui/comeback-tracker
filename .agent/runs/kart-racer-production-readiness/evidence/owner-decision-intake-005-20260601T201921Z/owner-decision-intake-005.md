# Owner Decision Intake 005 - Visual Reference, IP Naming, Support, API Follow-Up

Date: 2026-06-01

## Owner Answers Recorded

| Question | Owner answer | Recorded decision |
| --- | --- | --- |
| Q23 | "i attached the screenshot for reference" | The attached `IMG_9588.png` is the approved original ChatGPT Image Gen 2 reference screenshot. It was copied to `src/assets/game/reference/comeback-city-original-reference.png`. |
| Q24 | "I dont understand this question" | The screenshot itself defines the composition target. Engineering translated it into measurable notes instead of asking the owner for camera jargon. |
| Q25 | "lets research this and pick the best options" | Engineering selected stricter original Comeback City player-facing names and cue ids after research. |
| Q26 | "i dont understand the question" | Support contact/path means where launch issues are reported and triaged. Conservative V1 support path is owner/admin-only launch monitoring through Cloudflare dashboards plus the release runbook/post-launch report; no public support email is added until owner supplies one. |
| Q27 | "whatever is best" | Cloudflare Functions, D1 sync, FatSecret proxy, barcode, and camera remain scoped out of immediate kart-racer readiness. Follow-up is dated 2026-06-08 for owner/admin to provide smoke inputs, bindings, and production scope. |

## Visual Reference Evidence

| Field | Value |
| --- | --- |
| Source attachment | `/Users/andrewferguson/Library/Messages/Attachments/86/06/4BE31AB5-FDD7-435B-9D56-E8E9681543A5/IMG_9588.png` |
| Repo reference path | `src/assets/game/reference/comeback-city-original-reference.png` |
| File type | PNG image data, 1536 x 1024, 8-bit/color RGB, non-interlaced |
| SHA-256 | `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55` |
| Visual gate | `npm run test:visual` passed with this repo-local reference path. |

## Composition Notes Extracted From The Screenshot

- Visual style: bright, high-saturation, clean low-poly arcade city with crisp labels, strong rim glows, and readable district color coding.
- Desktop plaza: wide 16:9 overview with Comeback City logo, central roundabout, objective beacon, five districts visible, layered skyline, water/bridge foreground, and no empty-plane read.
- Mobile game view: portrait race view with rear kart centered in the lower third, broad road-ahead visibility, horizon/skyscrapers in the upper half, compact top/side HUD, minimap bottom left, and large go/action button bottom right.
- District closeups: Gym green, Food Court orange, Lab purple, Clinic red, Garage blue; each district has a glowing portal and icon/sign identity.
- Kart design: chunky red/black/white kart with cyan lights, oversized tires, readable front/side/back/top proportions, and no protected character or brand shape.
- HUD mood: dark navy translucent panels, compact white labels, bright district icons, yellow route/action accents, readable resource counters, and no exact copied UI layout.

## Item/IP Naming Research

Research basis:

- USPTO states a trademark can be a word, phrase, symbol, design, or combination identifying goods/services and distinguishes source.
- USPTO likelihood-of-confusion guidance warns that marks can be problematic when similar in sound, appearance, meaning, or commercial impression for related goods.
- U.S. Copyright Office guidance distinguishes protectable expression from unprotected ideas, procedures, methods, systems, and concepts.
- Nintendo's official Mario Kart 8 Deluxe item page includes item terms such as `Banana`, `Green Shell`, `Red Shell`, `Spiny Shell`, and `Super Star`.

Practical production decision:

| Prior term | Decision | Reason |
| --- | --- | --- |
| `Guard Shell` | Rename player-facing item to `Guard Gel`. | Keeps defensive mechanic, removes shell language. |
| `Star Shield` | Rename player-facing item to `Comeback Surge`. | Keeps invincibility mechanic, removes star language and ties it to product theme. |
| `Banana Magnet` | Rename player-facing item to `Fuel Magnet`; describe pickups as fuel tokens. | Keeps magnet/economy mechanic, removes banana language from player-facing copy. |
| `Oil Slick` | Rename player-facing trap to `Slick Gel`. | Keeps slippery trap mechanic, shifts art direction toward original training-gel visual. |
| `star-on`, `star-contact`, `star-off` cue ids | Rename to `surge-on`, `surge-contact`, `surge-off`. | Removes star terminology from generated cue ids. |

Implementation note: existing internal keys such as `bananaMagnet`, `oil`, `shield`, and `invincibility` remain implementation identifiers for now to preserve test-covered mechanics and avoid a broad refactor. The shipped labels/cues use the safer terminology above.

Sources:

- https://www.uspto.gov/trademarks/basics/what-trademark
- https://www.uspto.gov/trademarks/search/likelihood-confusion
- https://www.copyright.gov/what-is-copyright/
- https://www.nintendo.com/ph/switch/aabp/sp/item/index.html

## Remaining Blocking Evidence

- Preview and production Cloudflare URLs, project, branch, deployment IDs, and smoke results are still not supplied.
- Manual QA scores and target-browser/device accessibility sign-off are still not supplied.
- Public support contact is not supplied; V1 support path is owner/admin-only unless the owner supplies a public contact.
