# Cold Wallet v2: an armoured vault on wheels. Gunmetal tub, light steel
# armour plates with rivets, steel-blue bumpers, fenders and cockpit rim, a
# round vault door with a handwheel on the tail, a combination dial on the
# hood, chunky block-tread tyres and ice-blue glow strips.
# Built from nothing by script (no imported meshes, no external images).
#
#   blender -b -P build_coldwallet.py -- out/cold-wallet-v2.glb [--preview renders/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0. The file is
# flipped at the end so the nose is on -X, the facing the game already has on
# record for the Cold Wallet (KART_NOSE_YAW.coldwallet), which makes it a
# drop-in for cold-wallet.glb.
#
# Colour rule from the race shader: a texel whose linear chroma (max - min) is
# over about 0.08 counts as paint and takes racer washes and bought paints.
# So the blue and the ice glow are the paint; gunmetal, steel, rubber and the
# seat are kept under 0.07 chroma so they stay metal under any paint.
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
C_BLUE = (0.085, 0.27, 0.62)
C_ICE = (0.28, 0.82, 1.0)
C_GUN = (0.160, 0.178, 0.208)
C_STEEL = (0.38, 0.40, 0.44)
C_INK = (0.02, 0.024, 0.032)


def hull_pattern(t, c):
    # panel seams across the tub, and a darker skirt along the bottom edge
    x, y, z = objcoord(t)
    lines = None
    for gx in (0.385, 0.150, -0.285, -0.375):
        g = band(t, x, gx - 0.002, gx + 0.002, soft=0.001)
        lines = g if lines is None else mth(t, 'MAXIMUM', lines, g)
    c = mixc(t, mth(t, 'MULTIPLY', lines, 0.85), c, C_INK)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, smooth(t, z, 0.066, 0.072)), 0.6), c, C_INK)


def tyre_pattern(t, c):
    # block tread: wide chevron bars round the tread and shoulders (axle = local X)
    x, y, z = objcoord(t)
    g = nd(t, 'ShaderNodeNewGeometry')
    tc = nd(t, 'ShaderNodeVectorTransform', vector_type='NORMAL', convert_from='WORLD', convert_to='OBJECT')
    t.links.new(g.outputs['Normal'], tc.inputs[0])
    sep = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs[0], sep.inputs[0])
    tread = mth(t, 'SUBTRACT', 1.0, smooth(t, mth(t, 'ABSOLUTE', sep.outputs[0]), 0.55, 0.8))
    ang = mth(t, 'ARCTAN2', z, y)
    v = mth(t, 'ADD', mth(t, 'MULTIPLY', ang, 16 / (2 * pi)), mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', x), 7.0))
    bar = mth(t, 'LESS_THAN', mth(t, 'FRACT', v), 0.30)
    edge = smooth(t, mth(t, 'ABSOLUTE', x), 0.010, 0.018)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', bar, tread), mth(t, 'MULTIPLY', edge, 0.75)), c, (0.006, 0.006, 0.008))


HULL_M = mat('gun_hull', C_GUN, rough=0.42, metal=0.45, pattern=hull_pattern, edge=0.55)
GUN = mat('gun', C_GUN, rough=0.42, metal=0.45, edge=0.55)
BLUE = mat('blue', C_BLUE, rough=0.32, edge=0.45)
PLATE = mat('plate', C_STEEL, rough=0.34, metal=0.6, edge=0.8)
CHROME = mat('chrome', (0.62, 0.64, 0.68), rough=0.2, metal=0.8, edge=0.8)
DARK = mat('dark', (0.03, 0.033, 0.042), rough=0.5)
SEAT = mat('seat', (0.05, 0.052, 0.062), rough=0.75, edge=0.35)
GLASS = mat('glass', (0.03, 0.07, 0.10), rough=0.08)
ICE = mat('ice', (0.6, 0.95, 1.0), rough=0.2, emit=(0.0, 0.74, 1.0), emit_strength=1.0)
ICE_TRIM = mat('ice_trim', C_ICE, rough=0.3)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.04, 0.04, 0.045), rough=0.9, toplight=False, ao_floor=0.45, edge=0.5, pattern=tyre_pattern)
RIM = mat('rim', (0.50, 0.52, 0.56), rough=0.28, metal=0.65, toplight=False, edge=0.75)
RIM_DARK = mat('rim_dark', (0.035, 0.037, 0.045), rough=0.45, toplight=False)
W_ICE = mat('w_ice', C_ICE, rough=0.3, toplight=False)
W_BLUE = mat('w_blue', C_BLUE, rough=0.32, toplight=False)

P = []


def add(o):
    P.append(o); return o


def rivet(pos, nrm, r=0.0052, material=None):
    return add(lathe('rivet', material or CHROME, [(0, r * 0.62), (r * 0.72, r * 0.42), (r, 0.0), (r, -r * 0.5)], segs=6, M4=frame(pos, nrm), sharp=30))


def arch(name, material, cx, cz, r0, r1, y0, y1, a0, a1, n=5, bevel=0.004):
    """faceted armour fender: an arc of flat plates round a wheel centre"""
    rings = []
    for k in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * k / n)
        ca, sa = math.cos(a), math.sin(a)
        rings.append([V((cx + r0 * ca, y0, cz + r0 * sa)), V((cx + r0 * ca, y1, cz + r0 * sa)),
                      V((cx + r1 * ca, y1, cz + r1 * sa)), V((cx + r1 * ca, y0, cz + r1 * sa))])
    v, f = loft(rings)
    return make_obj(name, v, f, material, sharp=35, bevel=bevel, bevel_segs=1)


# ------------------------------------------------------------------- hull ---
HULL = [  # x, half width, top, bottom, exponent
    (0.452, 0.120, 0.156, 0.078, 4.0),
    (0.436, 0.146, 0.176, 0.064, 5.0),
    (0.385, 0.152, 0.196, 0.056, 5.0),
    (0.300, 0.150, 0.224, 0.052, 5.0),
    (0.180, 0.164, 0.258, 0.050, 5.0),
    (0.110, 0.172, 0.276, 0.050, 5.0),
    (0.078, 0.172, 0.272, 0.050, 5.0),
    (0.052, 0.172, 0.212, 0.050, 5.0),
    (-0.236, 0.172, 0.212, 0.050, 5.0),
    (-0.262, 0.168, 0.292, 0.050, 5.0),
    (-0.300, 0.162, 0.302, 0.052, 5.0),
    (-0.425, 0.158, 0.302, 0.060, 5.0),
    (-0.455, 0.150, 0.294, 0.070, 4.5),
]
FW = dict(R=0.132, W=0.160, x=0.300, y=0.282)
RW = dict(R=0.156, W=0.192, x=-0.298, y=0.274)


def hull_at(x):
    """(half width, top, slope of the top) of the hull at x"""
    for a, b in zip(HULL, HULL[1:]):
        if b[0] <= x <= a[0]:
            f = (x - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, (b[2] - a[2]) / (b[0] - a[0])
    return 0.15, 0.2, 0.0


def on_hood(x, y, lift=0.0):
    """point on the hood top and the matrix of a part lying on it"""
    hw, zt, slope = hull_at(x)
    n = V((-slope, 0, 1)).normalized()
    p = V((x, y, zt)) + n * lift
    return p, n, T(p.x, p.y, p.z) @ R(math.atan(-slope), 'Y')


add(xloft('hull', HULL_M, HULL, N=20, sub=1, sharp=60))
add(rbox('floor', (0.84, 0.27, 0.022), DARK, T(0.0, 0, 0.047), bevel=0.008, segs=1, sharp=50))

# ---------------------------------------------------------------- front end ---
# heavy steel-blue bumper across the full width, like the kart it replaces
add(rbox('bumper_f', (0.052, 0.700, 0.072), BLUE, T(0.472, 0, 0.098), bevel=0.014, sharp=50,
         taper=lambda v: V((v.x - (0.030 if abs(v.y) > 0.3 else 0.0), v.y, v.z))))
add(rbox('bumper_f_plate', (0.020, 0.200, 0.084), PLATE, T(0.492, 0, 0.100), bevel=0.006, sharp=50))
add(rbox('bumper_f_lip', (0.070, 0.560, 0.016), DARK, T(0.452, 0, 0.058), bevel=0.005, segs=1, sharp=50))
# keyhole on the centre plate
kh = frame((0.5025, 0, 0.112), (1, 0, 0), (0, 1, 0))
add(lathe('keyhole', ICE, [(0, 0.003), (0.0125, 0.003), (0.0135, 0.0)], segs=12, M4=kh, sharp=60))
add(rbox('keyhole_slot', (0.005, 0.013, 0.036), ICE, T(0.5025, 0, 0.092), bevel=0.0, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.5 if v.z < 0 else 0.8), v.z))))
for s in (-1, 1):
    for z in (0.068, 0.132):
        rivet((0.502, s * 0.084, z), (1, 0, 0), 0.0058)
    # headlamps set into the bumper
    add(rbox('lamp_bezel_f', (0.014, 0.150, 0.046), DARK, T(0.494, s * 0.205, 0.102), bevel=0.006, sharp=50))
    add(rbox('lamp_f', (0.010, 0.128, 0.024), ICE, T(0.500, s * 0.205, 0.102), bevel=0.005, sharp=50))
    # tow hooks
    add(torus('tow', CHROME, 0.017, 0.006, M4=T(0.493, s * 0.122, 0.070) @ R(pi / 2, 'X'), segs=10, rsegs=5))
    # bumper brackets back to the hull
    add(rbox('bumper_bracket', (0.050, 0.030, 0.040), GUN, T(0.435, s * 0.105, 0.105), bevel=0.005, segs=1, sharp=50))

# hood armour plate with the combination dial
p, n, m = on_hood(0.262, 0, 0.004)
add(rbox('hood_plate', (0.200, 0.236, 0.012), PLATE, m, bevel=0.005, sharp=50,
         taper=lambda v: V((v.x, v.y * (0.84 if v.x > 0 else 1.0), v.z))))
for s in (-1, 1):
    for dx in (-0.084, 0.0, 0.084):
        q = m @ V((dx, s * (0.106 - (0.014 if dx > 0.05 else 0.0)), 0.0065))
        rivet(q, n)
dm = frame(m @ V((0.004, 0, 0.006)), n, (1, 0, 0))
add(lathe('dial_base', DARK, [(0.066, 0.0), (0.066, 0.006), (0.060, 0.009)], segs=24, M4=dm, sharp=45))
add(lathe('dial_face', PLATE, [(0.060, 0.009), (0.056, 0.012), (0.030, 0.012)], segs=24, M4=dm, sharp=45))
for k in range(24):
    a = 2 * pi * k / 24
    big = k % 3 == 0
    ln = 0.014 if big else 0.008
    add(rbox('dial_tick', (ln, 0.0042 if big else 0.0026, 0.002), DARK,
             dm @ R(a, 'Z') @ T(0.0545 - ln / 2, 0, 0.0125), bevel=0.0, sharp=50))


def knurl(pi_, k):
    return -0.0026 if (pi_ in (1, 2) and k % 2 == 0) else 0.0


add(lathe('dial_knob', BLUE, [(0.031, 0.010), (0.031, 0.026), (0.029, 0.030), (0.019, 0.032), (0, 0.032)], segs=20, M4=dm, rmod=knurl, sharp=40))
add(lathe('dial_cap', CHROME, [(0.012, 0.032), (0.012, 0.036), (0.009, 0.038), (0, 0.038)], segs=10, M4=dm, sharp=40))
add(rbox('dial_pointer', (0.016, 0.010, 0.004), ICE, dm @ T(0.074, 0, 0.004), bevel=0.0, sharp=50,
         taper=lambda v: V((v.x, v.y * (0.15 if v.x < 0 else 1.0), v.z))))
# nose armour: a blue cap plate on the snout with two vents
p, n, m = on_hood(0.408, 0, 0.003)
add(rbox('nose_cap', (0.070, 0.240, 0.012), BLUE, m, bevel=0.005, sharp=50))
for s in (-1, 1):
    add(rbox('nose_vent', (0.036, 0.060, 0.006), DARK, m @ T(0.0, s * 0.062, 0.006), bevel=0.002, segs=1, sharp=50))
    rivet(m @ V((0.0, s * 0.108, 0.0065)), n)

# bolted armour strips down the hood flanks
for s in (-1, 1):
    add(rbox('flank_plate', (0.170, 0.012, 0.062), PLATE, T(0.292, s * 0.153, 0.142) @ R(-0.20, 'Y'), bevel=0.004, sharp=50,
             taper=lambda v: V((v.x, v.y, v.z * (0.72 if v.x > 0 else 1.0)))))
    for dx in (-0.066, 0.0, 0.066):
        q = T(0.292, s * 0.153, 0.142) @ R(-0.20, 'Y') @ V((dx, s * 0.006, 0.0))
        rivet(q, (0, s, 0), 0.0058)

# ----------------------------------------------------------------- sponsons ---
for s in (-1, 1):
    add(rbox('sponson', (0.262, 0.108, 0.112), BLUE, T(0.002, s * 0.226, 0.112), bevel=0.016, sharp=50,
             taper=lambda v: V((v.x * (1.0 if v.z < 0 else 0.90), v.y, v.z))))
    add(rbox('step', (0.200, 0.086, 0.012), PLATE, T(0.002, s * 0.224, 0.172), bevel=0.004, sharp=50))
    for i in range(5):
        add(rbox('step_rib', (0.010, 0.070, 0.006), DARK, T(-0.064 + i * 0.033, s * 0.224, 0.179), bevel=0.002, segs=1, sharp=50))
    # glow strip along the sponson flank
    add(rbox('glow_side', (0.190, 0.008, 0.016), ICE, T(0.002, s * 0.281, 0.100), bevel=0.003, segs=1, sharp=50))
    add(rbox('glow_side_bezel', (0.214, 0.008, 0.034), DARK, T(0.002, s * 0.278, 0.100), bevel=0.003, segs=1, sharp=50))
    for bx in (-0.108, 0.112):
        rivet((bx, s * 0.2805, 0.140), (0, s, 0), 0.006)
        rivet((bx, s * 0.2805, 0.084), (0, s, 0), 0.006)

# ------------------------------------------------------------------ cockpit ---
path = []
for k in range(32):
    th = 2 * pi * k / 32
    x = -0.092 + 0.186 * sgnpow(math.cos(th), 2 / 5.0)
    y = 0.152 * sgnpow(math.sin(th), 2 / 5.0)
    z = 0.268 + 0.010 * max(0.0, math.cos(th)) ** 2 + 0.026 * max(0.0, -math.cos(th)) ** 2
    path.append((x, y, z))
add(tube('coaming', BLUE, path, 0.024, N=8, closed=True, up=(0, 0, 1), ell=1.25, sharp=70))
for s in (-1, 1):
    add(rbox('tub_wall', (0.330, 0.034, 0.070), GUN, T(-0.092, s * 0.156, 0.236), bevel=0.006, segs=1, sharp=50))
    for bx in (-0.19, -0.092, 0.006):
        rivet((bx, s * 0.1745, 0.232), (0, s, 0), 0.0058)
add(rbox('dash', (0.030, 0.270, 0.060), GUN, T(0.070, 0, 0.240), bevel=0.006, segs=1, sharp=50))
add(rbox('tub_floor', (0.300, 0.270, 0.010), DARK, T(-0.092, 0, 0.213), bevel=0.0, sharp=50))
add(rbox('seat_base', (0.170, 0.205, 0.028), SEAT, T(-0.150, 0, 0.226), bevel=0.012, sharp=50))
seat_m = T(-0.262, 0, 0.312) @ R(-0.16, 'Y')
add(rbox('seat_back', (0.050, 0.262, 0.170), SEAT, seat_m, bevel=0.016, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.84), v.z))))
add(rbox('seat_piping', (0.052, 0.170, 0.012), ICE_TRIM, seat_m @ T(0, 0, 0.083), bevel=0.005, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('seat_bolster', (0.110, 0.030, 0.064), SEAT, T(-0.198, s * 0.112, 0.262) @ R(-0.12, 'Y'), bevel=0.012, sharp=50))

# armoured visor on the cowl: steel plate with a glass slit
vm = T(0.118, 0, 0.300) @ R(-0.42, 'Y')
add(rbox('visor', (0.014, 0.290, 0.066), PLATE, vm, bevel=0.005, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.86), v.z))))
add(rbox('visor_slit', (0.017, 0.200, 0.020), GLASS, vm @ T(0, 0, 0.008), bevel=0.003, segs=1, sharp=50))
for s in (-1, 1):
    rivet(vm @ V((0.0072, s * 0.122, -0.016)), vm.to_3x3() @ V((1, 0, 0)))
# steering wheel
sw = T(0.040, 0, 0.300) @ R(-1.10, 'Y')
add(torus('steer_ring', DARK, 0.046, 0.009, M4=sw, segs=18, rsegs=6))
add(rbox('steer_bar', (0.013, 0.088, 0.006), DARK, sw, bevel=0.002, segs=1, sharp=50))
add(rbox('steer_stem', (0.046, 0.013, 0.006), DARK, sw @ T(-0.023, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', ICE_TRIM, [(0, 0.008), (0.011, 0.007), (0.014, 0.003), (0.014, -0.004)], segs=10, M4=sw, sharp=40))
add(tube('steer_column', GUN, [(0.043, 0, 0.297), (0.090, 0, 0.268)], 0.008, N=6))

# ---------------------------------------------------------------- roll hoop ---
# boxy armoured hoop behind the seat with a light bar across the top
for s in (-1, 1):
    add(rbox('hoop_post', (0.040, 0.034, 0.130), GUN, T(-0.318, s * 0.128, 0.352) @ R(-0.10, 'Y'), bevel=0.007, sharp=50))
    add(rbox('hoop_gusset', (0.090, 0.022, 0.050), GUN, T(-0.362, s * 0.128, 0.318) @ R(0.5, 'Y'), bevel=0.005, segs=1, sharp=50))
    rivet((-0.312, s * 0.146, 0.330), (0, s, 0), 0.0058)
    rivet((-0.318, s * 0.146, 0.385), (0, s, 0), 0.0058)
add(rbox('hoop_bar', (0.046, 0.300, 0.036), BLUE, T(-0.326, 0, 0.418), bevel=0.008, sharp=50))
add(rbox('light_bar', (0.012, 0.210, 0.016), ICE, T(-0.350, 0, 0.418), bevel=0.004, segs=1, sharp=50))
add(rbox('light_bar_f', (0.012, 0.210, 0.016), ICE, T(-0.302, 0, 0.418), bevel=0.004, segs=1, sharp=50))
add(rbox('headrest', (0.030, 0.110, 0.050), SEAT, T(-0.296, 0, 0.385), bevel=0.010, sharp=50))

# --------------------------------------------------------------- vault deck ---
add(rbox('deck_plate', (0.130, 0.270, 0.012), PLATE, T(-0.385, 0, 0.3035), bevel=0.005, sharp=50))
for s in (-1, 1):
    for bx in (-0.438, -0.334):
        rivet((bx, s * 0.120, 0.310), (0, 0, 1))
    # grab handles
    add(tube('handle', CHROME, [(-0.428, s * 0.088, 0.308), (-0.428, s * 0.088, 0.326), (-0.345, s * 0.088, 0.326), (-0.345, s * 0.088, 0.308)], 0.0055, N=6, sharp=70))
# hardware-wallet screen on the deck
add(rbox('screen_body', (0.070, 0.110, 0.016), DARK, T(-0.385, 0, 0.314), bevel=0.005, sharp=50))
add(rbox('screen', (0.036, 0.086, 0.006), ICE, T(-0.376, 0, 0.3215), bevel=0.002, segs=1, sharp=50))
for s in (-1, 1):
    add(lathe('screen_button', CHROME, [(0, 0.004), (0.006, 0.004), (0.007, 0.0)], segs=8, M4=T(-0.409, s * 0.022, 0.322), sharp=40))

# ---------------------------------------------------------------- vault door ---
DZ = 0.184
vd = frame((-0.455, 0, DZ), (-1, 0, 0), (0, 1, 0))
add(lathe('door_frame', BLUE, [(0.112, -0.012), (0.112, 0.008), (0.106, 0.014), (0.094, 0.014), (0.091, 0.008)], segs=28, M4=vd, sharp=45))
add(lathe('door_glow', ICE, [(0.092, 0.010), (0.081, 0.010)], segs=28, M4=vd, sharp=60))
add(lathe('door', PLATE, [(0.083, 0.004), (0.083, 0.017), (0.076, 0.023), (0.052, 0.023), (0.047, 0.028), (0, 0.028)], segs=28, M4=vd, sharp=40))
for k in range(8):
    a = 2 * pi * (k + 0.5) / 8
    pos = vd @ V((0.100 * math.cos(a), 0.100 * math.sin(a), 0.014))
    add(bolt('door_bolt', CHROME, pos, (-1, 0, 0), 0.0062))
    # locking pins round the door edge
    pos = vd @ V((0.064 * math.cos(a), 0.064 * math.sin(a), 0.023))
    add(lathe('door_pin', GUN, [(0, 0.006), (0.0075, 0.006), (0.0085, 0.0)], segs=8, M4=frame(pos, (-1, 0, 0)), sharp=40))
# handwheel
add(lathe('hand_boss', DARK, [(0.020, 0.028), (0.018, 0.040), (0.011, 0.044), (0, 0.044)], segs=12, M4=vd, sharp=40))
hm = vd @ T(0, 0, 0.040)
add(torus('hand_ring', BLUE, 0.050, 0.0085, M4=hm, segs=20, rsegs=6))
for k in range(3):
    a = 2 * pi * k / 3 + pi / 2
    add(rbox('hand_spoke', (0.050, 0.012, 0.009), BLUE, hm @ R(a, 'Z') @ T(0.027, 0, 0), bevel=0.002, segs=1, sharp=50))
    pos = hm @ V((0.050 * math.cos(a), 0.050 * math.sin(a), 0.005))
    add(lathe('hand_knob', CHROME, [(0, 0.013), (0.009, 0.011), (0.0105, 0.002), (0.007, -0.002)], segs=8, M4=frame(pos, (-1, 0, 0)), sharp=40))
# hinges on the left of the door
for dz in (-0.045, 0.045):
    add(rbox('hinge', (0.026, 0.050, 0.030), GUN, T(-0.470, 0.108, DZ + dz), bevel=0.005, segs=1, sharp=50))
    add(tube('hinge_pin', CHROME, [(-0.478, 0.128, DZ + dz - 0.020), (-0.478, 0.128, DZ + dz + 0.020)], 0.0075, N=6, sharp=70))
# rear bumper and corner lamps
add(rbox('bumper_r', (0.044, 0.400, 0.050), BLUE, T(-0.476, 0, 0.060), bevel=0.012, sharp=50))
for s in (-1, 1):
    add(rbox('bumper_r_guard', (0.052, 0.036, 0.062), PLATE, T(-0.478, s * 0.070, 0.062), bevel=0.006, sharp=50))
    rivet((-0.5045, s * 0.070, 0.062), (-1, 0, 0), 0.006)
for s in (-1, 1):
    add(rbox('lamp_bezel_r', (0.016, 0.042, 0.118), DARK, T(-0.458, s * 0.134, 0.212), bevel=0.005, segs=1, sharp=50))
    add(rbox('lamp_r', (0.010, 0.028, 0.098), ICE, T(-0.465, s * 0.134, 0.212), bevel=0.004, segs=1, sharp=50))
    add(tube('exhaust', CHROME, [(-0.440, s * 0.128, 0.108), (-0.492, s * 0.134, 0.108)], [0.015, 0.017], N=8, sharp=70))
    add(lathe('exhaust_bore', DARK, [(0, 0.0), (0.0125, 0.0)], segs=8, M4=frame((-0.4926, s * 0.134, 0.108), (-1, 0, 0)), sharp=60, recalc=False))

# ------------------------------------------------------------------ fenders ---
for s in (-1, 1):
    y0, y1 = (0.166, 0.318) if s > 0 else (-0.318, -0.166)
    add(arch('fender_r', BLUE, RW['x'], RW['R'], RW['R'] + 0.016, RW['R'] + 0.030, y0, y1, 42, 138, n=4))
    add(arch('fender_r_edge', PLATE, RW['x'], RW['R'], RW['R'] + 0.012, RW['R'] + 0.034, s * 0.318, s * 0.336, 42, 138, n=4, bevel=0.003))
    for a in (54, 90, 126):
        ar = math.radians(a)
        rr = RW['R'] + 0.030
        rivet((RW['x'] + rr * math.cos(ar) * 0.985, s * 0.296, RW['R'] + rr * math.sin(ar) * 0.985), (math.cos(ar), 0, math.sin(ar)), 0.006)
    add(rbox('fender_stay', (0.030, 0.050, 0.060), GUN, T(RW['x'] - 0.01, s * 0.176, 0.300), bevel=0.005, segs=1, sharp=50))

# --------------------------------------------------------------- suspension ---
for s in (-1, 1):
    yi = FW['y'] - FW['W'] / 2 + 0.014
    for zt, zh in ((0.176, 0.186), (0.090, 0.082)):
        for xh in (0.352, 0.250):
            add(tube('arm_f', GUN, [(xh, s * 0.120, zh), (FW['x'], s * yi, zt)], 0.0095, N=6, ell=0.6, up=(0, 0, 1)))
    add(tube('tie_rod', CHROME, [(0.250, s * 0.130, 0.134), (0.272, s * yi, 0.130)], 0.0055, N=5))
    add(tube('coil_f', ICE_TRIM, [(0.300, s * 0.214, 0.104), (0.297, s * 0.150, 0.196)], 0.014, N=8, sharp=70))
    add(tube('coil_f_rod', CHROME, [(0.3005, s * 0.228, 0.086), (0.2965, s * 0.138, 0.212)], 0.0065, N=6))
    yr = RW['y'] - RW['W'] / 2 + 0.014
    add(tube('axle', GUN, [(RW['x'], s * 0.05, RW['R']), (RW['x'], s * yr, RW['R'])], 0.020, N=8, sharp=70))

body = join(P, 'coldwallet_body')


# ------------------------------------------------------------------- wheels ---
def build_wheel(name, spec):
    """right-hand wheel: axle on local X, outer face on +X"""
    Rr, W = spec['R'], spec['W']; hw = W / 2
    A = frame((0, 0, 0), (1, 0, 0), (0, 1, 0))
    parts = []
    prof = []

    def PT(r, a):
        prof.append((r * Rr, a * hw))
    PT(0.60, -0.80); PT(0.74, -0.98); PT(0.89, -0.97); PT(0.975, -0.86); PT(1.0, -0.66)
    for g in (-0.30, 0.30):
        PT(1.0, g - 0.10); PT(0.94, g - 0.06); PT(0.94, g + 0.06); PT(1.0, g + 0.10)
    PT(1.0, 0.66); PT(0.975, 0.86); PT(0.89, 0.97); PT(0.78, 1.0); PT(0.69, 0.975); PT(0.625, 0.86); PT(0.60, 0.74)
    n = len(prof)
    lug = {2, 3, 4, n - 7, n - 6, n - 5}      # shoulder rows: deep square lugs
    segs = 32

    def rmod(pi_, k):
        return -0.050 * Rr if (pi_ in lug and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    parts.append(lathe('stripe', W_ICE, [(0.775 * Rr, hw * 0.998), (0.785 * Rr, hw * 1.018), (0.815 * Rr, hw * 1.012), (0.825 * Rr, hw * 0.990)], segs=segs, M4=A, sharp=60))
    parts.append(lathe('rim', RIM, [(0.615 * Rr, hw * 0.70), (0.635 * Rr, hw * 0.80), (0.660 * Rr, hw * 0.90), (0.645 * Rr, hw * 0.965),
                                    (0.600 * Rr, hw * 0.93), (0.575 * Rr, hw * 0.80), (0.560 * Rr, hw * 0.50)], segs=24, M4=A, sharp=45))
    # armoured disc: a steel plate with a raised ring, slots and a ring of bolts
    zf = hw * 0.56
    parts.append(lathe('dish', RIM_DARK, [(0.562 * Rr, hw * 0.52), (0.52 * Rr, hw * 0.46), (0.0, hw * 0.46)], segs=24, M4=A, sharp=45))
    parts.append(lathe('disc', RIM, [(0.50 * Rr, hw * 0.46), (0.50 * Rr, zf), (0.46 * Rr, zf + 0.03 * Rr), (0.30 * Rr, zf + 0.03 * Rr),
                                     (0.27 * Rr, zf + 0.075 * Rr), (0.0, zf + 0.075 * Rr)], segs=24, M4=A, sharp=40))
    parts.append(lathe('back', RIM_DARK, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.60 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
    for k in range(6):
        Rs = A @ R(2 * pi * k / 6 + 0.26, 'Z')
        parts.append(rbox('slot', (0.115 * Rr, 0.075 * Rr, 0.02 * Rr), RIM_DARK, Rs @ T(0.385 * Rr, 0, zf + 0.026 * Rr), bevel=0.0, sharp=50,
                          taper=lambda v: V((v.x, v.y * (0.7 if v.x < 0 else 1.25), v.z))))
        a = 2 * pi * (k + 0.5) / 6 + 0.26
        p = A @ V((0.385 * Rr * math.cos(a), 0.385 * Rr * math.sin(a), zf + 0.03 * Rr))
        parts.append(bolt('lug', W_ICE if k % 3 == 0 else RIM, p, (1, 0, 0), 0.036 * Rr))
    parts.append(lathe('cap', W_BLUE, [(0, zf + 0.135 * Rr), (0.13 * Rr, zf + 0.13 * Rr), (0.19 * Rr, zf + 0.10 * Rr), (0.20 * Rr, zf + 0.07 * Rr)], segs=14, M4=A, sharp=40))
    for k in range(3):
        Rs = A @ R(2 * pi * k / 3 + 0.26, 'Z')
        parts.append(rbox('cap_spoke', (0.13 * Rr, 0.035 * Rr, 0.03 * Rr), RIM, Rs @ T(0.075 * Rr, 0, zf + 0.135 * Rr), bevel=0.0, sharp=50))
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
    final = final_material('coldwallet_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)


for c in stand_ins:
    bpy.data.objects.remove(c)


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward); left wheels are
    mirrored meshes that share the right wheels' texture space."""
    root = empty('cold_wallet_v2')
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
