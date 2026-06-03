# Device QA Checklist

Use this checklist for the launch gate that cannot be proven by local headless checks: real mobile FPS and thermal behavior.

## Test URL

Open:

```text
/world.html?qa=1&try=1
```

On production, use:

```text
https://showcase-designs.com/world?qa=1&try=1
```

For the current stable preview, use:

```text
https://showcase-designs-preview.pages.dev/world?qa=1&try=1
```

## Required Devices

- iOS Safari on a real iPhone
- Chrome on a real Android phone

## Pass Criteria

- QA panel stays visible and reaches `90s complete`.
- `minFps` is at least `30`.
- Copied QA report includes `render.calls`, and `render.calls` is no more than `200`.
- `longFrames` stays low enough that interaction still feels usable.
- No browser crash, reload, memory warning, or WebGL context-loss fallback.
- Device does not become uncomfortably warm.
- Drag-to-look, station chip focus, live-site button, case-study button, and Fast view remain usable.
- Portrait UI does not cover the active station in a way that blocks understanding.

## Test Steps

1. Start from a fresh browser tab.
2. Open the test URL.
3. Wait for the intro to settle.
4. Tap each station chip once.
5. Drag the scene gently for 5-10 seconds.
6. Leave the page open until the QA panel reads `90s complete`.
7. Tap `Copy report`.
8. Paste the copied report into the template below or into `DEVICE_QA_RESULTS.md`.
9. Tap Fast view and confirm the static page loads.
10. Run `node verify-device-qa.mjs` after both real-device reports are recorded.

## Report Template

```text
Device:
OS/browser:
Network:
Viewport orientation:
Result: PASS / FAIL

QA report:
<paste copied JSON here>

Render metrics:
- render.calls:
- render.triangles:
- render.textures:
- render.geometries:

Manual observations:
- Heat:
- Interaction:
- Visual overlap:
- WebGL/context warnings:
- Notes:
```

## Launch Decision

Both required devices must pass before treating the 3D gallery as fully validated for launch. If either device fails, prefer the existing fallback behavior and tune scene complexity, DPR, station spacing, or animation before retesting.
