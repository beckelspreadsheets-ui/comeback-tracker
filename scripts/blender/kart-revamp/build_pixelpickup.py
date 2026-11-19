# Pixel Pickup v2: stubby teal and cream toy pickup truck with an open seat,
# a cream roll bar and a short cargo bed carrying a few pixel-art cubes.
# Built from nothing by script (no imported meshes, no external images).
#
#   blender -b -P build_pixelpickup.py -- out/pixel-pickup-v2.glb [--preview renders/pixelpickup/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0. The file is
# flipped at the end so the nose is on -X, the facing the game already has on
# record for the Pixel Pickup (KART_NOSE_YAW.pixelpickup), which makes it a
# drop-in for pixel-pickup.glb.
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kart_lib import *
import kart_lib as L
import studio

argv = sys.argv[sys.argv.index('--') + 1:]
out_glb = os.path.abspath(argv[0])
preview = os.path.abspath(argv[argv.index('--preview') + 1]) if '--preview' in argv else None
NOBAKE = '--nobake' in argv

reset_scene()

# ---------------------------------------------------------------- colours ---
# Teal is saturated on purpose (the game's paint recolours it); cream, greys
# and rubber stay under the paint mask's chroma window so they keep their bake.
C_TEAL = (0.012, 0.43, 0.40)
C_CREAM = (0.84, 0.795, 0.72)
C_INK = (0.006, 0.03, 0.035)


def normal_axis(t, i):
    g = nd(t, 'ShaderNodeNewGeometry')
    sep = nd(t, 'ShaderNodeSeparateXYZ')
    t.links.new(g.outputs['Normal'], sep.inputs[0])
    return sep.outputs[i]


def lines_x(t, x, xs, w=0.0022):
    out = None
    for gx in xs:
        g = band(t, x, gx - w, gx + w, soft=0.001)
        out = g if out is None else mth(t, 'MAXIMUM', out, g)
    return out


def side_pattern(t, c):
    # cream spear along the flank, door shut lines
    x, y, z = objcoord(t)
    side = smooth(t, mth(t, 'ABSOLUTE', normal_axis(t, 1)), 0.6, 0.8)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, z, SPEAR[0], SPEAR[1], soft=0.001), side), c, C_CREAM)
    door = mth(t, 'MULTIPLY', lines_x(t, x, (0.130, -0.165)), side)
    return mixc(t, mth(t, 'MULTIPLY', door, 0.85), c, C_INK)


def hood_pattern(t, c):
    # two cream stripes over the hood top, shut line round the hood
    x, y, z = objcoord(t)
    ay = mth(t, 'ABSOLUTE', y)
    top = smooth(t, normal_axis(t, 2), 0.55, 0.75)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, ay, 0.070, 0.092), top), c, C_CREAM)
    seam = mth(t, 'MULTIPLY', lines_x(t, x, (0.214,)), top)
    return mixc(t, mth(t, 'MULTIPLY', seam, 0.85), c, C_INK)


def glass_pattern(t, c):
    x, y, z = objcoord(t)
    v = mth(t, 'ADD', y, mth(t, 'MULTIPLY', z, 0.9))
    g = mth(t, 'MAXIMUM', band(t, v, 0.395, 0.425, soft=0.002), band(t, v, 0.440, 0.450, soft=0.002))
    return mixc(t, mth(t, 'MULTIPLY', g, 0.55), c, (0.55, 0.75, 0.78))


def plank_pattern(t, c):
    x, y, z = objcoord(t)
    v = mth(t, 'FRACT', mth(t, 'MULTIPLY', mth(t, 'ADD', y, 0.5), 1 / 0.056))
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'LESS_THAN', v, 0.09), 0.8), c, (0.01, 0.01, 0.012))


def tread_pattern(t, c):
    # rubber ribs across the running boards
    x, y, z = objcoord(t)
    v = mth(t, 'FRACT', mth(t, 'MULTIPLY', mth(t, 'ADD', x, 0.5), 1 / 0.022))
    top = smooth(t, normal_axis(t, 2), 0.6, 0.8)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'LESS_THAN', v, 0.45), top), c, (0.02, 0.02, 0.024))


def tyre_pattern(t, c):
    # chunky tread blocks round the tread and shoulders (wheel axle = local X)
    x, y, z = objcoord(t)
    g = nd(t, 'ShaderNodeNewGeometry')
    tc = nd(t, 'ShaderNodeVectorTransform', vector_type='NORMAL', convert_from='WORLD', convert_to='OBJECT')
    t.links.new(g.outputs['Normal'], tc.inputs[0])
    sep = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs[0], sep.inputs[0])
    tread = mth(t, 'SUBTRACT', 1.0, smooth(t, mth(t, 'ABSOLUTE', sep.outputs[0]), 0.55, 0.8))
    ang = mth(t, 'ARCTAN2', z, y)
    v = mth(t, 'ADD', mth(t, 'MULTIPLY', ang, 14 / (2 * pi)), mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', x), 5.0))
    bar = mth(t, 'LESS_THAN', mth(t, 'FRACT', v), 0.30)
    edge = smooth(t, mth(t, 'ABSOLUTE', x), 0.010, 0.018)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', bar, tread), mth(t, 'MULTIPLY', edge, 0.75)), c, (0.006, 0.006, 0.008))


def pixel_pattern(origin, cell, tones, n=4):
    """n x n x n grid of flat-colour pixels over a cube whose low corner is origin"""
    def pat(t, c):
        idx = []
        for co, o in zip(objcoord(t), origin):
            u = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', co, o), 1.0 / cell)
            u = mth(t, 'MINIMUM', mth(t, 'MAXIMUM', u, 0.02), n - 0.02)
            idx.append(mth(t, 'FLOOR', u))
        h = mth(t, 'ADD', mth(t, 'ADD', mth(t, 'MULTIPLY', idx[0], 12.9898), mth(t, 'MULTIPLY', idx[1], 78.233)), mth(t, 'MULTIPLY', idx[2], 37.719))
        h = mth(t, 'FRACT', mth(t, 'MULTIPLY', mth(t, 'SINE', h), 43758.5453))
        # a cell on two or more outside layers is on the rim of a face: a dark
        # frame round each face, the way a pixel-art crate is drawn
        rim = None
        for i in idx:
            e = mth(t, 'MAXIMUM', mth(t, 'LESS_THAN', i, 0.5), mth(t, 'GREATER_THAN', i, n - 1.5))
            rim = e if rim is None else mth(t, 'ADD', rim, e)
        out = mixc(t, mth(t, 'GREATER_THAN', h, 0.55), tones[0], tones[1])
        return mixc(t, mth(t, 'GREATER_THAN', rim, 1.5), out, tones[2])
    return pat


SPEAR = (0.176, 0.204)
PAINT = mat('paint', C_TEAL, rough=0.32, edge=0.45)
PAINT_SIDE = mat('paint_side', C_TEAL, rough=0.32, pattern=side_pattern, edge=0.45)
PAINT_HOOD = mat('paint_hood', C_TEAL, rough=0.32, pattern=hood_pattern, edge=0.45)
CREAM = mat('cream', C_CREAM, rough=0.4, edge=0.3)
DARK = mat('dark', (0.024, 0.026, 0.032), rough=0.5)
FLOOR = mat('floor', (0.05, 0.05, 0.056), rough=0.7, pattern=plank_pattern, edge=0.3)
TREAD = mat('tread', (0.09, 0.09, 0.10), rough=0.7, pattern=tread_pattern, edge=0.3)
SEAT = mat('seat', (0.05, 0.045, 0.05), rough=0.75, edge=0.35)
ENGINE = mat('engine', (0.10, 0.105, 0.12), rough=0.42, metal=0.5)
CHROME = mat('chrome', (0.58, 0.60, 0.64), rough=0.2, metal=0.8, edge=0.8)
GLASS = mat('glass', (0.05, 0.11, 0.13), rough=0.08, pattern=glass_pattern)
LAMP_F = mat('lamp_front', (1.0, 0.93, 0.72), rough=0.2, emit=(1.0, 0.86, 0.55), emit_strength=1.0)
LAMP_R = mat('lamp_rear', (1.0, 0.1, 0.12), rough=0.2, emit=(1.0, 0.04, 0.06), emit_strength=1.0)
LAMP_A = mat('lamp_amber', (1.0, 0.5, 0.05), rough=0.2, emit=(1.0, 0.42, 0.02), emit_strength=1.0)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.045, 0.045, 0.05), rough=0.9, toplight=False, ao_floor=0.45, edge=0.45, pattern=tyre_pattern)
W_CREAM = mat('wheel_cream', C_CREAM, rough=0.4, toplight=False, edge=0.3)
W_CHROME = mat('wheel_chrome', (0.56, 0.58, 0.62), rough=0.25, metal=0.7, toplight=False, edge=0.7)
W_DARK = mat('wheel_dark', (0.02, 0.02, 0.026), rough=0.5, toplight=False)

P = []


def add(o):
    P.append(o); return o


FW = dict(R=0.134, W=0.156, x=0.305, y=0.305)
RW = dict(R=0.140, W=0.176, x=-0.305, y=0.308)
Z_FLOOR = 0.225      # cockpit floor
Z_BELT = 0.322       # door tops
Z_RAIL = 0.372       # bed rail
Z_BED = 0.300        # bed floor
X_BULK = -0.300      # bulkhead between seat and bed
X_COWL = 0.160       # front of the cab
X_TAIL = -0.492
Y_SIDE = 0.190       # centre of the side panels (outer face 0.208)

# -------------------------------------------------------------------- body ---
# chassis and the tub under the floor
add(rbox('rail', (0.90, 0.26, 0.05), DARK, T(0.0, 0, 0.095), bevel=0.010, segs=1, sharp=50))
add(xloft('tub', PAINT, [(0.170, 0.196, Z_FLOOR + 0.004, 0.100, 6.0), (-0.150, 0.198, Z_FLOOR + 0.004, 0.100, 6.0),
                         (-0.460, 0.198, Z_BED, 0.104, 6.0), (-0.496, 0.192, Z_BED, 0.112, 5.0)], N=16, sub=1, sharp=60))

# hood: boxy with a crowned top, flat grille face, widening into the cowl
HOOD = [  # x, half width, top, bottom, exponent
    (0.4690, 0.150, 0.272, 0.126, 5.0),
    (0.4660, 0.166, 0.290, 0.114, 5.4),
    (0.4560, 0.174, 0.302, 0.108, 5.8),
    (0.4200, 0.176, 0.310, 0.106, 6.0),
    (0.3000, 0.178, 0.320, 0.106, 6.0),
    (0.2350, 0.181, 0.327, 0.106, 6.0),
    (0.2030, 0.196, 0.338, 0.106, 6.0),
    (0.1780, 0.206, 0.344, 0.106, 6.0),
    (0.1580, 0.207, 0.342, 0.106, 6.0),
]


def hood_at(x):
    for a, b in zip(HOOD, HOOD[1:]):
        if b[0] <= x <= a[0]:
            f = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[2] - a[2]) / (b[0] - a[0])
    return 0.17, 0.3, 0.0


add(xloft('hood', PAINT_HOOD, HOOD, N=20, sub=1, sharp=60))
# power bulge between the stripes, vents beside it
add(xloft('bulge', PAINT, [(0.432, 0.030, 0.314, 0.290, 3.0), (0.415, 0.046, 0.325, 0.290, 3.2), (0.300, 0.050, 0.336, 0.300, 3.4),
                           (0.240, 0.050, 0.342, 0.305, 3.4), (0.224, 0.040, 0.338, 0.306, 3.0)], N=12, sub=1, sharp=60))
for s in (-1, 1):
    for i in range(3):
        cx = 0.345 - i * 0.030
        hw, zt, slope = hood_at(cx)
        add(rbox('hood_vent', (0.015, 0.050, 0.008), DARK, T(cx, s * 0.132, zt - 0.0075) @ R(s * -0.16, 'X') @ R(math.atan(-slope), 'Y'), bevel=0.002, segs=1, sharp=50))

for s in (-1, 1):
    hw, zt, slope = hood_at(0.250)
    add(rbox('hood_latch', (0.030, 0.010, 0.014), CHROME, T(0.250, s * (hw + 0.001), zt - 0.050), bevel=0.003, segs=1, sharp=50))
# grille and round headlamps on the face
XF = 0.469
add(rbox('grille_frame', (0.014, 0.170, 0.112), CHROME, T(XF, 0, 0.204), bevel=0.006, sharp=50))
add(rbox('grille', (0.012, 0.150, 0.092), DARK, T(XF + 0.003, 0, 0.204), bevel=0.003, segs=1, sharp=50))
for i in range(5):
    add(rbox('grille_bar', (0.010, 0.146, 0.008), CHROME, T(XF + 0.006, 0, 0.170 + i * 0.017), bevel=0.002, segs=1, sharp=50))
add(rbox('grille_badge', (0.008, 0.030, 0.030), CREAM, T(XF + 0.010, 0, 0.204) @ R(pi / 4, 'X'), bevel=0.003, segs=1, sharp=50))
for s in (-1, 1):
    m4 = frame((XF - 0.004, s * 0.126, 0.218), (1, 0, 0), (0, 1, 0))
    add(lathe('lamp_bezel', CREAM, [(0.030, 0.006), (0.040, 0.012), (0.046, 0.006), (0.046, -0.010)], segs=16, M4=m4, sharp=40))
    add(lathe('lamp_f', LAMP_F, [(0, 0.017), (0.016, 0.015), (0.027, 0.010), (0.032, 0.004)], segs=16, M4=m4, sharp=60))
    add(rbox('indicator', (0.010, 0.036, 0.016), LAMP_A, T(XF - 0.001, s * 0.126, 0.156), bevel=0.004, segs=1, sharp=50))

# front bumper with over-riders, skid plate and tow hooks
add(rbox('bumper_f', (0.042, 0.560, 0.050), CREAM, T(0.486, 0, 0.112), bevel=0.014, segs=3, sharp=50,
         taper=lambda v: V((v.x - 0.022 * (abs(v.y) / 0.28) ** 2, v.y, v.z))))
for s in (-1, 1):
    add(rbox('overrider', (0.030, 0.030, 0.076), CREAM, T(0.494, s * 0.085, 0.120), bevel=0.009, sharp=50))
    add(rbox('bumper_bracket', (0.050, 0.020, 0.024), DARK, T(0.455, s * 0.085, 0.108), bevel=0.003, segs=1, sharp=50))
    add(bolt('bolt', CHROME, (0.5065, s * 0.225, 0.112), (1, 0, 0), 0.006))
add(rbox('skid', (0.110, 0.230, 0.012), ENGINE, T(0.440, 0, 0.082) @ R(-0.42, 'Y'), bevel=0.004, segs=1, sharp=50))
for sy in (-0.07, 0.0, 0.07):
    add(rbox('skid_slot', (0.050, 0.020, 0.006), DARK, T(0.447, sy, 0.0805) @ R(-0.42, 'Y'), bevel=0.002, segs=1, sharp=50))


# fender flares: a rounded strip swept over each wheel
def fender(name, material, spec, y0, y1, a0, a1, th=0.020, gap=0.009, n=11, e=4.0):
    rc = spec['R'] + gap + th / 2
    rings = []
    for k in range(n):
        f = k / (n - 1)
        a = math.radians(a0 + (a1 - a0) * f)
        u = V((math.cos(a), 0, math.sin(a)))
        end = 1.0 - 0.45 * (abs(2 * f - 1) ** 6)       # the ends thin out
        c = V((spec['x'], (y0 + y1) / 2, spec['R'])) + u * rc
        rings.append(sup_ring(c, u, V((0, 1, 0)), th / 2 * end, (y1 - y0) / 2, e=e, N=12))
    v, f_ = loft(rings)
    return make_obj(name, v, f_, material, sub=1, sharp=60)


for s in (-1, 1):
    ys = sorted((s * 0.168, s * 0.392))
    add(fender('fender_f', PAINT, FW, ys[0], ys[1], 30, 165))
    ys = sorted((s * 0.200, s * 0.400))
    add(fender('fender_r', PAINT, RW, ys[0], ys[1], 14, 165))
    # mud flaps hang off the back of each flare
    for spec, tag in ((FW, 'f'), (RW, 'r')):
        rc = spec['R'] + 0.009 + 0.010
        a = math.radians(165)
        fx = spec['x'] + rc * math.cos(a) - 0.004
        ztop = spec['R'] + rc * math.sin(a) + 0.006
        zb = 0.064
        wy = spec['W'] * 0.80
        add(rbox('mudflap', (0.011, wy, ztop - zb), DARK, T(fx, s * spec['y'], (ztop + zb) / 2), bevel=0.004, segs=1, sharp=50))
        # pixel chevron on the flap
        for px, pz in ((0, 0), (-1, 1), (1, 1)):
            add(rbox('flap_pixel', (0.004, 0.018, 0.018), CREAM, T(fx - 0.006, s * spec['y'] + px * 0.018, 0.098 + 0.018 - pz * 0.018), bevel=0.0, sharp=50))
    # running board between the flares
    add(rbox('step', (0.262, 0.112, 0.024), CREAM, T(0.004, s * 0.262, 0.110), bevel=0.008, sharp=50))
    add(rbox('step_tread', (0.226, 0.078, 0.008), TREAD, T(0.004, s * 0.268, 0.1235), bevel=0.002, segs=1, sharp=50))
    for bx in (-0.075, 0.085):
        add(rbox('step_bracket', (0.022, 0.050, 0.020), DARK, T(bx, s * 0.215, 0.096), bevel=0.003, segs=1, sharp=50))

# cab sides and bed walls
for s in (-1, 1):
    # cut-down door: the top dips between the cowl and the seat
    def door(v, s=s):
        dip = 0.020 * max(0.0, 1.0 - ((v.x + 0.02) / 0.19) ** 2) if v.z > 0 else 0.0
        return V((v.x, v.y, v.z - dip))
    zc = (0.104 + Z_BELT) / 2
    cab = rbox('cab_side', (X_COWL - X_BULK, 0.036, Z_BELT - 0.104), PAINT_SIDE, T((X_COWL + X_BULK) / 2, s * Y_SIDE, zc), bevel=0.011, sharp=50)
    add(cab)
    add(rbox('bed_side', (X_BULK - X_TAIL + 0.012, 0.038, Z_RAIL - 0.104), PAINT_SIDE, T((X_BULK + X_TAIL - 0.012) / 2, s * Y_SIDE, (0.104 + Z_RAIL) / 2), bevel=0.011, sharp=50))
    add(rbox('bed_cap', (X_BULK - X_TAIL + 0.020, 0.050, 0.014), CREAM, T((X_BULK + X_TAIL - 0.012) / 2, s * Y_SIDE, Z_RAIL + 0.004), bevel=0.005, sharp=50))
    for bx in (-0.335, -0.400, -0.465):
        add(rbox('stake', (0.020, 0.008, 0.030), CREAM, T(bx, s * 0.2095, Z_RAIL - 0.022), bevel=0.003, segs=1, sharp=50))
    for hz in (0.150, 0.290):
        add(rbox('hinge', (0.022, 0.008, 0.014), CHROME, T(0.140, s * 0.210, hz), bevel=0.003, segs=1, sharp=50))
    add(rbox('door_handle', (0.034, 0.008, 0.010), CHROME, T(-0.118, s * 0.210, 0.268), bevel=0.003, segs=1, sharp=50))
    # padded door top
    add(tube('door_pad', SEAT, [(0.135, s * Y_SIDE, Z_BELT + 0.002), (-0.160, s * Y_SIDE, Z_BELT + 0.002)], 0.013, N=8, round_ends=True, ell=0.7, up=(0, 1, 0), sharp=70))
    # tail lamps in the bed posts, stacked pixels
    for i, mt in enumerate((LAMP_R, LAMP_R, LAMP_A)):
        add(rbox('lamp_r', (0.010, 0.026, 0.026), mt, T(X_TAIL - 0.014, s * Y_SIDE, Z_RAIL - 0.040 - i * 0.031), bevel=0.003, segs=1, sharp=50))
    add(rbox('lamp_r_bezel', (0.010, 0.034, 0.100), DARK, T(X_TAIL - 0.0105, s * Y_SIDE, Z_RAIL - 0.071), bevel=0.003, segs=1, sharp=50))
    # mirror on a stalk
    add(tube('mirror_stalk', DARK, [(0.154, s * 0.200, 0.318), (0.164, s * 0.246, 0.348)], 0.006, N=5))
    add(rbox('mirror', (0.024, 0.056, 0.040), CREAM, T(0.166, s * 0.262, 0.356) @ R(s * 0.16, 'Z'), bevel=0.009, sharp=50))
    add(rbox('mirror_glass', (0.003, 0.042, 0.027), CHROME, T(0.1535, s * 0.2645, 0.356) @ R(s * 0.16, 'Z'), bevel=0.0, sharp=50))
add(lathe('fuel_cap', CHROME, [(0, 0.008), (0.013, 0.007), (0.018, 0.003), (0.019, -0.004)], segs=12, M4=frame((-0.235, 0.209, 0.262), (0, 1, 0)), sharp=40))

# ------------------------------------------------------------------ cockpit ---
add(rbox('cockpit_floor', (X_COWL - X_BULK - 0.02, 0.36, 0.012), DARK, T((X_COWL + X_BULK) / 2, 0, Z_FLOOR + 0.004), bevel=0.0, sharp=50))
add(rbox('dash', (0.034, 0.350, 0.070), DARK, T(0.146, 0, 0.296), bevel=0.010, sharp=50))
for gy, gr in ((0.0, 0.021), (-0.052, 0.015), (0.052, 0.015)):
    m4 = frame((0.1285, gy, 0.304), (-1, 0, 0.25), (0, 1, 0))
    add(lathe('gauge', CREAM, [(0, 0.002), (gr * 0.8, 0.002), (gr * 0.8, 0.0)], segs=12, M4=m4, sharp=40))
    add(lathe('gauge_rim', CHROME, [(gr * 0.8, 0.004), (gr, 0.004), (gr, -0.004)], segs=12, M4=m4, sharp=40))
# bench seat
add(rbox('seat_base', (0.190, 0.320, 0.046), SEAT, T(-0.165, 0, Z_FLOOR + 0.028), bevel=0.016, sharp=50))
seat_m = T(-0.272, 0, 0.332) @ R(-0.10, 'Y')
add(rbox('seat_back', (0.044, 0.330, 0.170), SEAT, seat_m, bevel=0.018, sharp=50))
add(rbox('seat_piping', (0.052, 0.250, 0.012), CREAM, seat_m @ T(0, 0, 0.083), bevel=0.005, segs=1, sharp=50))
for sy in (-0.082, 0.0, 0.082):
    add(rbox('seat_pleat', (0.010, 0.066, 0.110), ENGINE, seat_m @ T(0.021, sy, -0.005), bevel=0.004, segs=1, sharp=50))
# steering wheel
sw = T(0.098, 0, 0.342) @ R(-1.02, 'Y')
add(torus('steer_ring', DARK, 0.050, 0.0095, M4=sw, segs=18, rsegs=6))
add(rbox('steer_bar', (0.013, 0.096, 0.006), DARK, sw, bevel=0.002, segs=1, sharp=50))
add(rbox('steer_stem', (0.050, 0.013, 0.006), DARK, sw @ T(-0.025, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', CREAM, [(0, 0.008), (0.012, 0.007), (0.015, 0.003), (0.015, -0.004)], segs=10, M4=sw, sharp=40))
add(tube('steer_column', ENGINE, [(0.101, 0, 0.339), (0.146, 0, 0.304)], 0.008, N=6))
# gear lever
add(tube('gear_stick', CHROME, [(0.060, -0.085, Z_FLOOR + 0.005), (0.046, -0.085, Z_FLOOR + 0.070)], 0.0045, N=5))
add(lathe('gear_knob', CREAM, [(0, 0.012), (0.009, 0.009), (0.012, 0.0), (0.008, -0.010), (0, -0.012)], segs=8, M4=T(0.045, -0.085, Z_FLOOR + 0.078), sharp=40))

# low windscreen: cream frame, raked glass
WS = [(0.180, 0.178, 0.338), (0.164, 0.178, 0.396), (0.158, 0.162, 0.412), (0.158, -0.162, 0.412), (0.164, -0.178, 0.396), (0.180, -0.178, 0.338)]
add(tube('screen_frame', CREAM, WS, 0.0105, N=6, up=(1, 0, 0), sharp=70))
add(rbox('screen_glass', (0.006, 0.340, 0.068), GLASS, T(0.169, 0, 0.375) @ R(-0.26, 'Y'), bevel=0.0, sharp=50))
add(rbox('screen_foot', (0.020, 0.380, 0.012), CREAM, T(0.181, 0, 0.343), bevel=0.004, segs=1, sharp=50))

# ---------------------------------------------------------------- roll bar ---
hoop = []
for k in range(15):
    th = pi * k / 14
    hoop.append((X_BULK - 0.030 - 0.006 * math.sin(th), 0.186 * sgnpow(math.cos(th), 2 / 4.0), Z_RAIL - 0.01 + 0.075 * sgnpow(math.sin(th), 2 / 4.0)))
add(tube('hoop', CREAM, hoop, 0.0175, N=8, up=(1, 0, 0), sharp=70))
for s in (-1, 1):
    add(tube('hoop_stay', CREAM, [(X_BULK - 0.036, s * 0.180, 0.420), (-0.462, s * Y_SIDE, Z_RAIL + 0.006)], 0.0125, N=6, sharp=70))
    add(lathe('hoop_foot', ENGINE, [(0.027, 0.0), (0.027, 0.008), (0.020, 0.012), (0, 0.012)], segs=10, M4=T(-0.462, s * Y_SIDE, Z_RAIL + 0.008), sharp=40))
    # spot lamps on the bar
    m4 = frame((X_BULK - 0.024, s * 0.085, 0.4715), (1, 0, 0.04), (0, 1, 0))
    add(lathe('spot_shell', DARK, [(0, -0.030), (0.016, -0.027), (0.0255, -0.012), (0.027, 0.010), (0.0235, 0.012)], segs=12, M4=m4, sharp=40))
    add(lathe('spot_lens', LAMP_F, [(0, 0.0135), (0.014, 0.0125), (0.0235, 0.010)], segs=12, M4=m4, sharp=60))
    add(tube('spot_stem', ENGINE, [(X_BULK - 0.034, s * 0.085, 0.450), (X_BULK - 0.030, s * 0.085, 0.458)], 0.006, N=5))

# --------------------------------------------------------------------- bed ---
add(rbox('bulkhead', (0.030, 0.416, 0.416 - Z_FLOOR), PAINT, T(X_BULK, 0, (0.416 + Z_FLOOR) / 2), bevel=0.012, segs=3, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.90), v.z))))
add(rbox('bed_floor', (X_BULK - X_TAIL, 0.350, 0.012), FLOOR, T((X_BULK + X_TAIL) / 2, 0, Z_BED), bevel=0.0, sharp=50))
add(rbox('tailgate', (0.028, 0.346, Z_RAIL - 0.218), PAINT, T(X_TAIL - 0.002, 0, (Z_RAIL + 0.218) / 2), bevel=0.009, sharp=50))
add(rbox('tailgate_cap', (0.034, 0.340, 0.012), CREAM, T(X_TAIL - 0.002, 0, Z_RAIL + 0.002), bevel=0.004, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('latch', (0.010, 0.014, 0.030), CHROME, T(X_TAIL - 0.017, s * 0.150, Z_RAIL - 0.030), bevel=0.003, segs=1, sharp=50))
# pixel heart pressed into the tailgate
HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
px = 0.0125
for r, row in enumerate(HEART):
    for cidx, ch in enumerate(row):
        if ch == 'X':
            add(rbox('heart', (0.006, px * 0.94, px * 0.94), CREAM, T(X_TAIL - 0.017, (cidx - 3) * px, Z_RAIL - 0.038 - r * px), bevel=0.0, sharp=50))

# the cargo: chunky pixel cubes
CUBES = [  # x centre, y centre, z base, size, tones
    (-0.404, -0.092, Z_BED + 0.006, 0.100, ((0.07, 0.07, 0.08), (0.24, 0.24, 0.26), (0.84, 0.80, 0.74))),
    (-0.394, 0.022, Z_BED + 0.006, 0.086, ((0.84, 0.80, 0.74), (0.97, 0.95, 0.92), (0.05, 0.05, 0.06))),
    (-0.414, 0.118, Z_BED + 0.006, 0.076, ((0.90, 0.10, 0.30), (1.0, 0.45, 0.58), (0.40, 0.03, 0.14))),
    (-0.400, -0.036, Z_BED + 0.006 + 0.100, 0.078, ((0.95, 0.55, 0.03), (1.0, 0.82, 0.16), (0.50, 0.20, 0.02))),
]
for i, (cx, cy, zb, size, tones) in enumerate(CUBES):
    m = mat(f'cube{i}', tones[0], rough=0.55, edge=0.25, ao_floor=0.5,
            pattern=pixel_pattern((cx - size / 2, cy - size / 2, zb), size / 5, tones, n=5))
    add(rbox(f'cube{i}', (size, size, size), m, T(cx, cy, zb + size / 2), bevel=0.0035, segs=1, sharp=40))

# rear bumper, plate, tailpipe
add(rbox('bumper_r', (0.040, 0.440, 0.046), CREAM, T(-0.506, 0, 0.128), bevel=0.013, segs=3, sharp=50))
for s in (-1, 1):
    add(rbox('bumper_r_bracket', (0.040, 0.020, 0.024), DARK, T(-0.484, s * 0.120, 0.125), bevel=0.003, segs=1, sharp=50))
    add(bolt('bolt', CHROME, (-0.5265, s * 0.190, 0.128), (-1, 0, 0), 0.006))
add(rbox('plate', (0.006, 0.080, 0.036), CREAM, T(-0.499, 0, 0.190), bevel=0.002, segs=1, sharp=50))
add(rbox('plate_frame', (0.005, 0.090, 0.046), DARK, T(-0.4975, 0, 0.190), bevel=0.002, segs=1, sharp=50))
for i, ch in enumerate('X.XX.X'):
    if ch == 'X':
        add(rbox('plate_pixel', (0.004, 0.009, 0.014), DARK, T(-0.5015, (i - 2.5) * 0.0115, 0.190), bevel=0.0, sharp=50))
pipe = [(-0.360, -0.150, 0.092), (-0.440, -0.158, 0.090), (-0.524, -0.160, 0.086)]
add(tube('tailpipe', CHROME, pipe, [0.013, 0.013, 0.016], N=8, sharp=70))
add(lathe('tailpipe_bore', DARK, [(0, 0.0), (0.012, 0.0)], segs=8, M4=frame((-0.5247, -0.160, 0.086), (-1, 0, -0.05)), sharp=60, recalc=False))

# ------------------------------------------------------------- running gear ---
for spec in (FW, RW):
    yi = spec['y'] - spec['W'] / 2 + 0.012
    add(tube('axle', ENGINE, [(spec['x'], -yi, spec['R']), (spec['x'], yi, spec['R'])], 0.016, N=8, sharp=70))
add(lathe('diff', ENGINE, [(0, 0.040), (0.026, 0.034), (0.040, 0.014), (0.040, -0.014), (0.026, -0.034), (0, -0.040)], segs=12,
          M4=frame((RW['x'], 0, RW['R']), (1, 0, 0)), sharp=40))
for s in (-1, 1):
    # coil-over shocks, front and rear
    add(tube('coil_f', CREAM, [(FW['x'], s * 0.212, 0.150), (FW['x'], s * 0.172, 0.232)], 0.013, N=8, sharp=70))
    add(tube('coil_r', CREAM, [(RW['x'] - 0.03, s * 0.150, 0.150), (RW['x'] - 0.05, s * 0.130, 0.240)], 0.013, N=8, sharp=70))
    add(tube('tie_rod', ENGINE, [(0.262, 0.0, 0.130), (0.270, s * 0.215, 0.134)], 0.005, N=5))

body = join(P, 'pixelpickup_body')


# ------------------------------------------------------------------- wheels ---
def build_wheel(name, spec):
    """right-hand wheel: axle on local X, outer face on +X. Fat off-road tyre
    on a cream steel wheel with a chrome cap."""
    Rr, W = spec['R'], spec['W']; hw = W / 2
    A = frame((0, 0, 0), (1, 0, 0), (0, 1, 0))
    parts = []
    prof = []

    def PT(r, a):
        prof.append((r * Rr, a * hw))
    PT(0.60, -0.80); PT(0.72, -0.98); PT(0.89, -0.97); PT(0.975, -0.84); PT(1.0, -0.66)
    for g in (-0.30, 0.30):
        PT(1.0, g - 0.10); PT(0.94, g - 0.06); PT(0.94, g + 0.06); PT(1.0, g + 0.10)
    PT(1.0, 0.66); PT(0.975, 0.84); PT(0.89, 0.97); PT(0.78, 1.0); PT(0.68, 0.975); PT(0.61, 0.86); PT(0.585, 0.74)
    shoulder = {3, 4, len(prof) - 7, len(prof) - 6}
    segs = 28

    def rmod(pi_, k):
        return -0.075 * Rr if (pi_ in shoulder and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    parts.append(lathe('rim', W_CREAM, [(0.600 * Rr, hw * 0.70), (0.620 * Rr, hw * 0.80), (0.645 * Rr, hw * 0.90), (0.630 * Rr, hw * 0.965),
                                        (0.585 * Rr, hw * 0.93), (0.555 * Rr, hw * 0.80), (0.540 * Rr, hw * 0.44)], segs=24, M4=A, sharp=45))
    h0, h1 = hw * 0.44, hw * 0.70      # the dished face climbs toward the centre
    r0, r1 = 0.540 * Rr, 0.27 * Rr
    parts.append(lathe('face', W_CREAM, [(r0, h0), (r1, h1), (0.0, h1 + 0.004)], segs=24, M4=A, sharp=45))
    slope = (h1 - h0) / (r0 - r1)
    for k in range(6):
        a = 2 * pi * k / 6
        r = 0.405 * Rr
        h = h0 + (r0 - r) * slope
        p = V((r * math.cos(a), r * math.sin(a), h))
        n = V((slope * math.cos(a), slope * math.sin(a), 1.0)).normalized()
        tang = V((-math.sin(a), math.cos(a), 0))
        parts.append(lathe('slot', W_DARK, [(0, 0.0), (0.085 * Rr, 0.0)], segs=10, M4=A @ frame(p + n * 0.0025, n, tang) @ Matrix.Diagonal((1.35, 0.8, 1, 1)), sharp=60, recalc=False))
    for k in range(5):
        a = 2 * pi * (k + 0.5) / 5
        p = A @ V((0.215 * Rr * math.cos(a), 0.215 * Rr * math.sin(a), h1 + 0.004))
        parts.append(bolt('lug', W_CHROME, p, (1, 0, 0), 0.034 * Rr))
    parts.append(lathe('cap', W_CHROME, [(0, h1 + 0.115 * Rr), (0.07 * Rr, h1 + 0.105 * Rr), (0.125 * Rr, h1 + 0.065 * Rr), (0.14 * Rr, h1)], segs=12, M4=A, sharp=40))
    parts.append(lathe('back', W_DARK, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.60 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
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
    final = final_material('pixelpickup_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)


for c in stand_ins:
    bpy.data.objects.remove(c)


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward); left wheels are
    mirrored meshes that share the right wheels' texture space."""
    root = empty('pixel_pickup_v2')
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
    export_glb(raw, objs, jpeg_quality=86)
    print('RAW GLB', raw, os.path.getsize(raw), 'bytes (pack it with pack-glb.mjs)')

if preview:
    studio.setup()
    cam, lights = studio.add_rig()
    root.rotation_euler = (0, 0, pi)   # studio wants the nose on +X
    for view in studio.VIEWS:
        studio.aim(cam, lights, view)
        studio.render(f'{preview}-{view[0]}.png')
