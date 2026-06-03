# Next Agent Goal Prompt

Copy this into the next agent as the `/goal` content.

```text
/goal Implement the Hyperrealistic Interactive Gallery PRD for the /world route in /Users/andrewferguson/Downloads/comeback-tracker/AnimatedShowcaseDesigns, including visual rebuild, exhibit inspection/scroll actions, collisions, mobile controls, verification, and release-ready checks.

Repository instruction from AGENTS.md/user: Do not guess or make assumptions. When in doubt, ask Andrew. Keep replies concise.

Current state to inspect first:
- Read WORLD_PHOTO_MATCH_PRD.md, COMPLETION_AUDIT.md, PHOTO_MATCH_REVIEW.md, OPERATOR_INPUTS.md, DEVICE_QA_QUICK_START.md, DEVICE_QA.md, DEVICE_QA_RESULTS.md, LAUNCH_CHECKLIST.md, PRODUCTION_AUDIT.md, and CLOUDFLARE_DEPLOY.md.
- The last preview-only build is deployed at https://showcase-designs-preview.pages.dev/world.
- Immutable latest preview from the last verified deployment: https://d6444b74.showcase-designs-preview.pages.dev.
- Presentation review URL: https://showcase-designs-preview.pages.dev/world?try=1&qa=minimal&presentation=1.
- Local workspace path: /Users/andrewferguson/Downloads/comeback-tracker/AnimatedShowcaseDesigns.

Implemented already:
- /world remains a static Three.js route, not React/R3F.
- Four current exhibits remain: EvenPath Homes, Felco Vending, Abel M. Fitness, Beckel Spreadsheets.
- Main hero wall clusters EvenPath, Felco, Beckel; Abel remains on a side wall. This supersedes the old no-cluster rule by owner approval.
- First-person walking, desktop pointer look, mobile joystick, collision, inspection mode, screenshot scroll, escape/back exit, fullscreen, open-live-site actions, low-motion/WebGL fallbacks, and minimized UI are implemented.
- Initial hybrid presentation layer is implemented:
  - img/world/photo-match-room-plate.webp
  - world.html#photoMatchPlate
  - world.css .photo-match-plate shown in ?presentation=1 and hidden during inspection
- 2026-05-18 CSS refinement makes ?presentation=1 use the room plate as the primary visible layer and heavily de-emphasizes the live canvas underneath, removing the old double-exposure look in the local and preview photo-match captures.
- 2026-05-18 normal-mode refinement mounts addStoneSlabMaterialOverlays() in world.js so the real walking scene uses subtle graphite slab overlays instead of flat wall planes.
- 2026-05-19 normal-mode refinement raises the seamless-mode DPR cap within the PRD mobile range, enables antialiasing except on low-tier devices, softens the hard cove strip, and retunes the portrait default camera to show more floor, bench, and room depth.
- Cloudflare preview-only deploy was completed:
  - Project: showcase-designs-preview
  - Branch: main
  - Immutable URL: https://d6444b74.showcase-designs-preview.pages.dev
  - Stable URL: https://showcase-designs-preview.pages.dev
- Latest deploy artifact:
  - deploy-artifacts/showcase-designs-dist-20260519-110740.zip
  - SHA256 a92d3df5ec26b05adeb8dec470ee88e04ec7e4748db84d3e459c116ee7e1b00b

Latest recorded verification evidence from the current audits:
- node verify-photo-match.mjs -> 10 checks passed after the 2026-05-19 renderer/camera tuning.
- node verify-world.mjs -> 360 checks passed on 2026-05-19.
- SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs -> 10 checks passed on the latest preview deploy.
- SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs -> 63 checks passed.
- SHOWCASE_ORIGIN=https://d6444b74.showcase-designs-preview.pages.dev node verify-production.mjs -> 63 checks passed.
- Preview serves img/world/photo-match-room-plate.webp as image/webp.
- node verify-outbound.mjs currently fails because FormSubmit returns HTTP 522. The four station live URLs still respond.
- Direct stable and immutable preview checks confirmed the 2026-05-18 photo-lock CSS, normal-mode stone overlay, and 2026-05-19 renderer/camera tuning are deployed.

Important: Re-run local and preview verification before making any completion claim.

Remaining blockers before the goal can be marked complete:
1. Owner visual approval of the hybrid room-plate result, or concrete requested visual refinements.
2. Exact source copy for the requested “1:1 copy” match. Do not rewrite copy without the source text/reference.
3. Real-device iOS Safari report in DEVICE_QA_RESULTS.md, validated by node verify-device-qa.mjs.
4. Real-device Android Chrome report in DEVICE_QA_RESULTS.md, validated by node verify-device-qa.mjs.
5. Production Core Web Vitals p75 evidence: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
6. FormSubmit endpoint recovery, or owner approval for an alternate form provider/fallback contact flow.
7. Production showcase-designs.com is not approved yet and was previously failing because it served the old Vercel site. Do not deploy production until Andrew explicitly approves.
8. Final operator approval for production launch.

Next concrete steps:
1. Re-run:
   node verify-world.mjs
   node verify-photo-match.mjs
   node verify-outbound.mjs
2. If network/deploy verification is allowed, re-run:
   SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-production.mjs
   SHOWCASE_ORIGIN=https://showcase-designs-preview.pages.dev node verify-photo-match.mjs
3. Redeploy the preview-only build only after additional approved visual changes need to be shared on the stable link.
4. Ask Andrew for the exact 1:1 copy source before touching copy.
5. Ask Andrew to run DEVICE_QA_QUICK_START.md on iPhone Safari and Android Chrome and paste the QA reports into DEVICE_QA_RESULTS.md.
6. If Andrew gives visual feedback, improve the hybrid plate/scene toward the rightmost reference without breaking:
   - four approved exhibits
   - inspect/scroll/open-site flow
   - collision
   - mobile controls/performance
   - static / route
7. Only when every blocker above is resolved, perform a requirement-by-requirement completion audit against COMPLETION_AUDIT.md and the PRD. Do not call update_goal complete until the audit proves every requirement is satisfied.
```

Short message to send with the goal:

```text
Start by reading NEXT_AGENT_GOAL_PROMPT.md, COMPLETION_AUDIT.md, and OPERATOR_INPUTS.md. The latest preview build exists and is verified at https://d6444b74.showcase-designs-preview.pages.dev, including the 2026-05-18 presentation CSS, normal-mode stone overlay, and 2026-05-19 renderer/camera tuning. The goal is not complete; the main missing inputs are owner visual approval, exact 1:1 copy source, real iOS/Android QA reports, Core Web Vitals, FormSubmit recovery, and production approval.
```
