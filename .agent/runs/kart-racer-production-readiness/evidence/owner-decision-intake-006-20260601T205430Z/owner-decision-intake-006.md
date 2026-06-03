# Owner Decision Intake 006 - Q28-Q32

Date: 2026-06-01
Status: partial decision intake; deployment, production smoke, rollback, manual QA scores, and final provenance sign-off remain pending.

## Owner Answers Recorded

| Question | Owner answer | Repo interpretation |
| --- | --- | --- |
| Q28. Which Cloudflare account/project should host the preview? | "showcase-designs use one of the preview links that comes with my account ( i think this is the one you have access to locally )" | Use the locally visible Cloudflare Pages project `showcase-designs-preview` for preview deployment planning. Wrangler project-list evidence is recorded in `wrangler-pages-project-list.log`. |
| Q29. What should the preview link be named? | "a preview link with comeback tracker racer in the name" | Use a branch preview naming target tied to Comeback Tracker Kart Game. |
| Q30. What branch/name should be used? | "comebacktrackerkartgame" | Planned preview branch: `comebacktrackerkartgame`. Planned branch preview URL before deploy proof: `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev`. Actual deployment URL, deployment ID, and commit SHA remain pending until deploy. |
| Q31. What physical devices will you use for manual QA? | "I will use a mac mini with an m4 then I will use an iphone 16 pro" | Owner manual QA first-pass hardware is Mac mini M4 for desktop and iPhone 16 Pro for mobile. Browser(s), run date/time, scores, and evidence still need to be recorded. |
| Q32. Confirm asset source/provenance. | "send me this to confirm but we only used chat gptimage gen" | Preliminary owner statement: current game bitmap assets were made with ChatGPT Image Gen. Final confirmation is still pending against the inventory below. |

## Local Cloudflare Project Evidence

Command:

```sh
npx wrangler pages project list
```

Evidence:

- `wrangler-pages-project-list.log`
- Project found: `showcase-designs-preview`
- Project domain found: `showcase-designs-preview.pages.dev`
- Git provider: `No`

Selected preview target:

| Field | Value |
| --- | --- |
| Cloudflare Pages project | `showcase-designs-preview` |
| Preview branch | `comebacktrackerkartgame` |
| Planned branch preview URL | `https://comebacktrackerkartgame.showcase-designs-preview.pages.dev` |
| Deployment ID | Pending actual deploy |
| Commit SHA | Pending clean branch/deploy |
| Preview smoke | Pending deployed URL smoke |
| Production URL/domain | Pending owner/release decision or production deploy evidence |

## Asset Inventory Sent For Owner Confirmation

Evidence file: `binary-asset-confirmation-inventory.tsv`

Please confirm that every bitmap listed here was generated with ChatGPT Image Gen for this project or is otherwise project-owned and approved:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/assets/game/city-skyline-backdrop.png` | `1,721,609` | `dc508f525df9b35545ff089d45f99fbcdb59ff5521ae97a6a83b5901ecfd5e29` |
| `src/assets/game/comeback-city-race-backdrop-v2.png` | `2,021,818` | `8c70437666a3cf663825e76146e7959318f916dbde7d7b239311e8ef126b7337` |
| `src/assets/game/comeback-city-race-backdrop.png` | `1,820,097` | `62cea42d130b464fb2de217f40adf452e35f26a0c60d5ee55ae3fa028c38a68b` |
| `src/assets/game/generated/district-facade-clinic.png` | `177,467` | `e90b4a6d11c43e00ad1df79df253602324b4e99c9e738705997a9a1eed6a20e8` |
| `src/assets/game/generated/district-facade-food.png` | `168,932` | `0283fd16bf46ed03d526e37263ca8a878f1fde4cdbb05cfedb30384b29973e8e` |
| `src/assets/game/generated/district-facade-garage.png` | `171,597` | `0e2fc4e26c73b400c390c3e7a83c9a777197a154360fefcbb58ed0ef884ecd89` |
| `src/assets/game/generated/district-facade-gym.png` | `174,886` | `4364962300beef0f12a5965aaea3dffee174ef2290cdf56965dd2f758df64fe4` |
| `src/assets/game/generated/district-facade-lab.png` | `162,561` | `1d18f94b444ca1f4eb0454232920abb67073300170f818483b7de3a072909ad4` |
| `src/assets/game/reference/comeback-city-original-reference.png` | `2,519,471` | `8d4aef74073da4c86b5360163478b978fe5c3101371bc7a8d18d7390e4003c55` |

## Remaining Blockers After This Intake

- Deploy `showcase-designs-preview` branch `comebacktrackerkartgame` from a clean branch/worktree and record actual deployment URL, deployment ID, commit SHA, and preview smoke results.
- Decide whether a separate production URL/domain is required for this pass, then record production deploy/smoke or a dated release-owner exception.
- Record owner manual QA scores on Mac mini M4 and iPhone 16 Pro, including browser(s), date/time, route URL, and all rubric categories at `4+`.
- Confirm the binary asset inventory above as ChatGPT Image Gen/project-owned, then perform final screenshot/silhouette/sound/UI similarity sign-off.
- Record Cloudflare rollback evidence or a dated release-owner exception.
