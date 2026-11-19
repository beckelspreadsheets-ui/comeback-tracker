# Hash Runner v2: purple and mint open-wheel racer with an exposed engine.
# Built from nothing by script (no imported meshes, no external images).
#
#   blender -b -P build_hashrunner.py -- out/hash-runner-v2.glb [--preview renders/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0. The file is
# flipped at the end so the nose is on -X, the facing the game already has on
# record for the Hash Runner (KART_NOSE_YAW.hashrunner), which makes it a
# drop-in for hash-runner.glb.
import bpy, sys, os, math
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

# ---------------------------------------------------------------- colours ---
C_PURPLE = (0.088, 0.012, 0.30)
C_MINT = (0.28, 0.92, 0.62)
C_INK = (0.012, 0.006, 0.03)


def hull_pattern(t, c):
    x, y, z = objcoord(t)
    ay = mth(t, 'ABSOLUTE', y)
    top = smooth(t, normal_z(t), 0.5, 0.72)
    nose = smooth(t, x, 0.236, 0.240)
    stripe = mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', band(t, ay, 0.027, 0.037), top), nose)
    c = mixc(t, stripe, c, C_MINT)
    c = mixc(t, smooth(t, x, 0.4555, 0.4585), c, C_MINT)
    flank = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, top), mth(t, 'SUBTRACT', 1.0, smooth(t, x, 0.40, 0.45)))
    zl = mth(t, 'SUBTRACT', z, mth(t, 'MULTIPLY', x, 0.05))
    c = mixc(t, mth(t, 'MULTIPLY', band(t, zl, 0.150, 0.158, soft=0.001), flank), c, C_MINT)
    lines = None
    for gx in (0.2305, 0.405, -0.2885):
        g = band(t, x, gx - 0.0022, gx + 0.0022, soft=0.001)
        lines = g if lines is None else mth(t, 'MAXIMUM', lines, g)
    return mixc(t, mth(t, 'MULTIPLY', lines, 0.8), c, C_INK)


def pod_pattern(t, c):
    # purple pod with a mint lower half; the split line climbs toward the tail
    x, y, z = objcoord(t)
    zl = mth(t, 'ADD', z, mth(t, 'MULTIPLY', x, 0.16))
    c = mixc(t, smooth(t, zl, 0.1295, 0.1325), C_MINT, c)
    return mixc(t, band(t, zl, 0.1325, 0.1385, soft=0.001), c, C_INK)


def tyre_pattern(t, c):
    # tread sipes: slanted bars round the tread and shoulders (wheel axle = local X)
    x, y, z = objcoord(t)
    g = nd(t, 'ShaderNodeNewGeometry')
    tc = nd(t, 'ShaderNodeVectorTransform', vector_type='NORMAL', convert_from='WORLD', convert_to='OBJECT')
    t.links.new(g.outputs['Normal'], tc.inputs[0])
    sep = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs[0], sep.inputs[0])
    tread = mth(t, 'SUBTRACT', 1.0, smooth(t, mth(t, 'ABSOLUTE', sep.outputs[0]), 0.55, 0.8))
    ang = mth(t, 'ARCTAN2', z, y)
    v = mth(t, 'ADD', mth(t, 'MULTIPLY', ang, 22 / (2 * pi)), mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', x), 9.0))
    bar = mth(t, 'LESS_THAN', mth(t, 'FRACT', v), 0.24)
    edge = smooth(t, mth(t, 'ABSOLUTE', x), 0.012, 0.02)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', bar, tread), mth(t, 'MULTIPLY', edge, 0.7)), c, (0.006, 0.006, 0.008))


PAINT_HULL = mat('paint_hull', C_PURPLE, rough=0.3, pattern=hull_pattern)
PAINT = mat('paint', C_PURPLE, rough=0.3)
MINT_POD = mat('paint_pod', C_PURPLE, rough=0.3, pattern=pod_pattern)
MINT = mat('mint', C_MINT, rough=0.36)
DARK = mat('dark', (0.022, 0.024, 0.032), rough=0.5)
SEAT = mat('seat', (0.04, 0.034, 0.052), rough=0.75, edge=0.35)
ENGINE = mat('engine', (0.115, 0.12, 0.135), rough=0.42, metal=0.5)
STEEL = mat('steel', (0.40, 0.42, 0.46), rough=0.3, metal=0.65)
CHROME = mat('chrome', (0.70, 0.72, 0.76), rough=0.2, metal=0.8, edge=0.7)
GLASS = mat('glass', (0.03, 0.08, 0.09), rough=0.08)
LAMP_F = mat('lamp_front', (0.6, 1.0, 0.85), rough=0.2, emit=(0.5, 1.0, 0.8), emit_strength=1.0)
LAMP_R = mat('lamp_rear', (1.0, 0.1, 0.2), rough=0.2, emit=(1.0, 0.03, 0.12), emit_strength=1.0)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.036, 0.036, 0.04), rough=0.9, toplight=False, ao_floor=0.45, edge=0.45, pattern=tyre_pattern)
RIM = mat('rim', (0.50, 0.52, 0.56), rough=0.28, metal=0.65, toplight=False, edge=0.7)
RIM_DARK = mat('rim_dark', (0.03, 0.03, 0.04), rough=0.45, toplight=False)
W_MINT = mat('wheel_mint', C_MINT, rough=0.36, toplight=False)
W_PAINT = mat('wheel_paint', C_PURPLE, rough=0.3, toplight=False)
W_STEEL = mat('wheel_steel', (0.34, 0.35, 0.38), rough=0.35, metal=0.6, toplight=False)

P = []


def add(o):
    P.append(o); return o


# ------------------------------------------------------------------- hull ---
HULL = [  # x, half width, top, bottom, exponent
    (0.496, 0.034, 0.128, 0.092, 2.2),
    (0.476, 0.068, 0.152, 0.072, 2.5),
    (0.425, 0.090, 0.180, 0.058, 2.9),
    (0.345, 0.106, 0.212, 0.052, 3.2),
    (0.265, 0.126, 0.250, 0.050, 3.4),
    (0.222, 0.146, 0.290, 0.050, 3.4),
    (0.192, 0.164, 0.300, 0.050, 3.4),
    (0.165, 0.174, 0.268, 0.050, 3.6),
    (0.100, 0.180, 0.250, 0.050, 3.8),
    (-0.100, 0.184, 0.246, 0.050, 3.8),
    (-0.235, 0.181, 0.250, 0.050, 3.8),
    (-0.285, 0.174, 0.285, 0.052, 3.6),
    (-0.318, 0.154, 0.296, 0.058, 3.2),
    (-0.340, 0.110, 0.270, 0.066, 2.8),
]
FW = dict(R=0.130, W=0.150, x=0.300, y=0.305)
RW = dict(R=0.158, W=0.190, x=-0.315, y=0.318)


def hull_at(x):
    """(half width, top, slope of the top) of the hull at x"""
    for a, b in zip(HULL, HULL[1:]):
        if b[0] <= x <= a[0]:
            f = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[2] - a[2]) / (b[0] - a[0])
    return 0.15, 0.2, 0.0


add(xloft('hull', PAINT_HULL, HULL, N=20, sub=1, sharp=60))
add(rbox('floor', (0.80, 0.30, 0.022), DARK, T(-0.03, 0, 0.047), bevel=0.008, segs=1, sharp=50))
add(rbox('sill', (0.30, 0.71, 0.024), DARK, T(0.005, 0, 0.046), bevel=0.009, sharp=50))
add(rbox('splitter', (0.07, 0.22, 0.014), DARK, T(0.40, 0, 0.050), bevel=0.004, segs=1, sharp=50))

# hash emblem on the nose, between the pinstripes
for kind, a, b in (('x', 0.0, 0.0095), ('x', 0.0, -0.0095), ('y', 0.318, 0), ('y', 0.342, 0)):
    if kind == 'x':
        cx, cy, size = 0.330, b, (0.062, 0.0065, 0.007)
    else:
        cx, cy, size = a, 0.0, (0.0065, 0.044, 0.007)
    hw, zt, slope = hull_at(cx)
    add(rbox('hash', size, MINT, T(cx, cy, zt - 0.002) @ R(math.atan(-slope), 'Y'), bevel=0.0012, segs=1, sharp=50))
# cooling slots on the nose flanks
for s in (-1, 1):
    for i in range(2):
        cx = 0.292 - i * 0.03
        hw, zt, slope = hull_at(cx)
        add(rbox('nose_slot', (0.016, 0.040, 0.008), DARK, T(cx, s * (hw - 0.036), zt - 0.0085) @ R(s * -0.42, 'X') @ R(math.atan(-slope), 'Y'), bevel=0.002, segs=1, sharp=50))

# --------------------------------------------------------------- front wing ---
add(rbox('wing_main', (0.070, 0.70, 0.018), MINT, T(0.463, 0, 0.056) @ R(0.07, 'Y'), bevel=0.006, sharp=50))
for s in (-1, 1):
    add(rbox('wing_flap', (0.040, 0.205, 0.012), MINT, T(0.440, s * 0.238, 0.088) @ R(-0.40, 'Y'), bevel=0.004, segs=1, sharp=50))
    add(rbox('wing_end', (0.100, 0.020, 0.084), PAINT, T(0.452, s * 0.358, 0.086), bevel=0.007, sharp=50,
             taper=lambda v: V((v.x, v.y, v.z * (1.0 if v.x < 0 else 0.60) - (0.0 if v.x < 0 else 0.014)))))
    for bx in (0.428, 0.476):
        add(bolt('bolt', CHROME, (bx, s * 0.3685, 0.074 if bx > 0.45 else 0.094), (0, s, 0), 0.0058))
    add(rbox('wing_pylon', (0.036, 0.014, 0.034), DARK, T(0.452, s * 0.036, 0.072), bevel=0.003, segs=1, sharp=50))
    # headlamps set into the nose flanks
    d = V((0.86, s * 0.50, 0.10)).normalized()
    o = V((0.437, s * 0.079, 0.126))
    m4 = frame(o, d)
    add(lathe('lamp_f', LAMP_F, [(0, 0.014), (0.012, 0.012), (0.021, 0.006), (0.0245, -0.004)], segs=12, M4=m4, sharp=60))
    add(lathe('lamp_bezel', DARK, [(0.0245, -0.002), (0.031, 0.003), (0.033, -0.003), (0.033, -0.02)], segs=12, M4=m4, sharp=40))

# ---------------------------------------------------------------- side pods ---
for s in (-1, 1):
    secs = [(0.140, 0.034, 0.152, 0.086, 3.0, s * 0.240), (0.170, 0.040, 0.160, 0.078, 3.0, s * 0.240),
            (0.175, 0.052, 0.172, 0.066, 3.0, s * 0.243), (0.150, 0.072, 0.192, 0.054, 3.2, s * 0.251),
            (0.080, 0.086, 0.210, 0.049, 3.4, s * 0.258), (-0.040, 0.089, 0.216, 0.049, 3.4, s * 0.260),
            (-0.118, 0.078, 0.208, 0.053, 3.2, s * 0.252), (-0.158, 0.050, 0.184, 0.070, 2.8, s * 0.238)]
    add(xloft('pod', MINT_POD, secs, N=16, sub=1, sharp=60))
    ring = sup_ring((0.143, s * 0.240, 0.121), (0, 1, 0), (0, 0, 1), 0.035, 0.032, e=3.0, N=12)
    add(make_obj('pod_mouth', ring, [tuple(range(12))], DARK, sharp=60, recalc=False))
    for i in range(3):
        add(rbox('pod_louvre', (0.015, 0.088, 0.008), DARK, T(-0.012 - i * 0.034, s * 0.264, 0.2145 - i * 0.0012) @ R(-0.35, 'Y'), bevel=0.002, segs=1, sharp=50))
    for bx in (0.105, -0.112):
        add(bolt('bolt', CHROME, (bx, s * (0.339 if bx > 0 else 0.324), 0.166), (0, s, 0.25), 0.006))
# fuel cap on the left pod
add(lathe('fuel_cap', CHROME, [(0, 0.012), (0.015, 0.011), (0.021, 0.006), (0.022, -0.004)], segs=12, M4=T(0.065, 0.258, 0.209), sharp=40))

# ------------------------------------------------------------------ cockpit ---
path = []
for k in range(32):
    th = 2 * pi * k / 32
    x = -0.048 + 0.246 * sgnpow(math.cos(th), 2 / 4.2)
    y = 0.163 * sgnpow(math.sin(th), 2 / 4.2)
    z = 0.262 + 0.026 * max(0.0, math.cos(th)) ** 2 + 0.022 * max(0.0, -math.cos(th)) ** 2
    path.append((x, y, z))
add(tube('coaming', PAINT, path, 0.021, N=8, closed=True, up=(0, 0, 1), ell=1.45, sharp=70))
ring = sup_ring((-0.052, 0, 0.2560), (1, 0, 0), (0, 1, 0), 0.236, 0.156, e=4.0, N=24)
add(make_obj('cockpit_floor', ring, [tuple(range(24))], DARK, sharp=60, recalc=False))
add(rbox('seat_base', (0.17, 0.215, 0.03), SEAT, T(-0.165, 0, 0.258), bevel=0.012, sharp=50))
seat_m = T(-0.287, 0, 0.326) @ R(-0.18, 'Y')
add(rbox('seat_back', (0.05, 0.285, 0.15), SEAT, seat_m, bevel=0.016, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.86), v.z))))
add(rbox('seat_piping', (0.05, 0.19, 0.012), MINT, seat_m @ T(0, 0, 0.073), bevel=0.005, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('seat_bolster', (0.10, 0.03, 0.07), SEAT, T(-0.225, s * 0.120, 0.290) @ R(-0.12, 'Y'), bevel=0.012, sharp=50))

# windscreen deflector on the cowl
arc = [(0.052 + 0.160 * math.cos(math.radians(a)), 0.160 * math.sin(math.radians(a)), 0.316 - 0.016 * abs(a) / 56) for a in range(-56, 57, 14)]
add(tube('screen', GLASS, arc, [0.012, 0.019, 0.024, 0.026, 0.027, 0.026, 0.024, 0.019, 0.012], N=8, ell=0.16, up=(0.35, 0, 1), sharp=70))
# steering wheel
sw = T(0.140, 0, 0.326) @ R(-1.12, 'Y')
add(torus('steer_ring', DARK, 0.047, 0.009, M4=sw, segs=18, rsegs=6))
add(rbox('steer_bar', (0.013, 0.090, 0.006), DARK, sw, bevel=0.002, segs=1, sharp=50))
add(rbox('steer_stem', (0.047, 0.013, 0.006), DARK, sw @ T(-0.0235, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', MINT, [(0, 0.008), (0.011, 0.007), (0.014, 0.003), (0.014, -0.004)], segs=10, M4=sw, sharp=40))
add(tube('steer_column', ENGINE, [(0.143, 0, 0.323), (0.210, 0, 0.292)], 0.008, N=6))
# mirrors
for s in (-1, 1):
    add(tube('mirror_stalk', DARK, [(0.194, s * 0.152, 0.292), (0.180, s * 0.204, 0.334)], 0.0065, N=5))
    add(rbox('mirror', (0.028, 0.060, 0.036), PAINT, T(0.176, s * 0.222, 0.342) @ R(s * 0.18, 'Z'), bevel=0.009, sharp=50))
    add(rbox('mirror_glass', (0.003, 0.046, 0.024), CHROME, T(0.1615, s * 0.2247, 0.342) @ R(s * 0.18, 'Z'), bevel=0.0, sharp=50))

# ---------------------------------------------------------------- roll hoop ---
hoop = []
for k in range(15):
    th = pi * k / 14
    hoop.append((-0.330 - 0.004 * math.sin(th), 0.138 * sgnpow(math.cos(th), 2 / 3.4), 0.240 + 0.194 * sgnpow(math.sin(th), 2 / 3.4)))
add(tube('hoop', CHROME, hoop, 0.016, N=8, up=(1, 0, 0), sharp=70))
for s in (-1, 1):
    add(tube('hoop_stay', CHROME, [(-0.338, s * 0.116, 0.418), (-0.468, s * 0.088, 0.215)], 0.010, N=6, sharp=70))
    add(lathe('hoop_foot', ENGINE, [(0.025, 0.0), (0.025, 0.008), (0.019, 0.012), (0, 0.012)], segs=10, M4=T(-0.330, s * 0.138, 0.238), sharp=40))

# ------------------------------------------------------------------- engine ---
add(xloft('tail', PAINT, [(-0.322, 0.156, 0.226, 0.060, 3.2), (-0.400, 0.150, 0.212, 0.064, 3.2), (-0.462, 0.136, 0.198, 0.074, 3.2),
                          (-0.492, 0.116, 0.184, 0.090, 3.0)], N=16, sub=1, sharp=60))
add(rbox('block', (0.13, 0.165, 0.12), ENGINE, T(-0.403, 0, 0.222), bevel=0.012, sharp=50))
for s in (-1, 1):
    hm = T(-0.403, s * 0.070, 0.288) @ R(-s * 0.62, 'X')
    add(rbox('head', (0.122, 0.056, 0.052), ENGINE, hm, bevel=0.008, segs=1, sharp=50))
    add(rbox('valve_cover', (0.112, 0.048, 0.024), MINT, hm @ T(0, 0, 0.035), bevel=0.009, sharp=50))
    for bx in (-0.04, 0.0, 0.04):
        p = hm @ V((bx, 0, 0.048)); n = hm.to_3x3() @ V((0, 0, 1))
        add(bolt('bolt', CHROME, p, n, 0.005))
        # plug leads from the cover up to the blower
        q = hm @ V((bx, -s * 0.02, 0.046))
        add(tube('lead', MINT, [q, (q.x, s * 0.044, 0.345), (q.x, s * 0.030, 0.352)], 0.0032, N=4, sharp=70))
    # zoomie headers
    for x0 in (-0.363, -0.401, -0.439):
        pts = [(x0, s * 0.094, 0.292), (x0 - 0.003, s * 0.132, 0.292), (x0 - 0.015, s * 0.162, 0.312),
               (x0 - 0.034, s * 0.180, 0.352), (x0 - 0.050, s * 0.188, 0.398)]
        add(tube('header', CHROME, pts, [0.014, 0.014, 0.0145, 0.016, 0.018], N=8, sharp=70))
        a, b = V(pts[-2]), V(pts[-1]); d = (b - a).normalized()
        add(lathe('header_bore', DARK, [(0, 0.0), (0.013, 0.0)], segs=8, M4=frame(b + d * 0.0006, d), sharp=60, recalc=False))
for i in range(4):
    add(rbox('block_fin', (0.014, 0.125, 0.009), STEEL, T(-0.468, 0, 0.212 + i * 0.019), bevel=0.003, segs=1, sharp=50))
add(lathe('cam_cover', CHROME, [(0, 0.008), (0.020, 0.008), (0.026, 0.002), (0.026, -0.006)], segs=12, M4=frame((-0.470, 0, 0.292), (-1, 0, 0.25)), sharp=40))
add(rbox('blower', (0.10, 0.08, 0.052), STEEL, T(-0.403, 0, 0.332), bevel=0.010, sharp=50))
for i in range(4):
    add(rbox('blower_rib', (0.008, 0.086, 0.040), ENGINE, T(-0.438 + i * 0.0235, 0, 0.332), bevel=0.003, segs=1, sharp=50))
SCOOP = [(-0.344, 0.046, 0.426, 0.372, 3.0), (-0.350, 0.062, 0.440, 0.362, 3.0), (-0.403, 0.062, 0.438, 0.360, 3.0),
         (-0.452, 0.050, 0.416, 0.364, 2.6), (-0.478, 0.028, 0.392, 0.370, 2.2)]
add(xloft('scoop', PAINT, SCOOP, N=16, sub=1, sharp=60))
ring = sup_ring((-0.3425, 0, 0.3965), (0, 1, 0), (0, 0, 1), 0.041, 0.022, e=3.0, N=14)
add(make_obj('scoop_mouth', ring, [tuple(range(14))], DARK, sharp=60, recalc=False))
lip = sup_ring((-0.343, 0, 0.3965), (0, 1, 0), (0, 0, 1), 0.047, 0.028, e=3.0, N=18)
add(tube('scoop_lip', MINT, lip, 0.006, N=6, closed=True, up=(1, 0, 0), sharp=70))
# tail lamps and diffuser
add(rbox('lamp_bezel_r', (0.016, 0.215, 0.050), DARK, T(-0.4925, 0, 0.140), bevel=0.007, sharp=50))
for s in (-1, 1):
    add(rbox('lamp_r', (0.010, 0.082, 0.028), LAMP_R, T(-0.5005, s * 0.052, 0.140), bevel=0.005, sharp=50))
    add(rbox('lamp_r_trim', (0.006, 0.092, 0.006), MINT, T(-0.5005, s * 0.052, 0.1605), bevel=0.002, segs=1, sharp=50))
    for fy in (0.035, 0.095):
        add(rbox('diffuser_fin', (0.07, 0.008, 0.036), DARK, T(-0.455, s * fy, 0.066), bevel=0.002, segs=1, sharp=50))

# --------------------------------------------------------------- suspension ---
for s in (-1, 1):
    yi = FW['y'] - FW['W'] / 2 + 0.012
    for zt, zh in ((0.176, 0.192), (0.088, 0.080)):
        for xh in (0.350, 0.258):
            add(tube('arm_f', ENGINE, [(xh, s * 0.098, zh), (FW['x'], s * yi, zt)], 0.0078, N=6, ell=0.55, up=(0, 0, 1)))
    add(tube('tie_rod', STEEL, [(0.258, s * 0.115, 0.135), (0.276, s * yi, 0.130)], 0.005, N=5))
    add(tube('coil_f', MINT, [(0.299, s * 0.208, 0.104), (0.296, s * 0.124, 0.200)], 0.013, N=8, sharp=70))
    add(tube('coil_f_rod', STEEL, [(0.300, s * 0.226, 0.084), (0.2955, s * 0.106, 0.220)], 0.006, N=6))
    yr = RW['y'] - RW['W'] / 2 + 0.012
    add(tube('axle', ENGINE, [(RW['x'], s * 0.05, 0.158), (RW['x'], s * yr, 0.158)], 0.017, N=8, sharp=70))
    add(tube('arm_r_up', ENGINE, [(-0.345, s * 0.11, 0.232), (RW['x'], s * yr, 0.214)], 0.0085, N=6, ell=0.55, up=(0, 0, 1)))
    add(tube('arm_r_low', ENGINE, [(-0.272, s * 0.14, 0.080), (RW['x'], s * yr, 0.096)], 0.0085, N=6, ell=0.55, up=(0, 0, 1)))

body = join(P, 'hashrunner_body')


# ------------------------------------------------------------------- wheels ---
def build_wheel(name, spec):
    """right-hand wheel: axle on local X, outer face on +X"""
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
    segs = 28

    def rmod(pi_, k):
        return -0.040 * Rr if (pi_ in shoulder and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    parts.append(lathe('stripe', W_MINT, [(0.790 * Rr, hw * 0.996), (0.800 * Rr, hw * 1.016), (0.836 * Rr, hw * 1.008), (0.846 * Rr, hw * 0.982)], segs=segs, M4=A, sharp=60))
    parts.append(lathe('rim', RIM, [(0.615 * Rr, hw * 0.70), (0.635 * Rr, hw * 0.80), (0.660 * Rr, hw * 0.90), (0.645 * Rr, hw * 0.965),
                                    (0.600 * Rr, hw * 0.93), (0.570 * Rr, hw * 0.80), (0.550 * Rr, hw * 0.34)], segs=24, M4=A, sharp=45))
    parts.append(lathe('dish', RIM_DARK, [(0.552 * Rr, hw * 0.36), (0.50 * Rr, hw * 0.30), (0.0, hw * 0.30)], segs=24, M4=A, sharp=45))
    parts.append(lathe('disc', W_STEEL, [(0.50 * Rr, hw * 0.36), (0.50 * Rr, hw * 0.42), (0.16 * Rr, hw * 0.42)], segs=24, M4=A, sharp=45))
    parts.append(lathe('back', RIM_DARK, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.62 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
    zf = hw * 0.66
    for k in range(5):
        Rs = A @ R(2 * pi * k / 5 + 0.3, 'Z')
        parts.append(rbox('spoke', (0.40 * Rr, 0.15 * Rr, 0.085 * Rr), W_MINT, Rs @ T(0.385 * Rr, 0, zf) @ R(0.10, 'Y'), bevel=0.005, segs=1, sharp=50,
                          taper=lambda v: V((v.x, v.y * (1.15 if v.x < 0 else 0.72), v.z))))
        a = 2 * pi * (k + 0.5) / 5 + 0.3
        p = A @ V((0.165 * Rr * math.cos(a), 0.165 * Rr * math.sin(a), zf + 0.062 * Rr))
        parts.append(bolt('lug', RIM, p, (1, 0, 0), 0.030 * Rr))
    parts.append(lathe('hub', W_PAINT, [(0, zf + 0.065 * Rr), (0.20 * Rr, zf + 0.062 * Rr), (0.245 * Rr, zf + 0.035 * Rr), (0.25 * Rr, hw * 0.34)], segs=14, M4=A, sharp=40))
    parts.append(lathe('cap', RIM, [(0, zf + 0.115 * Rr), (0.07 * Rr, zf + 0.11 * Rr), (0.095 * Rr, zf + 0.085 * Rr), (0.095 * Rr, zf + 0.06 * Rr)], segs=10, M4=A, sharp=40))
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
mn, mx = bounds([body, wf, wr]); print('BOUNDS', [round(v, 3) for v in mn], [round(v, 3) for v in mx])

# ------------------------------------------------------------- bake + export ---
if not NOBAKE:
    unwrap([body, wf, wr])
    images = bake_atlas([[body], [wf], [wr]], dict(color=1024, orm=256, emit=256), samples=24)
    final = final_material('hashrunner_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)


for c in stand_ins:
    bpy.data.objects.remove(c)


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward); left wheels are
    mirrored meshes that share the right wheels' texture space."""
    root = empty('hash_runner_v2')
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
