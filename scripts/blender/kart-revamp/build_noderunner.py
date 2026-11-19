# Node Runner v2: hot pink and navy server-rack slot car. "Always on".
# Low, wide open-wheel racer with twin radiator pods (a case fan on each), a
# rack of status lights and cooling fins behind the seat, an antenna and a dish.
# Built from nothing by script (no imported meshes, no external images).
#
#   blender -b -P build_noderunner.py -- out/node-runner-v2.glb [--preview renders/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0. The file is
# flipped at the end so the nose is on -X, the facing the game has on record
# for the Node Runner (KART_NOSE_YAW.noderunner), which makes it a drop-in for
# node-runner.glb.
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
C_PINK = (1.0, 0.030, 0.42)
C_NAVY = (0.016, 0.030, 0.115)
C_WHITE = (0.86, 0.87, 0.90)
C_INK = (0.006, 0.008, 0.02)
STRIPE_HW = 0.070


def hull_pattern(t, c):
    # pink hull, navy centre band edged in white, navy sill, panel lines
    x, y, z = objcoord(t)
    ay = mth(t, 'ABSOLUTE', y)
    top = smooth(t, normal_z(t), 0.45, 0.70)
    centre = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, smooth(t, ay, STRIPE_HW - 0.0015, STRIPE_HW + 0.0015)), top)
    c = mixc(t, centre, c, C_NAVY)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, ay, STRIPE_HW, STRIPE_HW + 0.010), top), c, C_WHITE)
    side = mth(t, 'SUBTRACT', 1.0, top)
    sill = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, smooth(t, z, 0.0835, 0.0865)), side)
    c = mixc(t, sill, c, C_NAVY)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, z, 0.0865, 0.0935, soft=0.001), side), c, C_WHITE)
    lines = None
    for gx in (0.232, 0.405, -0.292):
        g = band(t, x, gx - 0.0022, gx + 0.0022, soft=0.001)
        lines = g if lines is None else mth(t, 'MAXIMUM', lines, g)
    return mixc(t, mth(t, 'MULTIPLY', lines, 0.8), c, C_INK)


def pod_pattern(t, c):
    # navy pod, pink belt round the flank with a white pinstripe under it
    x, y, z = objcoord(t)
    side = mth(t, 'SUBTRACT', 1.0, smooth(t, normal_z(t), 0.45, 0.70))
    c = mixc(t, mth(t, 'MULTIPLY', band(t, z, 0.104, 0.136, soft=0.001), side), c, C_PINK)
    c = mixc(t, mth(t, 'MULTIPLY', band(t, z, 0.093, 0.099, soft=0.001), side), c, C_WHITE)
    return c


def tyre_pattern(t, c):
    # tread sipes: slanted bars round the tread and shoulders (axle = local X)
    x, y, z = objcoord(t)
    g = nd(t, 'ShaderNodeNewGeometry')
    tc = nd(t, 'ShaderNodeVectorTransform', vector_type='NORMAL', convert_from='WORLD', convert_to='OBJECT')
    t.links.new(g.outputs['Normal'], tc.inputs[0])
    sep = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs[0], sep.inputs[0])
    tread = mth(t, 'SUBTRACT', 1.0, smooth(t, mth(t, 'ABSOLUTE', sep.outputs[0]), 0.55, 0.8))
    ang = mth(t, 'ARCTAN2', z, y)
    v = mth(t, 'ADD', mth(t, 'MULTIPLY', ang, 18 / (2 * pi)), mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', x), 7.0))
    bar = mth(t, 'LESS_THAN', mth(t, 'FRACT', v), 0.22)
    edge = smooth(t, mth(t, 'ABSOLUTE', x), 0.012, 0.02)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', bar, tread), mth(t, 'MULTIPLY', edge, 0.7)), c, (0.006, 0.006, 0.008))


PAINT_HULL = mat('paint_hull', C_PINK, rough=0.3, pattern=hull_pattern, edge=0.4)
PINK = mat('pink', C_PINK, rough=0.3, edge=0.4)
POD = mat('paint_pod', C_NAVY, rough=0.32, pattern=pod_pattern, edge=0.55)
NAVY = mat('navy', C_NAVY, rough=0.32, edge=0.55)
WHITE = mat('white', C_WHITE, rough=0.35, edge=0.3)
DARK = mat('dark', (0.020, 0.022, 0.032), rough=0.5)
SEAT = mat('seat', (0.036, 0.038, 0.056), rough=0.75, edge=0.35)
RACK = mat('rack', (0.060, 0.066, 0.085), rough=0.45, metal=0.4, edge=0.6)
ENGINE = mat('engine', (0.115, 0.12, 0.135), rough=0.42, metal=0.5)
STEEL = mat('steel', (0.40, 0.42, 0.46), rough=0.3, metal=0.65)
CHROME = mat('chrome', (0.58, 0.60, 0.64), rough=0.2, metal=0.8, edge=0.8)
GLASS = mat('glass', (0.03, 0.05, 0.09), rough=0.08)
LAMP_F = mat('lamp_front', (0.9, 0.96, 1.0), rough=0.2, emit=(0.86, 0.95, 1.0), emit_strength=1.0)
LAMP_R = mat('lamp_rear', (1.0, 0.1, 0.2), rough=0.2, emit=(1.0, 0.03, 0.12), emit_strength=1.0)
LED_G = mat('led_green', (0.2, 1.0, 0.4), rough=0.2, emit=(0.10, 1.0, 0.30), emit_strength=1.0)
LED_A = mat('led_amber', (1.0, 0.6, 0.1), rough=0.2, emit=(1.0, 0.55, 0.02), emit_strength=1.0)
LED_W = mat('led_white', (1.0, 1.0, 1.0), rough=0.2, emit=(1.0, 1.0, 1.0), emit_strength=1.0)
LED_P = mat('led_pink', (1.0, 0.2, 0.6), rough=0.2, emit=(1.0, 0.10, 0.55), emit_strength=1.0)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.036, 0.036, 0.04), rough=0.9, toplight=False, ao_floor=0.45, edge=0.45, pattern=tyre_pattern)
W_PINK = mat('rim_pink', C_PINK, rough=0.3, toplight=False, edge=0.5)
W_DARK = mat('rim_dark', (0.022, 0.026, 0.05), rough=0.45, toplight=False)
W_STEEL = mat('rim_steel', (0.44, 0.46, 0.50), rough=0.3, metal=0.6, toplight=False, edge=0.6)
W_CHROME = mat('rim_chrome', (0.60, 0.62, 0.66), rough=0.2, metal=0.8, toplight=False, edge=0.8)

P = []


def add(o):
    P.append(o); return o


# ------------------------------------------------------------------- hull ---
HULL = [  # x, half width, top, bottom, exponent
    (0.492, 0.146, 0.102, 0.062, 4.0),
    (0.480, 0.168, 0.118, 0.050, 4.4),
    (0.430, 0.176, 0.134, 0.045, 4.4),
    (0.340, 0.176, 0.154, 0.045, 4.2),
    (0.240, 0.176, 0.182, 0.045, 4.0),
    (0.175, 0.176, 0.212, 0.045, 3.8),
    (0.135, 0.182, 0.226, 0.045, 4.0),
    (0.085, 0.186, 0.210, 0.045, 4.0),
    (-0.100, 0.188, 0.205, 0.045, 4.0),
    (-0.250, 0.186, 0.205, 0.045, 4.0),
    (-0.295, 0.182, 0.226, 0.048, 3.8),
    (-0.400, 0.174, 0.232, 0.052, 3.8),
    (-0.462, 0.160, 0.214, 0.060, 3.6),
    (-0.494, 0.132, 0.186, 0.076, 3.2),
]
FW = dict(R=0.118, W=0.150, x=0.300, y=0.345)
RW = dict(R=0.138, W=0.200, x=-0.325, y=0.335)


def hull_at(x):
    """(half width, top, slope of the top) of the hull at x"""
    for a, b in zip(HULL, HULL[1:]):
        if b[0] <= x <= a[0]:
            f = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[2] - a[2]) / (b[0] - a[0])
    return 0.15, 0.2, 0.0


add(xloft('hull', PAINT_HULL, HULL, N=20, sub=1, sharp=60))
add(rbox('floor', (0.82, 0.34, 0.022), DARK, T(-0.03, 0, 0.044), bevel=0.008, segs=1, sharp=50))
add(rbox('sill', (0.31, 0.80, 0.022), DARK, T(-0.005, 0, 0.044), bevel=0.009, sharp=50))

# node mark on the nose: three linked nodes, white on the navy band
NODES = [(0.385, 0.0), (0.318, 0.036), (0.318, -0.036)]
for i, (cx, cy) in enumerate(NODES):
    hw, zt, slope = hull_at(cx)
    add(lathe('node_dot', WHITE, [(0, 0.006), (0.0125, 0.006), (0.0155, 0.003), (0.0155, -0.004)], segs=12,
              M4=T(cx, cy, zt - 0.002) @ R(math.atan(-slope), 'Y'), sharp=40))
    nx, ny = NODES[(i + 1) % 3]
    mx_, my_ = (cx + nx) / 2, (cy + ny) / 2
    hw, zt, slope = hull_at(mx_)
    ln = math.hypot(nx - cx, ny - cy)
    add(rbox('node_link', (ln, 0.006, 0.006), WHITE, T(mx_, my_, zt - 0.0025) @ R(math.atan(-slope), 'Y') @ R(math.atan2(ny - cy, nx - cx), 'Z'),
             bevel=0.001, segs=1, sharp=50))
# vent grille slots on the nose flanks
for s in (-1, 1):
    for i in range(3):
        cx = 0.300 - i * 0.027
        hw, zt, slope = hull_at(cx)
        add(rbox('nose_slot', (0.014, 0.046, 0.008), DARK, T(cx, s * (hw - 0.040), zt - 0.0075) @ R(s * -0.30, 'X') @ R(math.atan(-slope), 'Y'), bevel=0.002, segs=1, sharp=50))

# --------------------------------------------------------------- front end ---
# shovel nose with a splitter and a chunky bumper bar, slot-car style
add(rbox('splitter', (0.085, 0.60, 0.016), DARK, T(0.455, 0, 0.046), bevel=0.005, segs=1, sharp=50))
bar = [(0.452, -0.405, 0.070), (0.474, -0.385, 0.070), (0.486, -0.330, 0.070), (0.488, 0.0, 0.070), (0.486, 0.330, 0.070), (0.474, 0.385, 0.070), (0.452, 0.405, 0.070)]
add(tube('bumper', NAVY, bar, 0.019, N=8, up=(0, 0, 1), ell=1.25, sharp=70))
for s in (-1, 1):
    add(lathe('bumper_cap', PINK, [(0.0235, -0.012), (0.0255, 0.0), (0.0235, 0.008), (0.014, 0.013), (0, 0.014)], segs=10,
              M4=frame((0.450, s * 0.407, 0.070), (-0.9, s * 0.45, 0)), sharp=50))
    add(rbox('bumper_stay', (0.030, 0.016, 0.022), ENGINE, T(0.470, s * 0.215, 0.064), bevel=0.003, segs=1, sharp=50))
# light bar across the nose
add(rbox('lamp_bezel_f', (0.020, 0.270, 0.036), DARK, T(0.490, 0, 0.104), bevel=0.008, sharp=50))
for s in (-1, 1):
    add(rbox('lamp_f', (0.010, 0.094, 0.018), LAMP_F, T(0.4985, s * 0.066, 0.105), bevel=0.004, segs=1, sharp=50))
add(rbox('lamp_f_mid', (0.010, 0.018, 0.012), LED_P, T(0.4985, 0, 0.105), bevel=0.003, segs=1, sharp=50))

# ---------------------------------------------------------------- side pods ---
POD_Y = 0.305
POD_TOP = 0.186
for s in (-1, 1):
    c = s * POD_Y
    secs = [(0.158, 0.066, 0.148, 0.064, 3.2, c), (0.150, 0.100, 0.172, 0.050, 3.6, c),
            (0.110, 0.113, 0.183, 0.046, 3.8, c), (0.000, 0.116, POD_TOP, 0.046, 4.0, c),
            (-0.115, 0.114, 0.184, 0.046, 3.8, c), (-0.158, 0.100, 0.172, 0.050, 3.6, c),
            (-0.168, 0.066, 0.148, 0.064, 3.2, c)]
    add(xloft('pod', POD, secs, N=16, sub=1, sharp=60))
    # intake mouth with slats on the pod nose
    ring = sup_ring((0.1605, c, 0.108), (0, 1, 0), (0, 0, 1), 0.056, 0.030, e=3.0, N=12)
    add(make_obj('pod_mouth', ring, [tuple(range(12))], DARK, sharp=60, recalc=False))
    for k in (-1, 0, 1):
        add(rbox('pod_slat', (0.006, 0.104, 0.006), ENGINE, T(0.1625, c, 0.108 + k * 0.016), bevel=0.0, sharp=50))
    # case fan sunk in the pod roof
    fm = T(-0.035, c, POD_TOP - 0.003)
    add(lathe('fan_bezel', PINK, [(0.052, 0.0), (0.052, 0.011), (0.058, 0.016), (0.069, 0.016), (0.076, 0.009), (0.076, 0.0)], segs=20, M4=fm, sharp=40))
    add(lathe('fan_well', DARK, [(0, 0.0045), (0.052, 0.0045)], segs=20, M4=fm, sharp=60))
    for k in range(7):
        bm_ = fm @ R(2 * pi * k / 7, 'Z') @ T(0.031, 0, 0.0095) @ R(s * 0.42, 'X') @ R(0.25, 'Z')
        add(rbox('fan_blade', (0.036, 0.021, 0.0035), STEEL, bm_, bevel=0.0, sharp=50,
                 taper=lambda v: V((v.x, v.y * (0.7 if v.x < 0 else 1.25), v.z))))
    add(lathe('fan_hub', CHROME, [(0, 0.019), (0.012, 0.018), (0.017, 0.013), (0.017, 0.004)], segs=10, M4=fm, sharp=40))
    for a in (pi / 4, -pi / 4):
        add(rbox('fan_guard', (0.112, 0.007, 0.004), DARK, fm @ R(a, 'Z') @ T(0, 0, 0.0175), bevel=0.0, sharp=50))
    # roof louvres ahead of the fan
    for i in range(3):
        add(rbox('pod_louvre', (0.013, 0.150, 0.008), DARK, T(0.118 - i * 0.027, c, POD_TOP - 0.0035 - (0.0035 if i == 0 else 0)) @ R(-0.35, 'Y'), bevel=0.002, segs=1, sharp=50))
    for bx in (0.120, -0.128):
        add(bolt('bolt', CHROME, (bx, s * (POD_Y + 0.113), 0.150), (0, s, 0.2), 0.006))

# ------------------------------------------------------------------ cockpit ---
path = []
for k in range(32):
    th = 2 * pi * k / 32
    x = -0.062 + 0.218 * sgnpow(math.cos(th), 2 / 4.2)
    y = 0.166 * sgnpow(math.sin(th), 2 / 4.2)
    z = 0.214 + 0.022 * max(0.0, math.cos(th)) ** 2 + 0.018 * max(0.0, -math.cos(th)) ** 2
    path.append((x, y, z))
add(tube('coaming', PINK, path, 0.020, N=8, closed=True, up=(0, 0, 1), ell=1.4, sharp=70))
ring = sup_ring((-0.062, 0, 0.2085), (1, 0, 0), (0, 1, 0), 0.208, 0.158, e=4.0, N=24)
add(make_obj('cockpit_floor', ring, [tuple(range(24))], DARK, sharp=60, recalc=False))
add(rbox('seat_base', (0.17, 0.215, 0.03), SEAT, T(-0.150, 0, 0.212), bevel=0.012, sharp=50))
seat_m = T(-0.262, 0, 0.276) @ R(-0.16, 'Y')
add(rbox('seat_back', (0.044, 0.250, 0.125), SEAT, seat_m, bevel=0.016, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.84), v.z))))
add(rbox('seat_piping', (0.050, 0.170, 0.012), PINK, seat_m @ T(0, 0, 0.066), bevel=0.005, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('seat_bolster', (0.10, 0.03, 0.06), SEAT, T(-0.205, s * 0.120, 0.240) @ R(-0.12, 'Y'), bevel=0.012, sharp=50))

# low visor on the cowl
arc = [(0.030 + 0.150 * math.cos(math.radians(a)), 0.158 * math.sin(math.radians(a)), 0.250 - 0.014 * abs(a) / 56) for a in range(-56, 57, 14)]
add(tube('screen', GLASS, arc, [0.010, 0.015, 0.019, 0.021, 0.022, 0.021, 0.019, 0.015, 0.010], N=8, ell=0.16, up=(0.45, 0, 1), sharp=70))
# steering wheel
sw = T(0.118, 0, 0.268) @ R(-1.12, 'Y')
add(torus('steer_ring', DARK, 0.044, 0.009, M4=sw, segs=18, rsegs=6))
add(rbox('steer_bar', (0.013, 0.084, 0.006), DARK, sw, bevel=0.002, segs=1, sharp=50))
add(rbox('steer_stem', (0.044, 0.013, 0.006), DARK, sw @ T(-0.022, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', PINK, [(0, 0.008), (0.011, 0.007), (0.014, 0.003), (0.014, -0.004)], segs=10, M4=sw, sharp=40))
add(tube('steer_column', ENGINE, [(0.121, 0, 0.265), (0.180, 0, 0.236)], 0.008, N=6))

# ------------------------------------------------------------- server rack ---
RX0, RX1 = -0.305, -0.462      # front and rear faces
RHW = 0.165                    # half width
RZ0, RZ1 = 0.215, 0.330        # bottom and top
rcx = (RX0 + RX1) / 2
add(rbox('rack', (RX0 - RX1, RHW * 2, RZ1 - RZ0), RACK, T(rcx, 0, (RZ0 + RZ1) / 2), bevel=0.010, sharp=50))
# corner rails (the rack's uprights), pink
for s in (-1, 1):
    for x in (RX0 + 0.004, RX1 - 0.004):
        add(rbox('rack_rail', (0.016, 0.016, RZ1 - RZ0 + 0.012), PINK, T(x, s * (RHW + 0.001), (RZ0 + RZ1) / 2 + 0.004), bevel=0.004, segs=1, sharp=50))
# three server blades on the rear face: dark faceplate, lights, grille, handle
LEDS = [LED_G, LED_W, LED_A, LED_G, LED_W, LED_P, LED_G, LED_W, LED_W, LED_G, LED_A, LED_W]
li = 0
for r in range(3):
    z = RZ0 + 0.024 + r * 0.034
    add(rbox('blade', (0.010, 0.290, 0.027), DARK, T(RX1 - 0.003, 0, z), bevel=0.003, segs=1, sharp=50))
    for k in range(4):
        add(rbox('led', (0.006, 0.016, 0.013), LEDS[li % len(LEDS)], T(RX1 - 0.0085, 0.122 - k * 0.023, z), bevel=0.0, sharp=50)); li += 1
    for k in range(5):
        add(rbox('blade_slot', (0.004, 0.013, 0.017), ENGINE, T(RX1 - 0.0085, 0.006 - k * 0.021, z), bevel=0.0, sharp=50))
    add(rbox('blade_handle', (0.012, 0.020, 0.018), CHROME, T(RX1 - 0.011, -0.124, z), bevel=0.003, segs=1, sharp=50))
# status lights and a vent on each side of the rack
for s in (-1, 1):
    for k in range(4):
        add(rbox('led', (0.013, 0.006, 0.010), LEDS[(k * 3 + (0 if s > 0 else 5)) % len(LEDS)], T(RX0 - 0.030 - k * 0.022, s * (RHW + 0.002), RZ1 - 0.020), bevel=0.0, sharp=50))
    for k in range(3):
        add(rbox('rack_vent', (0.100, 0.005, 0.009), DARK, T(rcx, s * (RHW + 0.0015), RZ0 + 0.030 + k * 0.017), bevel=0.0, sharp=50))
# heat sink on top
add(rbox('sink_base', (0.118, 0.262, 0.010), STEEL, T(rcx + 0.006, 0, RZ1 + 0.004), bevel=0.003, segs=1, sharp=50))
for k in range(9):
    add(rbox('sink_fin', (0.112, 0.009, 0.030), STEEL, T(rcx + 0.006, (k - 4) * 0.030, RZ1 + 0.022), bevel=0.002, segs=1, sharp=50,
             taper=lambda v: V((v.x * (1.0 if v.z < 0 else 0.86), v.y, v.z))))
# whip antenna (left) and dish (right) on the rack's back corners
ab = (RX1 + 0.018, 0.146, RZ1)
add(lathe('antenna_base', CHROME, [(0.015, 0.0), (0.015, 0.008), (0.010, 0.016), (0.0065, 0.022)], segs=10, M4=T(*ab), sharp=40))
tip = (ab[0] - 0.040, ab[1] + 0.006, ab[2] + 0.092)
add(tube('antenna', ENGINE, [(ab[0], ab[1], ab[2] + 0.018), (ab[0] - 0.012, ab[1] + 0.002, ab[2] + 0.055), tip], [0.0075, 0.0068, 0.006], N=6, sharp=70))
add(lathe('antenna_ball', PINK, [(0, 0.017), (0.012, 0.012), (0.017, 0.0), (0.012, -0.012), (0, -0.017)], segs=10, M4=T(*tip), sharp=70))
db = (RX1 + 0.020, -0.140, RZ1)
add(tube('dish_stalk', CHROME, [db, (db[0], db[1], db[2] + 0.034)], 0.007, N=6))
dm = frame((db[0] - 0.004, db[1], db[2] + 0.046), (-0.55, -0.25, 0.80))
add(lathe('dish', WHITE, [(0, -0.004), (0.022, 0.002), (0.040, 0.014), (0.043, 0.016), (0.040, 0.010), (0.022, -0.004), (0, -0.010)], segs=14, M4=dm, sharp=50))
add(tube('dish_feed', ENGINE, [dm @ V((0, 0, -0.002)), dm @ V((0, 0, 0.030))], 0.0035, N=5))
add(lathe('dish_horn', PINK, [(0, 0.007), (0.007, 0.004), (0.007, -0.004), (0, -0.006)], segs=8, M4=dm @ T(0, 0, 0.032), sharp=50))
# cables from the rack down into the pods
for s in (-1, 1):
    for j, (m, dz, rad) in enumerate(((PINK, 0.0, 0.0085), (WHITE, -0.026, 0.0065))):
        x0 = RX0 - 0.030 - j * 0.040
        pts = [(x0, s * (RHW - 0.004), RZ0 + 0.062 + dz), (x0 + 0.010, s * 0.176, RZ0 + 0.068 + dz), (x0 + 0.060, s * 0.205, RZ0 + 0.052 + dz),
               (-0.200 + j * 0.016, s * (0.228 + j * 0.016), 0.232 + dz * 0.6), (-0.150, s * (0.252 + j * 0.030), 0.200), (-0.128, s * (0.262 + j * 0.030), 0.176)]
        add(tube('cable', m, pts, rad, N=6, sharp=70))
        add(lathe('cable_boot', ENGINE, [(rad + 0.006, -0.004), (rad + 0.006, 0.006), (rad + 0.002, 0.010)], segs=8, M4=frame(pts[0], (0, s, 0)), sharp=40))
        add(lathe('cable_gland', ENGINE, [(rad + 0.007, 0.0), (rad + 0.007, 0.006), (rad + 0.002, 0.010)], segs=8, M4=T(pts[-1][0], pts[-1][1], 0.180), sharp=40))

# ---------------------------------------------------------------- tail end ---
add(rbox('lamp_bezel_r', (0.016, 0.250, 0.044), DARK, T(-0.492, 0, 0.142), bevel=0.007, sharp=50))
for s in (-1, 1):
    add(rbox('lamp_r', (0.010, 0.094, 0.024), LAMP_R, T(-0.500, s * 0.060, 0.142), bevel=0.005, sharp=50))
    for fy in (0.040, 0.105):
        add(rbox('diffuser_fin', (0.07, 0.008, 0.034), DARK, T(-0.458, s * fy, 0.062), bevel=0.002, segs=1, sharp=50))
add(rbox('plate', (0.006, 0.060, 0.026), WHITE, T(-0.4975, 0, 0.103), bevel=0.002, segs=1, sharp=50))
# navy rear bumper bar and exhaust-vent slats under the rack
rbar = [(-0.462, -0.215, 0.078), (-0.486, -0.190, 0.078), (-0.497, -0.120, 0.078), (-0.497, 0.120, 0.078), (-0.486, 0.190, 0.078), (-0.462, 0.215, 0.078)]
add(tube('bumper_r', NAVY, rbar, 0.016, N=8, up=(0, 0, 1), ell=1.2, sharp=70))
for cx in (-0.4715, -0.4855):
    hw, zt, slope = hull_at(cx)
    add(rbox('tail_slat', (0.009, 0.230, 0.008), DARK, T(cx, 0, zt - 0.002) @ R(math.atan(-slope), 'Y'), bevel=0.002, segs=1, sharp=50))

# --------------------------------------------------------------- suspension ---
for s in (-1, 1):
    yi = FW['y'] - FW['W'] / 2 + 0.012
    for zt, zh in ((0.158, 0.150), (0.082, 0.072)):
        for xh in (0.350, 0.258):
            add(tube('arm_f', ENGINE, [(xh, s * 0.150, zh), (FW['x'], s * yi, zt)], 0.0078, N=6, ell=0.55, up=(0, 0, 1)))
    add(tube('tie_rod', STEEL, [(0.250, s * 0.150, 0.120), (0.272, s * yi, 0.118)], 0.005, N=5))
    add(tube('coil_f', PINK, [(0.299, s * 0.236, 0.096), (0.296, s * 0.166, 0.158)], 0.012, N=8, sharp=70))
    add(tube('coil_f_rod', STEEL, [(0.300, s * 0.252, 0.082), (0.2955, s * 0.150, 0.172)], 0.006, N=6))
    yr = RW['y'] - RW['W'] / 2 + 0.012
    add(tube('axle', ENGINE, [(RW['x'], s * 0.05, RW['R']), (RW['x'], s * yr, RW['R'])], 0.017, N=8, sharp=70))
    add(tube('arm_r_up', ENGINE, [(-0.352, s * 0.13, 0.205), (RW['x'], s * yr, 0.190)], 0.0085, N=6, ell=0.55, up=(0, 0, 1)))

body = join(P, 'noderunner_body')


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
    PT(1.0, 0.64); PT(0.972, 0.83); PT(0.90, 0.96); PT(0.80, 1.0); PT(0.72, 0.975); PT(0.665, 0.86); PT(0.64, 0.74)
    shoulder = {3, len(prof) - 6}
    segs = 28

    def rmod(pi_, k):
        return -0.040 * Rr if (pi_ in shoulder and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    # fat neon rim lip, dark dish behind turbine blades
    parts.append(lathe('rim', W_PINK, [(0.655 * Rr, hw * 0.70), (0.675 * Rr, hw * 0.82), (0.705 * Rr, hw * 0.93), (0.690 * Rr, hw * 1.00),
                                       (0.630 * Rr, hw * 0.98), (0.580 * Rr, hw * 0.86)], segs=24, M4=A, sharp=45))
    parts.append(lathe('dish', W_DARK, [(0.580 * Rr, hw * 0.86), (0.555 * Rr, hw * 0.52), (0.50 * Rr, hw * 0.48), (0.0, hw * 0.48)], segs=24, M4=A, sharp=45))
    parts.append(lathe('back', W_DARK, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.62 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
    zf = hw * 0.70
    for k in range(6):
        Rs = A @ R(2 * pi * k / 6 + 0.2, 'Z')
        parts.append(rbox('blade', (0.40 * Rr, 0.27 * Rr, 0.055 * Rr), W_STEEL, Rs @ T(0.37 * Rr, 0, zf) @ R(0.38, 'X') @ R(0.20, 'Z'), bevel=0.003, segs=1, sharp=50,
                          taper=lambda v: V((v.x, v.y * (0.62 if v.x < 0 else 1.25), v.z))))
    parts.append(lathe('hub', W_PINK, [(0, zf + 0.095 * Rr), (0.17 * Rr, zf + 0.09 * Rr), (0.235 * Rr, zf + 0.045 * Rr), (0.245 * Rr, hw * 0.48)], segs=14, M4=A, sharp=40))
    parts.append(lathe('cap', W_CHROME, [(0, zf + 0.15 * Rr), (0.07 * Rr, zf + 0.145 * Rr), (0.10 * Rr, zf + 0.115 * Rr), (0.10 * Rr, zf + 0.085 * Rr)], segs=10, M4=A, sharp=40))
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
    final = final_material('noderunner_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)


for c in stand_ins:
    bpy.data.objects.remove(c)


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward); left wheels are
    mirrored meshes that share the right wheels' texture space."""
    root = empty('node_runner_v2')
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
