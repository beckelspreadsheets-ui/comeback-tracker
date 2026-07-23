#!/usr/bin/env python3
"""Inscription item icons (M4) — original flat-glyph designs for the new item
set. Zero borrowed art: pure PIL geometry on the circuit's dark stone tile.
128x128 webp, written to src/assets/game/items/.
"""
from PIL import Image, ImageDraw
import math
import os

S = 128
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'game', 'items')
os.makedirs(OUT, exist_ok=True)

BG = (20, 14, 34, 255)
TEAL = (46, 230, 200, 255)
ORANGE = (255, 139, 33, 255)
GOLD = (255, 211, 79, 255)
LANTERN = (255, 178, 62, 255)
VIOLET = (176, 138, 255, 255)
PURPLE = (90, 63, 159, 255)
RED = (212, 58, 46, 255)
PALE = (244, 240, 255, 255)
DARK = (22, 20, 28, 255)
TIMBER = (74, 50, 32, 255)


def tile(border):
    img = Image.new('RGBA', (S, S), BG)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([3, 3, S - 4, S - 4], radius=18, outline=border, width=4)
    return img, d


def shard(d, cx, cy, w, h, color):
    d.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)], fill=color)
    d.polygon([(cx, cy - h), (cx + w, cy), (cx, cy)], fill=tuple(min(255, c + 45) for c in color[:3]) + (255,))


def save(img, name):
    img.save(os.path.join(OUT, name), 'WEBP', quality=90)
    print('wrote', name)


# Rune Bolt (forward shard — isethius skin: iceshard)
img, d = tile(TEAL)
shard(d, 64, 64, 20, 42, TEAL)
d.line([64, 22, 64, 106], fill=PALE, width=3)
save(img, 'item-runebolt.webp')

# Sigil Bolt (layer23 skin: snowball)
img, d = tile(VIOLET)
shard(d, 64, 64, 20, 42, VIOLET)
d.ellipse([58, 58, 70, 70], fill=GOLD)
save(img, 'item-sigilbolt.webp')

# Powder Shot (t clow skin: carrot)
img, d = tile(LANTERN)
d.ellipse([34, 44, 94, 104], fill=DARK, outline=LANTERN, width=3)
d.line([64, 44, 74, 28], fill=LANTERN, width=5)
d.ellipse([70, 20, 82, 32], fill=GOLD)
save(img, 'item-powdershot.webp')

# Signal Seeker (homing: sardine)
img, d = tile(GOLD)
d.polygon([(24, 64), (88, 40), (72, 64), (88, 88)], fill=GOLD)
d.polygon([(72, 64), (104, 52), (104, 76)], fill=TEAL)
d.ellipse([52, 58, 62, 68], fill=BG)
save(img, 'item-seeker.webp')

# Glyph Mine (rear trap: fishbone)
img, d = tile(VIOLET)
d.rounded_rectangle([26, 78, 102, 96], radius=6, fill=PURPLE)
shard(d, 64, 52, 16, 32, VIOLET)
d.rectangle([36, 86, 92, 90], fill=GOLD)
save(img, 'item-glyphmine.webp')

# Ward Shell (shield: iceshield)
img, d = tile(TEAL)
d.arc([28, 24, 100, 108], 180, 360, fill=TEAL, width=8)
d.line([28, 66, 100, 66], fill=TEAL, width=8)
d.arc([44, 40, 84, 96], 180, 360, fill=PALE, width=4)
save(img, 'item-wardshell.webp')

# Ion Charge (boost: cocoa)
img, d = tile(ORANGE)
d.rounded_rectangle([44, 30, 84, 100], radius=8, outline=ORANGE, width=6)
d.rectangle([56, 20, 72, 30], fill=ORANGE)
d.polygon([(70, 44), (54, 68), (66, 68), (58, 92), (78, 62), (64, 62)], fill=GOLD)
save(img, 'item-ioncharge.webp')

# Cutlass Arc (melee: slapfish)
img, d = tile(RED)
d.arc([24, 24, 104, 104], 250, 120, fill=PALE, width=9)
d.line([78, 88, 96, 106], fill=TIMBER, width=8)
d.ellipse([72, 84, 86, 98], fill=GOLD)
save(img, 'item-cutlass.webp')

# Static Veil (fog dome: blizzard)
img, d = tile(VIOLET)
d.arc([24, 36, 104, 116], 180, 360, fill=PURPLE, width=10)
d.line([24, 76, 104, 76], fill=PURPLE, width=10)
for i, x in enumerate((40, 64, 88)):
    y = 58 + (i % 2) * 10
    d.line([x - 8, y, x, y - 6, ], fill=VIOLET, width=4)
    d.line([x, y - 6, x + 8, y], fill=VIOLET, width=4)
save(img, 'item-staticveil.webp')

# Blackflag Barrage (leader-killer: avalanche)
img, d = tile(RED)
d.rectangle([30, 62, 78, 78], fill=DARK, outline=RED, width=3)
d.line([78, 70, 102, 62], fill=PALE, width=10)
d.ellipse([88, 46, 112, 70], fill=DARK, outline=GOLD, width=4)
d.polygon([(36, 62), (36, 34), (60, 44), (36, 52)], fill=RED)
d.line([36, 62, 36, 30], fill=PALE, width=4)
save(img, 'item-barrage.webp')

# Overdrive (invincible speed: aurora)
img, d = tile(GOLD)
for i, x in enumerate((30, 56, 82)):
    d.polygon([(x, 96), (x + 16, 32), (x + 24, 32), (x + 8, 96)], fill=(TEAL if i % 2 else GOLD))
save(img, 'item-overdrive.webp')

# Cargo Crawler (crossing ultimate: march)
img, d = tile(LANTERN)
d.rounded_rectangle([28, 56, 100, 92], radius=6, fill=TIMBER)
d.rectangle([44, 34, 76, 56], fill=(106, 72, 44, 255))
d.rectangle([28, 88, 100, 98], fill=DARK)
d.ellipse([86, 62, 98, 74], fill=LANTERN)
save(img, 'item-crawler.webp')
