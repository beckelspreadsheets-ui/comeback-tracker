# Penguin kart hero key art -- fully procedural Blender 5.x script.
# Usage: blender -b -P hero.py -- --jobs square:640x640:48:/path/out.png[,wide:1344x621:48:/path/o2.png]
import bpy, bmesh, sys, math, random
from math import sin, cos, pi, radians, sqrt, exp
from mathutils import Vector, Matrix, Euler, noise
from mathutils.bvhtree import BVHTree
import numpy as np

random.seed(7)
np.random.seed(7)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
JOBS = arg("--jobs", "square:640x640:48:/tmp/out.png")

# ------------------------------------------------------------------ scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COLL = scene.collection

# ------------------------------------------------------------------ helpers
def sgnpow(v, p):
    return math.copysign(abs(v) ** p, v)

def mk(name, verts, faces, mat=None, sub=2, parent=None, smooth=True, matrix=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    COLL.objects.link(ob)
    if mat: me.materials.append(mat)
    if sub:
        m = ob.modifiers.new("sub", "SUBSURF"); m.levels = sub; m.render_levels = sub
    if parent: ob.parent = parent
    if matrix is not None: ob.matrix_local = matrix
    return ob

def empty(name, parent=None, matrix=None):
    ob = bpy.data.objects.new(name, None)
    COLL.objects.link(ob)
    if parent: ob.parent = parent
    if matrix is not None: ob.matrix_local = matrix
    return ob

def instance(src, matrix, parent=None):
    ob = src.copy(); COLL.objects.link(ob)
    ob.parent = parent; ob.matrix_local = matrix
    return ob

def ring_yz(x, cy, z0, z1, hw, e=2.6, n=24, spine=0.0):
    cz = (z0 + z1) / 2; hh = (z1 - z0) / 2; out = []
    for j in range(n):
        t = 2 * pi * j / n; c = cos(t); s = sin(t)
        y = hw * sgnpow(c, 2 / e); z = hh * sgnpow(s, 2 / e)
        if spine and s > 0:
            z += spine * exp(-(y / (0.45 * hw)) ** 2) * s
        out.append(Vector((x, cy + y, cz + z)))
    return out

def ring_xz(y, cx, cz, hx, hz, e=2.6, n=24, tilt=0.0):
    out = []
    for j in range(n):
        t = 2 * pi * j / n
        px = hx * sgnpow(cos(t), 2 / e); pz = hz * sgnpow(sin(t), 2 / e)
        out.append(Vector((cx + px * cos(tilt) + pz * sin(tilt), y, cz - px * sin(tilt) + pz * cos(tilt))))
    return out

def ring_xy(z, cx, cy, hx, hy, e=2.6, n=24):
    out = []
    for j in range(n):
        t = 2 * pi * j / n
        out.append(Vector((cx + hx * sgnpow(cos(t), 2 / e), cy + hy * sgnpow(sin(t), 2 / e), z)))
    return out

def centroid(ring):
    return sum(ring, Vector()) / len(ring)

def cap_rings(ring, dirv, depth, style):
    c = centroid(ring)
    if style == 'round':
        spec = [(cos(radians(a)), sin(radians(a))) for a in (28, 55, 76)]
    elif style == 'flat':
        spec = [(0.95, 0.55), (0.84, 1.0), (0.5, 1.0)]
    elif style == 'hollow':
        spec = [(0.9, 0.5), (0.78, 0.0), (0.74, -6.0), (0.4, -6.0)]
    else:
        spec = []
    return [[c + (p - c) * sc + dirv * depth * off for p in ring] for sc, off in spec]

def loft(name, rings, mat, end0=('round', 0.03), end1=('round', 0.03), closed=False, **kw):
    rings = [list(r) for r in rings]
    if not closed:
        if end0:
            d = (centroid(rings[0]) - centroid(rings[1])).normalized()
            rings = list(reversed(cap_rings(rings[0], d, end0[1], end0[0]))) + rings
        if end1:
            d = (centroid(rings[-1]) - centroid(rings[-2])).normalized()
            rings = rings + cap_rings(rings[-1], d, end1[1], end1[0])
    n = len(rings[0]); R = len(rings)
    verts = [p for r in rings for p in r]
    faces = []
    for i in range(R if closed else R - 1):
        a = i * n; b = ((i + 1) % R) * n
        for j in range(n):
            faces.append((a + j, a + (j + 1) % n, b + (j + 1) % n, b + j))
    if not closed:
        if end0: faces.append(tuple(reversed(range(0, n))))
        if end1: faces.append(tuple(range((R - 1) * n, R * n)))
    return mk(name, verts, faces, mat, **kw)

def catmull(pts, per=6, closed=False):
    P = [Vector(p) for p in pts]; out = []; n = len(P)
    for i in range(n if closed else n - 1):
        p0 = P[(i - 1) % n] if (closed or i > 0) else P[0]
        p1 = P[i]; p2 = P[(i + 1) % n]
        p3 = P[(i + 2) % n] if (closed or i + 2 < n) else P[-1]
        for k in range(per):
            t = k / per
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed: out.append(P[-1])
    return out

def tube(name, path, rad, mat, n=16, closed=False, ends=(('round', 0.02), ('round', 0.02)), normals=None, e=2.0, **kw):
    P = [Vector(p) for p in path]; m = len(P)
    tang = []
    for i in range(m):
        prev = P[i - 1] if (i > 0 or closed) else P[i]
        nxt = P[(i + 1) % m] if (i < m - 1 or closed) else P[i]
        tang.append((nxt - prev).normalized())
    N = []
    if normals is None:
        a = Vector((0, 0, 1))
        if abs(tang[0].dot(a)) > 0.9: a = Vector((0, 1, 0))
        N.append((a - tang[0] * a.dot(tang[0])).normalized())
        for i in range(1, m):
            N.append((N[-1] - tang[i] * N[-1].dot(tang[i])).normalized())
    else:
        for i in range(m):
            nv = Vector(normals[i]); N.append((nv - tang[i] * nv.dot(tang[i])).normalized())
    rings = []
    for i in range(m):
        B = tang[i].cross(N[i]).normalized()
        r = rad(i / max(1, m - 1)) if callable(rad) else rad
        rn, rb = r if isinstance(r, tuple) else (r, r)
        rings.append([P[i] + N[i] * rn * sgnpow(cos(2 * pi * j / n), 2 / e) + B * rb * sgnpow(sin(2 * pi * j / n), 2 / e) for j in range(n)])
    return loft(name, rings, mat, end0=ends[0], end1=ends[1], closed=closed, **kw)

def lathe(name, prof, mat, seg=48, axis='Z', mod=None, **kw):
    def mp(a, b, h):
        if axis == 'Z': return (a, b, h)
        if axis == 'Y': return (a, h, b)
        return (h, a, b)
    verts = []; idx = []
    for i, pr in enumerate(prof):
        r, h = pr[0], pr[1]
        if r < 1e-6:
            idx.append([len(verts)]); verts.append(mp(0, 0, h))
        else:
            ids = []
            for j in range(seg):
                rr = mod(i, j, r, h) if mod else r
                a = 2 * pi * j / seg
                ids.append(len(verts)); verts.append(mp(rr * cos(a), rr * sin(a), h))
            idx.append(ids)
    faces = []
    for i in range(len(prof) - 1):
        A, B = idx[i], idx[i + 1]
        if len(A) == 1 and len(B) == 1: continue
        for j in range(seg):
            j2 = (j + 1) % seg
            if len(A) == 1: faces.append((A[0], B[j], B[j2]))
            elif len(B) == 1: faces.append((A[j], A[j2], B[0]))
            else: faces.append((A[j], A[j2], B[j2], B[j]))
    return mk(name, verts, faces, mat, **kw)

SPH = [(sin(pi * k / 16), -cos(pi * k / 16)) for k in range(17)]
SPH[0] = (0, -1); SPH[-1] = (0, 1)
def ellipsoid(name, center, radii, mat, rot=(0, 0, 0), parent=None, sub=1, seg=32):
    M = Matrix.LocRotScale(Vector(center), Euler(rot), Vector(radii))
    return lathe(name, SPH, mat, seg=seg, sub=sub, parent=parent, matrix=M)

def align(pos, normal, up=Vector((0, 0, 1))):
    z = Vector(normal).normalized()
    x = up.cross(z)
    if x.length < 1e-4: x = Vector((1, 0, 0)).cross(z)
    x.normalize(); y = z.cross(x)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = Vector(pos)
    return M

def bvh_of(ob):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(ob, dg)

def interp(xs, ys, x):
    if x <= xs[0]: return ys[0]
    for i in range(len(xs) - 1):
        if x <= xs[i + 1]:
            t = (x - xs[i]) / (xs[i + 1] - xs[i]); t = t * t * (3 - 2 * t)
            return ys[i] + (ys[i + 1] - ys[i]) * t
    return ys[-1]

# ------------------------------------------------------------------ materials
def c4(c): return (c[0], c[1], c[2], 1.0)

def pmat(name, color, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = c4(color)
    for k, v in kw.items():
        k = k.replace('_', ' ')
        if isinstance(v, tuple) and len(v) == 3 and b.inputs[k].type == 'RGBA': v = c4(v)
        b.inputs[k].default_value = v
    return m

class NB:
    """tiny node-building helper"""
    def __init__(s, m):
        s.nt = m.node_tree; s.N = s.nt.nodes; s.L = s.nt.links
        s.b = s.N.get('Principled BSDF')
    def _set(s, sock, v):
        if isinstance(v, bpy.types.NodeSocket): s.L.new(v, sock)
        elif v is not None: sock.default_value = v
    def math(s, op, a, b=None, c=None, clamp=False):
        n = s.N.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        s._set(n.inputs[0], a); s._set(n.inputs[1], b)
        if c is not None: s._set(n.inputs[2], c)
        return n.outputs[0]
    def maprange(s, v, a, b, c=0.0, d=1.0, smooth=True):
        n = s.N.new('ShaderNodeMapRange'); n.interpolation_type = 'SMOOTHSTEP' if smooth else 'LINEAR'
        s._set(n.inputs['Value'], v); n.inputs['From Min'].default_value = a; n.inputs['From Max'].default_value = b
        n.inputs['To Min'].default_value = c; n.inputs['To Max'].default_value = d
        return n.outputs[0]
    def mix(s, fac, a, b, blend='MIX'):
        n = s.N.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend
        s._set(n.inputs[0], fac)
        s._set(n.inputs[6], c4(a) if isinstance(a, tuple) and len(a) == 3 else a)
        s._set(n.inputs[7], c4(b) if isinstance(b, tuple) and len(b) == 3 else b)
        return n.outputs[2]
    def coords(s, kind='Object'):
        n = s.N.new('ShaderNodeTexCoord'); return n.outputs[kind]
    def sep(s, v):
        n = s.N.new('ShaderNodeSeparateXYZ'); s.L.new(v, n.inputs[0]); return n.outputs
    def noise(s, vec=None, scale=5.0, detail=2.0, rough=0.5, out='Fac'):
        n = s.N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
        if vec is not None: s.L.new(vec, n.inputs['Vector'])
        return n.outputs[0] if out == 'Fac' else n.outputs[1]
    def voronoi(s, vec=None, scale=5.0, feature='F1', out=0):
        n = s.N.new('ShaderNodeTexVoronoi'); n.feature = feature; n.inputs['Scale'].default_value = scale
        if vec is not None: s.L.new(vec, n.inputs['Vector'])
        return n.outputs[out] if isinstance(out, str) else n.outputs[out]
    def bump(s, height, strength=0.3, dist=0.01, normal=None, invert=False):
        n = s.N.new('ShaderNodeBump'); n.invert = invert
        n.inputs['Strength'].default_value = strength; n.inputs['Distance'].default_value = dist
        s._set(n.inputs['Height'], height)
        if normal is not None: s.L.new(normal, n.inputs['Normal'])
        return n.outputs[0]
    def ramp(s, fac, stops):
        n = s.N.new('ShaderNodeValToRGB'); el = n.color_ramp.elements
        el[0].position = stops[0][0]; el[0].color = c4(stops[0][1])
        el[1].position = stops[-1][0]; el[1].color = c4(stops[-1][1])
        for p, c in stops[1:-1]:
            e = el.new(p); e.color = c4(c)
        s._set(n.inputs[0], fac); return n.outputs[0]
    def inp(s, name, v):
        s._set(s.b.inputs[name], c4(v) if isinstance(v, tuple) and len(v) == 3 else v)

PURPLE = (0.075, 0.006, 0.25)
PURPLE_EDGE = (0.38, 0.03, 0.75)
MINT = (0.16, 0.95, 0.60)
CYAN = (0.05, 0.85, 1.0)
ORANGE = (1.0, 0.24, 0.015)

def paint_mat(name, base=PURPLE, edge=PURPLE_EDGE, stripe=False, lines=(), metallic=0.85, rough=0.26):
    m = pmat(name, base, Metallic=metallic, Roughness=rough, Coat_Weight=0.55, Coat_Roughness=0.04, Coat_IOR=1.45,
             Emission_Color=(0.2, 0.02, 0.8), Emission_Strength=0.06)
    nb = NB(m)
    lw = nb.N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.3
    col = nb.mix(nb.math('SUBTRACT', 1.0, lw.outputs['Facing']), edge, base)
    x, y, z = nb.sep(nb.coords())
    if stripe:
        ay = nb.math('ABSOLUTE', y)
        s1 = nb.maprange(ay, 0.036, 0.039, 1.0, 0.0)
        s2 = nb.math('MULTIPLY', nb.maprange(ay, 0.052, 0.054), nb.maprange(ay, 0.060, 0.062, 1.0, 0.0))
        smask = nb.math('MAXIMUM', s1, s2)
        col = nb.mix(smask, col, MINT)
        nb.inp('Emission Strength', nb.maprange(smask, 0, 1, 0.06, 0.0))
    nrm = None
    if lines:
        acc = None
        for ax, val in lines:
            src = {'x': x, 'y': y, 'z': z}[ax]
            d = nb.math('ABSOLUTE', nb.math('SUBTRACT', src, val))
            l = nb.maprange(d, 0.0012, 0.0045, 1.0, 0.0)
            acc = l if acc is None else nb.math('MAXIMUM', acc, l)
        col = nb.mix(nb.math('MULTIPLY', acc, 0.9), col, (0.004, 0.002, 0.01))
        nrm = nb.bump(acc, strength=0.8, dist=0.006, invert=True)
        nb.inp('Normal', nrm); nb.inp('Coat Normal', nrm)
    fl = nb.noise(nb.coords(), scale=2500.0, detail=0.0)
    nb.inp('Roughness', nb.maprange(fl, 0.3, 0.7, rough - 0.08, rough + 0.12, smooth=False))
    nb.inp('Base Color', col)
    return m

M_PAINT = paint_mat("Paint")
M_PAINT_NOSE = paint_mat("PaintNose", stripe=True, lines=(('x', 0.61),))
M_PAINT_ENG = paint_mat("PaintEngine", stripe=True, lines=(('x', -0.72),))
M_MINT = pmat("Mint", MINT, Metallic=0.35, Roughness=0.25, Coat_Weight=1.0, Coat_Roughness=0.04)
M_MINT_RIM = pmat("MintRim", MINT, Metallic=0.85, Roughness=0.22, Coat_Weight=1.0, Coat_Roughness=0.03)
M_CHROME = pmat("Chrome", (0.92, 0.93, 0.95), Metallic=1.0, Roughness=0.06)
M_STEEL = pmat("Steel", (0.5, 0.52, 0.56), Metallic=1.0, Roughness=0.32, Anisotropic=0.6)
M_DARK = pmat("Carbon", (0.012, 0.013, 0.02), Metallic=0.3, Roughness=0.38, Coat_Weight=0.6, Coat_Roughness=0.15)
M_DARKMETAL = pmat("DarkMetal", (0.03, 0.032, 0.04), Metallic=1.0, Roughness=0.35)
M_SEAT = pmat("Seat", (0.015, 0.014, 0.02), Roughness=0.55, Sheen_Weight=0.3)
M_BLACK = pmat("Void", (0.0, 0.0, 0.0), Roughness=0.9)
M_CALIPER = pmat("Caliper", ORANGE, Metallic=0.2, Roughness=0.3, Coat_Weight=1.0)
M_HEADLIGHT = pmat("Headlight", (0.02, 0.3, 0.4), Roughness=0.05, Coat_Weight=1.0,
                   Emission_Color=(0.03, 0.75, 1.0), Emission_Strength=3.2)
M_GLOWMINT = pmat("GlowMint", MINT, Roughness=0.3, Emission_Color=MINT, Emission_Strength=1.2)
M_WHITE = pmat("DecalDark", (0.012, 0.01, 0.03), Roughness=0.45)

def tyre_mat(name, R, hw):
    m = pmat(name, (0.012, 0.012, 0.014), Roughness=0.62, Sheen_Weight=0.25, Sheen_Roughness=0.5, Specular_IOR_Level=0.35)
    nb = NB(m)
    x, y, z = nb.sep(nb.coords())
    rho = nb.math('SQRT', nb.math('ADD', nb.math('MULTIPLY', x, x), nb.math('MULTIPLY', z, z)))
    band = nb.math('MULTIPLY', nb.maprange(rho, R * 0.775, R * 0.78), nb.maprange(rho, R * 0.815, R * 0.82, 1.0, 0.0))
    side = nb.maprange(nb.math('ABSOLUTE', y), hw * 0.8, hw * 0.9)
    mask = nb.math('MULTIPLY', band, side)
    nb.inp('Base Color', nb.mix(mask, (0.012, 0.012, 0.014), MINT))
    nb.inp('Emission Color', MINT); nb.inp('Emission Strength', nb.math('MULTIPLY', mask, 0.6))
    n = nb.noise(nb.coords(), scale=180.0, detail=3.0)
    nb.inp('Roughness', nb.maprange(n, 0.3, 0.7, 0.5, 0.75, smooth=False))
    nb.inp('Normal', nb.bump(n, strength=0.12, dist=0.002))
    return m

# penguin materials
M_PBLACK = pmat("PenguinBlack", (0.01, 0.011, 0.016), Roughness=0.42, Sheen_Weight=0.6, Sheen_Roughness=0.4,
                Sheen_Tint=(0.5, 0.6, 0.9), Coat_Weight=0.15, Coat_Roughness=0.3)
def head_mat():
    m = pmat("PenguinHead", (0.006, 0.007, 0.011), Roughness=0.7, IOR=1.0)
    nb = NB(m)
    vn = nb.N.new('ShaderNodeVectorMath'); vn.operation = 'NORMALIZE'; nb.L.new(nb.coords(), vn.inputs[0])
    x, y, z = nb.sep(vn.outputs[0])
    az = nb.math('ARCTAN2', y, x); el = nb.math('ARCSINE', z)
    a = nb.math('DIVIDE', az, radians(60)); b = nb.math('DIVIDE', nb.math('SUBTRACT', el, radians(-6)), radians(25))
    val = nb.math('ADD', nb.math('MULTIPLY', a, a), nb.math('MULTIPLY', b, b))
    mask = nb.maprange(val, 0.93, 1.0, 1.0, 0.0)
    nb.inp('Base Color', nb.mix(mask, (0.01, 0.011, 0.016), (0.88, 0.9, 0.93)))
    
    nb.inp('Subsurface Weight', nb.math('MULTIPLY', mask, 0.3))
    nb.b.inputs['Subsurface Radius'].default_value = (0.02, 0.02, 0.025)
    nb.b.inputs['Subsurface Scale'].default_value = 0.3
    # constant small gloss lobe (no grazing fresnel, so the crown never greys out)
    gl = nb.N.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.38
    ms = nb.N.new('ShaderNodeMixShader'); ms.inputs[0].default_value = 0.03
    nb.L.new(nb.b.outputs[0], ms.inputs[1]); nb.L.new(gl.outputs[0], ms.inputs[2])
    nb.L.new(ms.outputs[0], nb.N['Material Output'].inputs['Surface'])
    return m
M_HEAD = head_mat()

def jacket_mat():
    m = pmat("Jacket", ORANGE, Roughness=0.5, Sheen_Weight=0.2, Sheen_Roughness=0.35, Sheen_Tint=(1.0, 0.7, 0.4),
             Coat_Weight=0.12, Coat_Roughness=0.35)
    nb = NB(m)
    co = nb.coords()
    n1 = nb.noise(co, scale=7.0, detail=3.0); n2 = nb.noise(co, scale=140.0, detail=2.0)
    b1 = nb.bump(n1, strength=0.25, dist=0.02); b2 = nb.bump(n2, strength=0.08, dist=0.002, normal=b1)
    nb.inp('Normal', b2)
    nb.inp('Base Color', nb.mix(n1, (0.6, 0.075, 0.0), (0.8, 0.13, 0.0)))
    return m
M_JACKET = jacket_mat()
M_COLLAR = pmat("Collar", (0.008, 0.008, 0.011), Roughness=0.5, Sheen_Weight=0.3, Sheen_Roughness=0.35,
                Sheen_Tint=(0.6, 0.7, 1.0), Coat_Weight=0.2, Coat_Roughness=0.3)
M_BEAK = pmat("Beak", (0.95, 0.2, 0.0), Roughness=0.28, Coat_Weight=0.5, Coat_Roughness=0.1,
              Subsurface_Weight=0.2, Subsurface_Scale=0.05)
M_FOOT = pmat("Foot", (0.95, 0.17, 0.0), Roughness=0.4, Subsurface_Weight=0.2, Subsurface_Scale=0.05)
M_GOGGLE = pmat("GoggleFrame", (0.008, 0.008, 0.012), Roughness=0.22, Coat_Weight=1.0, Coat_Roughness=0.08)
M_STRAP = pmat("Strap", (0.02, 0.02, 0.025), Roughness=0.7, Sheen_Weight=0.5)
def lens_mat():
    m = pmat("Lens", (0.0, 0.02, 0.04), Metallic=0.0, Roughness=0.1, Coat_Weight=0.35, Coat_Roughness=0.0, Specular_IOR_Level=0.1)
    nb = NB(m)
    x, y, z = nb.sep(nb.coords())
    t = nb.maprange(z, -0.01, 0.11, smooth=False)
    grad = nb.ramp(t, [(0.0, (0.0, 1.0, 0.85)), (0.5, (0.0, 0.7, 1.0)), (1.0, (0.0, 0.25, 0.85))])
    # stylised diagonal glint band
    d = nb.math('ADD', nb.math('MULTIPLY', y, 0.8), nb.math('MULTIPLY', z, 1.0))
    band = nb.math('MULTIPLY', nb.maprange(d, 0.075, 0.08), nb.maprange(d, 0.098, 0.103, 1.0, 0.0))
    band2 = nb.math('MULTIPLY', nb.maprange(d, 0.112, 0.116), nb.maprange(d, 0.122, 0.126, 1.0, 0.0))
    glint = nb.math('MULTIPLY', nb.math('MAXIMUM', band, band2), 0.4)
    nb.inp('Emission Color', nb.mix(glint, grad, (1, 1, 1)))
    nb.inp('Emission Strength', 1.5)
    return m
M_LENS = lens_mat()
M_PATCH = pmat("ChestPatch", (0.0, 0.3, 0.4), Roughness=0.2, Coat_Weight=1.0, Emission_Color=(0.0, 0.8, 1.0), Emission_Strength=1.1)

# ------------------------------------------------------------------ kart
ROLL = radians(-3.0)        # body leans to the outside (+Y / kart-left)
STEER = radians(24.0)       # counter-steer
ROOT = empty("KartRoot")
PIV = 0.18
BODY = empty("Body", ROOT, Matrix.Translation((0, 0, PIV)) @ Matrix.Rotation(ROLL, 4, 'X') @ Matrix.Translation((0, 0, -PIV)))

def make_wheel(name, R, w, Rr, loc, left, steer=0.0, spin=0.0, nsp=5):
    hw = w / 2
    grp = empty(name, ROOT, Matrix.Translation(loc) @ Matrix.Rotation(steer + (pi if left else 0), 4, 'Z') @ Matrix.Rotation(spin, 4, 'Y'))
    sh = min(0.5 * hw, 0.55 * (R - Rr))
    th = hw - sh
    P = []   # (r, y, flag)
    P += [(Rr - 0.014, -hw * 0.78, 0), (Rr + 0.004, -hw * 0.9, 0), (Rr + 0.03, -hw * 1.0, 0),
          (Rr + 0.03 + 0.45 * (R - sh - Rr - 0.03), -hw * 1.035, 0), (R - sh, -hw * 1.0, 0)]
    for k in (1, 2, 3):
        a = radians(k * 22.5); P.append((R - sh * (1 - sin(a)), -hw + sh * (1 - cos(a)), 1))
    gs = [-0.42 * th, 0.42 * th]; gw = 0.007; gd = 0.011
    P.append((R, -th, 0))
    for g in gs:
        P += [(R + 0.001, g - gw - 0.004, 0), (R - gd, g - gw, 0), (R - gd, g + gw, 0), (R + 0.001, g + gw + 0.004, 0)]
    P.append((R, th, 0))
    for k in (3, 2, 1):
        a = radians(k * 22.5); P.append((R - sh * (1 - sin(a)), hw - sh * (1 - cos(a)), 1))
    P += [(R - sh, hw, 0), (Rr + 0.03 + 0.45 * (R - sh - Rr - 0.03), hw * 1.035, 0), (Rr + 0.03, hw, 0),
          (Rr + 0.004, hw * 0.9, 0), (Rr - 0.014, hw * 0.78, 0)]
    seg = 144
    def mod(i, j, r, h):
        if P[i][2] and (j % 6) < 2: return r - 0.011
        return r
    lathe(name + "Tyre", P, tyre_mat(name + "Rubber", R, hw), seg=seg, axis='Y', mod=mod, sub=1, parent=grp)
    # rim barrel
    rp = [(Rr + 0.014, -hw * 0.84), (Rr + 0.013, -hw * 0.93), (Rr - 0.002, -hw * 0.96), (Rr - 0.016, -hw * 0.9),
          (Rr - 0.022, -hw * 0.6), (Rr - 0.024, hw * 0.5), (Rr - 0.022, hw * 0.86), (Rr + 0.012, hw * 0.9)]
    lathe(name + "Rim", rp, M_MINT_RIM, seg=64, axis='Y', sub=2, parent=grp)
    # back plate
    lathe(name + "Back", [(0, hw * 0.55), (Rr - 0.03, hw * 0.55), (Rr - 0.022, hw * 0.62), (Rr - 0.024, hw * 0.8)], M_DARKMETAL, seg=32, axis='Y', sub=1, parent=grp)
    # brake disc + caliper
    Rd = Rr * 0.8; y0 = -hw * 0.2
    lathe(name + "Disc", [(0.03, y0), (Rd - 0.003, y0), (Rd, y0 + 0.002), (Rd, y0 + 0.012), (Rd - 0.003, y0 + 0.014), (0.03, y0 + 0.014)],
          M_STEEL, seg=48, axis='Y', sub=1, parent=grp)
    loft(name + "Caliper", [ring_xz(y0 - 0.03 + 0.07 * k, 0.0, Rd * 0.82, 0.06, Rd * 0.25, e=4, n=16) for k in (0, 0.5, 1)], M_CALIPER,
         end0=('flat', 0.008), end1=('flat', 0.008), parent=grp, matrix=Matrix.Rotation(radians(35), 4, 'Y'))
    # spokes
    ys_h = -hw * 0.82; ys_r = -hw * 0.70
    for k in range(nsp):
        rings = []
        for f, wv in ((0.0, 0.03), (0.3, 0.021), (0.7, 0.021), (1.0, 0.034)):
            r = 0.03 + (Rr - 0.018 - 0.03) * f
            yy = ys_h + (ys_r - ys_h) * f
            rings.append([Vector((wv * sgnpow(cos(2 * pi * j / 16), 0.5), yy + 0.015 * sgnpow(sin(2 * pi * j / 16), 0.5), r)) for j in range(16)])
        loft(name + "Spoke", rings, M_MINT_RIM, end0=None, end1=None, parent=grp, matrix=Matrix.Rotation(2 * pi * k / nsp, 4, 'Y'))
    # hub
    hb = ys_h
    lathe(name + "Hub", [(0, hb - 0.026), (0.022, hb - 0.026), (0.046, hb - 0.018), (0.06, hb - 0.002), (0.062, hb + 0.03)], M_MINT_RIM, seg=32, axis='Y', sub=2, parent=grp)
    lathe(name + "Nut", [(0, hb - 0.04), (0.014, hb - 0.04), (0.018, hb - 0.034), (0.018, hb - 0.02)], M_CHROME, seg=6, axis='Y', sub=1, parent=grp)
    for k in range(nsp):
        a = 2 * pi * (k + 0.5) / nsp
        ellipsoid(name + "Lug", (0.042 * sin(a), hb - 0.012, 0.042 * cos(a)), (0.007, 0.008, 0.007), M_CHROME, parent=grp, seg=12)
    return grp

FA, RA = 0.66, -0.62      # axle x
FT, RT = 0.60, 0.62       # half track
FR, RR = 0.225, 0.275     # tyre radii
make_wheel("WFR", FR, 0.22, 0.13, (FA, -FT, FR), False, STEER, 0.3)
make_wheel("WFL", FR, 0.22, 0.13, (FA, FT, FR), True, STEER, 1.1)
make_wheel("WRR", RR, 0.31, 0.155, (RA, -RT, RR), False, 0.0, 0.7)
make_wheel("WRL", RR, 0.31, 0.155, (RA, RT, RR), True, 0.0, 0.2)

# --- floor tub
loft("Tub", [ring_yz(x, 0, 0.065, 0.15, hw, e=5) for x, hw in ((-0.9, 0.2), (-0.6, 0.3), (-0.3, 0.36), (0.25, 0.36), (0.6, 0.24), (1.0, 0.16))],
     M_DARK, parent=BODY)

# --- nose
nose_st = [(0.36, 0.13, 0.545, 0.19, 0.015), (0.50, 0.125, 0.525, 0.195, 0.02), (0.66, 0.115, 0.46, 0.205, 0.025),
           (0.82, 0.105, 0.385, 0.205, 0.025), (1.0, 0.10, 0.315, 0.185, 0.02), (1.15, 0.105, 0.265, 0.14, 0.012)]
NOSE = loft("Nose", [ring_yz(x, 0, z0, z1, hw, e=2.7, spine=sp, n=28) for x, z0, z1, hw, sp in nose_st], M_PAINT_NOSE,
            end0=('flat', 0.02), end1=('round', 0.08), parent=BODY, sub=3)
# dash panel
loft("Dash", [ring_yz(x, 0, 0.3, 0.52, 0.16, e=3) for x in (0.335, 0.35)], M_DARK, end0=('flat', 0.006), end1=None, parent=BODY)

# --- front wing
def fw_x(y): return 1.19 - 0.07 * (abs(y) / 0.5) ** 2
loft("FWing", [ring_xz(y, fw_x(y), 0.10 + 0.02 * (abs(y) / 0.5) ** 2, 0.10, 0.022, e=2.4) for y in np.linspace(-0.5, 0.5, 11)], M_MINT,
     end0=('flat', 0.01), end1=('flat', 0.01), parent=BODY)
for s in (-1, 1):
    loft("FWEnd", [ring_xz(s * yy, 1.10, 0.15, 0.15, 0.075, e=4.5) for yy in (0.495, 0.51, 0.525)], M_PAINT,
         end0=('flat', 0.008), end1=('flat', 0.008), parent=BODY)

# --- side pods
pod_st = [(0.24, 0.47, 0.105, 0.33, 0.125), (0.05, 0.48, 0.10, 0.355, 0.135), (-0.15, 0.47, 0.10, 0.365, 0.13),
          (-0.32, 0.405, 0.10, 0.34, 0.085), (-0.46, 0.34, 0.11, 0.30, 0.05)]
PODS = []
for s in (-1, 1):
    p = loft("Pod", [ring_yz(x, s * cy, z0, z1, hw, e=3.2) for x, cy, z0, z1, hw in pod_st], paint_mat("PaintPod%d" % s, lines=(('x', -0.1),)),
             end0=('hollow', 0.02), end1=('round', 0.04), parent=BODY, sub=3)
    PODS.append(p)
    loft("PodPlug", [ring_yz(x, s * 0.47, 0.13, 0.31, 0.10, e=3.2) for x in (0.12, 0.18)], M_BLACK, parent=BODY, sub=1)
    for k in range(3):
        z = 0.165 + 0.055 * k
        tube("PodBar", [(0.215, s * 0.47 - 0.098, z), (0.215, s * 0.47 + 0.098, z)], (0.009, 0.007), M_MINT, n=8, parent=BODY, sub=1)
    # mint accent blade along pod top
    tube("PodBlade", catmull([(0.2, s * 0.47, 0.338), (0.05, s * 0.48, 0.365), (-0.15, s * 0.47, 0.375), (-0.33, s * 0.40, 0.35)], 5),
         (0.012, 0.05), M_MINT, n=12, e=3, parent=BODY)

# --- seat
def seat_x(z): return -0.52 - 0.16 * (z - 0.14)
loft("Seat", [ring_xy(z, seat_x(z), 0, 0.055, hy, e=3.5) for z, hy in ((0.14, 0.25), (0.4, 0.3), (0.7, 0.3), (0.95, 0.24), (1.06, 0.15))],
     M_SEAT, parent=BODY)
loft("SeatBase", [ring_yz(x, 0, 0.14, 0.2, 0.27, e=4) for x in (-0.52, -0.2, 0.05)], M_SEAT, parent=BODY)

# --- engine cover
eng_st = [(-0.58, 0.135, 0.62, 0.27, 0.02), (-0.66, 0.135, 0.63, 0.285, 0.025), (-0.79, 0.14, 0.57, 0.265, 0.025),
          (-0.92, 0.16, 0.47, 0.22, 0.02), (-1.03, 0.20, 0.39, 0.16, 0.01)]
ENG = loft("Engine", [ring_yz(x, 0, z0, z1, hw, e=2.8, spine=sp, n=28) for x, z0, z1, hw, sp in eng_st], M_PAINT_ENG,
           end0=('flat', 0.02), end1=('round', 0.06), parent=BODY, sub=3)
# tail light
ellipsoid("TailLight", (-1.085, 0, 0.3), (0.02, 0.09, 0.03), pmat("Tail", (0.5, 0, 0.1), Emission_Color=(1, 0.05, 0.3), Emission_Strength=6.0), parent=BODY)

# --- exhausts
for s in (-1, 1):
    for k, (dy, dz, ln) in enumerate(((0.0, 0.0, 1.0), (0.075, -0.075, 0.86))):
        pts = [(-0.62, s * (0.2 + dy), 0.42 + dz), (-0.70, s * (0.34 + dy), 0.53 + dz), (-0.82, s * (0.42 + dy), 0.68 + dz),
               (-0.82 - 0.2 * ln, s * (0.45 + dy), 0.68 + 0.2 * ln + dz)]
        tube("Exhaust", catmull(pts, 8), lambda t: 0.036 + 0.02 * max(0, (t - 0.72) / 0.28) ** 1.5, M_CHROME, n=20,
             ends=(('round', 0.01), ('hollow', 0.02)), parent=BODY)

# --- rear wing
def rw_x(y): return -1.02 - 0.11 * (abs(y) / 0.58) ** 1.6
def rw_z(y): return 1.04 + 0.035 * (abs(y) / 0.58) ** 2
loft("RWing", [ring_xz(y, rw_x(y), rw_z(y), 0.135, 0.024, e=2.3, tilt=radians(-12)) for y in np.linspace(-0.58, 0.58, 13)], M_PAINT,
     end0=('flat', 0.01), end1=('flat', 0.01), parent=BODY, sub=3)
loft("RWingFlap", [ring_xz(y, rw_x(y) - 0.135, rw_z(y) + 0.05, 0.04, 0.012, e=2.3, tilt=radians(-32)) for y in np.linspace(-0.58, 0.58, 13)], M_MINT,
     end0=('flat', 0.006), end1=('flat', 0.006), parent=BODY)
EP = []; RIMX = []
for s in (-1, 1):
    ep = loft("RWEnd", [ring_xz(s * yy, -1.15, 1.04, 0.2, 0.125, e=4.5) for yy in (0.585, 0.6, 0.615)], M_PAINT,
              end0=('flat', 0.01), end1=('flat', 0.01), parent=BODY)
    EP.append(ep); RIMX.append(ep) if s == -1 else None
    loft("RWStrut", [ring_xy(z, -0.86 - 0.27 * (z - 0.45), s * 0.13, 0.05, 0.011, e=2.5, n=16) for z in (0.42, 0.7, 1.03)], M_DARK,
         end0=None, end1=None, parent=BODY)
    # roundel + bolts on end plate
    Mr = align((-1.15, s * 0.626, 1.04), (0, s, 0), up=Vector((0, 0, 1)))
    _r = lathe("Roundel", [(0, 0.0), (0.07, 0.0), (0.075, -0.004)], M_WHITE, seg=40, sub=1, parent=BODY, matrix=Mr)
    if s == -1: RIMX.append(_r)
    for bx, bz in ((-0.17, 0.09), (0.17, 0.09), (-0.17, -0.09), (0.17, -0.09)):
        ellipsoid("Bolt", (-1.15 + bx, s * 0.626, 1.04 + bz), (0.009, 0.006, 0.009), M_CHROME, parent=BODY, seg=12)
    cu = bpy.data.curves.new("Num", 'FONT'); cu.body = "7"; cu.size = 0.14; cu.extrude = 0.003; cu.shear = 0.25
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    tx = bpy.data.objects.new("Num", cu); COLL.objects.link(tx); tx.parent = BODY
    cu.materials.append(M_GLOWMINT)
    # text faces local +Z; local +X should be image-right when viewed from outside
    xax = Vector((-s, 0, 0)); zax = Vector((0, s, 0)); yax = zax.cross(xax)
    Mt = Matrix((xax, yax, zax)).transposed().to_4x4(); Mt.translation = Vector((-1.15, s * 0.629, 1.04))
    tx.matrix_local = Mt

# --- headlight nacelles
for s in (-1, 1):
    cy = s * 0.185
    loft("Nacelle", [ring_yz(x, cy + s * dyy, zc - hh, zc + hh, hw, e=2.3, n=20) for x, dyy, zc, hw, hh in
                     ((0.74, -0.03, 0.30, 0.02, 0.02), (0.84, -0.01, 0.285, 0.055, 0.05), (0.95, 0.0, 0.262, 0.07, 0.058), (1.045, 0.0, 0.245, 0.066, 0.052))],
         M_PAINT, end0=('round', 0.02), end1=('flat', 0.012), parent=BODY, sub=3)
    Ml = Matrix.Translation((1.05, cy, 0.245)) @ Matrix.Diagonal((1, 0.057, 0.045, 1))
    lathe("HLens", [(0, 0.034), (0.5, 0.027), (0.86, 0.01), (1.0, -0.004)], M_HEADLIGHT, seg=32, axis='X', sub=2, parent=BODY, matrix=Ml)
    ellipsoid("HCore", (1.075, cy, 0.245), (0.012, 0.024, 0.019), pmat("HCore%d" % s, (0, 0, 0), Emission_Color=(0.6, 1.0, 1.0), Emission_Strength=9.0), parent=BODY)
    ring = [(1.052, cy + 0.06 * sgnpow(cos(t), 1.0) * 1.0, 0.245 + 0.048 * sin(t)) for t in np.linspace(0, 2 * pi, 32, endpoint=False)]
    tube("HBezel", ring, 0.008, M_CHROME, n=10, closed=True, normals=[(1, 0, 0)] * 32, parent=BODY, sub=1)

# --- suspension / axle (in ROOT frame so wheels stay planted)
for s in (-1, 1):
    for zz, xo in ((0.17, 0.11), (0.29, 0.09)):
        for sx in (-1, 1):
            tube("Wishbone", [(FA + sx * xo, s * 0.17, zz + 0.01), (FA, s * (FT - 0.07), zz)], 0.013, M_DARKMETAL, n=10, parent=ROOT, sub=1)
    tube("TieRod", [(FA - 0.2, s * 0.15, 0.24), (FA - 0.12, s * (FT - 0.09), 0.24)], 0.009, M_CHROME, n=8, parent=ROOT, sub=1)
    ellipsoid("Upright", (FA, s * (FT - 0.075), FR), (0.035, 0.03, 0.09), M_DARKMETAL, parent=ROOT)
    # coil-over
    tube("Shock", [(FA, s * 0.15, 0.40), (FA, s * (FT - 0.12), 0.20)], lambda t: 0.022 + 0.008 * abs(sin(t * pi * 9)), M_GLOWMINT if False else M_MINT, n=12, parent=ROOT, sub=1)
tube("RearAxle", [(RA, -RT + 0.05, RR), (RA, RT - 0.05, RR)], 0.032, M_DARKMETAL, n=16, parent=ROOT, sub=1)

# --- nose details: fuel cap, bolts, vents (placed by raycast on the nose surface)
bv_nose = bvh_of(NOSE)
def on_surface(bv, x, y, z=2.0, d=(0, 0, -1)):
    loc, nrm, idx, dist = bv.ray_cast(Vector((x, y, z)), Vector(d))
    return loc, nrm
BOLT = lathe("BoltSrc", [(0, 0.004), (0.005, 0.0035), (0.0075, 0.0), (0.0075, -0.004)], M_CHROME, seg=12, sub=1)
BOLT.hide_render = True
def bolt_at(bv, x, y, parent=BODY, **kw):
    loc, nrm = on_surface(bv, x, y, **kw)
    if loc is not None:
        instance(BOLT, align(loc, nrm), parent).hide_render = False
for s in (-1, 1):
    for x in (0.585, 0.635):
        for yy in (0.11, 0.15):
            bolt_at(bv_nose, x, s * yy)
loc, nrm = on_surface(bv_nose, 0.47, 0.115)
lathe("FuelCap", [(0, 0.012), (0.02, 0.012), (0.03, 0.006), (0.032, -0.006)], M_CHROME, seg=24, sub=2, parent=BODY, matrix=align(loc, nrm))
# vents on nose (dark slots following the surface)
for s in (-1, 1):
    for k in range(4):
        x = 0.70 + 0.045 * k
        pts = []
        for yy in np.linspace(0.105, 0.165, 5):
            l, n_ = on_surface(bv_nose, x + (yy - 0.105) * 0.5, s * yy)
            pts.append(l + n_ * 0.0005)
        tube("Vent", pts, (0.004, 0.011), M_BLACK, n=8, parent=BODY, sub=1)
bv_eng = bvh_of(ENG)
for s in (-1, 1):
    for x in (-0.695, -0.745):
        for yy in (0.12, 0.19):
            bolt_at(bv_eng, x, s * yy)

# ------------------------------------------------------------------ penguin
PX = -0.15
PS = 1.3
PENG = empty("Penguin", BODY, Matrix.Translation((PX, 0, 0.18)) @ Matrix.Scale(PS, 4) @ Matrix.Translation((-PX, 0, -0.18)))
# --- steering wheel
SW_C = Vector((0.185, 0, 0.575)); SW_N = Vector((-0.93, 0, 0.37)).normalized(); SW_R = 0.135
SW = empty("SteerWheel", PENG, align(SW_C, SW_N) @ Matrix.Rotation(radians(-22), 4, 'Z'))
circ = [(SW_R * cos(t), SW_R * sin(t), 0) for t in np.linspace(0, 2 * pi, 40, endpoint=False)]
tube("SWRim", circ, (0.02, 0.017), M_SEAT, n=12, closed=True, normals=[(0, 0, 1)] * 40, parent=SW, sub=1)
for a in (0, 180, 270):
    tube("SWSpoke", [(0.02 * cos(radians(a)), 0.02 * sin(radians(a)), -0.012), (SW_R * cos(radians(a)), SW_R * sin(radians(a)), -0.002)], (0.006, 0.016), M_CHROME, n=8, parent=SW, sub=1)
lathe("SWHub", [(0, 0.012), (0.03, 0.012), (0.042, 0.0), (0.04, -0.03)], M_MINT, seg=24, parent=SW)
tube("SWColumn", [PENG.matrix_local @ (SW_C - SW_N * 0.01), Vector((0.45, 0, 0.47))], 0.022, M_DARKMETAL, n=10, parent=BODY, sub=1)

ZH, ZN = 0.20, 0.74
fs = [0.0, 0.2, 0.45, 0.7, 0.88, 1.0]; rs = [0.215, 0.25, 0.25, 0.225, 0.17, 0.115]
def torso_r(z, puff=True):
    f = (z - ZH) / (ZN - ZH)
    r = interp(fs, rs, f)
    if puff and f < 0.86:
        u = (f / 0.86 * 4) % 1.0
        r += 0.02 * (sin(pi * u) ** 0.55) - 0.006
    return r
prof = [(0.0, ZH - 0.05), (0.14, ZH - 0.045), (0.2, ZH - 0.02)]
for b in range(4):
    for u in (0.0, 0.07, 0.25, 0.5, 0.75, 0.93):
        z = ZH + (ZN - ZH) * 0.86 * (b + u) / 4
        prof.append((torso_r(z), z))
for f in (0.86, 0.9, 0.95, 1.0):
    z = ZH + (ZN - ZH) * f; prof.append((torso_r(z), z))
prof += [(0.08, ZN + 0.02), (0.0, ZN + 0.025)]
TORSO = lathe("Jacket", prof, M_JACKET, seg=48, sub=2, parent=PENG, matrix=Matrix.Translation((PX, 0, 0)) @ Matrix.Diagonal((0.92, 1.0, 1.0, 1.0)))
ellipsoid("Hips", (PX, 0, 0.22), (0.2, 0.22, 0.12), M_PBLACK, parent=PENG)
# zipper
zp = [(PX + 0.92 * torso_r(z, False) + 0.012, 0, z) for z in np.linspace(ZH + 0.01, ZN - 0.09, 14)]
tube("Zipper", zp, (0.009, 0.014), M_COLLAR, n=10, e=3, parent=PENG, sub=1)
tube("ZipTeeth", [(p[0] + 0.008, 0, p[2]) for p in zp], lambda t: (0.003, 0.004 + 0.0015 * (int(t * 60) % 2)), M_CHROME, n=8, parent=PENG, sub=0)
# collar
CC = Vector((PX + 0.01, 0, 0.745))
cp = [(CC.x + 0.168 * cos(t), 0.178 * sin(t), CC.z - 0.02 * cos(t)) for t in np.linspace(0, 2 * pi, 72, endpoint=False)]
tube("Collar", cp, lambda t: 0.05 + 0.011 * abs(sin(t * pi * 7)) ** 0.6, M_COLLAR, n=16, closed=True, normals=[(0, 0, 1)] * 72, parent=PENG)

# arms + mittens
SLEEVE = {}
for s in (-1, 1):
    grip = SW_C + Vector((0, s * SW_R * 0.98, 0)) + SW_N * 0.0
    # rotate grip point with the steering wheel angle
    ang = radians(-22)
    yv = Vector((0, 1, 0)); xv = yv.cross(SW_N).normalized()   # in-plane axes
    grip = SW_C + (yv * cos(ang) * s + (SW_N.cross(yv)).normalized() * sin(ang) * s) * SW_R
    wrist = grip + Vector((-0.07, s * 0.035, 0.0))
    pts = [(PX + 0.0, s * 0.165, 0.615), (PX + 0.06, s * 0.265, 0.575), (PX + 0.17, s * 0.30, 0.515), wrist]
    def arm_r(t):
        base = 0.088 - 0.022 * t
        u = (t * 3) % 1.0
        return base + 0.014 * (sin(pi * u) ** 0.55) - 0.004
    SLEEVE[s] = tube("Sleeve", catmull(pts, 8), arm_r, M_JACKET, n=16, parent=PENG)
    d = (grip - wrist).normalized()
    tube("Cuff", [wrist - d * 0.015, wrist + d * 0.03], 0.058, M_COLLAR, n=14, parent=PENG, sub=2)
    ellipsoid("Mitten", grip - d * 0.005 + SW_N * 0.012, (0.066, 0.062, 0.072), M_PBLACK, parent=PENG, sub=2)
    ellipsoid("Thumb", grip + Vector((0.0, -s * 0.055, 0.035)) + SW_N * 0.03, (0.03, 0.032, 0.04), M_PBLACK, parent=PENG, sub=2)

# chest patch (penguin's right chest, camera side)
bv_t = bvh_of(TORSO)
def torso_hit(az, z):
    o = Vector((PX + 1.0 * cos(az), 1.0 * sin(az), z)); d = (Vector((PX, 0, z)) - o).normalized()
    # TORSO bvh is in object-local (unscaled) coords -> transform ray
    Mi = TORSO.matrix_local.inverted()
    loc, nrm, i, dist = bv_t.ray_cast(Mi @ o, (Mi.to_3x3() @ d).normalized())
    loc = TORSO.matrix_local @ loc
    nrm = (TORSO.matrix_local.inverted().transposed().to_3x3() @ nrm).normalized()
    return loc, nrm
bv_s = bvh_of(SLEEVE[-1])
_t = Vector((PX + 0.125, -0.285, 0.545)); _o = _t + Vector((0.8, -0.45, 0.5))
loc, nrm, _i, _d = bv_s.ray_cast(_o, (_t - _o).normalized())
Mp = align(loc, nrm) @ Matrix.Scale(0.9, 4)
loft("PatchFrame", [ring_xy(z, 0, 0, 0.05, 0.043, e=5) for z in (-0.004, 0.006)], M_GOGGLE, end0=None, end1=('flat', 0.004), parent=PENG, matrix=Mp)
loft("PatchGlow", [ring_xy(z, 0, 0, 0.037, 0.03, e=5) for z in (0.004, 0.0115)], M_PATCH, end0=None, end1=('flat', 0.003), parent=PENG, matrix=Mp)

# legs + feet
for s in (-1, 1):
    tube("Leg", catmull([(PX + 0.08, s * 0.11, 0.25), (0.12, s * 0.17, 0.26), (0.27, s * 0.225, 0.25)], 6), 0.055, M_PBLACK, n=12, parent=PENG)
    Mf = Matrix.Translation((0.28, s * 0.225, 0.235)) @ Matrix.Rotation(radians(-58), 4, 'Y') @ Matrix.Rotation(radians(s * -8), 4, 'Z')
    loft("Foot", [ring_yz(x, 0, -hh, hh, hw, e=2.6, n=20) for x, hw, hh in ((0.0, 0.04, 0.03), (0.06, 0.056, 0.026), (0.115, 0.066, 0.02), (0.15, 0.06, 0.014))],
         M_FOOT, end0=('round', 0.03), end1=('round', 0.02), parent=PENG, matrix=Mf)
    for ta in (-26, 0, 26):
        tr_ = radians(ta)
        ellipsoid("Toe", (0.0, 0.0, 0.0), (0.062 if ta == 0 else 0.054, 0.023, 0.017), M_FOOT, parent=PENG, sub=2, seg=16).matrix_local = (
            Mf @ Matrix.Translation((0.115, 0.0, 0.0)) @ Matrix.Rotation(tr_, 4, 'Z') @ Matrix.Translation((0.06, 0, 0)) @ Matrix.Diagonal((0.062 if ta == 0 else 0.054, 0.023, 0.017, 1)))

# head
HR = Vector((0.245, 0.262, 0.236))
HC = Vector((PX + 0.035, 0, 0.995))
HEAD = empty("Head", PENG, Matrix.Translation(HC) @ Euler((radians(-5), radians(3), radians(-22))).to_matrix().to_4x4())
lathe("HeadMesh", [(sin(pi * k / 28), -cos(pi * k / 28)) if 0 < k < 28 else (0, -1 if k == 0 else 1) for k in range(29)], M_HEAD,
      seg=64, sub=2, parent=HEAD, matrix=Matrix.Diagonal((HR.x, HR.y, HR.z, 1)))
def hp(az, el, off=0.0):
    az = radians(az); el = radians(el)
    return Vector(((HR.x + off) * cos(el) * cos(az), (HR.y + off) * cos(el) * sin(az), (HR.z + off) * sin(el)))
G_AZ, G_EL0, G_EL1 = 60.0, -4.0, 27.0
def notch(az): return 6.5 * exp(-(az / 13.0) ** 2)
rim_pts = []; rim_n = []
for t in np.linspace(0, 2 * pi, 96, endpoint=False):
    az = G_AZ * sgnpow(cos(t), 2 / 5.0)
    el = (G_EL0 + G_EL1) / 2 + (G_EL1 - G_EL0) / 2 * sgnpow(sin(t), 2 / 5.0)
    if sin(t) < 0: el += notch(az) * min(1.0, -sin(t) * 3)
    p = hp(az, el, 0.014); rim_pts.append(p); rim_n.append(hp(az, el).normalized())
tube("GoggleRim", rim_pts, (0.021, 0.026), M_GOGGLE, n=14, closed=True, normals=rim_n, e=2.6, parent=HEAD)
# lens
lv = []; lf = []; NU, NV = 41, 9
for i in range(NU):
    az = -G_AZ + 1.5 + (2 * G_AZ - 3) * i / (NU - 1)
    e0 = G_EL0 + notch(az) + 0.5; e1 = G_EL1 - 0.5
    for j in range(NV):
        v = j / (NV - 1)
        lv.append(hp(az, e0 + (e1 - e0) * v, 0.012 + 0.012 * sin(pi * v) ** 0.7))
for i in range(NU - 1):
    for j in range(NV - 1):
        a = i * NV + j; lf.append((a, a + NV, a + NV + 1, a + 1))
mk("Lens", lv, lf, M_LENS, sub=2, parent=HEAD)
# strap
sp_ = [hp(az, 8.0, 0.004) for az in np.linspace(0, 360, 64, endpoint=False)]
tube("Strap", sp_, (0.007, 0.03), M_STRAP, n=10, closed=True, normals=[p.normalized() for p in sp_], e=4, parent=HEAD, sub=1)
# beak
loft("Beak", [ring_yz(x, 0, zc - hh, zc + hh * 0.9, hw, e=2.2, n=20) for x, zc, hw, hh in
              ((0.17, -0.058, 0.082, 0.05), (0.25, -0.060, 0.072, 0.042), (0.305, -0.066, 0.05, 0.029), (0.345, -0.073, 0.026, 0.015))],
     M_BEAK, end0=None, end1=('round', 0.022), parent=HEAD, sub=3)

# ------------------------------------------------------------------ environment
# ice
def ice_mat():
    m = pmat("Ice", (0.01, 0.05, 0.08), Roughness=0.1, IOR=1.31, Specular_IOR_Level=0.8)
    nb = NB(m)
    g = nb.N.new('ShaderNodeNewGeometry'); pos = g.outputs['Position']
    big = nb.noise(pos, scale=0.35, detail=4.0, rough=0.6)
    fine = nb.noise(pos, scale=6.0, detail=5.0, rough=0.65)
    wn = nb.noise(pos, scale=1.3, detail=3.0, out='Color')
    wv = nb.N.new('ShaderNodeVectorMath'); wv.operation = 'MULTIPLY_ADD'
    nb.L.new(wn, wv.inputs[0]); wv.inputs[1].default_value = (0.9, 0.9, 0.0); nb.L.new(pos, wv.inputs[2])
    c1 = nb.voronoi(wv.outputs[0], scale=0.4, feature='DISTANCE_TO_EDGE')
    c2 = nb.voronoi(wv.outputs[0], scale=1.3, feature='DISTANCE_TO_EDGE')
    # warp cracks a little via noise-modulated thresholds
    l1 = nb.math('MULTIPLY', nb.maprange(c1, 0.0, 0.005, 1.0, 0.0), 0.4)
    l2 = nb.math('MULTIPLY', nb.maprange(c2, 0.0, 0.004, 1.0, 0.0), 0.3)
    crack = nb.math('MAXIMUM', l1, l2)
    snow = nb.maprange(nb.math('ADD', big, nb.math('MULTIPLY', fine, 0.25)), 0.74, 0.9)
    base = nb.mix(big, (0.004, 0.035, 0.07), (0.012, 0.09, 0.14))
    base = nb.mix(nb.math('MULTIPLY', crack, 0.55), base, (0.35, 0.75, 0.85))
    base = nb.mix(nb.math('MULTIPLY', snow, 0.6), base, (0.55, 0.75, 0.9))
    nb.inp('Base Color', base)
    r = nb.maprange(fine, 0.3, 0.75, 0.015, 0.09, smooth=False)
    r = nb.math('ADD', r, nb.math('MULTIPLY', crack, 0.25))
    r = nb.math('ADD', r, nb.math('MULTIPLY', snow, 0.5))
    nb.inp('Roughness', r)
    nb.inp('Normal', nb.bump(nb.math('ADD', nb.math('MULTIPLY', crack, -1.0), nb.math('MULTIPLY', fine, 0.15)), strength=0.15, dist=0.01))
    nb.inp('Emission Color', (0.1, 0.7, 0.9)); nb.inp('Emission Strength', nb.math('MULTIPLY', crack, 0.02))
    return m
ICE = mk("IceLake", [(-900, -900, 0), (900, -900, 0), (900, 900, 0), (-900, 900, 0)], [(0, 1, 2, 3)], ice_mat(), sub=0, smooth=False)

# camera definitions (needed for placing environment)
CAM_POS = Vector((2.58, -0.98, 0.27))
CAM_TGT = Vector((0.12, 0.05, 0.74))
VIEW_AZ = math.atan2(CAM_TGT.y - CAM_POS.y, CAM_TGT.x - CAM_POS.x)   # direction camera looks

# mountains
_vd = Vector((cos(VIEW_AZ), sin(VIEW_AZ), 0)); _vl = Vector((-_vd.y, _vd.x, 0))
MOON_DIR = tuple((_vl * 0.75 - _vd * 0.35 + Vector((0, 0, 0.55))).normalized())
def ridged(x, y):
    v = 0.0; a = 1.0; f = 1.0; tot = 0.0
    for o in range(5):
        n = noise.noise(Vector((x * f, y * f, 3.7 + o)))
        v += a * (1.0 - abs(n * 2.0)) ** 2 if abs(n * 2) < 1 else 0.0
        tot += a; a *= 0.5; f *= 2.1
    return v / tot
def mountain_mat():
    m = pmat("Mountain", (0.5, 0.68, 0.85), Roughness=0.6)
    nb = NB(m)
    g = nb.N.new('ShaderNodeNewGeometry')
    x, y, z = nb.sep(g.outputs['Normal'])
    px, py, pz = nb.sep(g.outputs['Position'])
    n = nb.noise(g.outputs['Position'], scale=0.05, detail=4.0)
    n2 = nb.noise(g.outputs['Position'], scale=0.012, detail=3.0)
    snow_h = nb.maprange(nb.math('ADD', pz, nb.math('MULTIPLY', n2, 60.0)), 95.0, 135.0)
    snow_s = nb.maprange(nb.math('ADD', z, nb.math('MULTIPLY', n, 0.35)), 0.5, 0.85)
    rock = nb.math('SUBTRACT', 1.0, nb.math('MAXIMUM', nb.math('MULTIPLY', snow_h, 0.95), nb.math('MULTIPLY', snow_s, 0.22)))
    col = nb.mix(rock, (0.55, 0.82, 1.0), (0.03, 0.09, 0.26))
    lv = nb.N.new('ShaderNodeVectorMath'); lv.operation = 'DOT_PRODUCT'
    nb.L.new(g.outputs['Normal'], lv.inputs[0]); lv.inputs[1].default_value = MOON_DIR
    lit = nb.maprange(lv.outputs['Value'], -0.2, 0.9, 0.06, 1.0, smooth=False)
    nb.inp('Base Color', (0, 0, 0)); nb.inp('Specular IOR Level', 0.0)
    nb.inp('Emission Color', col); nb.inp('Emission Strength', nb.math('MULTIPLY', lit, 0.8))
    cd = nb.N.new('ShaderNodeCameraData')
    hz = nb.math('MULTIPLY', nb.maprange(cd.outputs['View Distance'], 120.0, 560.0, 0.1, 0.9, smooth=False),
                 nb.maprange(pz, 0.0, 70.0, 1.0, 0.55, smooth=False))
    em = nb.N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.015, 0.085, 0.19, 1); em.inputs['Strength'].default_value = 1.0
    ms = nb.N.new('ShaderNodeMixShader')
    nb.L.new(hz, ms.inputs[0]); nb.L.new(nb.b.outputs[0], ms.inputs[1]); nb.L.new(em.outputs[0], ms.inputs[2])
    out = nb.N['Material Output']; nb.L.new(ms.outputs[0], out.inputs['Surface'])
    return m
def build_mountains():
    NA, NR = 800, 130; r0, r1 = 150.0, 560.0
    verts = []; faces = []
    for i in range(NA):
        a = 2 * pi * i / NA
        for k in range(NR):
            f = k / (NR - 1); r = r0 + (r1 - r0) * f
            x = r * cos(a); y = r * sin(a)
            env = sin(pi * min(1.0, f * 1.15)) ** 0.9 if f < 0.87 else 0.0
            rg = ridged(x * 0.0075, y * 0.0075)
            # taller toward the sides of the view, lower directly behind the hero
            da = abs((a - VIEW_AZ + pi) % (2 * pi) - pi)
            side = 0.55 + 0.45 * min(1.0, da / 0.45)
            h = env * side * (10.0 + 150.0 * rg ** 1.8)
            verts.append((x, y, h - 0.5))
    for i in range(NA):
        i2 = (i + 1) % NA
        for k in range(NR - 1):
            faces.append((i * NR + k, i2 * NR + k, i2 * NR + k + 1, i * NR + k + 1))
    return mk("Mountains", verts, faces, mountain_mat(), sub=0, smooth=True)
build_mountains()

# aurora ribbon
def aurora_mat():
    m = bpy.data.materials.new("Aurora"); m.use_nodes = True
    nb = NB(m); nb.N.remove(nb.b)
    uv = nb.N.new('ShaderNodeUVMap').outputs[0]
    u, v, _ = nb.sep(uv)
    cv = nb.N.new('ShaderNodeCombineXYZ'); nb.L.new(nb.math('MULTIPLY', u, 55.0), cv.inputs[0]); nb.L.new(nb.math('MULTIPLY', v, 0.6), cv.inputs[1])
    streak = nb.noise(cv.outputs[0], scale=1.0, detail=3.0, rough=0.6)
    cv2 = nb.N.new('ShaderNodeCombineXYZ'); nb.L.new(nb.math('MULTIPLY', u, 6.0), cv2.inputs[0])
    slow = nb.noise(cv2.outputs[0], scale=1.0, detail=1.0)
    prof = nb.math('MULTIPLY', nb.maprange(v, 0.0, 0.07), nb.math('POWER', nb.math('SUBTRACT', 1.0, v, clamp=True), 2.2))
    ends = nb.math('MULTIPLY', nb.maprange(u, 0.0, 0.12), nb.maprange(u, 0.8, 1.0, 1.0, 0.0))
    a = nb.math('MULTIPLY', prof, nb.maprange(streak, 0.25, 0.8, 0.35, 1.0))
    a = nb.math('MULTIPLY', a, nb.maprange(slow, 0.2, 0.7, 0.45, 1.0))
    a = nb.math('MULTIPLY', a, ends, clamp=True)
    col = nb.ramp(v, [(0.0, (0.25, 1.0, 0.55)), (0.35, (0.02, 0.9, 0.45)), (0.75, (0.02, 0.45, 0.8)), (1.0, (0.3, 0.1, 0.8))])
    em = nb.N.new('ShaderNodeEmission'); nb.L.new(col, em.inputs['Color']); em.inputs['Strength'].default_value = 2.6
    tr = nb.N.new('ShaderNodeBsdfTransparent'); ms = nb.N.new('ShaderNodeMixShader')
    nb.L.new(a, ms.inputs[0]); nb.L.new(tr.outputs[0], ms.inputs[1]); nb.L.new(em.outputs[0], ms.inputs[2])
    nb.L.new(ms.outputs[0], nb.N['Material Output'].inputs['Surface'])
    return m
def build_aurora(name, az0, az1, rad, zb0, zb1, height, wav=1.0, lean=0.0, phase=0.0, pw=1.0):
    NU, NV = 240, 10
    verts = []; faces = []; uvs = []
    for i in range(NU):
        u = i / (NU - 1)
        a = VIEW_AZ + radians(az0 + (az1 - az0) * u)
        r = rad * (1.0 + 0.16 * wav * sin(u * 2 * pi * 2.3 + phase) + 0.05 * wav * sin(u * 2 * pi * 7.1 + phase * 2))
        zb = zb0 + (zb1 - zb0) * u ** pw + 14 * wav * sin(u * 2 * pi * 1.7 + phase + 1.0)
        for j in range(NV):
            v = j / (NV - 1)
            rr = r * (1 + lean * v)
            verts.append((rr * cos(a), rr * sin(a), zb + height * v)); uvs.append((u, v))
    for i in range(NU - 1):
        for j in range(NV - 1):
            a_ = i * NV + j; faces.append((a_, a_ + NV, a_ + NV + 1, a_ + 1))
    ob = mk(name, verts, faces, AUR, sub=0)
    uvl = ob.data.uv_layers.new(name="UVMap")
    for l in ob.data.loops:
        uvl.data[l.index].uv = uvs[l.vertex_index]
    ob.visible_shadow = False
    return ob
AUR = aurora_mat()
# main swoosh: rises from behind the peaks on the left up across to the top right
build_aurora("Aurora1", 44, -40, 620, 60, 330, 150, wav=0.45, lean=-0.1, pw=2.2)


build_aurora("Aurora2", 75, -5, 900, 420, 560, 170, wav=0.5, lean=-0.1, phase=2.0)
# world: sky gradient + stars
def build_world():
    w = bpy.data.worlds.new("Sky"); w.use_nodes = True; scene.world = w
    nt = w.node_tree; N = nt.nodes; L = nt.links
    bg = N['Background']
    class W(NB):
        def __init__(s): s.nt = nt; s.N = N; s.L = L; s.b = None
    nb = W()
    co = nb.coords('Generated')
    vn = N.new('ShaderNodeVectorMath'); vn.operation = 'NORMALIZE'; L.new(co, vn.inputs[0])
    x, y, z = nb.sep(vn.outputs[0])
    sky = nb.ramp(nb.maprange(z, -0.02, 0.75, smooth=False),
                  [(0.0, (0.03, 0.16, 0.26)), (0.12, (0.015, 0.075, 0.17)), (0.4, (0.006, 0.025, 0.09)), (1.0, (0.002, 0.008, 0.045))])
    vd = nb.voronoi(vn.outputs[0], scale=240.0, feature='F1', out='Distance')
    vc = nb.voronoi(vn.outputs[0], scale=240.0, feature='F1', out='Color')
    r_, g_, b_ = nb.sep(vc)
    size = nb.maprange(r_, 0.0, 1.0, 0.012, 0.05, smooth=False)
    star = nb.maprange(nb.math('DIVIDE', vd, size), 0.3, 1.0, 1.0, 0.0)
    star = nb.math('MULTIPLY', star, nb.math('POWER', g_, 1.6))
    star = nb.math('MULTIPLY', star, nb.maprange(z, 0.03, 0.2))
    col = nb.mix(nb.math('MULTIPLY', star, 1.0, clamp=True), sky, (0.8, 0.9, 1.0), blend='ADD')
    add = N.new('ShaderNodeMix'); add.data_type = 'RGBA'; add.blend_type = 'ADD'; add.inputs[0].default_value = 1.0
    L.new(sky, add.inputs[6])
    sc = N.new('ShaderNodeMix'); sc.data_type = 'RGBA'; sc.blend_type = 'MULTIPLY'; sc.inputs[0].default_value = 1.0
    sc.inputs[6].default_value = (10.0, 12.0, 14.0, 1.0)
    comb = N.new('ShaderNodeCombineXYZ'); L.new(star, comb.inputs[0]); L.new(star, comb.inputs[1]); L.new(star, comb.inputs[2])
    L.new(comb.outputs[0], sc.inputs[7]); L.new(sc.outputs[2], add.inputs[7])
    L.new(add.outputs[2], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0
build_world()

# skid tracks scraped into the ice (arcs about the turn centre)
def track_mat():
    m = pmat("Scrape", (0.75, 0.9, 1.0), Roughness=0.85)
    nb = NB(m)
    uv = nb.N.new('ShaderNodeUVMap').outputs[0]
    u, v, _ = nb.sep(uv)
    cv = nb.N.new('ShaderNodeCombineXYZ'); nb.L.new(nb.math('MULTIPLY', u, 3.0), cv.inputs[0]); nb.L.new(nb.math('MULTIPLY', v, 40.0), cv.inputs[1])
    n = nb.noise(cv.outputs[0], scale=1.0, detail=4.0, rough=0.7)
    edge = nb.math('MULTIPLY', nb.maprange(v, 0.0, 0.12), nb.maprange(v, 0.88, 1.0, 1.0, 0.0))
    a = nb.math('MULTIPLY', nb.maprange(n, 0.42, 0.72), edge)
    a = nb.math('MULTIPLY', a, nb.math('POWER', nb.math('SUBTRACT', 1.0, u, clamp=True), 1.3))
    a = nb.math('MULTIPLY', a, 0.3)
    nb.inp('Alpha', a)
    return m
M_TRACK = track_mat()
TC = Vector((0.42 * 6.0, -0.9 * 6.0, 0))
def skid(wx, wy, width, length):
    r = (Vector((wx, wy, 0)) - TC); R = r.length; a0 = math.atan2(r.y, r.x)
    NUM = 80; verts = []; faces = []; uvs = []
    for i in range(NUM):
        u = i / (NUM - 1); a = a0 + (u * length) / R       # going back in time = counter-clockwise
        for k, rr in enumerate((R - width / 2, R + width / 2)):
            verts.append((TC.x + rr * cos(a), TC.y + rr * sin(a), 0.0015)); uvs.append((u, float(k)))
    for i in range(NUM - 1):
        faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    ob = mk("Skid", verts, faces, M_TRACK, sub=0)
    uvl = ob.data.uv_layers.new(name="UVMap")
    for l in ob.data.loops: uvl.data[l.index].uv = uvs[l.vertex_index]
    ob.visible_shadow = False
skid(RA, RT, 0.26, 9.0); skid(RA, -RT, 0.26, 9.0); skid(FA, FT, 0.17, 7.0); skid(FA, -FT, 0.17, 7.0)

# ------------------------------------------------------------------ ice spray
def scatter(name, centers, sizes, mat, flat=True, dirs=None, stretch=1.0):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    V = np.array([v.co[:] for v in bm.verts]); F = np.array([[v.index for v in f.verts] for f in bm.faces]); bm.free()
    n = len(centers)
    A = np.random.normal(size=(n, 3, 3))
    if dirs is not None:
        A[:, :, 0] = dirs + np.random.normal(0, 0.18, size=(n, 3))
    Q, _ = np.linalg.qr(A)
    S = np.random.uniform(0.45, 1.3, size=(n, 3)) * sizes[:, None]
    if dirs is not None: S[:, 0] *= stretch
    Mx = Q * S[:, None, :]
    verts = centers[:, None, :] + np.einsum('vk,nik->nvi', V, Mx)
    faces = (F[None, :, :] + (np.arange(n) * len(V))[:, None, None]).reshape(-1, 3)
    me = bpy.data.meshes.new(name)
    me.vertices.add(n * len(V)); me.vertices.foreach_set("co", verts.reshape(-1))
    me.loops.add(len(faces) * 3); me.loops.foreach_set("vertex_index", faces.reshape(-1))
    me.polygons.add(len(faces))
    me.polygons.foreach_set("loop_start", np.arange(len(faces)) * 3)
    me.polygons.foreach_set("loop_total", np.full(len(faces), 3))
    me.update(); me.validate()
    if not flat: me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); COLL.objects.link(ob)
    return ob
M_SPRAY = pmat("IceSpray", (0.75, 0.92, 1.0), Roughness=0.15, IOR=1.31, Specular_IOR_Level=1.0,
               Emission_Color=(0.45, 0.85, 1.0), Emission_Strength=0.35, Subsurface_Weight=0.5, Subsurface_Scale=0.02)
def plume(origin, dirxy, n, length, height, spread, size0, size1):
    d = Vector((dirxy[0], dirxy[1], 0)).normalized(); side = Vector((-d.y, d.x, 0))
    s = np.random.uniform(0, 1, n) ** 1.6
    hk = np.random.uniform(0.05, 1.0, n) ** 1.3 * height
    lat = np.random.normal(0, 1, n) * (0.05 + spread * s)
    dist = s * length * np.random.uniform(0.7, 1.1, n)
    z = 0.01 + 4.0 * hk * s * (1.0 - 0.72 * s) + np.random.uniform(0, 0.02, n)
    P = np.zeros((n, 3))
    P[:, 0] = origin[0] + d.x * dist + side.x * lat
    P[:, 1] = origin[1] + d.y * dist + side.y * lat
    P[:, 2] = np.maximum(0.004, z)
    sz = (size0 + (size1 - size0) * s) * np.random.uniform(0.4, 1.4, n)
    slope = 4.0 * hk * (1.0 - 1.44 * s) / length
    D = np.stack([np.full(n, d.x), np.full(n, d.y), slope], axis=1)
    D /= np.linalg.norm(D, axis=1)[:, None]
    return P, sz, D
parts = [plume((RA - 0.05, RT + 0.05), (-0.35, 0.94), 5200, 2.6, 0.62, 0.42, 0.009, 0.003),
         plume((RA - 0.05, -RT + 0.1), (-0.8, 0.6), 2600, 2.0, 0.42, 0.4, 0.008, 0.003),
         plume((FA - 0.05, FT + 0.06), (-0.1, 1.0), 1300, 1.2, 0.26, 0.25, 0.006, 0.0025),
         plume((RA - 0.15, RT + 0.0), (-0.6, 0.8), 14000, 3.4, 0.8, 0.7, 0.003, 0.0015)]
scatter("Spray", np.concatenate([p[0] for p in parts]), np.concatenate([p[1] for p in parts]), M_SPRAY, dirs=np.concatenate([p[2] for p in parts]), stretch=6.0)

# mist puffs (real volumes, lit by the rim lights)
def mist_mat():
    m = bpy.data.materials.new("Mist"); m.use_nodes = True
    nb = NB(m); nb.N.remove(nb.b)
    co = nb.coords()
    ln = nb.N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nb.L.new(co, ln.inputs[0])
    fall = nb.math('POWER', nb.math('SUBTRACT', 1.0, ln.outputs['Value'], clamp=True), 1.4)
    n = nb.noise(co, scale=2.2, detail=4.0, rough=0.6)
    dens = nb.math('MULTIPLY', nb.math('MULTIPLY', fall, nb.maprange(n, 0.35, 0.75)), MIST_DENSITY)
    pv = nb.N.new('ShaderNodeVolumePrincipled'); pv.inputs['Color'].default_value = (0.85, 0.93, 1.0, 1)
    nb.L.new(dens, pv.inputs['Density']); pv.inputs['Anisotropy'].default_value = 0.35
    nb.L.new(pv.outputs[0], nb.N['Material Output'].inputs['Volume'])
    return m
MIST_DENSITY = 3.2
M_MIST = mist_mat()
for c, r in (((RA - 0.25, RT + 0.45, 0.22), (0.55, 0.6, 0.34)), ((RA - 0.65, RT + 1.1, 0.34), (0.8, 0.8, 0.5)),
             ((RA - 1.0, RT + 1.9, 0.38), (1.0, 1.0, 0.55)), ((RA - 0.7, 0.2, 0.2), (0.7, 0.7, 0.32)),
             ((RA - 1.3, 0.9, 0.3), (0.9, 1.0, 0.45)), ((FA - 0.1, FT + 0.45, 0.12), (0.35, 0.45, 0.2))):
    ob = ellipsoid("MistPuff", c, r, M_MIST, sub=0, seg=16)
    ob.rotation_euler = (0, 0, random.uniform(0, 6))

# ------------------------------------------------------------------ lights
def area(name, pos, tgt, power, size, color, spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.size = size; l.color = color
    ob = bpy.data.objects.new(name, l); COLL.objects.link(ob)
    ob.location = pos; ob.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    return ob
vt = (CAM_POS - CAM_TGT); vt.z = 0; vt.normalize()          # toward camera
vr = Vector((-vt.y, vt.x, 0)) * -1                           # image right
if (Vector((cos(VIEW_AZ), sin(VIEW_AZ), 0)).cross(Vector((0, 0, 1)))).dot(vr) < 0: vr = -vr
T = Vector((0.0, 0.0, 0.6))
area("Key", T + vt * 2.3 - vr * 2.6 + Vector((0, 0, 3.3)), T, 950, 2.2, (1.0, 0.94, 0.86))
RIM1 = area("RimCyan", T - vt * 3.0 - vr * 2.6 + Vector((0, 0, 1.7)), T + Vector((0, 0, 0.1)), 2600, 1.2, (0.05, 0.8, 1.0))
RIM2 = area("RimMagenta", T - vt * 2.7 + vr * 3.0 + Vector((0, 0, 1.5)), T + Vector((0, 0, 0.1)), 1700, 1.2, (1.0, 0.12, 0.75))
area("Fill", T + vt * 3.5 + vr * 2.8 + Vector((0, 0, 0.9)), T, 160, 3.5, (0.35, 0.55, 1.0))
area("TopKick", T - vt * 0.8 + Vector((0, 0, 4.0)), T, 260, 2.0, (0.6, 0.9, 1.0))
try:
    lc = bpy.data.collections.new("RimReceivers"); lc.objects.link(ICE)
    lc.collection_objects[0].light_linking.link_state = 'EXCLUDE'
    lc2 = bpy.data.collections.new("CyanRimReceivers")
    for o_ in [ICE] + RIMX: lc2.objects.link(o_)
    for co_ in lc2.collection_objects: co_.light_linking.link_state = 'EXCLUDE'
    RIM1.light_linking.receiver_collection = lc2; RIM2.light_linking.receiver_collection = lc
except Exception as ex:
    print("light linking failed", ex)
sun = bpy.data.lights.new("Moon", 'SUN'); sun.energy = 0.6; sun.color = (0.55, 0.75, 1.0); sun.angle = radians(3)
so = bpy.data.objects.new("Moon", sun); COLL.objects.link(so)
so.rotation_euler = (-(vt * 0.3 + vr * 0.8) - Vector((0, 0, 0.45))).to_track_quat('-Z', 'Y').to_euler()
# headlight beams
for s in (-1, 1):
    l = bpy.data.lights.new("Beam", 'SPOT'); l.energy = 120; l.color = (0.2, 0.9, 1.0); l.spot_size = radians(60); l.spot_blend = 0.7; l.shadow_soft_size = 0.03
    ob = bpy.data.objects.new("Beam", l); COLL.objects.link(ob); ob.parent = BODY
    ob.visible_glossy = False
    ob.matrix_local = Matrix.Translation((1.10, s * 0.185, 0.245)) @ Vector((1, s * 0.1, -0.22)).to_track_quat('-Z', 'Y').to_matrix().to_4x4()

# ------------------------------------------------------------------ cameras
def make_cam(name, lens, shift_x=0.0, shift_y=0.0, pos=CAM_POS, tgt=CAM_TGT, fstop=1.8, roll=0.0):
    c = bpy.data.cameras.new(name); c.lens = lens; c.sensor_width = 36; c.clip_start = 0.1; c.clip_end = 3000
    c.shift_x = shift_x; c.shift_y = shift_y
    ob = bpy.data.objects.new(name, c); COLL.objects.link(ob)
    ob.location = pos; ob.rotation_euler = ((Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_matrix() @ Matrix.Rotation(radians(roll), 3, 'Z')).to_euler()
    c.dof.use_dof = True; c.dof.aperture_fstop = fstop
    bpy.context.view_layer.update()
    focus = PENG.matrix_world @ (HC + Vector((0.2, -0.05, 0.0)))
    fwd = (Vector(tgt) - Vector(pos)).normalized()
    c.dof.focus_distance = (focus - Vector(pos)).dot(fwd)
    return ob
CAMS = {
    'square': make_cam("CamSquare", 35, shift_y=0.0, tgt=CAM_TGT + Vector((0.05, 0.1, 0.0)), roll=-4.0),
    'face': make_cam("CamFace", 90, pos=Vector((2.2, -1.3, 0.9)), tgt=Vector((-0.1, 0, 1.05))),
    'wheel': make_cam("CamWheel", 70, pos=Vector((2.6, -1.9, 0.5)), tgt=Vector((0.7, -0.4, 0.28))),
    'wide': make_cam("CamWide", 31, shift_x=0.05, pos=CAM_TGT + (CAM_POS - CAM_TGT) * 1.32 + Vector((0, 0, 0.06)), tgt=CAM_TGT + Vector((0, 0, -0.12)), roll=-3.0),
}

# ------------------------------------------------------------------ render setup
scene.render.engine = 'CYCLES'
cy = scene.cycles
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    ok = False
    for d in prefs.devices:
        d.use = (d.type == 'METAL'); ok = ok or d.use
    cy.device = 'GPU' if ok else 'CPU'
except Exception as ex:
    print("GPU setup failed, CPU fallback:", ex); cy.device = 'CPU'
print("CYCLES DEVICE", cy.device)
cy.use_adaptive_sampling = True; cy.adaptive_threshold = float(arg('--noise', '0.015'))
cy.use_denoising = True
try: cy.denoiser = 'OPENIMAGEDENOISE'
except Exception as ex: print("denoiser", ex)
cy.max_bounces = 8; cy.diffuse_bounces = 3; cy.glossy_bounces = 5; cy.transmission_bounces = 6; cy.transparent_max_bounces = 12
cy.sample_clamp_indirect = 8.0; cy.volume_bounces = 1
cy.caustics_reflective = False; cy.caustics_refractive = False
scene.render.film_transparent = False
vs = scene.view_settings
for vtn in (arg('--view', 'Filmic'), 'AgX', 'Filmic', 'Standard'):
    try: vs.view_transform = vtn; break
    except Exception as ex: print("view transform", vtn, ex)
for lk in (arg('--look', 'High Contrast'), 'AgX - Punchy', 'Punchy', 'AgX - High Contrast', 'High Contrast'):
    try: vs.look = lk; break
    except Exception as ex: print("look", lk, "unavailable")
print("VIEW", vs.view_transform, vs.look)
vs.exposure = float(arg('--exposure', '-0.05'))
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'

# compositor: bloom
def build_comp():
    ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
    scene.compositing_node_group = ng
    ng.interface.new_socket(name="Image", in_out='OUTPUT', socket_type='NodeSocketColor')
    N = ng.nodes; L = ng.links
    rl = N.new('CompositorNodeRLayers'); out = N.new('NodeGroupOutput')
    gl = N.new('CompositorNodeGlare')
    for t in ('Bloom', 'Fog Glow'):
        try: gl.inputs['Type'].default_value = t; break
        except Exception as ex: print("glare type", t, ex)
    gl.inputs['Threshold'].default_value = 1.0
    gl.inputs['Strength'].default_value = 0.4
    gl.inputs['Size'].default_value = 0.55
    try: gl.inputs['Quality'].default_value = 'High'
    except Exception as ex: print("glare quality", ex)
    L.new(rl.outputs['Image'], gl.inputs['Image'])
    L.new(gl.outputs['Image'], out.inputs[0])
    scene.render.use_compositing = True
try: build_comp()
except Exception as ex:
    import traceback; traceback.print_exc()

# ------------------------------------------------------------------ jobs
for job in JOBS.split(','):
    cam, res, spp, path = job.split(':', 3)
    w, h = res.split('x')
    scene.camera = CAMS[cam]
    scene.render.resolution_x = int(w); scene.render.resolution_y = int(h); scene.render.resolution_percentage = 100
    cy.samples = int(spp)
    scene.render.filepath = path
    print("RENDER", job)
    bpy.ops.render.render(write_still=True)
print("DONE")
