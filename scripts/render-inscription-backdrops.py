#!/usr/bin/env python3
"""Inscription Circuit backdrop rings (M3) — replaces the CC/PV horizon art
for the new track. Two strips, same contract as the retired cc/pv rings:

- ic-far.webp: opaque dusk sky band + far silhouette panorama (mesa plateau,
  spaceport towers/dishes, ship masts), top 35% alpha-faded into the
  procedural sky dome.
- ic-near.webp: alpha-keyed NEAR silhouette row (dune ridge, arches, crates,
  gantry posts), darker than the far band.

Art is 100% generated (PIL polygons, no source images, no Nintendo anything).
The panorama reads left-to-right as the lap's districts: Launch Yard towers
-> Blackflag masts -> Layer23 mesa, repeated by the ring's mirror wrap.
"""
from PIL import Image, ImageDraw, ImageFilter
import os

W, H = 2048, 512
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'game', 'generated', 'backdrops')
os.makedirs(OUT, exist_ok=True)

INK_FAR = (26, 18, 44, 255)      # desaturated violet far ink
INK_NEAR = (13, 9, 24, 255)      # near-black violet
LANTERN = (255, 178, 62, 255)
TEAL = (46, 230, 200, 255)
GOLD = (255, 211, 79, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# ---------------- far band ----------------
def sky_gradient(draw):
    stops = [
        (0.00, (7, 10, 30)),
        (0.42, (20, 34, 74)),
        (0.66, (39, 74, 104)),
        (0.85, (138, 90, 84)),
        (1.00, (255, 154, 74)),
    ]
    for y in range(H):
        t = y / (H - 1)
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                local = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0])
                draw.line([(0, y), (W, y)], fill=lerp(stops[i][1], stops[i + 1][1], local))
                break


def far_panorama(draw, base):
    horizon = int(H * 0.86)
    # Mesa plateau chain (Layer23 district).
    for cx, w, h in [(150, 340, 120), (420, 260, 88), (1650, 380, 140), (1950, 300, 96)]:
        top = horizon - h
        draw.polygon([(cx - w // 2, horizon), (cx - w // 2 + 30, top + 24), (cx - w // 4, top),
                      (cx + w // 4, top), (cx + w // 2 - 24, top + 30), (cx + w // 2, horizon)], fill=INK_FAR)
        # signal beacon on the biggest mesas
        if h > 100:
            bx, by = cx - 20, top - 46
            draw.polygon([(bx - 5, top), (bx - 3, by), (bx + 3, by), (bx + 5, top)], fill=INK_FAR)
            draw.ellipse([bx - 5, by - 10, bx + 5, by], fill=GOLD)
    # Spaceport: control tower + gantries + dishes (Launch Yard).
    tx = 760
    draw.rectangle([tx - 26, horizon - 150, tx + 26, horizon], fill=INK_FAR)
    draw.rectangle([tx - 36, horizon - 168, tx + 36, horizon - 150], fill=INK_FAR)
    draw.line([tx, horizon - 168, tx, horizon - 210], fill=INK_FAR, width=5)
    draw.ellipse([tx - 5, horizon - 218, tx + 5, horizon - 208], fill=TEAL)
    for gx in (880, 1010):
        draw.line([gx - 30, horizon, gx - 30, horizon - 96], fill=INK_FAR, width=8)
        draw.line([gx + 30, horizon, gx + 30, horizon - 96], fill=INK_FAR, width=8)
        draw.line([gx - 38, horizon - 96, gx + 38, horizon - 96], fill=INK_FAR, width=10)
    for dx, s in [(1150, 66), (1260, 48)]:
        draw.line([dx, horizon, dx, horizon - s], fill=INK_FAR, width=7)
        draw.arc([dx - s, horizon - s * 2, dx + s, horizon], 200, 340, fill=INK_FAR, width=12)
    # Ship masts + sails (Blackflag Wharf).
    for mx, mh in [(1420, 150), (1520, 120), (1590, 168)]:
        draw.line([mx, horizon, mx, horizon - mh], fill=INK_FAR, width=7)
        draw.polygon([(mx + 4, horizon - mh), (mx + 4, horizon - mh // 3), (mx + 58, horizon - mh // 2)], fill=INK_FAR)
        draw.polygon([(mx + 2, horizon - mh - 16), (mx + 26, horizon - mh - 4), (mx + 2, horizon - mh + 2)], fill=(212, 58, 46, 255))
    # Dune floor.
    draw.rectangle([0, horizon, W, H], fill=INK_FAR)


def make_far():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    sky_gradient(d)
    # faint stars in the upper sky
    import random
    rng = random.Random(23)
    for _ in range(160):
        x, y = rng.randint(0, W), int(rng.random() ** 1.7 * H * 0.4)
        d.point((x, y), fill=(255, 255, 255, 120))
    far_panorama(d, INK_FAR)
    # Top 35% alpha fade (ring shader blends into the procedural sky dome).
    px = img.load()
    for y in range(int(H * 0.35)):
        a = int(255 * (y / (H * 0.35)) ** 1.2)
        for x in range(W):
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, a)
    return img


# ---------------- near band ----------------
def make_near():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    base = int(H * 0.98)
    # Dune ridge.
    pts = [(0, base)]
    import random
    rng = random.Random(7)
    x = 0
    while x < W:
        pts.append((x, base - rng.randint(30, 110)))
        x += rng.randint(90, 200)
    pts += [(W, base), (W, H), (0, H)]
    d.polygon(pts, fill=INK_NEAR)
    # Stone arches — small, sparse, low on the ridge (they were dominating
    # the horizon at first pass).
    for ax, ah, aw in [(420, 96, 84), (1420, 120, 96), (1900, 84, 70)]:
        d.arc([ax - aw, base - ah * 2, ax + aw, base + 30], 180, 360, fill=INK_NEAR, width=22)
    # Crate stacks.
    for cx0 in (600, 1460):
        for i, (ox, s) in enumerate([(0, 60), (66, 52), (28, 44)]):
            d.rectangle([cx0 + ox, base - s - (i == 2) * 52, cx0 + ox + s, base - (i == 2) * 52], fill=INK_NEAR)
        d.ellipse([cx0 + 26, base - 128, cx0 + 40, base - 114], fill=LANTERN)
    # Gantry posts with teal caps.
    for gx in (900, 960):
        d.rectangle([gx - 8, base - 210, gx + 8, base], fill=INK_NEAR)
        d.rectangle([gx - 12, base - 222, gx + 12, base - 206], fill=TEAL)
    d.rectangle([888, base - 216, 972, base - 204], fill=INK_NEAR)
    # Mast row.
    for mx in (1650, 1720):
        d.rectangle([mx - 6, base - 260, mx + 6, base], fill=INK_NEAR)
        d.polygon([(mx + 6, base - 250), (mx + 6, base - 120), (mx + 70, base - 180)], fill=INK_NEAR)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    return img


far = make_far()
far.save(os.path.join(OUT, 'ic-far.webp'), 'WEBP', quality=88)
near = make_near()
near.save(os.path.join(OUT, 'ic-near.webp'), 'WEBP', quality=88)
far.convert('RGB').save('/tmp/ic-far-preview.png')
near.convert('RGB').save('/tmp/ic-near-preview.png')
print('wrote ic-far.webp / ic-near.webp')
