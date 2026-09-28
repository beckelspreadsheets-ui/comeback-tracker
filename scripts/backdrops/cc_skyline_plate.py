"""Comeback City near-ring skyline plate, drawn procedurally (release push,
2026-09-28). Stand-in for cc-near.webp, whose crude cut-out slabs with thick
yellow edge strokes were the single most 'cheap' element in the CC frame.

Deterministic (fixed seed). Horizontally tileable: the near ring repeats the
strip 7x around the camera, so no building crosses the left/right edge.
Rendered at 2x and downsampled for anti-aliasing.

  python3 scripts/backdrops/cc_skyline_plate.py
"""
import random
from PIL import Image, ImageDraw, ImageFilter

W, H = 2560, 1005
S = 2  # supersample
OUT = 'src/assets/game/generated/backdrops/cc-near-v2.webp'
rng = random.Random(20260928)

def lerp(a, b, t):
    return a + (b - a) * t

def mix(c1, c2, t):
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))

BODY_TOP = (58, 30, 96)
BODY_BOTTOM = (22, 12, 52)
BACK_TOP = (104, 58, 126)
BACK_BOTTOM = (60, 34, 96)
WARM = [(255, 196, 110), (255, 170, 90), (255, 214, 150)]
NEON = [(255, 79, 157), (54, 226, 255), (181, 107, 255)]

W2, H2 = W * S, H * S
body = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
glow = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
db = ImageDraw.Draw(body)
dg = ImageDraw.Draw(glow)

def vgrad_rect(draw, x0, y0, x1, y1, top, bottom, alpha=255):
    h = max(1, y1 - y0)
    for y in range(y0, y1):
        t = (y - y0) / h
        # colour keyed to ABSOLUTE height so every tower shares one haze ramp
        ta = y / H2
        c = mix(top, bottom, ta)
        draw.line([(x0, y), (x1, y)], fill=c + (alpha,))

def building(x, w, top_y, row):
    """Draw one tower: stacked setback tiers, a crown, windows, neon."""
    top, bottom = (BACK_TOP, BACK_BOTTOM) if row == 0 else (BODY_TOP, BODY_BOTTOM)
    tiers = rng.choice([1, 2, 2, 3])
    ground = H2
    tier_h = (ground - top_y) / tiers
    tier_boxes = []
    cur_x0, cur_x1 = x, x + w
    y_bottom = ground
    for i in range(tiers):
        y_top = int(ground - tier_h * (i + 1)) if i < tiers - 1 else top_y
        vgrad_rect(db, int(cur_x0), int(y_top), int(cur_x1), int(y_bottom), top, bottom)
        tier_boxes.append((cur_x0, y_top, cur_x1, y_bottom))
        inset = (cur_x1 - cur_x0) * rng.uniform(0.08, 0.18)
        cur_x0 += inset
        cur_x1 -= inset
        y_bottom = y_top
    # crown
    cx0, cy, cx1, _ = tier_boxes[-1]
    crown = rng.choice(['deco', 'round', 'spire', 'flat', 'deco'])
    ccol = mix(top, bottom, cy / H2)
    if crown == 'deco':
        steps = 3
        for k in range(steps):
            sw = (cx1 - cx0) * (1 - (k + 1) * 0.22)
            sx = (cx0 + cx1) / 2 - sw / 2
            sh = 14 * S * (k + 1) * 0.6
            db.rectangle([sx, cy - sh * (k + 1) * 0.55 - sh, sx + sw, cy], fill=ccol + (255,))
        spire_h = rng.uniform(40, 110) * S
        mx = (cx0 + cx1) / 2
        db.polygon([(mx - 3 * S, cy - 40 * S), (mx + 3 * S, cy - 40 * S), (mx, cy - 40 * S - spire_h)], fill=ccol + (255,))
    elif crown == 'round':
        r = (cx1 - cx0) / 2
        db.pieslice([cx0, cy - r, cx1, cy + r], 180, 360, fill=ccol + (255,))
    elif crown == 'spire':
        mx = (cx0 + cx1) / 2
        db.rectangle([mx - 2 * S, cy - rng.uniform(60, 160) * S, mx + 2 * S, cy], fill=ccol + (255,))
        # aircraft beacon
        by = cy - 150 * S
        dg.ellipse([mx - 7 * S, by - 7 * S, mx + 7 * S, by + 7 * S], fill=(255, 90, 110, 110))
        db.ellipse([mx - 2.5 * S, by - 2.5 * S, mx + 2.5 * S, by + 2.5 * S], fill=(255, 120, 130, 255))
    # sun-side rim: a hairline, not a slab
    for (bx0, by0, bx1, by1) in tier_boxes:
        db.line([(bx0 + S, by0), (bx0 + S, by1)], fill=(255, 176, 96, 150 if row else 90), width=2 * S)
    if row == 0:
        # back row: sparse windows only, hazed
        for (bx0, by0, bx1, by1) in tier_boxes:
            for wy in range(int(by0 + 12 * S), int(by1 - 6 * S), 22 * S):
                for wx in range(int(bx0 + 8 * S), int(bx1 - 8 * S), 16 * S):
                    if rng.random() < 0.12:
                        db.rectangle([wx, wy, wx + 6 * S, wy + 9 * S], fill=(236, 160, 120, 150))
        return
    # windows: a real grid, ~28% lit, mostly warm with a few cool units
    for (bx0, by0, bx1, by1) in tier_boxes:
        cell_w, cell_h = rng.choice([(7, 10), (6, 12), (10, 8)])
        gap_x, gap_y = 5, 7
        lit_share = rng.uniform(0.18, 0.4)
        for wy in range(int(by0 + 14 * S), int(by1 - 10 * S), (cell_h + gap_y) * S):
            floor_lit = rng.random() < 0.15  # whole lit floors
            for wx in range(int(bx0 + 9 * S), int(bx1 - 9 * S - cell_w * S), (cell_w + gap_x) * S):
                on = floor_lit or rng.random() < lit_share
                if on:
                    c = rng.choice(WARM) if rng.random() < 0.88 else rng.choice(NEON[1:])
                    db.rectangle([wx, wy, wx + cell_w * S, wy + cell_h * S], fill=c + (235,))
                    if rng.random() < 0.25:
                        dg.rectangle([wx, wy, wx + cell_w * S, wy + cell_h * S], fill=c + (120,))
                else:
                    db.rectangle([wx, wy, wx + cell_w * S, wy + cell_h * S], fill=(34, 20, 70, 255))
    # neon: a horizontal band sign or a vertical blade sign on some towers
    bx0, by0, bx1, by1 = tier_boxes[0]
    roll = rng.random()
    color = rng.choice(NEON)
    if roll < 0.35:
        y = rng.uniform(by0 + 40 * S, by1 - 120 * S)
        db.rectangle([bx0 + 6 * S, y, bx1 - 6 * S, y + 7 * S], fill=color + (255,))
        dg.rectangle([bx0 + 2 * S, y - 6 * S, bx1 - 2 * S, y + 13 * S], fill=color + (200,))
    elif roll < 0.6:
        side = bx1 - 4 * S if rng.random() < 0.5 else bx0 - 14 * S
        y0 = rng.uniform(by0 + 30 * S, by1 - 260 * S)
        db.rectangle([side, y0, side + 18 * S, y0 + 150 * S], fill=(26, 14, 44, 255))
        db.rectangle([side + 3 * S, y0 + 4 * S, side + 15 * S, y0 + 146 * S], outline=color + (255,), width=3 * S)
        dg.rectangle([side - 4 * S, y0 - 4 * S, side + 22 * S, y0 + 154 * S], fill=color + (170,))
    # rooftop sign box on a few
    if rng.random() < 0.3:
        tx0, ty0, tx1, _ = tier_boxes[-1]
        sw = min(90 * S, (tx1 - tx0) * 0.9)
        sx = (tx0 + tx1) / 2 - sw / 2
        c2 = rng.choice(NEON)
        db.rectangle([sx, ty0 - 28 * S, sx + sw, ty0 - 8 * S], outline=c2 + (255,), width=3 * S)
        db.line([(sx + 8 * S, ty0 - 8 * S), (sx + 8 * S, ty0)], fill=(30, 18, 50, 255), width=3 * S)
        db.line([(sx + sw - 8 * S, ty0 - 8 * S), (sx + sw - 8 * S, ty0)], fill=(30, 18, 50, 255), width=3 * S)
        dg.rectangle([sx - 4 * S, ty0 - 32 * S, sx + sw + 4 * S, ty0 - 4 * S], fill=c2 + (150,))

def row(row_index, min_h, max_h, min_w, max_w, gap):
    x = rng.uniform(0, 30) * S
    margin = 12 * S
    while True:
        w = rng.uniform(min_w, max_w) * S
        if x + w > W2 - margin:
            break
        top_y = H2 - rng.uniform(min_h, max_h) * S
        building(x, w, top_y, row_index)
        x += w + rng.uniform(*gap) * S

# back row: taller, hazier, sparser; front row: denser, detailed.
row(0, 420, 900, 90, 200, (-40, 10))
row(1, 180, 640, 80, 210, (-20, 26))
# continuous low fabric along the base so the strip reads as a city floor
for x in range(0, W2, 6 * S):
    pass
vgrad_rect(db, 0, H2 - 70 * S, W2, H2, BODY_TOP, BODY_BOTTOM)
for wx in range(10 * S, W2 - 10 * S, 13 * S):
    if rng.random() < 0.3:
        c = rng.choice(WARM)
        db.rectangle([wx, H2 - 52 * S, wx + 7 * S, H2 - 44 * S], fill=c + (220,))

glow = glow.filter(ImageFilter.GaussianBlur(9 * S))
out = Image.alpha_composite(glow, body)
out = Image.alpha_composite(out, body.filter(ImageFilter.GaussianBlur(0)))
out = out.resize((W, H), Image.LANCZOS)
out.save(OUT, 'WEBP', quality=88, method=6)
print('wrote', OUT, out.size)
