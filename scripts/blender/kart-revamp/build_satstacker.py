# Sat Stacker v2: a vintage treasure hauler. Sand body, dark brown trim, brass
# hardware, a leather seat and a rear rack of gold coin stacks and strapped
# crates. Built from nothing by script (no imported meshes, no external images).
#
#   blender -b -P build_satstacker.py -- out/sat-stacker-v2.glb [--preview renders/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0. The file is
# flipped at the end so the nose is on -X, the facing the game has on record
# for the Sat Stacker (KART_NOSE_YAW.satstacker), which makes it a drop-in for
# sat-stacker.glb.
#
# Paint: the game recolours texels whose linear chroma (max - min channel) is
# over about 0.1. Sand body, brass and gold are over it on purpose (they take
# the racer wash and bought paints); brown trim, leather, wood, rubber, cream
# and iron are kept under it so they stay put.
import bpy, sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kart_lib import *
import kart_lib as L
import studio

argv = sys.argv[sys.argv.index('--') + 1:]
out_glb = os.path.abspath(argv[0])
preview = os.path.abspath(argv[argv.index('--preview') + 1]) if '--preview' in argv else None
NOBAKE = '--nobake' in argv
HERE = os.path.dirname(os.path.abspath(__file__))

reset_scene()
random.seed(23)

# ---------------------------------------------------------------- colours ---
C_SAND = (0.70, 0.44, 0.185)
C_CARAMEL = (0.105, 0.048, 0.026)
C_BROWN = (0.070, 0.034, 0.020)
C_CREAM = (0.64, 0.585, 0.52)
C_BRASS = (0.50, 0.255, 0.035)
C_GOLD = (0.96, 0.54, 0.055)
C_INK = (0.030, 0.014, 0.008)


def hull_pattern(t, c):
    x, y, z = objcoord(t)
    top = smooth(t, normal_z(t), 0.5, 0.72)
    flank = mth(t, 'SUBTRACT', 1.0, top)
    # dark brown lower band with a cream pinstripe over it
    low = mth(t, 'SUBTRACT', 1.0, smooth(t, z, 0.1005, 0.1035))
    c = mixc(t, low, c, C_BROWN)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, z, 0.1085, 0.1150, soft=0.001), flank), c, C_CREAM)
    # door roundel with the sats mark: three bars and a tick above and below
    dx = mth(t, 'SUBTRACT', x, 0.030); dz = mth(t, 'SUBTRACT', z, 0.172)
    r = mth(t, 'SQRT', mth(t, 'ADD', mth(t, 'MULTIPLY', dx, dx), mth(t, 'MULTIPLY', dz, dz)))
    side = mth(t, 'MULTIPLY', flank, smooth(t, mth(t, 'ABSOLUTE', y), 0.150, 0.160))
    disc = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, smooth(t, r, 0.0530, 0.0550)), side)
    ring = mth(t, 'MULTIPLY', band(t, r, 0.0455, 0.0510, soft=0.0008), side)
    c = mixc(t, disc, c, C_CREAM)
    c = mixc(t, ring, c, C_BROWN)
    adx = mth(t, 'ABSOLUTE', dx)
    barx = mth(t, 'SUBTRACT', 1.0, smooth(t, adx, 0.0225, 0.0240))
    mark = None
    for zc in (-0.0135, 0.0, 0.0135):
        b = mth(t, 'MULTIPLY', band(t, dz, zc - 0.0037, zc + 0.0037, soft=0.0006), barx)
        mark = b if mark is None else mth(t, 'MAXIMUM', mark, b)
    tickx = mth(t, 'SUBTRACT', 1.0, smooth(t, adx, 0.0032, 0.0044))
    for z0, z1 in ((0.0215, 0.0320), (-0.0320, -0.0215)):
        mark = mth(t, 'MAXIMUM', mark, mth(t, 'MULTIPLY', band(t, dz, z0, z1, soft=0.0006), tickx))
    c = mixc(t, mth(t, 'MULTIPLY', mark, side), c, C_BROWN)
    # panel lines: cowl joint, door cuts
    lines = None
    for gx in (0.2025, 0.098, -0.160):
        g = band(t, x, gx - 0.0020, gx + 0.0020, soft=0.001)
        if gx < 0.2:
            g = mth(t, 'MULTIPLY', g, flank)
        lines = g if lines is None else mth(t, 'MAXIMUM', lines, g)
    return mixc(t, mth(t, 'MULTIPLY', lines, 0.75), c, C_INK)


def deck_pattern(t, c):
    # planks running fore and aft
    x, y, z = objcoord(t)
    v = mth(t, 'FRACT', mth(t, 'ADD', mth(t, 'MULTIPLY', y, 1 / 0.043), 0.5))
    gap = mth(t, 'LESS_THAN', v, 0.09)
    return mixc(t, mth(t, 'MULTIPLY', gap, 0.85), c, C_INK)


def board_pattern(t, c):
    # running board: rubber ribs across
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


PAINT_HULL = mat('paint_hull', C_SAND, rough=0.34, pattern=hull_pattern, edge=0.4)
PAINT = mat('paint', C_SAND, rough=0.34, edge=0.4)
# fenders, bed and tailgate: a warmer brown than the trim, still under the paint mask
CARAMEL = mat('fender_brown', C_CARAMEL, rough=0.4, edge=0.55)
BROWN = mat('brown', C_BROWN, rough=0.5, edge=0.45)
BOARD = mat('board', (0.060, 0.032, 0.022), rough=0.6, pattern=board_pattern, edge=0.4)
LEATHER = mat('leather', (0.150, 0.066, 0.034), rough=0.62, edge=0.4)
CREAM = mat('cream', C_CREAM, rough=0.5)
BRASS = mat('brass', C_BRASS, rough=0.3, metal=0.85, edge=0.9)
GOLD = mat('gold', C_GOLD, rough=0.24, metal=0.9, edge=0.38, ao_floor=0.2)
WOOD = mat('wood', (0.265, 0.160, 0.098), rough=0.7, edge=0.35)
WOOD_D = mat('wood_dark', (0.150, 0.086, 0.050), rough=0.75, edge=0.2)
DECK = mat('deck', (0.180, 0.105, 0.062), rough=0.7, pattern=deck_pattern, edge=0.3)
DARK = mat('dark', (0.024, 0.021, 0.020), rough=0.5)
IRON = mat('iron', (0.085, 0.080, 0.078), rough=0.45, metal=0.5)
GLASS = mat('glass', (0.045, 0.075, 0.085), rough=0.08)
LAMP_F = mat('lamp_front', (1.0, 0.95, 0.85), rough=0.2, emit=(1.0, 0.92, 0.78), emit_strength=1.0)
# painted, not emissive: the bake turns an emissive red pale pink, and the game
# hangs its own brake lamps on the tail anyway
LAMP_R = mat('lamp_rear', (0.80, 0.045, 0.03), rough=0.2, ao_floor=0.75, edge=0.6)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.036, 0.034, 0.034), rough=0.9, toplight=False, ao_floor=0.45, edge=0.45, pattern=tyre_pattern)
W_CREAM = mat('wheel_cream', C_CREAM, rough=0.5, toplight=False)
W_BRASS = mat('wheel_brass', C_BRASS, rough=0.3, metal=0.85, toplight=False, edge=0.9)
W_BROWN = mat('wheel_brown', (0.050, 0.026, 0.016), rough=0.5, toplight=False)
W_SAND = mat('wheel_spoke', (0.56, 0.50, 0.42), rough=0.45, toplight=False, edge=0.4)
W_IRON = mat('wheel_iron', (0.07, 0.066, 0.064), rough=0.45, metal=0.5, toplight=False)

# Brown fenders look best in the stock colours but leave little paint showing
# from the chase camera; True makes them body colour so they take paints.
FENDERS_TAKE_PAINT = False

P = []


def add(o):
    P.append(o); return o


# ------------------------------------------------------------------- hull ---
HULL = [  # x, half width, top, bottom, exponent
    (0.466, 0.060, 0.214, 0.092, 2.6),
    (0.458, 0.083, 0.238, 0.072, 3.0),
    (0.436, 0.092, 0.247, 0.064, 3.2),
    (0.330, 0.106, 0.263, 0.056, 3.2),
    (0.240, 0.124, 0.281, 0.052, 3.4),
    (0.203, 0.150, 0.297, 0.050, 3.4),
    (0.172, 0.172, 0.299, 0.050, 3.6),
    (0.120, 0.181, 0.273, 0.050, 3.8),
    (-0.100, 0.184, 0.252, 0.050, 3.8),
    (-0.215, 0.182, 0.256, 0.050, 3.8),
    (-0.262, 0.176, 0.286, 0.052, 3.6),
    (-0.292, 0.166, 0.290, 0.058, 3.2),
    (-0.306, 0.130, 0.270, 0.066, 2.8),
]
FW = dict(R=0.126, W=0.142, x=0.300, y=0.300)
RW = dict(R=0.156, W=0.192, x=-0.300, y=0.290)
DECK_Z = 0.216


def hull_at(x):
    """(half width, top, slope of the top, bottom) of the hull at x"""
    for a, b in zip(HULL, HULL[1:]):
        if b[0] <= x <= a[0]:
            f = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[2] - a[2]) / (b[0] - a[0]), a[3] + (b[3] - a[3]) * f
    return 0.15, 0.2, 0.0, 0.05


def hull_ring(x, grow=0.0, e=3.2, a0=0.0, a1=pi, n=13):
    """points over the top half of the hull section at x, pushed out by grow"""
    hw, top, slope, bot = hull_at(x)
    zc = bot + 0.45 * (top - bot)
    pts = []
    for k in range(n):
        th = a0 + (a1 - a0) * k / (n - 1)
        pts.append((x, (hw + grow) * sgnpow(math.cos(th), 2 / e), zc + (top - zc + grow) * sgnpow(math.sin(th), 2 / e)))
    return pts


add(xloft('hull', PAINT_HULL, HULL, N=20, sub=1, sharp=60))
add(rbox('floor', (0.74, 0.30, 0.022), DARK, T(0.07, 0, 0.047), bevel=0.008, segs=1, sharp=50))
add(rbox('sill', (0.30, 0.40, 0.022), BROWN, T(0.0, 0, 0.058), bevel=0.008, segs=1, sharp=50))

# ---------------------------------------------------------- radiator grille ---
GX = 0.4665
ring = sup_ring((GX + 0.004, 0, 0.156), (0, 1, 0), (0, 0, 1), 0.060, 0.064, e=3.0, N=16)
add(make_obj('grille_face', ring, [tuple(range(16))], DARK, sharp=60, recalc=False))
shell = sup_ring((GX + 0.003, 0, 0.156), (0, 1, 0), (0, 0, 1), 0.066, 0.070, e=3.0, N=20)
add(tube('grille_shell', BRASS, shell, 0.0105, N=8, closed=True, up=(1, 0, 0), sharp=70))
for i in range(5):
    add(rbox('grille_bar', (0.007, 0.0075, 0.122), BRASS, T(GX + 0.0075, (i - 2) * 0.0225, 0.156), bevel=0.0, segs=1, sharp=50))
# radiator cap: a gold coin standing on the nose
add(lathe('cap_neck', BRASS, [(0.013, 0.0), (0.013, 0.006), (0.008, 0.010), (0.006, 0.020), (0, 0.020)], segs=10, M4=T(0.440, 0, 0.245), sharp=40))
add(lathe('cap_coin', GOLD, [(0, -0.0045), (0.0215, -0.0045), (0.024, -0.002), (0.024, 0.002), (0.0215, 0.0045), (0.017, 0.0045), (0.016, 0.003), (0, 0.003)],
          segs=14, M4=frame((0.440, 0, 0.287), (1, 0, 0)), sharp=40))
# hood hinge and leather strap
hinge = [(x, 0, hull_at(x)[1] + 0.0005) for x in (0.432, 0.38, 0.33, 0.285, 0.240, 0.214)]
add(tube('hood_hinge', BRASS, hinge, 0.0055, N=6, round_ends=True, sharp=70))
for sx in (0.392, 0.262):
    add(tube('hood_strap', LEATHER, hull_ring(sx, grow=0.0035, a0=0.10, a1=pi - 0.10), 0.0125, N=6, ell=0.28, up=(1, 0, 0), sharp=70))
    hw, top, slope, bot = hull_at(sx)
    for s in (-1, 1):
        add(rbox('strap_buckle', (0.024, 0.016, 0.007), BRASS, T(sx, s * hw * 0.50, top + 0.0015 - 0.008) @ R(s * -0.30, 'X') @ R(math.atan(-slope), 'Y'), bevel=0.003, segs=1, sharp=50))
# louvres on the hood flanks
for s in (-1, 1):
    for i in range(4):
        cx = 0.362 - i * 0.023
        hw, top, slope, bot = hull_at(cx)
        add(rbox('louvre', (0.0095, 0.010, 0.060), DARK, T(cx, s * (hw - 0.0005), 0.176) @ R(-0.22, 'Y'), bevel=0.0, segs=1, sharp=50))

# -------------------------------------------------- front bumper and lamps ---
bump = [(0.452, -0.262, 0.104), (0.476, -0.236, 0.104), (0.487, -0.170, 0.104), (0.489, 0.0, 0.104), (0.487, 0.170, 0.104), (0.476, 0.236, 0.104), (0.452, 0.262, 0.104)]
add(tube('bumper_f', BRASS, bump, 0.0125, N=8, round_ends=True, sharp=70))
for s in (-1, 1):
    add(rbox('bumper_iron', (0.060, 0.014, 0.022), IRON, T(0.458, s * 0.055, 0.100), bevel=0.0, segs=1, sharp=50))
    # bucket headlamp on a stalk
    o = V((0.398, s * 0.156, 0.212)); d = V((1.0, s * 0.10, 0.02)).normalized()
    m4 = frame(o, d)
    add(lathe('lamp_bucket', BRASS, [(0, -0.052), (0.020, -0.047), (0.034, -0.026), (0.040, -0.004), (0.042, 0.004), (0.040, 0.009), (0.035, 0.009)], segs=14, M4=m4, sharp=45))
    add(lathe('lamp_f', LAMP_F, [(0.035, 0.007), (0.026, 0.013), (0.012, 0.016), (0, 0.0165)], segs=14, M4=m4, sharp=60))
    add(tube('lamp_stalk', IRON, [(0.385, s * 0.092, 0.176), (0.384, s * 0.140, 0.176), (0.382, s * 0.156, 0.190)], 0.0075, N=6, sharp=70))

# --------------------------------------------------- front axle and springs ---
yi = FW['y'] - FW['W'] / 2 + 0.014
add(tube('axle_f', IRON, [(FW['x'], -yi, FW['R']), (FW['x'], -0.10, 0.108), (FW['x'], 0.10, 0.108), (FW['x'], yi, FW['R'])], 0.0125, N=8, sharp=70))
add(tube('tie_rod', IRON, [(0.250, -yi, 0.118), (0.250, yi, 0.118)], 0.0055, N=5))
for s in (-1, 1):
    for i, ln in enumerate((0.200, 0.150, 0.100)):
        add(rbox('leaf', (ln, 0.024, 0.0065), IRON, T(FW['x'], s * 0.148, 0.126 + i * 0.0068), bevel=0.0, segs=1, sharp=50))
    add(rbox('leaf_hanger', (0.016, 0.060, 0.016), IRON, T(FW['x'] + 0.095, s * 0.125, 0.128), bevel=0.0, segs=1, sharp=50))
    add(rbox('leaf_hanger', (0.016, 0.060, 0.016), IRON, T(FW['x'] - 0.095, s * 0.130, 0.128), bevel=0.0, segs=1, sharp=50))
    add(tube('stub', BRASS, [(FW['x'], s * (yi - 0.006), FW['R']), (FW['x'], s * (yi + 0.012), FW['R'])], 0.022, N=8, sharp=70))


# ------------------------------------------------ rear fenders and boards ---
def fender(s):
    Rf = RW['R'] + 0.022
    sect = [(-0.100, -0.002), (-0.100, 0.009), (-0.088, 0.014), (0.086, 0.014), (0.102, 0.006), (0.105, -0.018), (0.096, -0.018), (0.093, -0.003), (0.080, 0.001), (-0.088, 0.001)]
    rings = []; bead = []
    A0, A1 = -30, 163
    for k in range(15):
        a = math.radians(A0 + (A1 - A0) * k / 14)
        rd = V((math.cos(a), 0, math.sin(a)))
        c = V((RW['x'], s * RW['y'], RW['R'])) + rd * Rf
        rings.append([c + V((0, s * yo, 0)) + rd * ro for yo, ro in sect])
        bead.append(c + V((0, s * 0.1045, 0)) + rd * -0.017)
    v, f = loft(rings)
    add(tube('fender_bead', BRASS, bead, 0.0058, N=5, round_ends=True, up=(0, 1, 0), sharp=70))
    return make_obj('fender', v, f, PAINT if FENDERS_TAKE_PAINT else CARAMEL, sharp=50)


for s in (-1, 1):
    add(fender(s))
    add(rbox('running_board', (0.300, 0.118, 0.018), BOARD, T(0.004, s * 0.243, 0.066), bevel=0.006, segs=1, sharp=50))
    add(tube('board_trim', BRASS, [(-0.140, s * 0.303, 0.068), (0.140, s * 0.303, 0.068), (0.156, s * 0.290, 0.068)], 0.0065, N=6, round_ends=True, sharp=70))
    for bx in (-0.09, 0.10):
        add(rbox('board_iron', (0.022, 0.090, 0.014), IRON, T(bx, s * 0.215, 0.053), bevel=0.0, segs=1, sharp=50))

# ------------------------------------------------------------------ cockpit ---
path = []
for k in range(26):
    th = 2 * pi * k / 26
    x = -0.048 + 0.222 * sgnpow(math.cos(th), 2 / 4.2)
    y = 0.160 * sgnpow(math.sin(th), 2 / 4.2)
    z = 0.259 + 0.036 * max(0.0, math.cos(th)) ** 2 + 0.028 * max(0.0, -math.cos(th)) ** 2
    path.append((x, y, z))
add(tube('coaming', LEATHER, path, 0.021, N=8, closed=True, up=(0, 0, 1), ell=1.4, sharp=70))
ring = sup_ring((-0.050, 0, 0.2555), (1, 0, 0), (0, 1, 0), 0.214, 0.153, e=4.0, N=24)
add(make_obj('cockpit_floor', ring, [tuple(range(24))], DARK, sharp=60, recalc=False))
add(rbox('seat_base', (0.17, 0.215, 0.032), LEATHER, T(-0.150, 0, 0.259), bevel=0.013, sharp=50))
seat_m = T(-0.262, 0, 0.333) @ R(-0.17, 'Y')
add(rbox('seat_back', (0.052, 0.280, 0.150), LEATHER, seat_m, bevel=0.017, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.88), v.z))))
add(rbox('seat_piping', (0.056, 0.268, 0.0065), CREAM, seat_m @ T(0, 0, 0.050), bevel=0.002, segs=1, sharp=50))
for by in (-0.075, 0.0, 0.075):
    for bz in (-0.022, 0.030):
        p = seat_m @ V((0.027, by, bz)); n = seat_m.to_3x3() @ V((1, 0, 0))
        add(bolt('seat_button', BRASS, p, n, 0.0075))
for s in (-1, 1):
    add(rbox('seat_bolster', (0.10, 0.03, 0.07), LEATHER, T(-0.205, s * 0.120, 0.291) @ R(-0.12, 'Y'), bevel=0.012, sharp=50))

# fold-flat windscreen in a brass frame
wb = [(0.170, -0.128, 0.300), (0.170, 0.128, 0.300), (0.146, 0.118, 0.372), (0.146, -0.118, 0.372)]
frame_path = []
for a, b in zip(wb, wb[1:] + wb[:1]):
    a = V(a); b = V(b)
    frame_path += [a + (b - a) * 0.06, a + (b - a) * 0.94]
add(tube('screen_frame', BRASS, frame_path, 0.0075, N=6, closed=True, up=(1, 0, 0.3), sharp=70))
add(make_obj('screen_glass', [V(p) for p in wb] + [V(p) + V((-0.003, 0, -0.001)) for p in wb],
             [(0, 1, 2, 3), (7, 6, 5, 4)], GLASS, sharp=60, recalc=False))
for s in (-1, 1):
    add(lathe('screen_foot', BRASS, [(0.013, 0.0), (0.013, 0.008), (0.007, 0.014), (0, 0.014)], segs=8, M4=T(0.170, s * 0.128, 0.290), sharp=40))
# steering wheel: wooden rim, brass spokes
sw = T(0.112, 0, 0.330) @ R(-1.08, 'Y')
add(torus('steer_ring', WOOD_D, 0.050, 0.0095, M4=sw, segs=18, rsegs=6))
for k in range(3):
    add(rbox('steer_spoke', (0.050, 0.0105, 0.005), BRASS, sw @ R(2 * pi * k / 3 + pi, 'Z') @ T(0.026, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', BRASS, [(0, 0.009), (0.011, 0.008), (0.015, 0.003), (0.015, -0.004)], segs=10, M4=sw, sharp=40))
add(tube('steer_column', IRON, [(0.115, 0, 0.327), (0.185, 0, 0.292)], 0.008, N=6))
# bulb horn on the cowl
hd = V((1.0, 0.0, 0.10)).normalized()
add(lathe('horn', BRASS, [(0.0065, -0.050), (0.0075, -0.012), (0.012, 0.004), (0.021, 0.016), (0.026, 0.019), (0.0235, 0.0165), (0.012, 0.008), (0, 0.004)], segs=10,
          M4=frame((0.205, 0.205, 0.318), hd), sharp=45, recalc=True))
add(lathe('horn_bulb', DARK, [(0, -0.030), (0.014, -0.024), (0.019, -0.010), (0.015, 0.004), (0.007, 0.010)], segs=8, M4=frame((0.150, 0.205, 0.3125), hd), sharp=60))
add(rbox('horn_clip', (0.014, 0.030, 0.012), IRON, T(0.176, 0.190, 0.305), bevel=0.0, segs=1, sharp=50))

# --------------------------------------------------------------------- bed ---
BX0, BX1, BHW = -0.480, -0.272, 0.176
bxc = (BX0 + BX1) / 2; blen = BX1 - BX0
add(rbox('bed_frame', (blen, BHW * 2, 0.052), CARAMEL, T(bxc, 0, DECK_Z - 0.028), bevel=0.008, segs=1, sharp=50))
add(rbox('deck', (blen - 0.022, BHW * 2 - 0.022, 0.008), DECK, T(bxc, 0, DECK_Z - 0.002), bevel=0.0, sharp=50))
add(rbox('chassis_r', (0.170, 0.230, 0.074), DARK, T(-0.380, 0, 0.134), bevel=0.012, segs=1, sharp=50))
add(tube('bumper_r', BRASS, [(BX0 - 0.004, -0.150, 0.118), (BX0 - 0.011, -0.110, 0.118), (BX0 - 0.011, 0.110, 0.118), (BX0 - 0.004, 0.150, 0.118)], 0.0105, N=6, round_ends=True, sharp=70))
for s in (-1, 1):
    add(rbox('bumper_r_iron', (0.030, 0.012, 0.050), IRON, T(BX0 - 0.002, s * 0.085, 0.142), bevel=0.0, segs=1, sharp=50))
yr = RW['y'] - RW['W'] / 2 + 0.014
add(tube('axle_r', IRON, [(RW['x'], -yr, RW['R']), (RW['x'], yr, RW['R'])], 0.017, N=8, sharp=70))
add(lathe('diff', IRON, [(0, -0.040), (0.030, -0.034), (0.042, -0.012), (0.042, 0.012), (0.030, 0.034), (0, 0.040)], segs=10, M4=frame((RW['x'] - 0.012, 0, RW['R'] - 0.01), (1, 0, 0)), sharp=50))
# headboard between the cab and the load
add(rbox('headboard', (0.016, BHW * 2 - 0.070, 0.090), BROWN, T(BX1 - 0.006, 0, DECK_Z + 0.050), bevel=0.005, segs=1, sharp=50))
# tailgate, lamps and plate
add(rbox('tailgate', (0.016, BHW * 2 + 0.004, 0.084), CARAMEL, T(BX0 + 0.000, 0, DECK_Z - 0.012), bevel=0.006, segs=1, sharp=50))
add(tube('gate_rail', BRASS, [(BX0 + 0.001, -BHW + 0.012, DECK_Z + 0.032), (BX0 + 0.001, BHW - 0.012, DECK_Z + 0.032)], 0.0085, N=6, round_ends=True, sharp=70))
for s in (-1, 1):
    m4 = frame((BX0 - 0.0075, s * 0.128, DECK_Z - 0.018), (-1, 0, 0))
    add(lathe('lamp_r_bezel', BRASS, [(0.0285, -0.004), (0.0285, 0.004), (0.024, 0.007), (0.021, 0.007)], segs=12, M4=m4, sharp=45))
    add(lathe('lamp_r', LAMP_R, [(0.021, 0.005), (0.014, 0.010), (0, 0.0115)], segs=12, M4=m4, sharp=60))
    add(rbox('gate_hinge', (0.008, 0.012, 0.070), IRON, T(BX0 - 0.007, s * 0.066, DECK_Z - 0.014), bevel=0.0, segs=1, sharp=50))
add(rbox('plate', (0.006, 0.096, 0.040), CREAM, T(BX0 - 0.0085, 0, DECK_Z - 0.016), bevel=0.002, segs=1, sharp=50))
add(rbox('plate_bar', (0.004, 0.060, 0.007), BROWN, T(BX0 - 0.0105, 0, DECK_Z - 0.016), bevel=0.0, sharp=50))
for dz in (-0.0105, 0.0105):
    add(rbox('plate_bar', (0.004, 0.060, 0.007), BROWN, T(BX0 - 0.0105, 0, DECK_Z - 0.016 + dz), bevel=0.0, sharp=50))

# brass exhaust stacks behind the cab
for s in (-1, 1):
    sx, sy = -0.297, s * 0.150
    add(tube('stack', BRASS, [(sx, sy, DECK_Z - 0.01), (sx, sy, 0.405), (sx - 0.010, sy, 0.438), (sx - 0.030, sy, 0.458)], [0.0185, 0.0185, 0.0195, 0.0215], N=10, sharp=70))
    a, b = V((sx - 0.010, sy, 0.438)), V((sx - 0.030, sy, 0.458)); d = (b - a).normalized()
    add(lathe('stack_bore', DARK, [(0, 0.0), (0.0165, 0.0)], segs=10, M4=frame(b + d * 0.0006, d), sharp=60, recalc=False))
    add(tube('stack_shield', IRON, [(sx, sy, 0.262), (sx, sy, 0.372)], 0.0245, N=10, sharp=70))
    for z in (0.2565, 0.3775):
        add(torus('stack_band', BRASS, 0.0245, 0.0052, M4=T(sx, sy, z), segs=12, rsegs=5))
    add(lathe('stack_foot', BRASS, [(0.031, 0.0), (0.031, 0.007), (0.023, 0.012), (0.019, 0.012)], segs=10, M4=T(sx, sy, DECK_Z + 0.001), sharp=40))


# ------------------------------------------------------------------- cargo ---
def crate(c, size, yaw=0.0, strap=True):
    """wooden crate: dark panel box framed with boards, a brace on each side"""
    sx, sy, sz = size
    M = T(c[0], c[1], c[2] + sz / 2) @ R(yaw, 'Z')
    b, w = 0.009, 0.019
    add(rbox('crate_panel', (sx - b, sy - b, sz - b * 0.6), WOOD_D, M, bevel=0.0, sharp=40))
    for sg in (-1, 1):
        # faces across X
        fx = sg * (sx / 2 - b / 2)
        for sz_ in (-1, 1):
            add(rbox('crate_rail', (b, sy, w), WOOD, M @ T(fx, 0, sz_ * (sz / 2 - w / 2)), bevel=0.0, sharp=40))
            add(rbox('crate_post', (b, w, sz - 2 * w), WOOD, M @ T(fx, sz_ * (sy / 2 - w / 2), 0), bevel=0.0, sharp=40))
        ang = math.atan2(sz - 2 * w, sy - 2 * w)
        add(rbox('crate_brace', (b * 0.7, math.hypot(sz - 2 * w, sy - 2 * w) - 0.006, w * 0.8), WOOD, M @ T(fx - sg * 0.001, 0, 0) @ R(sg * ang, 'X'), bevel=0.0, sharp=40))
        # faces across Y
        fy = sg * (sy / 2 - b / 2)
        for sz_ in (-1, 1):
            add(rbox('crate_rail', (sx - 2 * b, b, w), WOOD, M @ T(0, fy, sz_ * (sz / 2 - w / 2)), bevel=0.0, sharp=40))
            add(rbox('crate_post', (w - b, b, sz - 2 * w), WOOD, M @ T(sz_ * (sx / 2 - b - (w - b) / 2), fy, 0), bevel=0.0, sharp=40))
        ang = math.atan2(sz - 2 * w, sx - 2 * w)
        add(rbox('crate_brace', (math.hypot(sz - 2 * w, sx - 2 * w) - 0.006, b * 0.7, w * 0.8), WOOD, M @ T(0, fy - sg * 0.001, 0) @ R(-sg * ang, 'Y'), bevel=0.0, sharp=40))
        # lid boards
        add(rbox('crate_lid', (sx, w, b), WOOD, M @ T(0, sg * (sy / 2 - w / 2), sz / 2 - b / 2 + 0.001), bevel=0.0, sharp=40))
        add(rbox('crate_lid', (w, sy - 2 * w, b), WOOD, M @ T(sg * (sx / 2 - w / 2), 0, sz / 2 - b / 2 + 0.001), bevel=0.0, sharp=40))
    if strap:
        t = 0.0045; sw_ = 0.021
        add(rbox('strap', (sw_, sy + 2 * t, t), LEATHER, M @ T(0, 0, sz / 2 + t / 2 + 0.001), bevel=0.0015, segs=1, sharp=50))
        for sg in (-1, 1):
            add(rbox('strap', (sw_, t, sz + 0.002), LEATHER, M @ T(0, sg * (sy / 2 + t / 2), 0), bevel=0.0015, segs=1, sharp=50))
        add(rbox('buckle', (sw_ + 0.010, 0.022, 0.006), BRASS, M @ T(0, sy * 0.22, sz / 2 + t + 0.003), bevel=0.002, segs=1, sharp=50))
    return M


CR, CT = 0.0345, 0.0116   # coin radius and thickness


def coin(M, top=False):
    c = 0.0026
    if top:
        prof = [(CR - c, 0.0004), (CR, c), (CR, CT - c), (CR - c, CT), (CR * 0.80, CT), (CR * 0.75, CT - 0.0022), (CR * 0.36, CT - 0.0022), (CR * 0.30, CT), (0, CT)]
    else:
        prof = [(CR, 0.0006), (CR, CT - c), (CR - c, CT), (0, CT)]
    add(lathe('coin', GOLD, prof, segs=12 if top else 10, M4=M, sharp=35))


def stack(x, y, z0, n, jitter=0.0034):
    for i in range(n):
        jx = random.uniform(-jitter, jitter); jy = random.uniform(-jitter, jitter)
        coin(T(x + jx, y + jy, z0 + i * CT) @ R(random.uniform(0, 0.5), 'Z'), top=(i == n - 1))
    return z0 + n * CT


CA = (-0.338, 0.0, DECK_Z); CA_SIZE = (0.104, 0.150, 0.092)
crate(CA, CA_SIZE)
crate((-0.427, 0.098, DECK_Z), (0.076, 0.086, 0.070), yaw=0.12)
# coin stacks: tallest at the outer corners, low in the middle
stack(-0.350, 0.128, DECK_Z, 11)
stack(-0.350, -0.128, DECK_Z, 13)
stack(-0.432, -0.130, DECK_Z, 14)
stack(-0.434, -0.058, DECK_Z, 9)
stack(-0.432, 0.014, DECK_Z, 6)
stack(-0.362, -0.034, DECK_Z + CA_SIZE[2] + 0.001, 4)
stack(-0.427, 0.098, DECK_Z + 0.071, 3)
# one coin leaning on the crate, one flat on the deck
coin(T(-0.3885, 0.036, DECK_Z + 0.0015) @ R(-1.22, 'Y') @ T(0, 0, -CT / 2) @ T(-CR, 0, 0), top=True)

# side load on the running boards: a strapped strongbox on the left, coins on the right
BOARD_Z = 0.0755
crate((-0.088, 0.247, BOARD_Z), (0.092, 0.090, 0.062), yaw=0.0)
stack(-0.100, -0.247, BOARD_Z, 7)
stack(-0.026, -0.249, BOARD_Z, 4)

body = join(P, 'satstacker_body')


# ------------------------------------------------------------------- wheels ---
def build_wheel(name, spec):
    """right-hand wheel: axle on local X, outer face on +X. Artillery wheel:
    fat tyre, cream band, brass rim, six sand spokes, brass hub dome."""
    Rr, W = spec['R'], spec['W']; hw = W / 2
    A = frame((0, 0, 0), (1, 0, 0), (0, 1, 0))
    parts = []
    prof = []

    def PT(r, a):
        prof.append((r * Rr, a * hw))
    PT(0.62, -0.80); PT(0.74, -0.98); PT(0.90, -0.96); PT(0.972, -0.83); PT(1.0, -0.64)
    for g in (-0.27, 0.27):
        PT(1.0, g - 0.085); PT(0.955, g - 0.05); PT(0.955, g + 0.05); PT(1.0, g + 0.085)
    PT(1.0, 0.64); PT(0.972, 0.83); PT(0.90, 0.96); PT(0.80, 1.0); PT(0.70, 0.975); PT(0.625, 0.86); PT(0.60, 0.74)
    shoulder = {3, len(prof) - 6}
    segs = 24

    def rmod(pi_, k):
        return -0.045 * Rr if (pi_ in shoulder and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    parts.append(lathe('band', W_CREAM, [(0.775 * Rr, hw * 0.994), (0.785 * Rr, hw * 1.014), (0.828 * Rr, hw * 1.008), (0.838 * Rr, hw * 0.984)], segs=segs, M4=A, sharp=60))
    parts.append(lathe('rim', W_BRASS, [(0.615 * Rr, hw * 0.70), (0.635 * Rr, hw * 0.80), (0.665 * Rr, hw * 0.90), (0.648 * Rr, hw * 0.970),
                                        (0.596 * Rr, hw * 0.93), (0.566 * Rr, hw * 0.80), (0.550 * Rr, hw * 0.40)], segs=24, M4=A, sharp=45))
    parts.append(lathe('dish', W_BROWN, [(0.552 * Rr, hw * 0.42), (0.50 * Rr, hw * 0.36), (0.0, hw * 0.36)], segs=24, M4=A, sharp=45))
    parts.append(lathe('back', W_BROWN, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.62 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
    zf = hw * 0.66
    for k in range(6):
        Rs = A @ R(2 * pi * k / 6 + 0.2, 'Z')
        parts.append(rbox('spoke', (0.36 * Rr, 0.135 * Rr, 0.12 * Rr), W_SAND, Rs @ T(0.385 * Rr, 0, zf - 0.01 * Rr), bevel=0.006, segs=1, sharp=50,
                          taper=lambda v: V((v.x, v.y * (1.25 if v.x < 0 else 0.80), v.z))))
        a = 2 * pi * (k + 0.5) / 6 + 0.2
        p = A @ V((0.185 * Rr * math.cos(a), 0.185 * Rr * math.sin(a), zf + 0.066 * Rr))
        parts.append(bolt('lug', W_IRON, p, (1, 0, 0), 0.028 * Rr))
    parts.append(lathe('hub', W_BRASS, [(0, zf + 0.070 * Rr), (0.23 * Rr, zf + 0.066 * Rr), (0.275 * Rr, zf + 0.035 * Rr), (0.28 * Rr, hw * 0.40)], segs=14, M4=A, sharp=40))
    parts.append(lathe('cap', W_BRASS, [(0, zf + 0.165 * Rr), (0.055 * Rr, zf + 0.155 * Rr), (0.095 * Rr, zf + 0.125 * Rr), (0.115 * Rr, zf + 0.085 * Rr), (0.115 * Rr, zf + 0.06 * Rr)], segs=12, M4=A, sharp=40))
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
    images = bake_atlas([[body], [wf], [wr]], dict(color=1024, orm=256, emit=256), samples=24)
    final = final_material('satstacker_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)


for c in stand_ins:
    bpy.data.objects.remove(c)


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward); left wheels are
    mirrored meshes that share the right wheels' texture space."""
    root = empty('sat_stacker_v2')
    body.parent = root
    out = [root, body]
    for src, spec, tag in ((wf, FW, 'front'), (wr, RW, 'rear')):
        src.location = (0, 0, 0); src.rotation_euler = (0, 0, 0)
        left = mirrored_copy(src, f'wheel_{tag}_l')
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
