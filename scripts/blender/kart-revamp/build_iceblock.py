# Ice Block v2 ("Cold Storage"): a freezer truck carved from a block of glacier
# ice. Frost-white tops, pale-to-deep blue chiselled slabs, gold ingots and
# coins frozen into the tailgate and flanks ("Frozen assets"), icicles on the
# rear wing, chunky white snow tyres on blue steel wheels.
# Built from nothing by script (no imported meshes, no external images).
#
#   blender -b -P build_iceblock.py -- out/ice-block-v2.glb [--preview renders/wip] [--nobake]
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0, ground z=0.
# At the end the file is turned nose to -X (the old ice-block.glb's facing, so
# KART_NOSE_YAW.iceblock is unchanged), scaled to the old file's length (1.899)
# and put on the drop-in contract's origin: centre of the footprint, tyres on y = 0.
# The script prints SEAT_X, the value for `pack-glb.mjs --seat=`.
import bpy, sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kart_lib import *
import kart_lib as L
import studio

argv = sys.argv[sys.argv.index('--') + 1:]
out_glb = os.path.abspath(argv[0])
preview = os.path.abspath(argv[argv.index('--preview') + 1]) if '--preview' in argv else None
NOBAKE = '--nobake' in argv
OLD_LENGTH = 1.899   # ice-block.glb: mesh spans -1..1 at node scale 0.94955

reset_scene()
random.seed(7)

# ---------------------------------------------------------------- colours ---
C_DEEP = (0.035, 0.26, 0.66)      # thick ice, low on the block
C_MID = (0.20, 0.56, 0.90)
C_PALE = (0.40, 0.74, 1.0)        # thin ice, high on the block
C_GLOW = (0.50, 0.88, 1.0)        # light coming through an edge
C_FROST = (0.88, 0.94, 1.0)
C_SNOW = (0.93, 0.96, 1.0)
C_NAVY = (0.012, 0.075, 0.26)     # carved slots, the clear window
C_GOLD = (1.0, 0.60, 0.07)
C_HUB = (0.03, 0.30, 0.86)


def objvec(t):
    tc = nd(t, 'ShaderNodeTexCoord')
    return tc.outputs['Object']


def wide_edge(t, radius=0.03, gain=4.0):
    """0..1, high near any edge: where a widely rounded normal leaves the true one"""
    bev = nd(t, 'ShaderNodeBevel', samples=6)
    bev.inputs['Radius'].default_value = radius
    g = nd(t, 'ShaderNodeNewGeometry')
    dot = nd(t, 'ShaderNodeVectorMath', operation='DOT_PRODUCT')
    t.links.new(bev.outputs[0], dot.inputs[0]); t.links.new(g.outputs['Normal'], dot.inputs[1])
    return mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, dot.outputs['Value']), gain, clamp=True)


def noise(t, scale, detail=2.0, rough=0.55):
    n = nd(t, 'ShaderNodeTexNoise')
    t.links.new(objvec(t), n.inputs['Vector'])
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    return n.outputs[0]


def cracks(t, scale, width):
    v = nd(t, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE')
    t.links.new(objvec(t), v.inputs['Vector'])
    v.inputs['Scale'].default_value = scale
    return mth(t, 'SUBTRACT', 1.0, smooth(t, v.outputs['Distance'], 0.0, width))


def glare(t, c, k=0.4):
    """two slanted reflection bars, the same in every material that calls it, so
    they run unbroken across a window and whatever is frozen behind it"""
    x, y, z = objcoord(t)
    v = mth(t, 'ADD', mth(t, 'ADD', z, mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', y), 0.55)), mth(t, 'MULTIPLY', x, 0.55))
    f = mth(t, 'FRACT', mth(t, 'MULTIPLY', v, 6.3))
    bar = mth(t, 'MAXIMUM', band(t, f, 0.10, 0.24, soft=0.012), band(t, f, 0.30, 0.345, soft=0.012))
    return mixc(t, mth(t, 'MULTIPLY', bar, k), c, (0.86, 0.96, 1.0))


def ice_pattern(frost=0.9, lo=0.05, hi=0.40):
    def pattern(t, c):
        x, y, z = objcoord(t)
        g = smooth(t, z, lo, hi)
        c = mixc(t, smooth(t, g, 0.0, 0.55), C_DEEP, C_MID)
        c = mixc(t, smooth(t, g, 0.45, 1.0), c, C_PALE)
        # cloudy patches inside the block, then fracture lines
        cloud = smooth(t, noise(t, 7.5, 3.0), 0.42, 0.72)
        c = mixc(t, mth(t, 'MULTIPLY', cloud, 0.30), c, C_GLOW)
        deep = smooth(t, noise(t, 4.0, 1.0), 0.55, 0.8)
        c = mixc(t, mth(t, 'MULTIPLY', deep, 0.30), c, C_DEEP)
        c = mixc(t, mth(t, 'MULTIPLY', cracks(t, 6.5, 0.009), 0.60), c, C_SNOW)
        # thin ice at the chiselled edges lets the light through
        c = mixc(t, mth(t, 'MULTIPLY', wide_edge(t), 0.70), c, C_GLOW)
        # frost and packed snow on whatever faces up
        if frost > 0:
            top = smooth(t, normal_z(t), 0.78, 0.93)
            patch = mth(t, 'ADD', 0.52, mth(t, 'MULTIPLY', smooth(t, noise(t, 9.0, 3.0), 0.38, 0.62), 0.48))
            c = mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', top, patch), frost), c, C_SNOW)
        return c
    return pattern


def icicle_pattern(t, c):
    # frosty root, clear blue tip: read from how far the point hangs below its root
    x, y, z = objcoord(t)
    c = mixc(t, smooth(t, noise(t, 30.0, 1.0), 0.35, 0.75), C_PALE, C_GLOW)
    return mixc(t, mth(t, 'MULTIPLY', wide_edge(t, 0.012, 3.0), 0.5), c, C_FROST)


def window_pattern(t, c):
    c = mixc(t, mth(t, 'MULTIPLY', cracks(t, 9.0, 0.008), 0.35), c, C_MID)
    return glare(t, c, 0.55)


def gold_pattern(t, c):
    # gold seen through ice: cooler in the shade side, glare bars over the top
    c = mixc(t, smooth(t, normal_z(t), -0.2, 0.9), (0.80, 0.36, 0.03), c)
    return glare(t, c, 0.5)


def tyre_pattern(t, c):
    # snow-tyre sipes: slanted bars round the tread and shoulders (wheel axle = local X)
    x, y, z = objcoord(t)
    g = nd(t, 'ShaderNodeNewGeometry')
    tc = nd(t, 'ShaderNodeVectorTransform', vector_type='NORMAL', convert_from='WORLD', convert_to='OBJECT')
    t.links.new(g.outputs['Normal'], tc.inputs[0])
    sep = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs[0], sep.inputs[0])
    tread = mth(t, 'SUBTRACT', 1.0, smooth(t, mth(t, 'ABSOLUTE', sep.outputs[0]), 0.55, 0.8))
    ang = mth(t, 'ARCTAN2', z, y)
    v = mth(t, 'ADD', mth(t, 'MULTIPLY', ang, 20 / (2 * pi)), mth(t, 'MULTIPLY', mth(t, 'ABSOLUTE', x), 9.0))
    bar = mth(t, 'LESS_THAN', mth(t, 'FRACT', v), 0.20)
    edge = smooth(t, mth(t, 'ABSOLUTE', x), 0.010, 0.018)
    return mixc(t, mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', bar, tread), mth(t, 'MULTIPLY', edge, 0.85)), c, (0.20, 0.36, 0.58))


ICE = mat('ice', C_MID, rough=0.12, pattern=ice_pattern(lo=0.05, hi=0.52), edge=0.75, ao_floor=0.42)
ICE_SIDE = mat('ice_side', C_MID, rough=0.12, pattern=ice_pattern(frost=0.9, lo=0.03, hi=0.34), edge=0.75, ao_floor=0.42)
ICE_HIGH = mat('ice_high', C_PALE, rough=0.12, pattern=ice_pattern(frost=0.95, lo=0.20, hi=0.62), edge=0.75, ao_floor=0.45)
ICICLE = mat('icicle', C_PALE, rough=0.08, pattern=icicle_pattern, edge=0.6, ao_floor=0.6)
FROST = mat('frost', C_FROST, rough=0.55, edge=0.3, ao_floor=0.5)
NAVY = mat('navy', C_NAVY, rough=0.1, pattern=window_pattern, edge=0.3)
SLOT = mat('slot', (0.010, 0.05, 0.17), rough=0.2, edge=0.2)
GOLD = mat('gold', C_GOLD, rough=0.25, metal=0.9, pattern=gold_pattern, edge=0.9, ao_floor=0.55, protect=True)
DARK = mat('dark', (0.030, 0.036, 0.050), rough=0.55)
SEAT = mat('seat', (0.060, 0.072, 0.100), rough=0.75, edge=0.4)
STEEL = mat('steel', (0.42, 0.45, 0.50), rough=0.3, metal=0.65)
ENGINE = mat('engine', (0.13, 0.145, 0.17), rough=0.42, metal=0.5)
CHROME = mat('chrome', (0.66, 0.70, 0.76), rough=0.16, metal=0.85, edge=0.8)
LAMP_F = mat('lamp_front', (0.8, 1.0, 1.0), rough=0.2, emit=(0.55, 0.95, 1.0), emit_strength=1.0)
LAMP_R = mat('lamp_rear', (1.0, 0.1, 0.12), rough=0.2, emit=(1.0, 0.05, 0.08), emit_strength=1.0)
# wheel materials: no top light, the wheel turns
RUBBER = mat('rubber', (0.80, 0.84, 0.89), rough=0.8, toplight=False, ao_floor=0.5, edge=0.3, pattern=tyre_pattern)
RIM = mat('rim', (0.60, 0.64, 0.70), rough=0.25, metal=0.7, toplight=False, edge=0.7)
RIM_DARK = mat('rim_dark', (0.035, 0.05, 0.09), rough=0.45, toplight=False)
W_HUB = mat('wheel_hub', C_HUB, rough=0.3, toplight=False, edge=0.6)
W_PALE = mat('wheel_pale', (0.42, 0.74, 1.0), rough=0.3, toplight=False)

P = []


def add(o):
    P.append(o); return o


def block(name, x0, x1, y0, y1, z0, z1, material=None, bevel=0.016, taper=None, segs=1, rot=None):
    """a chiselled slab between two corners; flat chamfers, hard facets"""
    m4 = T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    if rot is not None:
        m4 = m4 @ rot
    return add(rbox(name, (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)), material or ICE, m4, bevel=bevel, segs=segs, taper=taper, sharp=24))


def icicle(pos, length, r, lean=(0, 0)):
    """hangs from pos; a faceted spike with a fat frozen root"""
    x, y, z = pos
    prof = [(r * 1.25, 0.004), (r, -length * 0.10), (r * 0.62, -length * 0.45), (r * 0.30, -length * 0.80), (0, -length)]
    m4 = T(x, y, z) @ R(lean[0], 'X') @ R(lean[1], 'Y')
    add(lathe('icicle', ICICLE, prof, segs=6, M4=m4, sharp=28))


def shard(pos, h, r, lean=(0, 0), spin=0.0):
    """an ice crystal growing out of the block: five flat sides and a point"""
    m4 = T(*pos) @ R(lean[0], 'X') @ R(lean[1], 'Y') @ R(spin, 'Z')
    add(lathe('shard', ICE_HIGH, [(r, -0.01), (r * 1.05, h * 0.15), (r * 0.78, h * 0.72), (0, h)], segs=5, M4=m4, sharp=20))


def ingot(name, centre, length, w, h, axis='y', M4=None):
    """trapezoid bar, long along `axis`, lying on its wide face"""
    hl = length / 2
    vs = []
    for a, k in ((-hl, 1.0), (hl, 1.0)):
        for (u, z, sh) in ((-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w * 0.34, h / 2, 1), (-w * 0.34, h / 2, 1)):
            aa = a * (0.86 if sh else 1.0)
            vs.append(V((u, aa, z)) if axis == 'y' else V((aa, u, z)))
    m = (M4 or Matrix.Identity(4))
    vs = [T(*centre) @ m @ v for v in vs]
    faces = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    o = make_obj(name, vs, faces, GOLD, sharp=24)
    bv = o.modifiers.new('bev', 'BEVEL'); bv.width = 0.0035; bv.segments = 1; bv.limit_method = 'NONE'
    return add(o)


def coin(pos, nrm, r=0.024, th=0.006):
    m4 = frame(pos, nrm)
    add(lathe('coin', GOLD, [(0, th), (r * 0.70, th), (r * 0.76, th * 0.55), (r * 0.86, th * 0.55), (r * 0.90, th), (r, th), (r, -th)], segs=14, M4=m4, sharp=30))
    add(rbox('coin_mark', (r * 0.16, r * 0.80, 0.003), GOLD, m4 @ T(0, 0, th + 0.0005), bevel=0.0, sharp=30))
    add(rbox('coin_mark', (r * 0.55, r * 0.15, 0.003), GOLD, m4 @ T(r * 0.12, r * 0.22, th + 0.0005), bevel=0.0, sharp=30))
    add(rbox('coin_mark', (r * 0.55, r * 0.15, 0.003), GOLD, m4 @ T(r * 0.12, -r * 0.22, th + 0.0005), bevel=0.0, sharp=30))


SEAT_X0 = -0.180
FW = dict(R=0.120, W=0.150, x=0.292, y=0.290)
RW = dict(R=0.145, W=0.172, x=-0.300, y=0.279)

# ------------------------------------------------------------------- body ---
add(rbox('floor', (0.86, 0.30, 0.022), DARK, T(0.0, 0, 0.047), bevel=0.008, segs=1, sharp=50))
block('chassis', -0.46, 0.44, -0.185, 0.185, 0.058, 0.20, ICE_SIDE, bevel=0.016)

# nose: a blunt slab, the top chiselled down toward the bumper
block('nose', 0.215, 0.468, -0.165, 0.165, 0.066, 0.312, bevel=0.022,
      taper=lambda v: V((v.x, v.y * (0.93 if v.x > 0 else 1.0), v.z - (0.052 if (v.x > 0 and v.z > 0) else 0.0))))
# cowl: steps up behind the nose and carries the wheel and the dials
block('cowl', 0.075, 0.245, -0.197, 0.197, 0.150, 0.342, bevel=0.020,
      taper=lambda v: V((v.x, v.y * (0.90 if v.x > 0 else 1.0), v.z - (0.022 if (v.x > 0 and v.z > 0) else 0.0))))
# cockpit walls and tub
for s in (-1, 1):
    block('wall', -0.315, 0.095, s * 0.134, s * 0.197, 0.160, 0.338, bevel=0.016,
          taper=lambda v: V((v.x, v.y, v.z + (0.022 if (v.x < 0 and v.z > 0) else 0.0))))
add(rbox('tub_floor', (0.40, 0.272, 0.02), DARK, T(-0.105, 0, 0.230), bevel=0.004, segs=1, sharp=50))

# pontoons between the axles: the gold is frozen into these
for s in (-1, 1):
    block('pontoon', -0.142, 0.158, s * 0.170, s * 0.338, 0.052, 0.226, ICE_SIDE, bevel=0.022,
          taper=lambda v: V((v.x * (0.90 if v.y * s > 0 else 1.0), v.y, v.z)))
    # step plate
    add(rbox('step', (0.15, 0.055, 0.008), STEEL, T(0.005, s * 0.262, 0.2285), bevel=0.002, segs=1, sharp=50))
    for i in range(5):
        add(rbox('step_rib', (0.006, 0.047, 0.004), ENGINE, T(-0.051 + i * 0.028, s * 0.262, 0.2335), bevel=0.0, sharp=50))
    # clear window in the flank with an ingot and two coins behind it
    yo = s * 0.338
    add(rbox('flank_window', (0.205, 0.006, 0.098), NAVY, T(0.008, yo, 0.128), bevel=0.0025, segs=1, sharp=30))
    rim = [(0.008 + 0.108 * sgnpow(math.cos(2 * pi * k / 20), 2 / 6.0), yo + s * 0.002, 0.128 + 0.054 * sgnpow(math.sin(2 * pi * k / 20), 2 / 6.0)) for k in range(20)]
    add(tube('flank_rim', FROST, rim, 0.0075, N=6, closed=True, up=(0, s, 0), sharp=40))
    ingot('ingot', (-0.030, yo - s * 0.006, 0.112), 0.118, 0.040, 0.046, axis='x')
    coin((0.070, yo + s * 0.002, 0.142), (0, s, 0), r=0.025)
    coin((0.078, yo + s * 0.002, 0.098), (0.0, s, 0.0), r=0.019)

# ------------------------------------------------------------ rear freezer ---
block('freezer', -0.482, -0.300, -0.172, 0.172, 0.066, 0.402, bevel=0.022)
for s in (-1, 1):
    # shelf over the rear wheel, sloping down toward the cockpit
    block('rear_shelf', -0.470, -0.120, s * 0.160, s * 0.368, 0.298, 0.390, bevel=0.022,
          taper=lambda v: V((v.x, v.y, v.z - ((0.046 if v.z > 0 else 0.034) if v.x > 0 else 0.0))))
    # tail lamps in the shelf ends
    add(rbox('lamp_r_bezel', (0.012, 0.130, 0.044), DARK, T(-0.470, s * 0.262, 0.346), bevel=0.005, segs=1, sharp=50))
    add(rbox('lamp_r', (0.010, 0.110, 0.028), LAMP_R, T(-0.476, s * 0.262, 0.346), bevel=0.004, segs=1, sharp=50))
    for j, (yy, ln) in enumerate(((0.195, 0.050), (0.335, 0.036))):
        icicle((-0.458, s * yy, 0.300), ln, 0.010)

# crystals growing where the shelves meet the cockpit, and on the plough ends
for s in (-1, 1):
    shard((-0.196, s * 0.318, 0.340), 0.105, 0.022, lean=(-s * 0.22, 0.10), spin=0.3)
    shard((-0.168, s * 0.290, 0.332), 0.070, 0.017, lean=(-s * 0.05, 0.38), spin=1.1)
    shard((-0.222, s * 0.345, 0.346), 0.058, 0.015, lean=(-s * 0.50, -0.15), spin=0.7)
    shard((0.462, s * 0.238, 0.105), 0.050, 0.014, lean=(-s * 0.45, 0.30), spin=0.2)

# tailgate: a clear pane with the frozen assets stacked behind it, hung like a cold-store door
XR = -0.482
add(rbox('gate_window', (0.008, 0.262, 0.222), NAVY, T(XR - 0.001, 0, 0.214), bevel=0.003, segs=1, sharp=30))
rim = [(XR - 0.004, 0.137 * sgnpow(math.cos(2 * pi * k / 24), 2 / 7.0), 0.214 + 0.117 * sgnpow(math.sin(2 * pi * k / 24), 2 / 7.0)) for k in range(24)]
add(tube('gate_rim', FROST, rim, 0.010, N=6, closed=True, up=(1, 0, 0), sharp=40))
for (yy, zz) in ((-0.062, 0.136), (0.062, 0.136), (0.0, 0.187)):
    ingot('ingot', (XR + 0.002, yy, zz), 0.118, 0.046, 0.050, axis='y')
coin((XR - 0.006, -0.078, 0.262), (-1, 0, 0), r=0.031)
coin((XR - 0.006, 0.082, 0.256), (-1, 0, 0), r=0.027)
coin((XR - 0.006, 0.030, 0.296), (-1, 0, 0), r=0.019)
# hinges on one side, lever latch on the other
for zz in (0.135, 0.295):
    add(tube('hinge', CHROME, [(XR - 0.010, 0.158, zz - 0.022), (XR - 0.010, 0.158, zz + 0.022)], 0.011, N=8, sharp=60))
    add(rbox('hinge_leaf', (0.006, 0.046, 0.030), STEEL, T(XR - 0.004, 0.138, zz), bevel=0.002, segs=1, sharp=50))
    for dz in (-0.008, 0.008):
        add(bolt('bolt', CHROME, (XR - 0.008, 0.128, zz + dz), (-1, 0, 0), 0.0045))
add(rbox('latch_plate', (0.006, 0.040, 0.076), STEEL, T(XR - 0.004, -0.150, 0.214), bevel=0.002, segs=1, sharp=50))
add(tube('latch', CHROME, [(XR - 0.016, -0.150, 0.244), (XR - 0.020, -0.150, 0.214), (XR - 0.020, -0.118, 0.180)], 0.008, N=6, round_ends=True, sharp=60))
add(lathe('latch_pivot', CHROME, [(0, 0.014), (0.012, 0.012), (0.015, 0.006), (0.015, 0.0)], segs=10, M4=frame((XR - 0.006, -0.150, 0.244), (-1, 0, 0)), sharp=40))
# rear bumper bar
add(rbox('bumper_r', (0.024, 0.46, 0.034), STEEL, T(-0.486, 0, 0.082), bevel=0.008, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('bumper_r_pad', (0.012, 0.05, 0.040), DARK, T(-0.494, s * 0.15, 0.082), bevel=0.004, segs=1, sharp=50))

# cooling fan of the freezer unit, let into the top
fz = 0.402
add(lathe('fan_ring', STEEL, [(0.050, 0.0), (0.050, 0.012), (0.043, 0.014), (0.040, 0.004)], segs=18, M4=T(-0.350, 0, fz), sharp=40))
add(lathe('fan_well', SLOT, [(0.041, 0.004), (0.0, 0.004)], segs=18, M4=T(-0.350, 0, fz), sharp=40))
for k in range(5):
    add(rbox('fan_blade', (0.030, 0.014, 0.003), CHROME, T(-0.350, 0, fz + 0.008) @ R(2 * pi * k / 5, 'Z') @ T(0.021, 0, 0) @ R(0.35, 'X'), bevel=0.0, sharp=50))
add(lathe('fan_cap', ENGINE, [(0, 0.016), (0.008, 0.015), (0.011, 0.010), (0.011, 0.004)], segs=10, M4=T(-0.350, 0, fz), sharp=40))
for k in range(2):
    a = pi / 4 + k * pi / 2
    add(rbox('fan_guard', (0.100, 0.005, 0.004), ENGINE, T(-0.350, 0, fz + 0.015) @ R(a, 'Z'), bevel=0.0, sharp=50))

# truck exhaust stacks at the front corners of the freezer
for s in (-1, 1):
    add(tube('stack', CHROME, [(-0.262, s * 0.215, 0.300), (-0.262, s * 0.215, 0.472)], 0.015, N=10, sharp=60))
    add(tube('stack_shield', ENGINE, [(-0.262, s * 0.215, 0.345), (-0.262, s * 0.215, 0.415)], 0.0195, N=10, sharp=60))
    add(lathe('stack_tip', CHROME, [(0.015, 0.0), (0.019, 0.004), (0.019, 0.030), (0.0155, 0.030)], segs=10, M4=T(-0.262, s * 0.215, 0.468) @ R(-0.30, 'Y'), sharp=50))
    add(lathe('stack_bore', DARK, [(0, 0.0), (0.0155, 0.0)], segs=10, M4=T(-0.262, s * 0.215, 0.468) @ R(-0.30, 'Y') @ T(0, 0, 0.0295), sharp=60, recalc=False))
    add(rbox('stack_foot', (0.05, 0.05, 0.02), STEEL, T(-0.262, s * 0.215, 0.318), bevel=0.005, segs=1, sharp=50))

# ---------------------------------------------------------------- rear wing ---
for s in (-1, 1):
    block('wing_pillar', -0.478, -0.418, s * 0.080, s * 0.128, 0.390, 0.470, ICE_HIGH, bevel=0.010,
          taper=lambda v: V((v.x - (0.016 if v.z > 0 else 0.0), v.y, v.z)))
    block('wing_end', -0.540, -0.392, s * 0.336, s * 0.368, 0.420, 0.510, ICE_HIGH, bevel=0.010,
          taper=lambda v: V((v.x, v.y, v.z + (0.034 if (v.x > 0 and v.z < 0) else 0.0))))
    icicle((-0.515, s * 0.352, 0.422), 0.052, 0.011)
    icicle((-0.470, s * 0.352, 0.424), 0.030, 0.008)
block('wing', -0.538, -0.404, -0.345, 0.345, 0.454, 0.490, ICE_HIGH, bevel=0.011, rot=R(-0.10, 'Y'))
# icicles under the trailing edge and the plank
for i, (yy, ln, r) in enumerate(((-0.300, 0.062, 0.013), (-0.262, 0.036, 0.010), (-0.215, 0.092, 0.016), (-0.168, 0.050, 0.012),
                                 (-0.105, 0.030, 0.009), (-0.060, 0.044, 0.011), (-0.020, 0.080, 0.015), (0.022, 0.052, 0.012), (0.066, 0.030, 0.009),
                                 (0.120, 0.036, 0.010), (0.170, 0.058, 0.012), (0.212, 0.098, 0.016), (0.256, 0.044, 0.011), (0.300, 0.066, 0.013))):
    icicle((-0.522 + (0.007 if i % 2 else 0.0), yy, 0.466), ln, r, lean=(random.uniform(-0.05, 0.05), 0.06))
for yy, ln in ((-0.24, 0.036), (0.0, 0.030), (0.235, 0.032)):
    icicle((-0.445, yy, 0.460), ln, 0.009)

# -------------------------------------------------------------------- nose ---
XF = 0.468
# bumper: an ice plough with a steel bull bar
block('plough', 0.440, 0.500, -0.268, 0.268, 0.050, 0.118, ICE_SIDE, bevel=0.014,
      taper=lambda v: V((v.x - (0.016 if v.z > 0 and v.x > 0 else 0.0), v.y * (0.94 if v.x > 0 else 1.0), v.z)))
bar = [(0.448, -0.215, 0.105), (0.492, -0.200, 0.150), (0.494, -0.090, 0.158), (0.494, 0.090, 0.158), (0.492, 0.200, 0.150), (0.448, 0.215, 0.105)]
add(tube('bull_bar', CHROME, bar, 0.0095, N=8, sharp=60))
for s in (-1, 1):
    add(tube('bull_stay', CHROME, [(0.494, s * 0.060, 0.158), (0.498, s * 0.060, 0.108)], 0.008, N=6, sharp=60))
    # headlamps: square lamps in dark housings
    add(rbox('lamp_f_bezel', (0.020, 0.090, 0.066), DARK, T(XF - 0.004, s * 0.098, 0.186), bevel=0.008, segs=1, sharp=50))
    add(rbox('lamp_f', (0.012, 0.066, 0.042), LAMP_F, T(XF + 0.004, s * 0.098, 0.186), bevel=0.006, segs=1, sharp=50))
# carved grille slots
for i in range(4):
    add(rbox('grille_slot', (0.010, 0.016, 0.060), SLOT, T(XF - 0.002, -0.036 + i * 0.024, 0.186), bevel=0.003, segs=1, sharp=50))
# snowflake cut into the bonnet
for k in range(3):
    m4 = T(0.345, 0, 0.2885) @ R(math.atan(0.052 / 0.253), 'Y') @ R(k * pi / 3, 'Z')
    add(rbox('flake_arm', (0.118, 0.012, 0.006), SLOT, m4, bevel=0.002, segs=1, sharp=50))
    for e in (-1, 1):
        for q in (-1, 1):
            add(rbox('flake_barb', (0.028, 0.008, 0.006), SLOT, m4 @ T(e * 0.036, q * 0.009, 0) @ R(q * e * 0.9, 'Z'), bevel=0.0, sharp=50))
# front mudguards: ice slabs over the steered wheels
for s in (-1, 1):
    block('guard_f', 0.160, 0.428, s * 0.158, s * 0.370, 0.246, 0.330, bevel=0.022,
          taper=lambda v: V((v.x, v.y, v.z - ((0.056 if v.z > 0 else 0.036) if v.x > 0 else 0.0))))
    icicle((0.172, s * 0.345, 0.248), 0.030, 0.008)
    icicle((0.172, s * 0.215, 0.248), 0.040, 0.009)

# ------------------------------------------------------------------ cockpit ---
add(rbox('seat_base', (0.17, 0.225, 0.034), SEAT, T(-0.180, 0, 0.250), bevel=0.012, sharp=50))
seat_m = T(-0.286, 0, 0.340) @ R(-0.14, 'Y')
add(rbox('seat_back', (0.052, 0.258, 0.185), SEAT, seat_m, bevel=0.016, sharp=50,
         taper=lambda v: V((v.x, v.y * (1.0 if v.z < 0 else 0.84), v.z))))
for i in range(3):
    add(rbox('seat_rib', (0.012, 0.18, 0.030), SEAT, seat_m @ T(0.026, 0, -0.045 + i * 0.045), bevel=0.006, segs=1, sharp=50))
add(rbox('seat_piping', (0.052, 0.17, 0.012), FROST, seat_m @ T(0, 0, 0.091), bevel=0.005, segs=1, sharp=50))
for s in (-1, 1):
    add(rbox('seat_bolster', (0.11, 0.030, 0.066), SEAT, T(-0.215, s * 0.113, 0.280) @ R(-0.10, 'Y'), bevel=0.012, sharp=50))
# steering wheel on the cowl
sw = T(0.056, 0, 0.368) @ R(-1.15, 'Y')
add(torus('steer_ring', DARK, 0.047, 0.0095, M4=sw, segs=18, rsegs=6))
add(rbox('steer_bar', (0.013, 0.090, 0.006), STEEL, sw, bevel=0.002, segs=1, sharp=50))
add(rbox('steer_stem', (0.047, 0.013, 0.006), STEEL, sw @ T(-0.0235, 0, 0), bevel=0.002, segs=1, sharp=50))
add(lathe('steer_hub', W_HUB, [(0, 0.008), (0.011, 0.007), (0.014, 0.003), (0.014, -0.004)], segs=10, M4=sw, sharp=40))
add(tube('steer_column', ENGINE, [(0.059, 0, 0.365), (0.125, 0, 0.322)], 0.008, N=6))
# an ice shard for a windscreen
block('screen', 0.122, 0.140, -0.150, 0.150, 0.330, 0.392, ICE_HIGH, bevel=0.006, rot=R(0.42, 'Y'),
      taper=lambda v: V((v.x, v.y * (0.80 if v.z > 0 else 1.0), v.z)))
# thermometer dial on the cowl
dm = T(0.185, 0.105, 0.3415) @ R(0.0, 'Y')
add(lathe('dial', CHROME, [(0.022, 0.0), (0.022, 0.006), (0.018, 0.008), (0.017, 0.005)], segs=14, M4=dm, sharp=40))
add(lathe('dial_face', FROST, [(0.0175, 0.005), (0, 0.005)], segs=14, M4=dm, sharp=40))
add(rbox('dial_needle', (0.016, 0.0035, 0.002), LAMP_R, dm @ T(-0.003, 0.004, 0.0065) @ R(2.3, 'Z'), bevel=0.0, sharp=50))
# mirrors
for s in (-1, 1):
    add(tube('mirror_stalk', ENGINE, [(0.110, s * 0.180, 0.334), (0.104, s * 0.226, 0.378)], 0.0065, N=5))
    add(rbox('mirror', (0.026, 0.062, 0.040), ICE_HIGH, T(0.102, s * 0.244, 0.388) @ R(s * 0.16, 'Z'), bevel=0.008, segs=1, sharp=30))
    add(rbox('mirror_glass', (0.003, 0.048, 0.027), CHROME, T(0.0885, s * 0.2462, 0.388) @ R(s * 0.16, 'Z'), bevel=0.0, sharp=50))

# --------------------------------------------------------------- suspension ---
for s in (-1, 1):
    yi = FW['y'] - FW['W'] / 2 + 0.012
    add(tube('axle_f', ENGINE, [(FW['x'], s * 0.10, 0.120), (FW['x'], s * yi, 0.120)], 0.014, N=8, sharp=70))
    add(tube('tie_rod', STEEL, [(0.240, s * 0.150, 0.130), (0.262, s * yi, 0.128)], 0.005, N=5))
    add(tube('coil_f', W_PALE, [(0.292, s * 0.205, 0.128), (0.292, s * 0.180, 0.235)], 0.013, N=8, sharp=70))
    yr = RW['y'] - RW['W'] / 2 + 0.012
    add(tube('axle', ENGINE, [(RW['x'], s * 0.05, 0.145), (RW['x'], s * yr, 0.145)], 0.018, N=8, sharp=70))

body = join(P, 'iceblock_body')


# ------------------------------------------------------------------- wheels ---
def build_wheel(name, spec):
    """right-hand wheel: axle on local X, outer face on +X. A fat snow tyre on a
    blue steel wheel with hand holes and chrome lug nuts."""
    Rr, W = spec['R'], spec['W']; hw = W / 2
    A = frame((0, 0, 0), (1, 0, 0), (0, 1, 0))
    parts = []
    prof = []

    def PT(r, a):
        prof.append((r * Rr, a * hw))
    PT(0.60, -0.80); PT(0.72, -0.98); PT(0.89, -0.96); PT(0.970, -0.84); PT(1.0, -0.66)
    for g in (-0.36, 0.0, 0.36):
        PT(1.0, g - 0.12); PT(0.945, g - 0.085)
        PT(0.945, g + 0.085); PT(1.0, g + 0.12)
    PT(1.0, 0.66); PT(0.970, 0.84); PT(0.89, 0.96); PT(0.79, 1.0); PT(0.69, 0.975); PT(0.615, 0.86); PT(0.59, 0.74)
    shoulder = {3, len(prof) - 6}
    segs = 28

    def rmod(pi_, k):
        return -0.055 * Rr if (pi_ in shoulder and (k // 2) % 2 == 0) else 0.0
    parts.append(lathe('tyre', RUBBER, prof, segs=segs, M4=A, rmod=rmod, sharp=30))
    parts.append(lathe('stripe', W_PALE, [(0.775 * Rr, hw * 0.996), (0.785 * Rr, hw * 1.018), (0.830 * Rr, hw * 1.010), (0.840 * Rr, hw * 0.982)], segs=segs, M4=A, sharp=60))
    parts.append(lathe('rim', RIM, [(0.605 * Rr, hw * 0.70), (0.625 * Rr, hw * 0.80), (0.650 * Rr, hw * 0.90), (0.635 * Rr, hw * 0.965),
                                    (0.590 * Rr, hw * 0.93), (0.560 * Rr, hw * 0.80), (0.545 * Rr, hw * 0.56)], segs=24, M4=A, sharp=45))
    zf = hw * 0.60
    # dished steel centre
    parts.append(lathe('dish', W_HUB, [(0.548 * Rr, hw * 0.56), (0.50 * Rr, hw * 0.50), (0.44 * Rr, hw * 0.52), (0.30 * Rr, zf + 0.03 * Rr),
                                       (0.22 * Rr, zf + 0.075 * Rr), (0.0, zf + 0.075 * Rr)], segs=24, M4=A, sharp=40))
    parts.append(lathe('back', RIM_DARK, [(0.0, -hw * 0.60), (0.40 * Rr, -hw * 0.60), (0.60 * Rr, -hw * 0.78)], segs=16, M4=A, sharp=45))
    for k in range(6):
        a = 2 * pi * (k + 0.5) / 6
        d = V((0, 0.38 * Rr * math.cos(a), 0.38 * Rr * math.sin(a)))
        # hand hole
        parts.append(lathe('hole', RIM_DARK, [(0, 0.0015), (0.066 * Rr, 0.0015), (0.075 * Rr, -0.002)], segs=10,
                           M4=frame((hw * 0.535 + 0.004, d.y, d.z), (1, 0, 0)), sharp=50))
        a2 = 2 * pi * k / 6
        p = V((zf + 0.078 * Rr, 0.135 * Rr * math.cos(a2), 0.135 * Rr * math.sin(a2)))
        parts.append(bolt('lug', RIM, p, (1, 0, 0), 0.032 * Rr))
    parts.append(lathe('cap', RIM, [(0, zf + 0.135 * Rr), (0.055 * Rr, zf + 0.13 * Rr), (0.078 * Rr, zf + 0.105 * Rr), (0.078 * Rr, zf + 0.07 * Rr)], segs=10, M4=A, sharp=40))
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
    final = final_material('iceblock_atlas', images, os.path.join(os.path.dirname(out_glb), '_bake'))
    for o in (body, wf, wr):
        assign_single(o, final)

for c in stand_ins:
    bpy.data.objects.remove(c)


def place_wheels():
    """hubs carry the axle direction (wheel X = the kart's right on all four,
    so the game's one spin sign rolls them all forward); left wheels are
    mirrored meshes that share the right wheels' texture space."""
    root = empty('ice_block_v2')
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

# the old file's length; origin at the centre of the footprint, on the ground
mn, mx = bounds(meshes)
S = OLD_LENGTH / (mx.x - mn.x)
shift = V((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)) * S
body.data.transform(Matrix.Translation(shift) @ Matrix.Scale(S, 4)); body.data.update()
for o in objs:
    if o.type == 'EMPTY' and o.parent is root:
        o.location = V(o.location) * S + shift
    elif o.type == 'MESH' and o is not body:
        o.data.transform(Matrix.Scale(S, 4)); o.data.update()
bpy.context.view_layer.update()
mn, mx = bounds(meshes)
print('FINAL TRIS', tri_count(meshes), 'VERTS', sum(len(o.data.vertices) for o in meshes),
      'SIZE', [round(v, 3) for v in (mx - mn)], 'MIN', [round(v, 3) for v in mn])
# seat centre (build frame x = SEAT_X0, nose +X) in file units (nose -X)
print('SEAT_X %.3f' % (-SEAT_X0 * S + shift.x))
os.makedirs(os.path.dirname(out_glb), exist_ok=True)
if not NOBAKE:
    raw = os.path.join(os.path.dirname(out_glb), '_bake', os.path.basename(out_glb).replace('.glb', '.raw.glb'))
    export_glb(raw, objs, jpeg_quality=int(os.environ.get('ICEBLOCK_JPEG', '82')))
    print('RAW GLB', raw, os.path.getsize(raw), 'bytes (pack it with pack-glb.mjs)')

if preview:
    studio.setup()
    cam, lights = studio.add_rig()
    root.rotation_euler = (0, 0, pi)   # studio wants the nose on +X
    root.scale = (1 / S,) * 3
    for view in studio.VIEWS:
        studio.aim(cam, lights, view)
        studio.render(f'{preview}-{view[0]}.png')
