# Penguin kart hero art -- fully procedural Blender 5.x script.
# usage: blender -b -P hero.py -- --cam square --res 640 640 --samples 48 --out /path/x.png [--cam2 ...]
import bpy, bmesh, math, random, sys, os
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None, n=1):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if n == 1 else argv[i + 1:i + 1 + n]
    return default

random.seed(7)
pi = math.pi
V = Vector

# ----------------------------------------------------------------------------
# scene reset
# ----------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
coll = scene.collection

# ----------------------------------------------------------------------------
# material helpers
# ----------------------------------------------------------------------------
def nd(tree, typ, **kw):
    n = tree.nodes.new(typ)
    for k, v in kw.items():
        setattr(n, k, v)
    return n

def setin(tree, sock, val):
    if isinstance(val, bpy.types.NodeSocket):
        tree.links.new(val, sock)
    else:
        sock.default_value = val

def mth(tree, op, a, b=None, c=None, clamp=False):
    n = nd(tree, 'ShaderNodeMath', operation=op)
    n.use_clamp = clamp
    setin(tree, n.inputs[0], a)
    if b is not None: setin(tree, n.inputs[1], b)
    if c is not None: setin(tree, n.inputs[2], c)
    return n.outputs[0]

def smooth(tree, v, lo, hi):
    n = nd(tree, 'ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
    setin(tree, n.inputs['Value'], v)
    n.inputs['From Min'].default_value = lo
    n.inputs['From Max'].default_value = hi
    return n.outputs[0]

def band(tree, v, lo, hi, soft=0.0025):
    a = smooth(tree, v, lo - soft, lo + soft)
    b = smooth(tree, v, hi - soft, hi + soft)
    return mth(tree, 'SUBTRACT', a, b, clamp=True)

def mixc(tree, fac, a, b, blend='MIX'):
    n = nd(tree, 'ShaderNodeMix', data_type='RGBA', blend_type=blend)
    setin(tree, n.inputs[0], fac)
    setin(tree, n.inputs[6], a if isinstance(a, bpy.types.NodeSocket) else (*a, 1.0)[:4])
    setin(tree, n.inputs[7], b if isinstance(b, bpy.types.NodeSocket) else (*b, 1.0)[:4])
    return n.outputs[2]

def mixf(tree, fac, a, b):
    n = nd(tree, 'ShaderNodeMix', data_type='FLOAT')
    setin(tree, n.inputs[0], fac)
    setin(tree, n.inputs[2], a)
    setin(tree, n.inputs[3], b)
    return n.outputs[0]

def objcoord(tree):
    tc = nd(tree, 'ShaderNodeTexCoord')
    sep = nd(tree, 'ShaderNodeSeparateXYZ')
    tree.links.new(tc.outputs['Object'], sep.inputs[0])
    return tc.outputs['Object'], sep.outputs[0], sep.outputs[1], sep.outputs[2]

def pmat(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    t = m.node_tree
    p = [n for n in t.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    for k, v in inputs.items():
        key = k.replace('_', ' ')
        if key not in p.inputs:
            print("!! missing principled input", key); continue
        if isinstance(v, (tuple, list)) and len(v) == 3 and p.inputs[key].type == 'RGBA':
            v = (*v, 1.0)
        setin(t, p.inputs[key], v)
    return m, t, p

def out_node(t):
    return [n for n in t.nodes if n.type == 'OUTPUT_MATERIAL'][0]

def bump(t, p, height, strength=0.3, dist=0.01, sock='Normal'):
    b = nd(t, 'ShaderNodeBump')
    b.inputs['Strength'].default_value = strength
    b.inputs['Distance'].default_value = dist
    setin(t, b.inputs['Height'], height)
    t.links.new(b.outputs[0], p.inputs[sock])
    return b

def noise_tex(t, scale, detail=2.0, rough=0.5, vec=None, dim='3D'):
    n = nd(t, 'ShaderNodeTexNoise', noise_dimensions=dim)
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    if vec is not None: t.links.new(vec, n.inputs['Vector'])
    return n

# colours
C_WHITE = (0.80, 0.82, 0.86)
C_ICE = (0.02, 0.30, 0.95)
C_ORANGE = (1.0, 0.17, 0.0)
C_CYAN = (0.0, 0.85, 1.0)

def paint(name, base, metallic=0.0, rough=0.32, pearl=None):
    """car paint with clear coat; pearl = colour seen at grazing angles"""
    m, t, p = pmat(name, Base_Color=base, Metallic=metallic, Roughness=rough,
                   Coat_Weight=1.0, Coat_Roughness=0.04, Coat_IOR=1.6)
    col = None
    if pearl:
        lw = nd(t, 'ShaderNodeLayerWeight')
        lw.inputs['Blend'].default_value = 0.35
        col = mixc(t, lw.outputs['Facing'], base, pearl)
        t.links.new(col, p.inputs['Base Color'])
    return m, t, p, col

# --- kart paints -------------------------------------------------------------
def make_body_paint():
    m, t, p, col = paint("BodyPaint", C_WHITE, metallic=0.05, rough=0.3, pearl=(0.72, 0.80, 0.98))
    co, x, y, z = objcoord(t)
    ax = mth(t, 'ABSOLUTE', x)
    # ice-blue lower flank with orange coach line (line rises toward the tail)
    zl = mth(t, 'SUBTRACT', z, mth(t, 'MULTIPLY', y, 0.05))
    lower = mth(t, 'SUBTRACT', 1.0, smooth(t, zl, 0.298, 0.302))
    lw = nd(t, 'ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.4
    ice = mixc(t, lw.outputs['Facing'], C_ICE, (0.0, 0.08, 0.55))
    col = mixc(t, lower, col, ice)
    col = mixc(t, band(t, zl, 0.302, 0.326), col, C_ORANGE)
    # centre stripe + pinstripes (only on upper surface)
    upper = smooth(t, zl, 0.345, 0.355)
    col = mixc(t, mth(t, 'MULTIPLY', band(t, ax, -1, 0.062), upper), col, C_ORANGE)
    col = mixc(t, mth(t, 'MULTIPLY', band(t, ax, 0.082, 0.100), upper), col, ice)
    t.links.new(col, p.inputs['Base Color'])
    # metallic for the blue part
    t.links.new(mth(t, 'MULTIPLY', lower, 0.3), p.inputs['Metallic'])
    # panel gaps (dark grooves across the hull)
    gaps = None
    for gy in (-0.88, -0.345, 0.50, 0.86):
        g = band(t, y, gy - 0.003, gy + 0.003, soft=0.002)
        gaps = g if gaps is None else mth(t, 'MAXIMUM', gaps, g)
    bump(t, p, mth(t, 'SUBTRACT', 1.0, gaps), strength=1.0, dist=0.006)
    col2 = mixc(t, mth(t, 'MULTIPLY', gaps, 0.85), col, (0.01, 0.012, 0.02))
    t.links.new(col2, p.inputs['Base Color'])
    return m

def make_ice_paint(name="IcePaint", line=True):
    m, t, p, col = paint(name, C_ICE, metallic=0.3, rough=0.28, pearl=(0.0, 0.08, 0.55))
    if line:
        co, x, y, z = objcoord(t)
        zl = mth(t, 'SUBTRACT', z, mth(t, 'MULTIPLY', y, 0.05))
        col = mixc(t, band(t, zl, 0.302, 0.326), col, C_ORANGE)
        col = mixc(t, smooth(t, zl, 0.298, 0.24), col, C_WHITE)
        t.links.new(col, p.inputs['Base Color'])
    return m

M = {}
def build_materials():
    M['body'] = make_body_paint()
    M['ice'] = make_ice_paint()
    M['iceplain'] = make_ice_paint("IcePlain", line=False)
    M['white'] = paint("WhitePaint", C_WHITE, metallic=0.05, rough=0.3, pearl=(0.72, 0.80, 0.98))[0]
    M['orange'] = paint("OrangePaint", C_ORANGE, metallic=0.1, rough=0.3, pearl=(1.0, 0.10, 0.0))[0]
    M['chrome'] = pmat("Chrome", Base_Color=(0.92, 0.93, 0.95), Metallic=1.0, Roughness=0.06)[0]
    M['steel'] = pmat("Steel", Base_Color=(0.45, 0.47, 0.5), Metallic=1.0, Roughness=0.32)[0]
    M['dark'] = pmat("DarkTrim", Base_Color=(0.012, 0.014, 0.02), Roughness=0.38, Coat_Weight=0.4, Coat_Roughness=0.2)[0]
    M['matte'] = pmat("MatteBlack", Base_Color=(0.006, 0.007, 0.01), Roughness=0.8)[0]

    # carbon-ish seat padding
    m, t, p = pmat("SeatPad", Base_Color=(0.02, 0.022, 0.03), Roughness=0.55, Sheen_Weight=0.3)
    co, x, y, z = objcoord(t)
    w = nd(t, 'ShaderNodeTexWave', wave_type='BANDS', bands_direction='X')
    w.inputs['Scale'].default_value = 9.0
    t.links.new(co, w.inputs['Vector'])
    bump(t, p, w.outputs['Fac'], strength=0.6, dist=0.012)
    M['seat'] = m

    # rubber tyre
    m, t, p = pmat("Rubber", Base_Color=(0.018, 0.018, 0.022), Roughness=0.62,
                   Sheen_Weight=0.25, Sheen_Roughness=0.5, Specular_IOR_Level=0.35)
    co, x, y, z = objcoord(t)
    n = noise_tex(t, 60, 3, 0.6, co)
    bump(t, p, n.outputs['Fac'], strength=0.12, dist=0.004)
    M['rubber'] = m
    M['tyrewhite'] = pmat("TyreLetter", Base_Color=(0.75, 0.76, 0.78), Roughness=0.5)[0]

    # emissives
    def emis(name, col, strength, base=(0, 0, 0)):
        return pmat(name, Base_Color=base, Emission_Color=col, Emission_Strength=strength,
                    Roughness=0.1, Coat_Weight=1.0, Coat_Roughness=0.02)[0]
    m, t, p = pmat("Headlight", Base_Color=(0, 0.02, 0.05), Roughness=0.08, Coat_Weight=1.0, Coat_Roughness=0.02)
    at = nd(t, 'ShaderNodeAttribute', attribute_name='r')
    rr_ = smooth(t, at.outputs['Fac'], 0.15, 1.0)
    t.links.new(mixc(t, rr_, (0.25, 0.85, 1.0), (0.0, 0.35, 1.0)), p.inputs['Emission Color'])
    setin(t, p.inputs['Emission Strength'], mixf(t, rr_, 16.0, 1.6))
    M['headlight'] = m
    M['lampring'] = emis("LampRing", (0.0, 0.6, 1.0), 7.0)
    M['lampcore'] = emis("LampCore", (0.35, 0.9, 1.0), 14.0)
    M['cyanglow'] = emis("CyanGlow", C_CYAN, 2.5)
    M['patch'] = emis("ChestPatch", (0.0, 0.6, 1.0), 1.8)

    # goggle lens: glossy glass, cyan emission with vertical gradient + streak
    m, t, p = pmat("Lens", Base_Color=(0.0, 0.03, 0.06), Roughness=0.06, Coat_Weight=0.15,
                   Coat_Roughness=0.02, Metallic=0.0, Specular_IOR_Level=0.2)
    co, x, y, z = objcoord(t)
    g = smooth(t, z, -0.01, 0.085)                 # 0 bottom -> 1 top
    c = mixc(t, g, (0.0, 0.75, 1.0), (0.0, 0.18, 0.9))
    diag = mth(t, 'ADD', x, mth(t, 'MULTIPLY', z, 0.9))
    st = mth(t, 'ADD', band(t, diag, 0.085, 0.125, 0.006), mth(t, 'MULTIPLY', band(t, diag, 0.145, 0.158, 0.004), 0.7))
    c = mixc(t, mth(t, 'MULTIPLY', st, 0.55), c, (0.85, 1.0, 1.0))
    t.links.new(c, p.inputs['Emission Color'])
    setin(t, p.inputs['Emission Strength'], mixf(t, g, 1.5, 0.7))
    M['lens'] = m

    # penguin
    m, t, p = pmat("PenguinHead", Base_Color=(0.012, 0.013, 0.02), Roughness=0.38,
                   Sheen_Weight=0.2, Sheen_Roughness=0.35, Sheen_Tint=(0.5, 0.7, 1.0))
    co, x, y, z = objcoord(t)
    ex = mth(t, 'DIVIDE', x, 0.225); ez = mth(t, 'DIVIDE', mth(t, 'ADD', z, 0.05), 0.155)
    e = mth(t, 'ADD', mth(t, 'MULTIPLY', ex, ex), mth(t, 'MULTIPLY', ez, ez))
    inside = mth(t, 'SUBTRACT', 1.0, smooth(t, e, 0.93, 1.0))
    front = mth(t, 'SUBTRACT', 1.0, smooth(t, y, -0.06, -0.03))
    below = mth(t, 'SUBTRACT', 1.0, smooth(t, z, 0.035, 0.05))    # nothing above the goggles
    mask = mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', inside, front), below)
    t.links.new(mixc(t, mask, (0.012, 0.013, 0.02), (0.86, 0.87, 0.9)), p.inputs['Base Color'])
    n = noise_tex(t, 220, 2, 0.5, co)
    bump(t, p, n.outputs['Fac'], strength=0.08, dist=0.002)
    M['head'] = m
    m, t, p = pmat("PenguinBlack", Base_Color=(0.012, 0.013, 0.02), Roughness=0.45,
                   Sheen_Weight=0.25, Sheen_Roughness=0.4, Sheen_Tint=(0.5, 0.7, 1.0))
    co, x, y, z = objcoord(t)
    n = noise_tex(t, 160, 2, 0.5, co)
    bump(t, p, n.outputs['Fac'], strength=0.15, dist=0.003)
    M['pblack'] = m
    # fluffy collar
    m, t, p = pmat("Collar", Base_Color=(0.008, 0.009, 0.014), Roughness=0.7,
                   Sheen_Weight=0.35, Sheen_Roughness=0.5, Sheen_Tint=(0.45, 0.6, 1.0))
    co, x, y, z = objcoord(t)
    n = noise_tex(t, 55, 4, 0.65, co)
    bump(t, p, n.outputs['Fac'], strength=0.7, dist=0.012)
    M['collar'] = m
    # puffer jacket: nylon sheen + fine weave
    m, t, p = pmat("Jacket", Base_Color=(1.0, 0.21, 0.01), Roughness=0.45,
                   Sheen_Weight=0.12, Sheen_Roughness=0.3, Sheen_Tint=(1.0, 0.5, 0.2),
                   Coat_Weight=0.1, Coat_Roughness=0.3)
    co, x, y, z = objcoord(t)
    n = noise_tex(t, 14, 3, 0.55, co)             # soft wrinkles
    n2 = noise_tex(t, 400, 1, 0.5, co)
    h = mth(t, 'ADD', n.outputs['Fac'], mth(t, 'MULTIPLY', n2.outputs['Fac'], 0.08))
    bump(t, p, h, strength=0.22, dist=0.012)
    t.links.new(mixc(t, n.outputs['Fac'], (0.95, 0.13, 0.0), (1.0, 0.21, 0.0)), p.inputs['Base Color'])
    M['jacket'] = m
    M['beak'] = pmat("Beak", Base_Color=(1.0, 0.36, 0.01), Roughness=0.3,
                     Subsurface_Weight=0.2, Subsurface_Radius=(0.02, 0.008, 0.003),
                     Coat_Weight=0.3, Coat_Roughness=0.15)[0]
    M['goggle'] = pmat("GoggleFrame", Base_Color=(0.008, 0.009, 0.012), Roughness=0.3,
                       Coat_Weight=0.6, Coat_Roughness=0.1)[0]
    M['strap'] = pmat("Strap", Base_Color=(0.02, 0.02, 0.025), Roughness=0.7, Sheen_Weight=0.5)[0]

    # flame: attribute t 0..1 along length
    def flame_mat(name, c0, c1, s0, s1, amax):
        m = bpy.data.materials.new(name); m.use_nodes = True; t = m.node_tree
        for n in list(t.nodes): t.nodes.remove(n)
        o = nd(t, 'ShaderNodeOutputMaterial')
        at = nd(t, 'ShaderNodeAttribute', attribute_name='t')
        lw = nd(t, 'ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
        em = nd(t, 'ShaderNodeEmission'); tr = nd(t, 'ShaderNodeBsdfTransparent')
        ft = smooth(t, at.outputs['Fac'], 0.05, 0.5)
        t.links.new(mixc(t, ft, c0, c1), em.inputs['Color'])
        setin(t, em.inputs['Strength'], mixf(t, ft, s0, s1))
        edge = mth(t, 'MULTIPLY', mth(t, 'POWER', mth(t, 'SUBTRACT', 1.0, lw.outputs['Facing']), 0.9), 1.5, clamp=True)
        a = mth(t, 'MULTIPLY', edge, mth(t, 'SUBTRACT', 1.0, smooth(t, at.outputs['Fac'], 0.4, 1.0)))
        a = mth(t, 'MULTIPLY', a, amax)
        ms = nd(t, 'ShaderNodeMixShader')
        setin(t, ms.inputs[0], a)
        t.links.new(tr.outputs[0], ms.inputs[1]); t.links.new(em.outputs[0], ms.inputs[2])
        t.links.new(ms.outputs[0], o.inputs['Surface'])
        return m
    M['flame'] = flame_mat("Flame", (0.45, 0.9, 1.0), (0.0, 0.10, 1.0), 30.0, 5.0, 1.0)
    M['flamecore'] = flame_mat("FlameCore", (0.25, 0.85, 1.0), (0.0, 0.4, 1.0), 22.0, 8.0, 1.0)

    # ice spray chunks
    M['spray'] = pmat("Spray", Base_Color=(0.9, 0.96, 1.0), Roughness=0.12, IOR=1.31,
                      Emission_Color=(0.6, 0.88, 1.0), Emission_Strength=0.7,
                      Transmission_Weight=0.2)[0]
    # mist puff: soft-edged translucent
    m = bpy.data.materials.new("Mist"); m.use_nodes = True; t = m.node_tree
    for n in list(t.nodes): t.nodes.remove(n)
    o = nd(t, 'ShaderNodeOutputMaterial')
    lw = nd(t, 'ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    df = nd(t, 'ShaderNodeBsdfDiffuse'); df.inputs['Color'].default_value = (0.8, 0.9, 1.0, 1)
    tl = nd(t, 'ShaderNodeBsdfTranslucent'); tl.inputs['Color'].default_value = (0.8, 0.9, 1.0, 1)
    tr = nd(t, 'ShaderNodeBsdfTransparent')
    ms0 = nd(t, 'ShaderNodeMixShader'); ms0.inputs[0].default_value = 0.6
    t.links.new(df.outputs[0], ms0.inputs[1]); t.links.new(tl.outputs[0], ms0.inputs[2])
    tc = nd(t, 'ShaderNodeTexCoord')
    nz = noise_tex(t, 3.0, 4, 0.6, tc.outputs['Object'])
    a = mth(t, 'POWER', mth(t, 'SUBTRACT', 1.0, lw.outputs['Facing']), 2.2)
    a = mth(t, 'MULTIPLY', a, mth(t, 'ADD', 0.03, mth(t, 'MULTIPLY', smooth(t, nz.outputs['Fac'], 0.3, 0.75), 0.22)))
    ms = nd(t, 'ShaderNodeMixShader')
    setin(t, ms.inputs[0], a)
    t.links.new(tr.outputs[0], ms.inputs[1]); t.links.new(ms0.outputs[0], ms.inputs[2])
    t.links.new(ms.outputs[0], o.inputs['Surface'])
    M['mist'] = m

# ----------------------------------------------------------------------------
# geometry helpers
# ----------------------------------------------------------------------------
def make_obj(name, verts, faces, mat, sub=2, parent=None, attrs=None, loc=None, smooth_shade=True, crease=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    if attrs:
        for k, vals in attrs.items():
            a = me.attributes.new(k, 'FLOAT', 'POINT')
            a.data.foreach_set('value', vals)
    if smooth_shade:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.update()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    if mat is not None:
        me.materials.append(mat)
    if sub:
        md = ob.modifiers.new("sub", 'SUBSURF')
        md.levels = sub; md.render_levels = sub
    if parent is not None:
        ob.parent = parent
    if loc is not None:
        ob.location = loc
    return ob

def sgnpow(v, e):
    return math.copysign(abs(v) ** e, v)

def sup_ring(c, u, v, a, b, e=2.5, N=24, b_low=None):
    """superellipse ring around centre c in plane (u, v)"""
    c = V(c); u = V(u); v = V(v)
    pts = []
    for k in range(N):
        th = 2 * pi * k / N
        cx = sgnpow(math.cos(th), 2.0 / e); sy = sgnpow(math.sin(th), 2.0 / e)
        bb = b if (sy >= 0 or b_low is None) else b_low
        pts.append(c + u * (a * cx) + v * (bb * sy))
    return pts

def loft(rings, cap0=True, cap1=True, closed=True):
    n = len(rings[0]); verts = []; faces = []
    for r in rings: verts += [V(p) for p in r]
    for i in range(len(rings) - 1):
        for j in range(n if closed else n - 1):
            a = i * n + j; b = i * n + (j + 1) % n
            faces.append((a, b, b + n, a + n))
    if cap0:
        c = sum(rings[0], V((0, 0, 0))) / n; verts.append(c); ci = len(verts) - 1
        for j in range(n): faces.append((ci, (j + 1) % n, j))
    if cap1:
        c = sum(rings[-1], V((0, 0, 0))) / n; verts.append(c); ci = len(verts) - 1
        o = (len(rings) - 1) * n
        for j in range(n): faces.append((ci, o + j, o + (j + 1) % n))
    return verts, faces

def tube(path, radii, N=12, round_ends=True, ell=1.0, up=None):
    """tube along path with parallel-transport frames; ell = ratio of second axis"""
    path = [V(p) for p in path]
    if not isinstance(radii, (list, tuple)): radii = [radii] * len(path)
    tans = []
    for i in range(len(path)):
        a = path[max(i - 1, 0)]; b = path[min(i + 1, len(path) - 1)]
        tans.append((b - a).normalized())
    t0 = tans[0]
    ref = V(up) if up else (V((0, 0, 1)) if abs(t0.z) < 0.9 else V((1, 0, 0)))
    nrm = (ref - t0 * ref.dot(t0)).normalized()
    rings = []; frames = []
    for i, p in enumerate(path):
        t = tans[i]
        nrm = (nrm - t * nrm.dot(t)).normalized()
        bn = t.cross(nrm)
        frames.append((p, t, nrm, bn))
    def ring(p, nrm, bn, r):
        return [p + nrm * (r * math.cos(2 * pi * k / N)) + bn * (r * ell * math.sin(2 * pi * k / N)) for k in range(N)]
    if round_ends:
        p, t, nr, bn = frames[0]; r = radii[0]
        for a in (75, 45, 20):
            rings.append(ring(p - t * (r * math.sin(math.radians(a))), nr, bn, r * math.cos(math.radians(a))))
    for (p, t, nr, bn), r in zip(frames, radii):
        rings.append(ring(p, nr, bn, r))
    if round_ends:
        p, t, nr, bn = frames[-1]; r = radii[-1]
        for a in (20, 45, 75):
            rings.append(ring(p + t * (r * math.sin(math.radians(a))), nr, bn, r * math.cos(math.radians(a))))
    return loft(rings)

def lathe(profile, segs=48, mat=None, rmod=None):
    """revolve (r, h) profile around local Z, transformed by mat. r==0 -> pole"""
    verts = []; faces = []; idx = []
    for pi_, (r, h) in enumerate(profile):
        if r < 1e-7:
            verts.append(V((0, 0, h))); idx.append([len(verts) - 1])
        else:
            row = []
            for k in range(segs):
                th = 2 * pi * k / segs
                rr = r + (rmod(pi_, k) if rmod else 0.0)
                verts.append(V((rr * math.cos(th), rr * math.sin(th), h))); row.append(len(verts) - 1)
            idx.append(row)
    for i in range(len(idx) - 1):
        A, B = idx[i], idx[i + 1]
        for k in range(segs):
            k2 = (k + 1) % segs
            if len(A) == 1 and len(B) == 1: continue
            if len(A) == 1: faces.append((A[0], B[k], B[k2]))
            elif len(B) == 1: faces.append((A[k], B[0], A[k2]))
            else: faces.append((A[k], B[k], B[k2], A[k2]))
    if mat is not None:
        verts = [mat @ v for v in verts]
    return verts, faces

def frame(origin, zdir, xhint=(1, 0, 0)):
    z = V(zdir).normalized(); x = V(xhint)
    x = (x - z * x.dot(z))
    if x.length < 1e-5: x = V((0, 1, 0)); x = x - z * x.dot(z)
    x.normalize(); y = z.cross(x)
    m = Matrix(((x.x, y.x, z.x, origin[0]), (x.y, y.y, z.y, origin[1]), (x.z, y.z, z.z, origin[2]), (0, 0, 0, 1)))
    return m

def sphere(name, loc, scale, mat, parent=None, segs=32, rings=16, sub=1, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    S = Matrix.Diagonal((*scale, 1.0)) if not isinstance(scale, (int, float)) else Matrix.Diagonal((scale, scale, scale, 1.0))
    T = Matrix.Translation(loc) @ (rot if rot is not None else Matrix.Identity(4)) @ S
    verts = [T @ v.co for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return make_obj(name, verts, faces, mat, sub=sub, parent=parent)

def rbox(name, size, mat, M4=None, bevel=0.02, parent=None, sub=2, taper=None):
    sx, sy, sz = [s / 2 for s in size]
    verts = [V((x * sx, y * sy, z * sz)) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    if taper:
        verts = [taper(v) for v in verts]
    if M4 is not None: verts = [M4 @ v for v in verts]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    ob = make_obj(name, verts, faces, mat, sub=0, parent=parent)
    bv = ob.modifiers.new("bev", 'BEVEL'); bv.width = bevel; bv.segments = 3; bv.limit_method = 'NONE'
    if sub:
        md = ob.modifiers.new("sub", 'SUBSURF'); md.levels = sub; md.render_levels = sub
    return ob

def torus(name, R, r, mat, M4=None, parent=None, segs=48, rsegs=14, sub=1, ell=1.0):
    verts = []; faces = []
    for i in range(segs):
        a = 2 * pi * i / segs
        for j in range(rsegs):
            b = 2 * pi * j / rsegs
            rr = R + r * math.cos(b)
            verts.append(V((rr * math.cos(a), rr * math.sin(a), r * ell * math.sin(b))))
    for i in range(segs):
        for j in range(rsegs):
            a = i * rsegs + j; b = i * rsegs + (j + 1) % rsegs
            c = ((i + 1) % segs) * rsegs + (j + 1) % rsegs; d = ((i + 1) % segs) * rsegs + j
            faces.append((a, b, c, d))
    if M4 is not None: verts = [M4 @ v for v in verts]
    return make_obj(name, verts, faces, mat, sub=sub, parent=parent)

def shell_patch(fn, us, vs, o1, o2):
    """closed thick patch: fn(u, v, offset) -> point"""
    nu, nv = len(us), len(vs)
    verts = [fn(u, v, o2) for u in us for v in vs] + [fn(u, v, o1) for u in us for v in vs]
    faces = []
    O = nu * nv
    for i in range(nu - 1):
        for j in range(nv - 1):
            a = i * nv + j; b = (i + 1) * nv + j; c = (i + 1) * nv + j + 1; d = i * nv + j + 1
            faces.append((a, b, c, d)); faces.append((O + a, O + d, O + c, O + b))
    for i in range(nu - 1):
        for j in (0, nv - 1):
            a = i * nv + j; b = (i + 1) * nv + j
            faces.append((a, b, O + b, O + a))
    for j in range(nv - 1):
        for i in (0, nu - 1):
            a = i * nv + j; b = i * nv + j + 1
            faces.append((a, b, O + b, O + a))
    return verts, faces

def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    coll.objects.link(e)
    e.parent = parent; e.location = loc; e.rotation_euler = rot
    return e

def bolt(name, pos, nrm, r, parent, mat=None):
    m4 = frame(pos, nrm)
    v, f = lathe([(0, r * 0.75), (r * 0.6, r * 0.7), (r, r * 0.3), (r, -r * 0.5)], segs=12, mat=m4)
    return make_obj(name, v, f, mat or M['chrome'], sub=1, parent=parent)

# ----------------------------------------------------------------------------
# KART
# ----------------------------------------------------------------------------
FW = dict(R=0.275, W=0.27, x=0.67, y=-0.72)     # front wheel
RW = dict(R=0.345, W=0.40, x=0.76, y=0.62)      # rear wheel

HULL = [  # y, half width, top, bottom, exponent
    (-1.24, 0.085, 0.300, 0.215, 2.2),
    (-1.20, 0.150, 0.335, 0.185, 2.4),
    (-1.10, 0.215, 0.385, 0.150, 2.6),
    (-0.95, 0.250, 0.430, 0.135, 2.8),
    (-0.75, 0.275, 0.490, 0.130, 2.9),
    (-0.55, 0.300, 0.550, 0.130, 3.0),
    (-0.40, 0.320, 0.595, 0.130, 3.0),
    (-0.325, 0.330, 0.605, 0.130, 3.0),
    (-0.285, 0.345, 0.560, 0.130, 3.0),
    (-0.240, 0.370, 0.440, 0.130, 3.2),
    (-0.150, 0.395, 0.405, 0.130, 3.4),
    (0.050, 0.410, 0.400, 0.130, 3.4),
    (0.300, 0.410, 0.400, 0.130, 3.4),
    (0.420, 0.400, 0.420, 0.130, 3.3),
    (0.480, 0.380, 0.560, 0.130, 3.0),
    (0.540, 0.350, 0.690, 0.130, 2.8),
    (0.640, 0.325, 0.730, 0.135, 2.7),
    (0.780, 0.290, 0.700, 0.150, 2.6),
    (0.920, 0.240, 0.620, 0.180, 2.5),
    (1.030, 0.180, 0.520, 0.220, 2.4),
    (1.090, 0.100, 0.440, 0.270, 2.2),
]

def hull_top(y):
    for a, b in zip(HULL, HULL[1:]):
        if a[0] <= y <= b[0]:
            f = (y - a[0]) / (b[0] - a[0])
            return a[2] + (b[2] - a[2]) * f
    return 0.4

def hull_hw(y):
    for a, b in zip(HULL, HULL[1:]):
        if a[0] <= y <= b[0]:
            f = (y - a[0]) / (b[0] - a[0])
            return a[1] + (b[1] - a[1]) * f
    return 0.3

def build_wheel(name, spec, side, parent, steer=0.0, spin=0.0):
    R, W = spec['R'], spec['W']
    e = empty(name, parent, (side * spec['x'], spec['y'], R), (0, 0, steer))
    # local frame: lathe Z -> wheel axis (outboard = +Z local -> side*X)
    A = Matrix(((0, 0, side, 0), (0, 1, 0, 0), (-side, 0, 0, 0), (0, 0, 0, 1))) @ Matrix.Rotation(spin, 4, 'Z')
    hw = W / 2
    # tyre profile (r, axial)
    prof = []
    def P(r, a): prof.append((r * R, a * hw))
    P(0.60, -0.78); P(0.66, -0.93); P(0.78, -1.0); P(0.89, -0.985); P(0.955, -0.90); P(0.99, -0.76); P(1.0, -0.62)
    for g in (-0.34, 0.0, 0.34):
        P(1.0, g - 0.085); P(0.972, g - 0.06); P(0.972, g + 0.06); P(1.0, g + 0.085)
    P(1.0, 0.62); P(0.99, 0.76); P(0.955, 0.90); P(0.89, 0.985); P(0.78, 1.0); P(0.66, 0.93); P(0.60, 0.78)
    shoulder = {5, len(prof) - 6}
    segs = 120
    def rmod(pi_, k):
        if pi_ in shoulder and (k // 2) % 2 == 0: return -0.013 * R
        return 0.0
    v, f = lathe(prof, segs=segs, mat=A, rmod=rmod)
    make_obj(name + "_tyre", v, f, M['rubber'], sub=2, parent=e)
    # sidewall stripe ring (raised, light)
    v, f = lathe([(0.80 * R, hw * 1.0), (0.815 * R, hw * 1.012), (0.845 * R, hw * 1.012), (0.86 * R, hw * 0.995)], segs=96, mat=A)
    make_obj(name + "_stripe", v, f, M['orange'], sub=1, parent=e)
    # rim barrel + lip
    rp = [(0.60 * R, -hw * 0.8), (0.625 * R, -hw * 0.8), (0.625 * R, hw * 0.80), (0.635 * R, hw * 0.86),
          (0.62 * R, hw * 0.90), (0.585 * R, hw * 0.86), (0.56 * R, hw * 0.70), (0.55 * R, hw * 0.15),
          (0.54 * R, hw * 0.05), (0.0, hw * 0.05)]
    v, f = lathe(rp, segs=64, mat=A)
    make_obj(name + "_rim", v, f, M['chrome'], sub=2, parent=e)
    # brake disc + caliper
    v, f = lathe([(0.14 * R, hw * 0.24), (0.47 * R, hw * 0.24), (0.48 * R, hw * 0.27), (0.47 * R, hw * 0.30), (0.14 * R, hw * 0.30)], segs=64, mat=A)
    make_obj(name + "_disc", v, f, M['steel'], sub=1, parent=e)
    cm = A @ Matrix.Rotation(1.2, 4, 'Z') @ Matrix.Translation((0.39 * R, 0, hw * 0.27))
    rbox(name + "_caliper", (0.2 * R, 0.34 * R, hw * 0.2), M['cyanglow'], cm, bevel=0.012, parent=e, sub=1)
    # hub
    zf = hw * 0.62                       # spoke face plane
    v, f = lathe([(0, zf + 0.085 * R), (0.07 * R, zf + 0.08 * R), (0.15 * R, zf + 0.05 * R), (0.2 * R, zf),
                  (0.21 * R, hw * 0.3), (0.0, hw * 0.3)], segs=32, mat=A)
    make_obj(name + "_hub", v, f, M['orange'], sub=2, parent=e)
    v, f = lathe([(0, zf + 0.15 * R), (0.055 * R, zf + 0.15 * R), (0.06 * R, zf + 0.14 * R), (0.06 * R, zf + 0.06 * R)], segs=6, mat=A)
    make_obj(name + "_nut", v, f, M['chrome'], sub=1, parent=e)
    # spokes: lofted, slightly dished
    for s in range(5):
        Rs = A @ Matrix.Rotation(2 * pi * s / 5, 4, 'Z')
        rings = []
        for rr, wd, th, zz in ((0.10, 0.10, 0.055, zf + 0.035 * R), (0.2, 0.085, 0.05, zf + 0.03 * R), (0.36, 0.062, 0.042, zf + 0.0 * R),
                               (0.50, 0.075, 0.04, zf - 0.02 * R), (0.585, 0.11, 0.04, zf - 0.01 * R)):
            rings.append(sup_ring(Rs @ V((rr * R, 0, zz)), Rs.to_3x3() @ V((0, 1, 0)), Rs.to_3x3() @ V((0, 0, 1)), wd * R, th * R, e=3, N=12))
        v, f = loft(rings)
        make_obj(f"{name}_spoke{s}", v, f, M['orange'], sub=2, parent=e)
        # lug bolt between spokes
        ang = 2 * pi * (s + 0.5) / 5
        bp = A @ V((0.125 * R * math.cos(ang), 0.125 * R * math.sin(ang), zf + 0.062 * R))
        bolt(f"{name}_lug{s}", bp, A.to_3x3() @ V((0, 0, 1)), 0.022 * R, e)
    return e

def build_kart():
    root = empty("KART")
    body = empty("BODY", root)

    # ---- hull ----
    rings = []
    for (y, hw, top, bot, ex) in HULL:
        zc = bot + 0.42 * (top - bot)
        rings.append(sup_ring((0, y, zc), (1, 0, 0), (0, 0, 1), hw, top - zc, e=ex, N=28, b_low=zc - bot))
    v, f = loft(rings)
    make_obj("hull", v, f, M['body'], sub=3, parent=body)

    # ---- floor / undertray ----
    rbox("floor", (0.74, 2.0, 0.05), M['matte'], Matrix.Translation((0, -0.05, 0.125)), bevel=0.02, parent=body)

    # ---- side pods ----
    for s in (-1, 1):
        secs = [(-0.42, 0.50, 0.06, 0.300, 0.20), (-0.40, 0.505, 0.105, 0.335, 0.165), (-0.33, 0.515, 0.135, 0.365, 0.14),
                (-0.15, 0.525, 0.15, 0.385, 0.135), (0.05, 0.525, 0.15, 0.39, 0.135), (0.18, 0.51, 0.13, 0.385, 0.14),
                (0.27, 0.485, 0.10, 0.37, 0.15), (0.33, 0.46, 0.07, 0.35, 0.17)]
        rings = []
        for (y, xc, hw, top, bot) in secs:
            zc = bot + 0.5 * (top - bot)
            rings.append(sup_ring((s * xc, y, zc), (1, 0, 0), (0, 0, 1), hw, top - zc, e=3.0, N=20, b_low=zc - bot))
        v, f = loft(rings)
        make_obj(f"pod{s}", v, f, M['ice'], sub=3, parent=body)
        # intake mouth (dark) + chrome surround
        m4 = frame((s * 0.51, -0.418, 0.268), (0, -1, 0.1), (1, 0, 0))
        v, f = loft([sup_ring(m4 @ V((0, 0, d)), m4.to_3x3() @ V((1, 0, 0)), m4.to_3x3() @ V((0, 1, 0)), a, b, e=3, N=20)
                     for d, a, b in ((-0.03, 0.07, 0.045), (0.004, 0.075, 0.05), (0.008, 0.06, 0.036))])
        make_obj(f"intake{s}", v, f, M['matte'], sub=2, parent=body)
        # louvre vents on the pod top
        for i in range(4):
            y = -0.12 + i * 0.075
            m4 = Matrix.Translation((s * 0.535, y, 0.386)) @ Matrix.Rotation(s * -0.06, 4, 'Y') @ Matrix.Rotation(0.5, 4, 'X')
            rbox(f"vent{s}_{i}", (0.15, 0.03, 0.016), M['matte'], m4, bevel=0.006, parent=body, sub=1)

    # ---- cockpit rim + floor ----
    rim_c = V((0, 0.13, 0.0))
    pts = []
    for k in range(40):
        th = 2 * pi * k / 40
        x = 0.335 * sgnpow(math.cos(th), 2 / 2.6); y = 0.13 + 0.33 * sgnpow(math.sin(th), 2 / 2.6)
        pts.append(V((x, y, max(hull_top(y), 0.40) + 0.012)))
    rings = []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % 40] - pts[i - 1]).normalized()
        n1 = V((0, 0, 1)); n2 = t.cross(n1).normalized()
        rings.append([p + n1 * (0.034 * math.cos(a)) + n2 * (0.04 * math.sin(a)) for a in [2 * pi * j / 10 for j in range(10)]])
    rings.append(rings[0])
    v, f = loft(rings, cap0=False, cap1=False)
    make_obj("cockpit_rim", v, f, M['seat'], sub=2, parent=body)
    v, f = lathe([(0, 0.412), (0.2, 0.412), (0.31, 0.412), (0.325, 0.40)], segs=40, mat=Matrix.Translation((0, 0.13, 0)))
    make_obj("cockpit_floor", v, f, M['matte'], sub=1, parent=body)

    # ---- seat back (padded, orange piping) ----
    sm = Matrix.Translation((0, 0.565, 0.70)) @ Matrix.Rotation(-0.2, 4, 'X')
    rbox("seat_back", (0.54, 0.10, 0.58), M['seat'], sm, bevel=0.045, parent=body,
         taper=lambda v: V((v.x * (1.0 if v.z < 0 else 0.78), v.y, v.z)))
    rbox("seat_piping", (0.48, 0.03, 0.52), M['orange'], sm @ Matrix.Translation((0, 0.045, 0.0)), bevel=0.012, parent=body,
         taper=lambda v: V((v.x * (1.0 if v.z < 0 else 0.78), v.y, v.z)))

    # ---- engine cover air scoop ----
    rings = []
    for (y, hw, zc, hh) in ((0.60, 0.085, 0.80, 0.055), (0.62, 0.10, 0.80, 0.065), (0.72, 0.105, 0.785, 0.07), (0.86, 0.085, 0.72, 0.06), (0.98, 0.05, 0.62, 0.035)):
        rings.append(sup_ring((0, y, zc), (1, 0, 0), (0, 0, 1), hw, hh, e=2.8, N=16))
    v, f = loft(rings)
    make_obj("scoop", v, f, M['iceplain'], sub=3, parent=body)
    v, f = loft([sup_ring((0, y, 0.80), (1, 0, 0), (0, 0, 1), a, b, e=2.8, N=16) for y, a, b in ((0.64, 0.07, 0.04), (0.596, 0.078, 0.047), (0.592, 0.06, 0.033))])
    make_obj("scoop_mouth", v, f, M['matte'], sub=2, parent=body)

    # ---- exhausts ----
    for s in (-1, 1):
        base = V((s * 0.27, 0.66, 0.50)); tip = V((s * 0.475, 0.86, 0.87))
        d = (tip - base); L = d.length; d.normalize()
        m4 = frame(base, d)
        prof = [(0, -0.02), (0.05, -0.02), (0.052, L * 0.5), (0.058, L * 0.86), (0.074, L), (0.078, L + 0.012), (0.07, L + 0.02),
                (0.058, L - 0.01), (0.052, L - 0.12), (0.0, L - 0.12)]
        v, f = lathe(prof, segs=32, mat=m4)
        make_obj(f"exhaust{s}", v, f, M['chrome'], sub=2, parent=body)
        v, f = lathe([(0.05, L * 0.3), (0.062, L * 0.31), (0.062, L * 0.38), (0.05, L * 0.39)], segs=32, mat=m4)
        make_obj(f"exhaust_clamp{s}", v, f, M['orange'], sub=1, parent=body)
        # flame
        fl = 0.30; prof = []; tvals = []
        for i in range(14):
            t = i / 13
            r = 0.066 * (math.sin(pi * min(t * 1.6, 1.0) ** 0.8) * (1 - t) ** 0.6 + 0.35 * (1 - t))
            prof.append((max(r, 0.0) if i < 13 else 0.0, L - 0.04 + fl * t)); tvals.append(t)
        v, f = lathe(prof, segs=20, mat=m4)
        tv = []
        for i in range(13): tv += [tvals[i]] * 20
        tv.append(1.0)
        ob = make_obj(f"flame{s}", v, f, M['flame'], sub=1, parent=body, attrs={'t': tv})
        ob.visible_shadow = False
        v2, f2 = lathe([(r_ * 0.48, L - 0.04 + (h_ - (L - 0.04)) * 0.5) for (r_, h_) in prof], segs=20, mat=m4)
        ob = make_obj(f"flamecore{s}", v2, f2, M['flamecore'], sub=1, parent=body, attrs={'t': tv})
        ob.visible_shadow = False
        fl_ = bpy.data.lights.new("FlameL", 'POINT'); fl_.energy = 25; fl_.color = (0.1, 0.4, 1.0); fl_.shadow_soft_size = 0.05
        fo = bpy.data.objects.new("FlameL", fl_); coll.objects.link(fo); fo.parent = body; fo.location = base + d * (L + 0.10)

    # ---- headlight pods ----
    for s in (-1, 1):
        d = V((s * 0.10, 1.0, 0.25)).normalized()
        o = V((s * 0.175, -1.075, 0.392))
        m4 = frame(o, d)
        v, f = lathe([(0.0, 0.02), (0.046, 0.016), (0.058, 0.0), (0.064, -0.006), (0.068, 0.0), (0.071, 0.04), (0.068, 0.14), (0.052, 0.30), (0.026, 0.44), (0.0, 0.52)], segs=32, mat=m4)
        make_obj(f"pod_light{s}", v, f, M['iceplain'], sub=2, parent=body)
        v, f = lathe([(0.0, 0.016), (0.03, 0.013), (0.05, 0.004), (0.058, -0.004)], segs=32, mat=m4)
        make_obj(f"lamp_bowl{s}", v, f, M['chrome'], sub=2, parent=body)
        torus(f"lamp_ring{s}", 0.040, 0.0075, M['lampring'], m4 @ Matrix.Translation((0, 0, 0.0)), parent=body, segs=32, rsegs=10)
        sphere(f"lamp_core{s}", tuple(m4 @ V((0, 0, 0.004))), 0.017, M['lampcore'], parent=body, segs=16, rings=8)
        for k_ in range(6):
            aa = 2 * pi * k_ / 6
            sphere(f"lamp_led{s}", tuple(m4 @ V((0.027 * math.cos(aa), 0.027 * math.sin(aa), 0.008))), 0.0045, M['lampring'], parent=body, segs=8, rings=6, sub=1)
        sl = bpy.data.lights.new("HeadSpot", 'SPOT'); sl.energy = 150; sl.color = (0.1, 0.8, 1.0)
        sl.spot_size = math.radians(55); sl.spot_blend = 0.9; sl.shadow_soft_size = 0.05
        so = bpy.data.objects.new("HeadSpot", sl); coll.objects.link(so); so.parent = body
        so.location = o - d * 0.12
        so.rotation_euler = V((-d.x, -d.y, -d.z - 0.22)).to_track_quat('-Z', 'Y').to_euler()
        torus(f"bezel{s}", 0.064, 0.007, M['chrome'], m4 @ Matrix.Translation((0, 0, -0.006)), parent=body)

    # ---- front wing ----
    rings = []
    for i in range(-8, 9):
        x = i / 8 * 0.66
        yc = -1.245 + 0.14 * (abs(x) / 0.66) ** 1.6
        zc = 0.155 + 0.02 * (abs(x) / 0.66) ** 2
        rings.append(sup_ring((x, yc, zc), (0, 1, 0), (0, 0, 1), 0.105, 0.028, e=2.6, N=16))
    v, f = loft(rings)
    make_obj("front_wing", v, f, M['iceplain'], sub=2, parent=body)
    for s in (-1, 1):
        m4 = Matrix.Translation((s * 0.675, -1.10, 0.19))
        rbox(f"fw_endplate{s}", (0.035, 0.27, 0.19), M['white'], m4, bevel=0.016, parent=body,
             taper=lambda v: V((v.x, v.y, v.z * (0.55 if v.y < 0 and v.z > 0 else 1.0))))
        cu = bpy.data.curves.new(f"num{s}", 'FONT'); cu.body = "7"; cu.size = 0.15; cu.extrude = 0.003
        cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.bevel_depth = 0.0008; cu.resolution_u = 8
        cu.materials.append(M['orange'])
        no = bpy.data.objects.new(f"num{s}", cu); coll.objects.link(no); no.parent = body
        xa = V((0, s, 0)); ya = V((0, 0, 1)); za = V((s, 0, 0)); po = V((s * 0.694, -1.075, 0.185))
        no.matrix_local = Matrix(((xa.x, ya.x, za.x, po.x), (xa.y, ya.y, za.y, po.y), (xa.z, ya.z, za.z, po.z), (0, 0, 0, 1)))
        rbox(f"fw_flap{s}", (0.2, 0.09, 0.02), M['orange'], Matrix.Translation((s * 0.55, -1.085, 0.197)) @ Matrix.Rotation(-0.3, 4, 'X'),
             bevel=0.008, parent=body)
    # nose pylons
    for s in (-1, 1):
        v, f = tube([(s * 0.09, -1.19, 0.22), (s * 0.09, -1.22, 0.165)], 0.02, N=10, ell=2.2, up=(1, 0, 0))
        make_obj(f"pylon{s}", v, f, M['dark'], sub=1, parent=body)

    # ---- rear wing ----
    WZ = 1.03
    rings = []
    for i in range(-8, 9):
        x = i / 8 * 0.66
        yc = 1.10 + 0.13 * (abs(x) / 0.66) ** 1.5
        zc = WZ + 0.045 * (abs(x) / 0.66) ** 2
        m4 = Matrix.Translation((x, yc, zc)) @ Matrix.Rotation(-0.2, 4, 'X')
        rings.append(sup_ring(m4 @ V((0, 0, 0)), m4.to_3x3() @ V((0, 1, 0)), m4.to_3x3() @ V((0, 0, 1)), 0.15, 0.028, e=2.6, N=16))
    v, f = loft(rings)
    make_obj("rear_wing", v, f, M['iceplain'], sub=2, parent=body)
    rings = []
    for i in range(-8, 9):       # orange gurney / upper element
        x = i / 8 * 0.64
        yc = 1.235 + 0.13 * (abs(x) / 0.66) ** 1.5
        zc = WZ + 0.075 + 0.045 * (abs(x) / 0.66) ** 2
        m4 = Matrix.Translation((x, yc, zc)) @ Matrix.Rotation(-0.55, 4, 'X')
        rings.append(sup_ring(m4 @ V((0, 0, 0)), m4.to_3x3() @ V((0, 1, 0)), m4.to_3x3() @ V((0, 0, 1)), 0.055, 0.014, e=2.6, N=12))
    v, f = loft(rings)
    make_obj("rear_wing_flap", v, f, M['orange'], sub=2, parent=body)
    for s in (-1, 1):
        m4 = Matrix.Translation((s * 0.685, 1.24, WZ + 0.035))
        ep = rbox(f"rw_endplate{s}", (0.04, 0.44, 0.30), M['iceplain'], m4, bevel=0.02, parent=body,
                  taper=lambda v: V((v.x, v.y + (0.10 if v.z > 0 else -0.04), v.z * (0.7 if v.y < 0 and v.z < 0 else 1.0))))
        rbox(f"rw_epstripe{s}", (0.046, 0.30, 0.05), M['orange'], m4 @ Matrix.Translation((0, 0.02, 0.03)) @ Matrix.Rotation(0.33, 4, 'X'), bevel=0.01, parent=body)
        for (by, bz) in ((-0.13, -0.08), (0.12, -0.10), (0.22, 0.10), (-0.05, 0.10)):
            bolt(f"rw_bolt{s}", m4 @ V((s * 0.02, by, bz)), (s, 0, 0), 0.012, body)
        # struts
        v, f = tube([(s * 0.15, 0.93, 0.56), (s * 0.19, 1.04, 0.80), (s * 0.21, 1.10, WZ - 0.015)], [0.03, 0.024, 0.022], N=10, ell=2.4, up=(1, 0, 0))
        make_obj(f"rw_strut{s}", v, f, M['dark'], sub=2, parent=body)

    # ---- suspension (not rolled) ----
    for s in (-1, 1):
        hubx = s * (FW['x'] - 0.10)
        for zz, zi in ((0.36, 0.40), (0.20, 0.22)):
            for yy in (-0.86, -0.60):
                v, f = tube([(s * 0.22, yy, zi), (hubx, FW['y'], zz)], 0.014, N=8)
                make_obj("wishbone", v, f, M['chrome'], sub=1, parent=root)
        v, f = tube([(hubx, FW['y'], 0.19), (hubx, FW['y'], 0.37)], 0.03, N=10)
        make_obj("upright", v, f, M['dark'], sub=1, parent=root)
        v, f = tube([(hubx, FW['y'], FW['R']), (s * FW['x'], FW['y'], FW['R'])], 0.03, N=10)
        make_obj("stub", v, f, M['steel'], sub=1, parent=root)
        v, f = tube([(s * 0.2, RW['y'], RW['R']), (s * RW['x'], RW['y'], RW['R'])], 0.04, N=12)
        make_obj("rear_axle", v, f, M['chrome'], sub=1, parent=root)
        # coil-over spring (orange) front
        a = V((s * 0.26, -0.72, 0.50)); b = V((hubx - s * 0.03, -0.72, 0.24))
        dd = (b - a); Ls = dd.length; fm = frame(a, dd)
        path = [fm @ V((0.028 * math.cos(t * 2 * pi * 6), 0.028 * math.sin(t * 2 * pi * 6), Ls * (0.12 + 0.76 * t))) for t in [i / 90 for i in range(91)]]
        v, f = tube(path, 0.0075, N=6)
        make_obj("spring", v, f, M['orange'], sub=1, parent=root)
        v, f = tube([a, b], 0.012, N=8)
        make_obj("damper", v, f, M['chrome'], sub=1, parent=root)

    # ---- wheels ----
    wheels = {}
    for s in (-1, 1):
        wheels[('f', s)] = build_wheel(f"wheelF{s}", FW, s, root, spin=0.3 + s)
        wheels[('r', s)] = build_wheel(f"wheelR{s}", RW, s, root, spin=0.9 + s)
    return root, body, wheels

# ----------------------------------------------------------------------------
# PENGUIN
# ----------------------------------------------------------------------------
def build_penguin(body):
    """Penguin ported from the other take (purple/hero.py). Its frame is X-forward; S2ROOT maps it into this kart."""
    import numpy as np
    from math import sin, cos, pi, radians, sqrt, exp
    from mathutils import Euler
    from mathutils.bvhtree import BVHTree
    COLL = coll
    ORANGE = (1.0, 0.24, 0.015)
    S2_SCALE = 1.3
    BODY = bpy.data.objects.new("S2ROOT", None); coll.objects.link(BODY); BODY.parent = body
    BODY.matrix_local = Matrix.Translation((0, 0.05, 0.12)) @ Matrix.Rotation(-pi / 2, 4, 'Z')
    M_SEAT = M['seat']; M_CHROME = M['chrome']; M_MINT = M['orange']; M_DARKMETAL = M['dark']
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
        nb.inp('Base Color', nb.mix(n1, (0.85, 0.11, 0.0), (1.0, 0.18, 0.0)))
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
        m = pmat("Lens", (0.0, 0.02, 0.04), Metallic=0.0, Roughness=0.1, Coat_Weight=0.15, Coat_Roughness=0.0, Specular_IOR_Level=0.1)
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
        nb.inp('Emission Strength', 1.45)
        return m
    M_LENS = lens_mat()
    M_PATCH = pmat("ChestPatch", (0.0, 0.3, 0.4), Roughness=0.2, Coat_Weight=1.0, Emission_Color=(0.0, 0.8, 1.0), Emission_Strength=1.1)
    # ------------------------------------------------------------------ penguin
    PX = -0.15
    PS = S2_SCALE
    PENG = empty("Penguin", BODY, Matrix.Translation((PX, 0, 0.18)) @ Matrix.Scale(PS, 4) @ Matrix.Translation((-PX, 0, -0.18)))
    bpy.context.view_layer.update()
    # --- steering wheel
    SW_C = Vector((0.185, 0, 0.575)); SW_N = Vector((-0.93, 0, 0.37)).normalized(); SW_R = 0.135
    SW = empty("SteerWheel", PENG, align(SW_C, SW_N) @ Matrix.Rotation(radians(-22), 4, 'Z'))
    circ = [(SW_R * cos(t), SW_R * sin(t), 0) for t in np.linspace(0, 2 * pi, 40, endpoint=False)]
    tube("SWRim", circ, (0.02, 0.017), M_SEAT, n=12, closed=True, normals=[(0, 0, 1)] * 40, parent=SW, sub=1)
    for a in (0, 180, 270):
        tube("SWSpoke", [(0.02 * cos(radians(a)), 0.02 * sin(radians(a)), -0.012), (SW_R * cos(radians(a)), SW_R * sin(radians(a)), -0.002)], (0.006, 0.016), M_CHROME, n=8, parent=SW, sub=1)
    lathe("SWHub", [(0, 0.012), (0.03, 0.012), (0.042, 0.0), (0.04, -0.03)], M_MINT, seg=24, parent=SW)
    tube("SWColumn", [PENG.matrix_local @ (SW_C - SW_N * 0.01), Vector((0.37, 0, 0.42))], 0.026, M_DARKMETAL, n=10, parent=BODY, sub=1)

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
        tube("Leg", catmull([(PX + 0.08, s * 0.12, 0.27), (0.10, s * 0.24, 0.31), (0.29, s * 0.27, 0.345)], 6), 0.055, M_PBLACK, n=12, parent=PENG)
        Mf = Matrix.Translation((0.30, s * 0.275, 0.35)) @ Matrix.Rotation(radians(s * 14), 4, 'Z') @ Matrix.Rotation(radians(-38), 4, 'Y')
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

    return PENG

# ----------------------------------------------------------------------------
# ENVIRONMENT
# ----------------------------------------------------------------------------
def build_ice():
    S = 600
    ob = make_obj("ice", [(-S, -S, 0), (S, -S, 0), (S, S, 0), (-S, S, 0)], [(0, 1, 2, 3)], None, sub=0)
    m, t, p = pmat("Ice", Base_Color=(0.01, 0.05, 0.09), Roughness=0.1, IOR=1.31, Specular_IOR_Level=0.6)
    tc = nd(t, 'ShaderNodeTexCoord'); co = tc.outputs['Object']
    big = noise_tex(t, 0.35, 4, 0.6, co)
    fine = noise_tex(t, 9.0, 3, 0.6, co)
    vor = nd(t, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE'); vor.inputs['Scale'].default_value = 1.3
    # warp the crack pattern a little
    wn = noise_tex(t, 1.5, 2, 0.5, co)
    wv = nd(t, 'ShaderNodeMixRGB'); wv.inputs[0].default_value = 0.12
    t.links.new(co, wv.inputs[1]); t.links.new(wn.outputs['Color'], wv.inputs[2])
    t.links.new(wv.outputs[0], vor.inputs['Vector'])
    crack = mth(t, 'SUBTRACT', 1.0, smooth(t, vor.outputs['Distance'], 0.0, 0.010))
    vor2 = nd(t, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE'); vor2.inputs['Scale'].default_value = 4.5
    t.links.new(wv.outputs[0], vor2.inputs['Vector'])
    crack2 = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, smooth(t, vor2.outputs['Distance'], 0.0, 0.010)), 0.3)
    cr = mth(t, 'MAXIMUM', crack, crack2)
    snow = smooth(t, big.outputs['Fac'], 0.56, 0.74)          # wind-blown frost patches
    col = mixc(t, big.outputs['Fac'], (0.004, 0.035, 0.075), (0.012, 0.085, 0.13))
    col = mixc(t, mth(t, 'MULTIPLY', cr, 0.30), col, (0.25, 0.65, 0.8))
    col = mixc(t, mth(t, 'MULTIPLY', snow, 0.35), col, (0.45, 0.62, 0.78))
    t.links.new(col, p.inputs['Base Color'])
    rough = mth(t, 'ADD', mth(t, 'MULTIPLY', fine.outputs['Fac'], 0.10), 0.03)
    rough = mth(t, 'ADD', rough, mth(t, 'MULTIPLY', snow, 0.35))
    rough = mth(t, 'ADD', rough, mth(t, 'MULTIPLY', cr, 0.25))
    t.links.new(rough, p.inputs['Roughness'])
    bump(t, p, mth(t, 'SUBTRACT', mth(t, 'MULTIPLY', fine.outputs['Fac'], 0.15), cr), strength=0.25, dist=0.01)
    ob.data.materials.append(m)
    return ob

def build_skids(root_m, steer):
    m = bpy.data.materials.new("Skid"); m.use_nodes = True; t = m.node_tree
    for n in list(t.nodes): t.nodes.remove(n)
    o = nd(t, 'ShaderNodeOutputMaterial')
    au = nd(t, 'ShaderNodeAttribute', attribute_name='u'); av = nd(t, 'ShaderNodeAttribute', attribute_name='v')
    cx = nd(t, 'ShaderNodeCombineXYZ')
    setin(t, cx.inputs[0], mth(t, 'MULTIPLY', au.outputs['Fac'], 3.0)); setin(t, cx.inputs[1], mth(t, 'MULTIPLY', av.outputs['Fac'], 22.0))
    nz = noise_tex(t, 1.0, 3, 0.6, cx.outputs[0])
    edge = mth(t, 'MULTIPLY', smooth(t, av.outputs['Fac'], 0.0, 0.2), mth(t, 'SUBTRACT', 1.0, smooth(t, av.outputs['Fac'], 0.8, 1.0)))
    a = mth(t, 'MULTIPLY', edge, mth(t, 'POWER', mth(t, 'SUBTRACT', 1.0, au.outputs['Fac'], clamp=True), 1.3))
    a = mth(t, 'MULTIPLY', a, mth(t, 'ADD', 0.25, mth(t, 'MULTIPLY', smooth(t, nz.outputs['Fac'], 0.35, 0.7), 0.6)))
    bs = nd(t, 'ShaderNodeBsdfPrincipled'); bs.inputs['Base Color'].default_value = (0.7, 0.85, 0.95, 1); bs.inputs['Roughness'].default_value = 0.7
    tr = nd(t, 'ShaderNodeBsdfTransparent'); ms = nd(t, 'ShaderNodeMixShader')
    setin(t, ms.inputs[0], a); t.links.new(tr.outputs[0], ms.inputs[1]); t.links.new(bs.outputs[0], ms.inputs[2])
    t.links.new(ms.outputs[0], o.inputs['Surface'])
    for spec, sgn in ((FW, -1), (FW, 1), (RW, -1), (RW, 1)):
        c = root_m @ V((sgn * spec['x'], spec['y'], 0))
        w = spec['W'] * 0.42
        verts = []; faces = []; ua = []; va = []
        n = 60; L = 9.0
        for i in range(n + 1):
            u = i / n; d = L * u
            ctr = V((c.x - 0.045 * d * d - 0.10 * d, c.y + d, 0.003))
            tan = V((-0.09 * d - 0.10, 1.0, 0)).normalized(); nr = V((tan.y, -tan.x, 0))
            for j in range(5):
                vv = j / 4
                verts.append(ctr + nr * (w * (2 * vv - 1))); ua.append(u); va.append(vv)
        for i in range(n):
            for j in range(4):
                a_ = i * 5 + j; b_ = (i + 1) * 5 + j
                faces.append((a_, b_, b_ + 1, a_ + 1))
        ob = make_obj("skid", verts, faces, m, sub=0, attrs={'u': ua, 'v': va})
        ob.visible_shadow = False

def build_mountains():
    N, Mr = 420, 46
    r0, r1 = 70.0, 190.0
    verts = []; faces = []
    for i in range(N):
        a = 2 * pi * i / N
        for j in range(Mr):
            t = j / (Mr - 1)
            r = r0 + (r1 - r0) * t
            x, y = r * math.sin(a), r * math.cos(a)
            env = math.sin(pi * t) ** 0.8
            p = V((x * 0.016, y * 0.016, 3.1))
            h = 0.0; amp = 1.0; fq = 1.0
            for o_ in range(5):
                nn = noise.noise(p * fq + V((o_ * 7.3, 0, 0)))
                h += (1 - abs(nn) * 1.6) ** 2 * amp if abs(nn) * 1.6 < 1 else 0.0
                amp *= 0.5; fq *= 2.1
            h /= 1.94
            h2 = noise.noise(V((x * 0.006, y * 0.006, 9.0)))
            hh = h ** 1.6 * 42.0 * (0.45 + 0.9 * max(h2 + 0.35, 0.0))
            verts.append(V((x, y, hh * env - 0.5)))
    for i in range(N):
        for j in range(Mr - 1):
            a = i * Mr + j; b = ((i + 1) % N) * Mr + j
            faces.append((a, b, b + 1, a + 1))
    m = bpy.data.materials.new("Mountain"); m.use_nodes = True; t = m.node_tree
    for n in list(t.nodes): t.nodes.remove(n)
    o = nd(t, 'ShaderNodeOutputMaterial')
    geo = nd(t, 'ShaderNodeNewGeometry')
    sp = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(geo.outputs['Position'], sp.inputs[0])
    dot = nd(t, 'ShaderNodeVectorMath', operation='DOT_PRODUCT')
    mn = noise_tex(t, 0.09, 6, 0.62, geo.outputs['Position'])
    mb = nd(t, 'ShaderNodeBump'); mb.inputs['Strength'].default_value = 1.0; mb.inputs['Distance'].default_value = 9.0
    t.links.new(mn.outputs['Fac'], mb.inputs['Height'])
    t.links.new(mb.outputs[0], dot.inputs[0]); dot.inputs[1].default_value = V((-0.62, -0.45, 0.64)).normalized()
    lit = smooth(t, dot.outputs['Value'], 0.30, 0.70)
    col = mixc(t, lit, (0.010, 0.05, 0.14), (0.16, 0.42, 0.66))
    hz = smooth(t, sp.outputs[2], 0.0, 5.0)
    col = mixc(t, mth(t, 'MULTIPLY', hz, 0.95), (0.02, 0.105, 0.19), col)
    em = nd(t, 'ShaderNodeEmission'); t.links.new(col, em.inputs['Color']); em.inputs['Strength'].default_value = 1.0
    t.links.new(em.outputs[0], o.inputs['Surface'])
    ob = make_obj("mountains", verts, faces, m, sub=0)
    return ob

def build_aurora(specs):
    m = bpy.data.materials.new("Aurora"); m.use_nodes = True; t = m.node_tree
    for n in list(t.nodes): t.nodes.remove(n)
    o = nd(t, 'ShaderNodeOutputMaterial')
    au = nd(t, 'ShaderNodeAttribute', attribute_name='u'); av = nd(t, 'ShaderNodeAttribute', attribute_name='v')
    cx = nd(t, 'ShaderNodeCombineXYZ')
    setin(t, cx.inputs[0], mth(t, 'MULTIPLY', au.outputs['Fac'], 60.0))
    setin(t, cx.inputs[1], mth(t, 'MULTIPLY', av.outputs['Fac'], 0.7))
    streak = noise_tex(t, 1.0, 3, 0.6, cx.outputs[0])
    cx2 = nd(t, 'ShaderNodeCombineXYZ'); setin(t, cx2.inputs[0], mth(t, 'MULTIPLY', au.outputs['Fac'], 7.0))
    slow = noise_tex(t, 1.0, 2, 0.5, cx2.outputs[0])
    v = av.outputs['Fac']
    vert = mth(t, 'MULTIPLY', smooth(t, v, 0.0, 0.10), mth(t, 'POWER', mth(t, 'SUBTRACT', 1.0, v, clamp=True), 1.7))
    ends = mth(t, 'MULTIPLY', smooth(t, au.outputs['Fac'], 0.0, 0.12), mth(t, 'SUBTRACT', 1.0, smooth(t, au.outputs['Fac'], 0.75, 1.0)))
    a = mth(t, 'MULTIPLY', vert, mth(t, 'ADD', 0.35, mth(t, 'MULTIPLY', smooth(t, streak.outputs['Fac'], 0.3, 0.75), 0.65)))
    a = mth(t, 'MULTIPLY', a, mth(t, 'MULTIPLY', ends, mth(t, 'ADD', 0.45, slow.outputs['Fac'])))
    col = mixc(t, smooth(t, v, 0.0, 0.8), (0.05, 1.0, 0.45), (0.0, 0.55, 1.0))
    em = nd(t, 'ShaderNodeEmission'); t.links.new(col, em.inputs['Color'])
    setin(t, em.inputs['Strength'], mth(t, 'MULTIPLY', a, 5.0))
    tr = nd(t, 'ShaderNodeBsdfTransparent')
    add = nd(t, 'ShaderNodeAddShader')
    t.links.new(tr.outputs[0], add.inputs[0]); t.links.new(em.outputs[0], add.inputs[1])
    t.links.new(add.outputs[0], o.inputs['Surface'])
    for si, spec in enumerate(specs):
        nseg, nv = 160, 10
        verts = []; faces = []; ua = []; va = []
        for i in range(nseg + 1):
            u = i / nseg
            az, dist, zb, ht = spec(u)
            x, y = dist * math.sin(az), dist * math.cos(az)
            for j in range(nv + 1):
                w = j / nv
                verts.append(V((x, y, zb + ht * w))); ua.append(u); va.append(w)
        for i in range(nseg):
            for j in range(nv):
                a_ = i * (nv + 1) + j; b_ = (i + 1) * (nv + 1) + j
                faces.append((a_, b_, b_ + 1, a_ + 1))
        ob = make_obj(f"aurora{si}", verts, faces, m, sub=0, attrs={'u': ua, 'v': va})
        ob.visible_shadow = False; ob.visible_diffuse = False

def build_world():
    w = bpy.data.worlds.new("World"); scene.world = w; w.use_nodes = True
    t = w.node_tree
    bg = [n for n in t.nodes if n.type == 'BACKGROUND'][0]
    tc = nd(t, 'ShaderNodeTexCoord')
    sp = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(tc.outputs['Generated'], sp.inputs[0])
    z = sp.outputs[2]
    col = mixc(t, smooth(t, z, -0.02, 0.10), (0.030, 0.150, 0.230), (0.010, 0.050, 0.130))
    col = mixc(t, smooth(t, z, 0.08, 0.55), col, (0.002, 0.008, 0.035))
    vor = nd(t, 'ShaderNodeTexVoronoi', feature='F1'); vor.inputs['Scale'].default_value = 130.0
    t.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
    star = mth(t, 'SUBTRACT', 1.0, smooth(t, vor.outputs['Distance'], 0.0, 0.055))
    rnd = nd(t, 'ShaderNodeSeparateXYZ'); t.links.new(vor.outputs['Color'], rnd.inputs[0])
    star = mth(t, 'MULTIPLY', star, mth(t, 'POWER', rnd.outputs[0], 5.0))
    star = mth(t, 'MULTIPLY', star, smooth(t, z, 0.02, 0.12))
    scol = mixc(t, rnd.outputs[1], (0.7, 0.85, 1.0), (1.0, 0.95, 0.9))
    add = nd(t, 'ShaderNodeMix', data_type='RGBA', blend_type='ADD')
    setin(t, add.inputs[0], 1.0); t.links.new(col, add.inputs[6])
    sc = nd(t, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); sc.inputs[0].default_value = 1.0
    t.links.new(scol, sc.inputs[6])
    cmb = nd(t, 'ShaderNodeCombineColor')
    s2 = mth(t, 'MULTIPLY', star, 55.0)
    for i in range(3): t.links.new(s2, cmb.inputs[i])
    t.links.new(cmb.outputs[0], sc.inputs[7])
    # only camera rays see the stars (keeps lighting noise-free)
    lp = nd(t, 'ShaderNodeLightPath')
    setin(t, add.inputs[0], lp.outputs['Is Camera Ray'])
    t.links.new(sc.outputs[2], add.inputs[7])
    t.links.new(add.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0

def build_spray(root_m):
    """ice chunks + mist kicked up by the rear tyres; world space"""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    iv = [v.co.copy() for v in bm.verts]; ifc = [tuple(v.index for v in f.verts) for f in bm.faces]; bm.free()
    verts = []; faces = []
    puffs = []
    for s, cnt, scale in ((-1, 15000, 1.0), (1, 8000, 0.8)):
        c = root_m @ V((s * RW['x'], RW['y'] + 0.12, 0.02))
        # throw direction: away from camera (+Y world) and to the outside of the slide (-X world)
        d = V((-0.30, 0.95, 0.0)).normalized(); side = V((d.y, -d.x, 0))
        for i in range(cnt):
            t = random.random() ** 1.6
            L = 2.3 * scale
            hgt = (1.75 * scale) * (1 - (2 * (t ** 0.75) - 0.9) ** 2 * 0.8) * (0.35 + 0.65 * random.random())
            lat = random.gauss(0, 0.06 + 0.30 * t) * scale
            p = c + d * (L * t) + side * lat + V((0, 0, max(hgt, 0.0) * (t ** 0.5) + 0.01))
            sz = (0.003 + 0.011 * random.random() ** 4) * (1.15 - 0.6 * t)
            rot = Matrix.Rotation(random.random() * 6.28, 3, V((random.random(), random.random(), random.random() + 0.01)).normalized())
            sc = V((sz * (0.6 + random.random()), sz * (0.6 + random.random()), sz * (0.6 + random.random())))
            o = len(verts)
            vel = (d * 1.0 + V((0, 0, 0.9 * (1 - 1.6 * t)))).normalized()
            for v in iv:
                q = rot @ V((v.x * sc.x, v.y * sc.y, v.z * sc.z))
                q = q + vel * (q.dot(vel) * 4.5)
                verts.append(p + q)
            for f in ifc: faces.append(tuple(o + k for k in f))
        for i in range(14):
            t = (i + 0.5) / 14
            L = 2.1 * scale
            p = c + d * (L * t) + side * random.gauss(0, 0.15 * t) + V((0, 0, (0.12 + 0.95 * math.sin(pi * min(t * 1.1, 1)) * scale * random.random() ** 0.5)))
            puffs.append((p, (0.12 + 0.36 * t) * scale))
    for s, cnt in ((-1, 170), (1, 70)):
        c = root_m @ V((s * FW['x'], FW['y'] - 0.05, 0.02))
        d = V((-0.55, -0.83, 0.0)).normalized(); side = V((d.y, -d.x, 0))
        for i in range(cnt):
            t = random.random() ** 1.8
            p = c + d * (1.9 * t) + side * random.gauss(0, 0.05 + 0.35 * t) + V((0, 0, 0.01 + abs(random.gauss(0, 0.10)) * (0.3 + 1.6 * t) * (1.2 - t)))
            sz = (0.002 + 0.008 * random.random() ** 3)
            rot = Matrix.Rotation(random.random() * 6.28, 3, V((random.random(), random.random(), random.random() + 0.01)).normalized())
            o = len(verts)
            vel = (d + V((0, 0, 0.3))).normalized()
            for v in iv:
                q = rot @ (v * sz); q = q + vel * (q.dot(vel) * 1.5)
                verts.append(p + q)
            for f in ifc: faces.append(tuple(o + k for k in f))
    ob = make_obj("spray", verts, faces, M['spray'], sub=0, smooth_shade=False)
    ob.visible_shadow = False
    for i, (p, r) in enumerate(puffs):
        o = sphere(f"puff{i}", p, (r * 1.2, r * 1.2, r * 0.8), M['mist'], segs=24, rings=12, sub=1)
        o.visible_shadow = False
    return ob

# ----------------------------------------------------------------------------
# lights / camera / render
# ----------------------------------------------------------------------------
def aim(ob, target):
    d = V(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def area(name, loc, target, power, color, size, spread=None):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = color; l.size = size; l.shape = 'DISK'
    if spread: l.spread = spread
    o = bpy.data.objects.new(name, l); coll.objects.link(o); o.location = loc; aim(o, target)
    return o

def build_lights():
    T = (0, -0.1, 0.6)
    area("Key", (-3.2, -3.6, 3.6), T, 520, (1.0, 0.93, 0.85), 2.2)
    area("Fill", (1.8, -5.5, 1.6), T, 160, (0.55, 0.75, 1.0), 3.0).visible_glossy = False
    area("RimCyan", (2.8, 3.6, 2.0), (0, 0, 0.8), 2200, (0.0, 0.75, 1.0), 1.6)
    area("RimMagenta", (-2.4, 4.4, 1.7), (0, 0, 0.8), 2200, (1.0, 0.10, 0.75), 1.6)
    area("TopKick", (0.0, 1.8, 4.0), (0, 0, 0.8), 500, (0.6, 0.8, 1.0), 2.0)
    sun = bpy.data.lights.new("Moon", 'SUN'); sun.energy = 2.0; sun.color = (0.55, 0.75, 1.0); sun.angle = 0.05
    o = bpy.data.objects.new("Moon", sun); coll.objects.link(o); o.location = (0, 0, 30)
    o.rotation_euler = (math.radians(62), 0, math.radians(200))

def add_camera(name, loc, target, lens, fstop, focus_pt, shift=(0, 0), roll=0.0):
    c = bpy.data.cameras.new(name); c.lens = lens; c.sensor_width = 36
    c.dof.use_dof = True; c.dof.aperture_fstop = fstop; c.dof.aperture_blades = 0
    c.shift_x, c.shift_y = shift
    c.clip_start = 0.05; c.clip_end = 2000
    o = bpy.data.objects.new(name, c); coll.objects.link(o); o.location = loc; aim(o, target)
    if roll:
        o.rotation_euler = (o.rotation_euler.to_matrix() @ Matrix.Rotation(math.radians(roll), 3, 'Z')).to_euler()
    c.dof.focus_distance = (V(focus_pt) - V(loc)).length
    return o

def setup_render():
    scene.render.engine = 'CYCLES'
    try:
        pr = bpy.context.preferences.addons['cycles'].preferences
        pr.compute_device_type = 'METAL'; pr.get_devices()
        ok = False
        for d in pr.devices:
            d.use = (d.type == 'METAL'); ok = ok or d.use
        scene.cycles.device = 'GPU' if ok else 'CPU'
        print("Cycles device:", scene.cycles.device)
    except Exception as ex:
        print("GPU setup failed, CPU:", ex); scene.cycles.device = 'CPU'
    cy = scene.cycles
    cy.use_denoising = True
    try: cy.denoiser = 'OPENIMAGEDENOISE'
    except Exception as ex: print(ex)
    cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.012
    cy.max_bounces = 8; cy.transparent_max_bounces = 24; cy.glossy_bounces = 6; cy.transmission_bounces = 6
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.sample_clamp_indirect = 8.0
    cy.filter_width = 1.5
    vs = scene.view_settings
    for vt in ('AgX', 'Filmic', 'Standard'):
        try: vs.view_transform = vt; break
        except Exception: pass
    for lk in ('AgX - Punchy', 'Punchy', 'AgX - High Contrast', 'High Contrast', 'Medium High Contrast'):
        try: vs.look = lk; break
        except Exception: pass
    print("view:", vs.view_transform, vs.look)
    vs.exposure = 0.0; vs.gamma = 1.0
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.compression = 30
    scene.render.film_transparent = False

def setup_compositor():
    try:
        t = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
        scene.compositing_node_group = t
        t.interface.new_socket(name="Image", in_out='OUTPUT', socket_type='NodeSocketColor')
        rl = t.nodes.new("CompositorNodeRLayers")
        go = t.nodes.new("NodeGroupOutput")
        gl = t.nodes.new("CompositorNodeGlare")
        gl.inputs['Type'].default_value = 'Bloom'
        gl.inputs['Quality'].default_value = 'High'
        gl.inputs['Threshold'].default_value = 2.0
        gl.inputs['Smoothness'].default_value = 0.4
        gl.inputs['Strength'].default_value = 0.3
        gl.inputs['Size'].default_value = 0.42
        gl.inputs['Saturation'].default_value = 1.15
        t.links.new(rl.outputs['Image'], gl.inputs['Image'])
        last = gl.outputs['Image']
        try:  # second, tight glow
            g2 = t.nodes.new("CompositorNodeGlare")
            g2.inputs['Type'].default_value = 'Fog Glow'
            g2.inputs['Threshold'].default_value = 2.5
            g2.inputs['Strength'].default_value = 0.15
            g2.inputs['Size'].default_value = 0.2
            t.links.new(last, g2.inputs['Image']); last = g2.outputs['Image']
        except Exception as ex: print("glare2:", ex)
        try:  # vignette
            em = t.nodes.new("CompositorNodeEllipseMask")
            em.inputs['Size'].default_value = (1.05, 1.05)
            bl = t.nodes.new("CompositorNodeBlur")
            bl.inputs['Size'].default_value = (scene.render.resolution_x * 0.25, scene.render.resolution_x * 0.25)
            t.links.new(em.outputs[0], bl.inputs[0])
            mr = t.nodes.new("ShaderNodeMapRange")
            t.links.new(bl.outputs[0], mr.inputs['Value'])
            mr.inputs['To Min'].default_value = 0.45; mr.inputs['To Max'].default_value = 1.0
            mx = t.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
            mx.inputs[0].default_value = 1.0
            t.links.new(last, mx.inputs[6]); t.links.new(mr.outputs[0], mx.inputs[7])
            last = mx.outputs[2]
        except Exception as ex: print("vignette:", ex)
        t.links.new(last, go.inputs[0])
        try: scene.render.use_compositing = True
        except Exception: pass
    except Exception as ex:
        import traceback; traceback.print_exc()
        print("compositor setup failed:", ex)

# ----------------------------------------------------------------------------
# BUILD
# ----------------------------------------------------------------------------
YAW = math.radians(22)
ROLL = math.radians(-3.5)
PITCH = math.radians(0.8)
STEER = math.radians(-19)

build_materials()
root, body, wheels = build_kart()
build_penguin(body)
root.rotation_euler = (0, 0, YAW)
body.rotation_euler = (PITCH, ROLL, 0)
body.location = (0, 0, 0.012)
wheels[('f', -1)].rotation_euler = (0, 0, STEER)
wheels[('f', 1)].rotation_euler = (0, 0, STEER)
root_m = Matrix.Rotation(YAW, 4, 'Z')

build_ice()
build_mountains()
build_world()
D = math.radians
build_aurora([
    lambda u: (D(-28 + 78 * u + 5 * math.sin(u * 9.0)), 240 + 60 * math.sin(u * 8.0 + 0.5), 20 + 26 * u + 6 * math.sin(u * 11), 32),
    lambda u: (D(8 + 40 * u + 4 * math.sin(u * 9.0 + 2)), 330 + 40 * math.sin(u * 6.0), 78 + 30 * u, 50),
    lambda u: (D(12 + 62 * u + 3 * math.sin(u * 8.0 + 1)), 330 + 50 * math.sin(u * 7.0 + 2), 34 + 14 * math.sin(u * 5.0), 26),
])
build_spray(root_m)
build_skids(root_m, STEER)
build_lights()
setup_render()

face_world = root_m @ V((0, -0.19, 1.37))
CAMS = {
    'square': add_camera("CamSquare", (-0.80, -3.85, 0.95), (0.03, -0.10, 0.66), 46, 4.0, face_world, roll=-4),
    'wide': add_camera("CamWide", (-1.25, -4.5, 0.85), (0.80, -0.1, 0.78), 32, 4.0, face_world, roll=-3),
    'face': add_camera("CamFace", (-0.7, -2.2, 1.15), (0.0, 0.0, 0.92), 70, 8, face_world),
    'wheel': add_camera("CamWheel", (-1.5, -1.9, 0.5), (-0.55, -0.35, 0.3), 60, 11, (-0.6, -0.5, 0.3)),
    'nose': add_camera("CamNose", (0.3, -2.6, 0.9), (0.45, -0.75, 0.3), 60, 11, (0.4, -0.9, 0.35)),
    'exh': add_camera("CamExh", (-2.6, -1.0, 1.2), tuple(root_m @ V((-0.5, 0.9, 0.9))), 70, 11, tuple(root_m @ V((-0.5, 0.9, 0.9)))),
    'side': add_camera("CamSide", (-4.6, 0.6, 1.3), (0, 0, 0.5), 50, 16, (0, 0, 0.5)),
    'rear': add_camera("CamRear", (2.8, 3.6, 1.6), (0, 0, 0.5), 50, 16, (0, 0, 0.5)),
    'top': add_camera("CamTop", (-1.0, -2.5, 3.6), (0, 0, 0.4), 50, 16, (0, 0, 0.5)),
}

def render(cam, w, h, samples, out):
    scene.camera = CAMS[cam]
    scene.render.resolution_x = int(w); scene.render.resolution_y = int(h); scene.render.resolution_percentage = 100
    scene.cycles.samples = int(samples)
    setup_compositor()
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("WROTE", out)

if arg('--save'):
    bpy.ops.wm.save_as_mainfile(filepath=arg('--save'))

# jobs: --job cam w h samples out   (repeatable)
i = 0
while i < len(argv):
    if argv[i] == '--job':
        cam, w, h, smp, out = argv[i + 1:i + 6]
        render(cam, w, h, smp, out); i += 6
    else:
        i += 1
