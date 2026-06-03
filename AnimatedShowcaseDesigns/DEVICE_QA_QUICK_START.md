# Device QA Quick Start

Use this when collecting the two real-device reports required before launch.

## Test URL

Open this exact preview URL on each phone:

```text
https://showcase-designs-preview.pages.dev/world?qa=1&try=1
```

Do not use `showcase-designs.com` until `PRODUCTION_AUDIT.md` says production is serving this workspace build.

## Required Devices

1. iOS Safari on a real iPhone.
2. Chrome on a real Android phone.

## 90-Second Test

On each device:

1. Open the test URL in a fresh tab.
2. Wait for the gallery to settle.
3. Tap each station chip once.
4. Drag the scene for 5-10 seconds.
5. Tap an exhibit, scroll it, then close inspection.
6. Leave the page open until the QA panel reaches at least 90 seconds.
7. Tap `Copy report`.
8. Paste the copied JSON into `DEVICE_QA_RESULTS.md` under the matching device.
9. Fill the manual notes in that same JSON block.
10. Run `node verify-device-qa.mjs`.

## Manual Notes To Fill

Use clear pass-oriented wording if the device behaves correctly:

```json
"manual": {
  "heat": "No uncomfortable heat after 90 seconds.",
  "interaction": "Walking, looking, station chips, inspect, scroll, close, and Fast view worked.",
  "visualOverlap": "Controls did not critically block the active exhibit.",
  "webglContextWarnings": "No crash, reload, warning, or context loss."
}
```

## Pass Thresholds

Both pasted reports must satisfy:

| Field | Required |
| --- | --- |
| `result` | `PASS` |
| `qa.durationSeconds` | `>= 90` |
| `qa.minFps` | `>= 30` |
| `qa.render.calls` | `<= 200` |
| manual heat | no uncomfortable heat |
| manual interaction | no broken interaction |
| manual visual overlap | no critical blocking |
| manual WebGL warnings | no crash, reload, warning, or context loss |

## Validation Command

```bash
node verify-device-qa.mjs
```

Expected success after both real-device reports are pasted:

```text
ok - iOS Safari real-device QA passed
ok - Android Chrome real-device QA passed
2 device QA reports passed.
```
