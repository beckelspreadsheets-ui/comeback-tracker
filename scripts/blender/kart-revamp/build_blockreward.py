# Block Reward v2 ("Number go up"): a chunky Bitcoin-orange buggy. Orange body
# and arch fenders, charcoal trim, a grey front bumper, gold coin wheels (bright
# rim and B-with-ticks mark on a darker gold field), the same coin on the hood
# and tail, and the number-go-up chart, a green line climbing to an arrow, on
# both faces of the rear price-board spoiler and on a panel on each door. Built from nothing by script (no imported
# meshes, no external images).
#
#   blender -b -P build_blockreward.py -- out/btc-kart-v2.glb [--preview renders/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0. The file is
# flipped at the end so the nose is on -X, the facing the game has on record
# for this kart (KART_NOSE_YAW.btckart), which makes it a drop-in for
# btc-kart.glb. Pack with `--seat=0.14 --join-rear`.
#
# Paint: the game recolours texels whose linear chroma is over about 0.1. Only
# the orange body takes it. Gold, the green chart and the
# lamps are flagged protect=True (they keep their colour under any racer or
# bought paint); charcoal, steel and rubber are grey and stay put anyway.
#
# The left wheels are the right wheels turned half a turn in mesh data, not
# mirrored: a mirrored coin would show its mark back to front.
import bpy, sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kart_lib import *
import kart_lib as L
import studio

argv = sys.argv[sys.argv.index('--') + 1:]
out_glb = os.path.abspath(argv[0])
preview = os.path.abspath(argv[argv.index('--preview') + 1]) if '--preview' in argv else None
NOBAKE = '--nobake' in argv

reset_scene()
random.seed(21)

# ---------------------------------------------------------------- colours ---
C_ORANGE = (0.90, 0.250, 0.022)
C_GOLD = (1.00, 0.60, 0.040)
C_GOLD_D = (0.72, 0.36, 0.016)
C_WHITE = (0.86, 0.85, 0.82)
C_CHAR = (0.030, 0.030, 0.034)
C_INK = (0.010, 0.010, 0.012)
C_GREEN = (0.06, 0.80, 0.20)
C_GREEN_D = (0.015, 0.20, 0.06)


def hull_pattern(t, c):
    x, y, z = objcoord(t)
    top = smooth(t, normal_z(t), 0.5, 0.72)
    flank = mth(t, 'SUBTRACT', 1.0, top)
    # charcoal sill band with a white pinstripe over it
    low = mth(t, 'SUBTRACT', 1.0, smooth(t, z, 0.1005, 0.1035))
    c = mixc(t, low, c, C_CHAR)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, z, 0.1085, 0.1150, soft=0.001), flank), c, C_WHITE)
    # twin charcoal stripes down the hood, either side of the coin
    ay = mth(t, 'ABSOLUTE', y)
    nose = band(t, x, 0.2065, 0.4450)
    stripe = mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', band(t, ay, 0.098, 0.126), top), nose)
    c = mixc(t, stripe, c, C_CHAR)
    # panel lines: cowl joint, door cuts, rear deck joint
    lines = None
    for gx in (0.2025, 0.098, -0.160, -0.2700):
        g = band(t, x, gx - 0.0020, gx + 0.0020, soft=0.001)
        if -0.2 < gx < 0.2:
            g = mth(t, 'MULTIPLY', g, flank)
        lines = g if lines is None else mth(t, 'MAXIMUM', lines, g)
    return mixc(t, mth(t, 'MULTIPLY', lines, 0.8), c, C_INK)


def step_pattern(t, c):
    # side step: grip ribs across
    x, y, z = objcoord(t)
    v = mth(t, 'FRACT', mth(t, 'MULTIPLY', x, 1 / 0.022))
    rib = mth(t, 'MULTIPLY', mth(t, 'LESS_THAN', v, 0.35), smooth(t, normal_z(t), 0.6, 0.8))
    return mixc(t, mth(t, 'MULTIPLY', rib, 0.7), c, C_INK)


def tyre_pattern(t, c):
    # chunky tread blocks round the tread and shoulders (wheel axle = local X)
    x, y, z = objcoord(t)
    g = nd(t, 'ShaderNodeNewGeometry')
    tc = nd(t, 'ShaderNodeVectorTransform', vector_type='NORMAL', convert_from='WORLD', convert_to='OBJECT')
    t.links.new(g.outputs['Normal'], tc.inputs[0])
    sep = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs[0], sep.inputs[0])
    tread = mth(t, 'SUBTRACT', 1.0, smooth(t, mth(t, 'ABSOLUTE', sep.outputs[0]), 0.55, 0.8))
    ang = mth(t, 'ARCTAN2', z, y)
    v = mth(t, 'ADD', mth(t, 'MULTIPLY', ang, 18 / (2 * pi)), mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', x), 7.0))
    bar = mth(t, 'LESS_THAN', mth(t, 'FRACT', v), 0.26)
    edge = smooth(t, mth(t, 'ABSOLUTE', x), 0.012, 0.02)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', bar, tread), mth(t, 'MULTIPLY', edge, 0.7)), c, (0.006, 0.006, 0.008))


def reeded(r_lo, r_hi, count=40):
    """coin edge: short dark-gold reeds between two radii round the axle (local X)"""
    def pattern(t, c):
        x, y, z = objcoord(t)
        r = mth(t, 'SQRT', mth(t, 'ADD', mth(t, 'MULTIPLY', y, y), mth(t, 'MULTIPLY', z, z)))
        ring = band(t, r, r_lo, r_hi, soft=0.001)
        reed = mth(t, 'LESS_THAN', mth(t, 'FRACT', mth(t, 'MULTIPLY', mth(t, 'ARCTAN2', z, y), count / (2 * pi))), 0.42)
        return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', ring, reed), 0.85), c, C_GOLD_D)
    return pattern


PAINT_HULL = mat('paint_hull', C_ORANGE, rough=0.32, pattern=hull_pattern, edge=0.4)
PAINT = mat('paint', C_ORANGE, rough=0.32, edge=0.4)


def haunch_pattern(t, c):
    # a charcoal stripe with white pinstripes over the top of each rear arch
    x, y, z = objcoord(t)
    d = mth(t, 'ABSOLUTE', mth(t, 'SUBTRACT', mth(t, 'ABSOLUTE', y), 0.322))
    up = smooth(t, z, 0.150, 0.160)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, d, 0.021, 0.027, soft=0.001), up), c, C_WHITE)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, smooth(t, d, 0.0170, 0.0185)), up), c, C_CHAR)


PAINT_HAUNCH = mat('paint_haunch', C_ORANGE, rough=0.32, edge=0.4, pattern=haunch_pattern)
CHAR = mat('charcoal', C_CHAR, rough=0.5, edge=0.5)
DARK = mat('dark', (0.016, 0.016, 0.018), rough=0.5)
STEP = mat('step', (0.040, 0.040, 0.044), rough=0.6, pattern=step_pattern, edge=0.4)
SEAT = mat('seat', (0.040, 0.040, 0.046), rough=0.7, edge=0.45)
STEEL = mat('steel', (0.30, 0.31, 0.33), rough=0.35, metal=0.6, edge=0.7)
IRON = mat('iron', (0.085, 0.085, 0.090), rough=0.45, metal=0.5, edge=0.6)
GOLD = mat('gold', C_GOLD, rough=0.42, metal=0.2, edge=0.4, ao_floor=0.3, protect=True)
GOLD_D = mat('gold_dark', C_GOLD_D, rough=0.5, metal=0.2, edge=0.0, ao_floor=0.6, protect=True)
BOARD = mat('board', (0.020, 0.024, 0.030), rough=0.3, edge=0.35)
CHART = mat('chart', C_GREEN, rough=0.3, ao_floor=0.8, edge=0.5, protect=True)
CHART_D = mat('chart_dim', C_GREEN_D, rough=0.4, ao_floor=0.8, edge=0.2, protect=True)
LAMP_F = mat('lamp_front', (1.0, 0.95, 0.85), rough=0.2, emit=(1.0, 0.92, 0.78), emit_strength=1.0)
# painted, not emissive: the bake turns an emissive red pale pink, and the game
# hangs its own brake lamps on the tail anyway
LAMP_R = mat('lamp_rear', (0.80, 0.045, 0.03), rough=0.2, ao_floor=0.75, edge=0.6, protect=True)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.036, 0.034, 0.034), rough=0.9, toplight=False, ao_floor=0.45, edge=0.45, pattern=tyre_pattern)
W_DARK = mat('wheel_dark', (0.030, 0.030, 0.034), rough=0.5, toplight=False)

P = []


def add(o):
    P.append(o); return o


# ------------------------------------------------------------------- hull ---
HULL = [  # x, half width, top, bottom, exponent
    (0.468, 0.105, 0.205, 0.100, 3.4),
    (0.460, 0.128, 0.232, 0.076, 4.0),
    (0.440, 0.138, 0.246, 0.064, 4.4),
    (0.330, 0.148, 0.264, 0.056, 4.6),
    (0.240, 0.154, 0.280, 0.052, 4.6),
    (0.203, 0.168, 0.297, 0.050, 4.4),
    (0.172, 0.178, 0.299, 0.050, 4.2),
    (0.120, 0.183, 0.273, 0.050, 4.0),
    (-0.100, 0.186, 0.252, 0.050, 4.0),
    (-0.215, 0.186, 0.258, 0.050, 4.0),
    (-0.265, 0.184, 0.312, 0.052, 4.2),
    (-0.300, 0.183, 0.322, 0.054, 4.4),
    (-0.410, 0.180, 0.322, 0.060, 4.4),
    (-0.455, 0.172, 0.310, 0.068, 3.8),
    (-0.470, 0.150, 0.284, 0.084, 3.0),
]
FW = dict(R=0.120, W=0.150, x=0.300, y=0.300)
RW = dict(R=0.150, W=0.190, x=-0.305, y=0.315)
DECK_Z = 0.322


def hull_at(x):
    """(half width, top, slope of the top, bottom) of the hull at x"""
    for a, b in zip(HULL, HULL[1:]):
        if b[0] <= x <= a[0]:
            f = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[2] - a[2]) / (b[0] - a[0]), a[3] + (b[3] - a[3]) * f
    return 0.15, 0.2, 0.0, 0.05


# ------------------------------------------------------- coin and its mark ---
def slab_arc(name, material, M4, cx, cy, r_in, r_out, a0, a1, z0, z1, n=8):
    rings = []
    for k in range(n + 1):
        a = a0 + (a1 - a0) * k / n
        c, s = math.cos(a), math.sin(a)
        rings.append([M4 @ V((cx + r_in * c, cy + r_in * s, z0)), M4 @ V((cx + r_out * c, cy + r_out * s, z0)),
                      M4 @ V((cx + r_out * c, cy + r_out * s, z1)), M4 @ V((cx + r_in * c, cy + r_in * s, z1))])
    v, f = loft(rings)
    return make_obj(name, v, f, material, sharp=35)


def btc_mark(M4, h, depth, material, out):
    """the B with two ticks above and below, standing on the plane z = 0 of M4
    (x right, y up, z toward the viewer). h is the height of the B itself; the
    ticks add 0.13 h at each end. The two bowls overlap at the waist, so the
    lower one is a hair shallower: no two faces share a plane."""
    def box(x0, x1, y0, y1, d=depth):
        out.append(rbox('mark', ((x1 - x0) * h, (y1 - y0) * h, d), material, M4 @ T((x0 + x1) / 2 * h, (y0 + y1) / 2 * h, d / 2), bevel=0.0, sharp=35))
    box(-0.33, -0.15, -0.5, 0.5)
    for y0, y1 in ((0.33, 0.5), (-0.085, 0.085), (-0.5, -0.33)):
        box(-0.15, 0.04, y0, y1)
    for tx in (-0.20, -0.02):
        box(tx - 0.045, tx + 0.045, 0.5, 0.63)
        box(tx - 0.045, tx + 0.045, -0.63, -0.5)
    for cy, d in ((0.2075, depth), (-0.2075, depth * 0.93)):
        out.append(slab_arc('mark', material, M4, 0.04 * h, cy * h, 0.1225 * h, 0.2925 * h, -pi / 2, pi / 2, 0.0, d, n=8))


def coin(M4, R, th, out, mark=True, segs=22, mark_h=0.62):
    """a coin lying on the plane z = 0 of M4, face toward +z: a bright raised
    border, a darker gold field sunk into it, and the mark standing on the
    field in bright gold. Gold on gold, so the coin reads as gold from any
    distance (a white mark turned the whole face pale)."""
    c = min(0.0035, th * 0.3); rec = min(0.0045, th * 0.34)
    out.append(lathe('coin', GOLD, [(R, 0.0), (R, th - c), (R - c, th), (R * 0.84, th), (R * 0.79, th - rec)], segs=segs, M4=M4, sharp=35))
    out.append(lathe('coin_field', GOLD_D, [(R * 0.79, th - rec), (0, th - rec)], segs=segs, M4=M4, sharp=35))
    if mark:
        btc_mark(M4 @ T(0, 0, th - rec), R * mark_h * 2 * 0.79 / 1.46, rec * 1.05, GOLD, out)


def chart(M4, zs, out, k=1.0, lw=0.0135, lt=0.0065, bars=None):
    """the number-go-up chart on the plane z = zs of M4 (x: the viewer's
    right, y: up): a green line that climbs to an arrow, and optionally dim
    volume bars along the bottom edge y = bars."""
    pts = [(-0.232 * k, -0.026 * k), (-0.140 * k, 0.000), (-0.078 * k, -0.018 * k), (0.020 * k, 0.012 * k), (0.076 * k, -0.004 * k), (0.180 * k, 0.024 * k)]
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        a = V((a[0], a[1], 0)); b = V((b[0], b[1], 0)); d = b - a
        out.append(rbox('chart_line', (d.length + lw * 0.9, lw, lt + (i % 2) * 0.0008), CHART,
                        M4 @ T((a.x + b.x) / 2, (a.y + b.y) / 2, zs + lt / 2) @ R(math.atan2(d.y, d.x), 'Z'), bevel=0.0, segs=1, sharp=40))
    a = V((pts[-2][0], pts[-2][1], 0)); b = V((pts[-1][0], pts[-1][1], 0)); d = (b - a).normalized(); nrm = V((-d.y, d.x, 0))
    tip = b + d * (lw * 3.7); base = b + d * (lw * 0.3); hwid = lw * 1.75; ht = lt + 0.0016
    tri = [base + nrm * hwid, base - nrm * hwid, tip]
    verts = [M4 @ (q + V((0, 0, zs))) for q in tri] + [M4 @ (q + V((0, 0, zs + ht))) for q in tri]
    out.append(make_obj('chart_arrow', verts, [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)], CHART, sharp=40))
    if bars is not None:
        heights = [0.006, 0.010, 0.007, 0.012, 0.009, 0.015, 0.011, 0.018, 0.014, 0.022]
        for i, hgt in enumerate(heights):
            out.append(rbox('chart_bar', (0.024 * k, hgt * k, 0.003), CHART_D, M4 @ T((-0.232 + i * 0.0445) * k, bars + (0.008 + hgt / 2) * k, zs + 0.0015), bevel=0.0, segs=1, sharp=40))


add(xloft('hull', PAINT_HULL, HULL, N=20, sub=1, sharp=60))
add(rbox('floor', (0.78, 0.30, 0.022), DARK, T(0.03, 0, 0.047), bevel=0.008, segs=1, sharp=50))
add(rbox('sill', (0.30, 0.40, 0.022), CHAR, T(0.0, 0, 0.058), bevel=0.008, segs=1, sharp=50))

# hood coin, read from the front (top of the mark toward the cockpit)
hx = 0.335
hw, top, slope, bot = hull_at(hx)
hn = V((-slope, 0, 1)).normalized()
coin(frame((hx, 0, top - 0.004), hn, (0, 1, 0)), 0.090, 0.018, P, segs=26)
# door price panels: the chart climbs left to right on both sides
for s in (-1, 1):
    Md = frame((-0.005, s * 0.1860, 0.172), (0, s, 0), (-s, 0, 0))
    add(rbox('door_panel', (0.224, 0.084, 0.010), BOARD, Md, bevel=0.004, segs=1, sharp=50))
    chart(Md, 0.005, P, k=0.40, lw=0.0105, lt=0.0055)

# -------------------------------------------------------- nose and bumper ---
GX = 0.4690
ring = sup_ring((GX + 0.0035, 0, 0.158), (0, 1, 0), (0, 0, 1), 0.046, 0.034, e=4.0, N=16)
add(make_obj('grille_face', ring, [tuple(range(16))], DARK, sharp=60, recalc=False))
shell = sup_ring((GX + 0.0025, 0, 0.158), (0, 1, 0), (0, 0, 1), 0.049, 0.037, e=4.0, N=20)
add(tube('grille_shell', CHAR, shell, 0.0075, N=6, closed=True, up=(1, 0, 0), sharp=70))
for i in range(3):
    add(rbox('grille_bar', (0.006, 0.088, 0.0075), STEEL, T(GX + 0.0065, 0, 0.140 + i * 0.018), bevel=0.0, segs=1, sharp=50))
for s in (-1, 1):
    m4 = frame((0.4600, s * 0.0855, 0.160), (1.0, s * 0.06, 0.0))
    add(lathe('lamp_bezel', GOLD, [(0.031, -0.004), (0.031, 0.012), (0.027, 0.016), (0.0235, 0.016)], segs=14, M4=m4, sharp=45))
    add(lathe('lamp_f', LAMP_F, [(0.0235, 0.014), (0.017, 0.019), (0.008, 0.0215), (0, 0.022)], segs=14, M4=m4, sharp=60))
# chunky grey bumper with charcoal over-riders and a skid plate
add(rbox('bumper_f', (0.044, 0.430, 0.044), STEEL, T(0.484, 0, 0.092), bevel=0.014, segs=2, sharp=50,
         taper=lambda v: V((v.x - (0.012 if abs(v.y) > 0.1 and v.x > 0 else 0.0), v.y, v.z))))
for s in (-1, 1):
    add(rbox('over_rider', (0.052, 0.030, 0.074), CHAR, T(0.486, s * 0.092, 0.100), bevel=0.010, segs=1, sharp=50))
    add(rbox('bumper_arm', (0.050, 0.020, 0.022), IRON, T(0.452, s * 0.092, 0.090), bevel=0.0, segs=1, sharp=50))
add(rbox('skid', (0.070, 0.200, 0.010), IRON, T(0.452, 0, 0.066) @ R(0.30, 'Y'), bevel=0.003, segs=1, sharp=50))

# ------------------------------------------------------------ axles, steps ---
yi = FW['y'] - FW['W'] / 2 + 0.014
add(tube('axle_f', IRON, [(FW['x'], -yi, FW['R']), (FW['x'], -0.10, 0.105), (FW['x'], 0.10, 0.105), (FW['x'], yi, FW['R'])], 0.0125, N=8, sharp=70))
yr = RW['y'] - RW['W'] / 2 + 0.014
add(tube('axle_r', IRON, [(RW['x'], -yr, RW['R']), (RW['x'], yr, RW['R'])], 0.017, N=8, sharp=70))
for s in (-1, 1):
    add(tube('stub_f', STEEL, [(FW['x'], s * (yi - 0.006), FW['R']), (FW['x'], s * (yi + 0.012), FW['R'])], 0.022, N=8, sharp=70))
    add(rbox('step', (0.262, 0.086, 0.018), STEP, T(0.012, s * 0.232, 0.070), bevel=0.006, segs=1, sharp=50))
    add(tube('step_rail', STEEL, [(0.146, s * 0.200, 0.074), (0.146, s * 0.270, 0.074), (0.130, s * 0.284, 0.074), (-0.106, s * 0.284, 0.074),
                                  (-0.122, s * 0.270, 0.074), (-0.122, s * 0.200, 0.074)], 0.0105, N=6, sharp=70))


# ----------------------------------------------------------------- fenders ---
def fender(spec, s, a0, a1, y_in, y_out, clear=0.020, t=0.013, crown=0.010, lip=0.018, n=15, material=None):
    """arch over a wheel, crowned across its width, with a down-turned lip on
    the outboard edge. y_in / y_out: how far the section reaches inboard and
    outboard of the wheel centre."""
    Rf = spec['R'] + clear
    top = []; under = []
    for k in range(7):
        u = -1 + 2 * k / 6
        y = -y_in + (y_out + y_in) * k / 6
        c = crown * (1 - u * u)
        top.append((y, t * (0.6 if k in (0, 6) else 1.0) + c))
        if 0 < k < 6:
            under.append((y, c))
    sect = [(-y_in, 0.0)] + top + [(y_out + 0.003, -lip), (y_out - 0.007, -lip)] + under[::-1]
    rings = []
    for k in range(n):
        f = k / (n - 1)
        a = math.radians(a0 + (a1 - a0) * f)
        rd = V((math.cos(a), 0, math.sin(a)))
        c = V((spec['x'], s * spec['y'], spec['R'])) + rd * Rf
        e = 1.0
        rings.append([c + V((0, s * yo, 0)) + rd * (ro * e) for yo, ro in sect])
    v, f = loft(rings)
    return make_obj('fender', v, f, material or PAINT, sharp=50)


for s in (-1, 1):
    # front: a cycle fender over the wheel, held by two iron arms
    add(fender(FW, s, 20, 165, 0.082, 0.082, clear=0.018, t=0.012, crown=0.008, lip=0.014, n=13))
    for ax in (0.045, -0.045):
        add(tube('fender_arm', IRON, [(FW['x'] + ax, s * 0.130, 0.215), (FW['x'] + ax * 0.9, s * 0.236, FW['R'] * 2 + 0.006)], 0.0075, N=6, sharp=70))
    add(tube('wishbone', IRON, [(FW['x'] + 0.060, s * 0.120, 0.120), (FW['x'], s * (FW['y'] - 0.070), FW['R'] + 0.010), (FW['x'] - 0.070, s * 0.120, 0.120)], 0.0095, N=6, sharp=70))
    # rear: a wide haunch that runs into the body
    add(fender(RW, s, -6, 162, RW['y'] - 0.176, 0.100, crown=0.012, material=PAINT_HAUNCH))

# ------------------------------------------------------------------ cockpit ---
path = []
for k in range(26):
    th = 2 * pi * k / 26
    x = -0.048 + 0.222 * sgnpow(math.cos(th), 2 / 4.2)
    y = 0.160 * sgnpow(math.sin(th), 2 / 4.2)
    z = 0.259 + 0.036 * max(0.0, math.cos(th)) ** 2 + 0.050 * max(0.0, -math.cos(th)) ** 2
    path.append((x, y, z))
add(tube('coaming', CHAR, path, 0.021, N=8, closed=True, up=(0, 0, 1), ell=1.4, sharp=70))
ring = sup_ring((-0.050, 0, 0.2555), (1, 0, 0), (0, 1, 0), 0.214, 0.153, e=4.0, N=24)
add(make_obj('cockpit_floor', ring, [tuple(range(24))], DARK, sharp=60, recalc=False))
add(rbox('seat_base', (0.17, 0.215, 0.032), SEAT, T(-0.150, 0, 0.259), bevel=0.013, sharp=50))
seat_m = T(-0.262, 0, 0.345) @ R(-0.17, 'Y')
add(rbox('seat_back', (0.054, 0.270, 0.170), SEAT, seat_m, bevel=0.018, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.80), v.z))))
for i in range(3):
    add(rbox('seat_rib', (0.012, 0.170, 0.028), SEAT, seat_m @ T(0.027, 0, -0.040 + i * 0.040), bevel=0.006, segs=1, sharp=50))
add(rbox('seat_stripe', (0.058, 0.060, 0.012), PAINT, seat_m @ T(0, 0, 0.074), bevel=0.004, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('seat_bolster', (0.10, 0.03, 0.07), SEAT, T(-0.205, s * 0.120, 0.291) @ R(-0.12, 'Y'), bevel=0.012, sharp=50))
# dash cowl and steering wheel
add(rbox('dash', (0.034, 0.270, 0.036), CHAR, T(0.170, 0, 0.306) @ R(-0.25, 'Y'), bevel=0.012, segs=2, sharp=50))
sw = T(0.112, 0, 0.332) @ R(-1.08, 'Y')
add(torus('steer_ring', CHAR, 0.052, 0.0105, M4=sw, segs=18, rsegs=6))
for k in range(3):
    add(rbox('steer_spoke', (0.052, 0.0115, 0.006), IRON, sw @ R(2 * pi * k / 3 + pi, 'Z') @ T(0.026, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', GOLD, [(0, 0.010), (0.012, 0.009), (0.017, 0.004), (0.017, -0.004)], segs=12, M4=sw, sharp=40))
add(tube('steer_column', IRON, [(0.115, 0, 0.329), (0.185, 0, 0.292)], 0.008, N=6))

# ------------------------------------------------------------- rear deck ---
add(rbox('engine_lid', (0.092, 0.230, 0.014), CHAR, T(-0.352, 0, DECK_Z + 0.004), bevel=0.005, segs=1, sharp=50))
for i in range(4):
    add(rbox('lid_slat', (0.010, 0.180, 0.008), IRON, T(-0.322 - i * 0.020, 0, DECK_Z + 0.012) @ R(0.5, 'Y'), bevel=0.0, segs=1, sharp=50))
for s in (-1, 1):
    add(lathe('filler', GOLD, [(0.016, 0.0), (0.016, 0.007), (0.012, 0.011), (0, 0.011)], segs=12, M4=T(-0.292, s * 0.118, DECK_Z - 0.001), sharp=40))

# ----------------------------------------------------------------- tail ---
TX = -0.4705
add(rbox('tail_panel', (0.014, 0.276, 0.092), CHAR, T(TX, 0, 0.196), bevel=0.006, segs=1, sharp=50))
coin(frame((TX - 0.006, 0, 0.198), (-1, 0, 0), (0, -1, 0)), 0.041, 0.011, P, segs=18)
for s in (-1, 1):
    m4 = frame((TX - 0.0065, s * 0.098, 0.200), (-1, 0, 0))
    add(lathe('lamp_r_bezel', STEEL, [(0.0285, -0.004), (0.0285, 0.004), (0.024, 0.007), (0.021, 0.007)], segs=12, M4=m4, sharp=45))
    add(lathe('lamp_r', LAMP_R, [(0.021, 0.005), (0.014, 0.010), (0, 0.0115)], segs=12, M4=m4, sharp=60))
    # gold exhaust tip under the tail
    add(tube('exhaust', GOLD, [(-0.430, s * 0.062, 0.112), (-0.492, s * 0.062, 0.112)], 0.0175, N=10, sharp=70))
    add(lathe('exhaust_bore', DARK, [(0, 0.0), (0.0135, 0.0)], segs=10, M4=frame((-0.4925, s * 0.062, 0.112), (-1, 0, 0)), sharp=60, recalc=False))
add(rbox('bumper_r', (0.030, 0.380, 0.032), STEEL, T(-0.480, 0, 0.150 - 0.070), bevel=0.010, segs=2, sharp=50))
add(rbox('chassis_r', (0.150, 0.220, 0.060), DARK, T(-0.395, 0, 0.100), bevel=0.012, segs=1, sharp=50))

# ------------------------------------------------- spoiler: the price board ---
BC = V((-0.436, 0.0, 0.428)); LEAN = math.radians(12)
bn = V((-math.cos(LEAN), 0, math.sin(LEAN)))
Mb = frame(BC, bn, (0, -1, 0))          # x: the viewer's right from behind, y: up the board, z: toward the viewer
BW, BH, BT = 0.540, 0.096, 0.016
add(rbox('board', (BW, BH, BT), BOARD, Mb, bevel=0.006, segs=1, sharp=50))
add(rbox('board_cap', (BW + 0.004, 0.010, BT + 0.006), PAINT, Mb @ T(0, BH / 2 + 0.001, 0), bevel=0.003, segs=1, sharp=50))
add(rbox('board_foot', (BW + 0.004, 0.010, BT + 0.006), CHAR, Mb @ T(0, -BH / 2 - 0.001, 0), bevel=0.003, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('board_post', (0.030, 0.018, 0.072), CHAR, T(BC.x + 0.016, s * 0.150, DECK_Z + 0.030) @ R(-LEAN, 'Y'), bevel=0.005, segs=1, sharp=50))
    # gold coin endplates, face out
    coin(frame((BC.x, s * (BW / 2 + 0.002), BC.z), (0, s, 0), (-s, 0, 0)), 0.055, 0.014, P, segs=20)
# the chart on both faces: from behind (the chase camera) and from the front
# (the setup stage and the thumbnail), each climbing left to right
chart(Mb, BT / 2, P, bars=-BH / 2)
Mf = frame(BC, -bn, (0, 1, 0))
chart(Mf, BT / 2, P, bars=-BH / 2)

body = join(P, 'blockreward_body')


# ------------------------------------------------------------------- wheels ---
def build_wheel(name, spec):
    """right-hand wheel: axle on local X, outer face on +X. A fat tyre round a
    gold coin: reeded edge, raised border, the white mark on the field."""
    Rr, W = spec['R'], spec['W']; hw = W / 2
    A = frame((0, 0, 0), (1, 0, 0), (0, 1, 0))
    parts = []
    prof = []

    def PT(r, a):
        prof.append((r * Rr, a * hw))
    PT(0.62, -0.80); PT(0.74, -0.98); PT(0.90, -0.96); PT(0.972, -0.83); PT(1.0, -0.64)
    for g in (-0.27, 0.27):
        PT(1.0, g - 0.085); PT(0.955, g - 0.05); PT(0.955, g + 0.05); PT(1.0, g + 0.085)
    PT(1.0, 0.64); PT(0.972, 0.83); PT(0.90, 0.96); PT(0.80, 1.0); PT(0.72, 0.975); PT(0.66, 0.86); PT(0.64, 0.74)
    shoulder = {3, len(prof) - 6}
    segs = 24

    def rmod(pi_, k):
        return -0.045 * Rr if (pi_ in shoulder and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    w_gold = mat(f'{name}_gold', C_GOLD, rough=0.42, metal=0.2, toplight=False, edge=0.45, ao_floor=0.45, protect=True,
                 pattern=reeded(0.585 * Rr, 0.70 * Rr))
    zf = hw * 0.86
    parts.append(lathe('coin', w_gold, [(0.650 * Rr, hw * 0.66), (0.665 * Rr, hw * 0.80), (0.690 * Rr, hw * 0.92), (0.672 * Rr, hw * 1.00), (0.610 * Rr, hw * 1.02),
                                        (0.500 * Rr, hw * 1.02), (0.455 * Rr, zf)], segs=24, M4=A, sharp=40))
    w_field = mat(f'{name}_field', C_GOLD_D, rough=0.5, metal=0.2, toplight=False, edge=0.0, ao_floor=0.6, protect=True)
    parts.append(lathe('coin_field', w_field, [(0.455 * Rr, zf), (0.0, zf)], segs=24, M4=A, sharp=40))
    btc_mark(A @ T(0, 0, zf), 0.54 * Rr, hw * 0.105, w_gold, parts)
    parts.append(lathe('back', W_DARK, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.62 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
    return join(parts, name)


wf = build_wheel('wheel_front_r', FW)
wr = build_wheel('wheel_rear_r', RW)
# park the two baked wheels where they sit on the kart so the body picks up
# their contact shade; they go under their hubs after the bake
wf.location = (FW['x'], -FW['y'], FW['R']); wf.rotation_euler = (0, 0, -pi / 2)
wr.location = (RW['x'], -RW['y'], RW['R']); wr.rotation_euler = (0, 0, -pi / 2)
stand_ins = []
for src, spec in ((wf, FW), (wr, RW)):
    c = src.copy(); L.coll.objects.link(c)
    c.location = (spec['x'], spec['y'], spec['R']); c.rotation_euler = (0, 0, pi / 2)
    stand_ins.append(c)
bpy.context.view_layer.update()

print('TRIS body', tri_count([body]), 'front wheel', tri_count([wf]), 'rear wheel', tri_count([wr]),
      'total', tri_count([body]) + 2 * tri_count([wf]) + 2 * tri_count([wr]))
mn, mx = bounds([body, wf, wr] + stand_ins); print('BOUNDS', [round(v, 3) for v in mn], [round(v, 3) for v in mx])

# ------------------------------------------------------------- bake + export ---
if not NOBAKE:
    unwrap([body, wf, wr])
    # the wheels are baked after the body and their marks would bleed
    # over body islands with the default 12 px margin; 3 px stays in the gap
    images = bake_atlas([[body], [wf], [wr]], dict(color=1024, orm=256, emit=256), samples=24, margins=[12, 3, 3])
    final = final_material('blockreward_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)


for c in stand_ins:
    bpy.data.objects.remove(c)


def turned_copy(o, name):
    """the wheel turned half a turn about its upright axis, in mesh data: the
    outer face moves to -X with the mark still the right way round, and the
    UVs are shared. No negative scale, no flipped faces."""
    me = o.data.copy(); me.name = name
    me.transform(Matrix.Rotation(pi, 4, 'Z')); me.update()
    n = bpy.data.objects.new(name, me)
    L.coll.objects.link(n)
    return n


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward)."""
    root = empty('btc_kart_v2')
    body.parent = root
    out = [root, body]
    for src, spec, tag in ((wf, FW, 'front'), (wr, RW, 'rear')):
        src.location = (0, 0, 0); src.rotation_euler = (0, 0, 0)
        left = turned_copy(src, f'wheel_{tag}_l')
        for w, side in ((src, -1), (left, 1)):
            hub = empty(w.name.replace('wheel', 'hub'), root, (spec['x'], side * spec['y'], spec['R']), (0, 0, -pi / 2))
            w.parent = hub
            out += [hub, w]
    return root, out


root, objs = place_wheels()
# nose to -X: turn the body's own data and the hubs, leave no rotated root
body.data.transform(Matrix.Rotation(pi, 4, 'Z'))
body.data.update()
for o in objs:
    if o.type == 'EMPTY' and o.parent is root:
        o.location = (-o.location.x, -o.location.y, o.location.z)
        o.rotation_euler = (0, 0, pi / 2)
bpy.context.view_layer.update()
meshes = [o for o in objs if o.type == 'MESH']
print('FINAL TRIS', tri_count(meshes), 'VERTS', sum(len(o.data.vertices) for o in meshes))
os.makedirs(os.path.dirname(out_glb), exist_ok=True)
if not NOBAKE:
    raw = os.path.join(os.path.dirname(out_glb), '_bake', os.path.basename(out_glb).replace('.glb', '.raw.glb'))
    export_glb(raw, objs, jpeg_quality=80)
    print('RAW GLB', raw, os.path.getsize(raw), 'bytes (pack it with pack-glb.mjs)')

if preview:
    studio.setup()
    cam, lights = studio.add_rig()
    root.rotation_euler = (0, 0, pi)   # studio wants the nose on +X
    for view in studio.VIEWS:
        studio.aim(cam, lights, view)
        studio.render(f'{preview}-{view[0]}.png')
