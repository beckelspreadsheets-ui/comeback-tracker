# Race Lab Readiness Smoke

Status: local lab-readiness evidence, not Lighthouse/Web Vitals acceptance
Date: 2026-05-23
Related production ticket: `PROD-032`

## Purpose

Use this smoke to record local lab signals that approximate the production plan's Lighthouse/Web Vitals evidence requirement without adding a Lighthouse dependency. Do not treat these measurements as production acceptance until a release owner supplies Web Vitals/Lighthouse targets or a dated exception.

## Command

```sh
npm run build
npm run test:lab
```

Optional evidence directory:

```sh
LAB_READINESS_ARTIFACT_DIR=.agent/runs/kart-racer-production-readiness/evidence/<run-id> npm run test:lab
```

## What It Records

- Built-app home and `/#race` route screenshots.
- Navigation timing, First Contentful Paint, Largest Contentful Paint, Cumulative Layout Shift, long-task counts, and a Total Blocking Time proxy.
- Basic accessibility DOM signals: document language, title, viewport meta, duplicate IDs, visible unlabeled controls, and visible images without `alt`.
- Best-practice signals: page errors, console errors, failed requests, and unexpected HTTP errors.
- PWA signals: manifest fetch, manifest metadata, service-worker support, activation, and control.

## Latest Local Evidence

Evidence directory: `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/`

| Artifact | Path |
| --- | --- |
| Build log | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-build.log` |
| Lab command log | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/npm-run-test-lab.log` |
| Summary JSON | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/lab-readiness-smoke-summary.json` |
| Home screenshot | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/home.png` |
| Race screenshot | `.agent/runs/kart-racer-production-readiness/evidence/lazy-route-001-20260523T225320Z/race.png` |

Latest local result:

- `npm run build`: pass, with the existing large-chunk warning.
- `npm run test:lab`: pass.
- Home route: FCP `268ms`, LCP `288ms`, CLS `0.0018`, no long tasks, no unlabeled visible controls, no console/page/request failures.
- Race route: FCP `68ms`, LCP `876ms`, CLS `0.0001`, `40` long tasks, max long task `706ms`, Total Blocking Time proxy `1576ms`, no unlabeled visible controls, no console/page/request failures.
- PWA: manifest fetch `200`, manifest display `standalone`, service worker activated and controlling the page.

## Open Acceptance Inputs

- Release-owner Web Vitals/Lighthouse numeric targets or dated exception.
- Production deployed URL and response-header evidence.
- Target browser/device matrix.
- Monitoring provider or explicit no-monitoring risk acceptance.

Current gate status: `recorded-not-accepted`.
