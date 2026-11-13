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
                      Emission_Color=(0.55, 0.85, 1.0), Emission_Strength=0.25,
                      Transmission_Weight=0.65)[0]
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
    a = mth(t, 'MULTIPLY', a, mth(t, 'ADD', 0.08, mth(t, 'MULTIPLY', smooth(t, nz.outputs['Fac'], 0.3, 0.75), 0.5)))
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
        d = V((s * 0.10, 1.0, 0.24)).normalized()
        o = V((s * 0.185, -1.045, 0.415))
        m4 = frame(o, d)
        v, f = lathe([(0.0, -0.004), (0.06, -0.004), (0.078, 0.0), (0.084, 0.03), (0.082, 0.10), (0.066, 0.22), (0.036, 0.34), (0.0, 0.40)], segs=32, mat=m4)
        make_obj(f"pod_light{s}", v, f, M['iceplain'], sub=2, parent=body)
        v, f = lathe([(0.0, -0.034), (0.035, -0.03), (0.058, -0.018), (0.068, -0.004), (0.068, 0.01)], segs=32, mat=m4)
        rr = [0.0] + [0.35] * 32 + [0.7] * 32 + [0.95] * 32 + [1.0] * 32
        make_obj(f"lens_light{s}", v, f, M['headlight'], sub=2, parent=body, attrs={'r': rr})
        sl = bpy.data.lights.new("HeadSpot", 'SPOT'); sl.energy = 150; sl.color = (0.1, 0.8, 1.0)
        sl.spot_size = math.radians(55); sl.spot_blend = 0.9; sl.shadow_soft_size = 0.05
        so = bpy.data.objects.new("HeadSpot", sl); coll.objects.link(so); so.parent = body
        so.location = o - d * 0.12
        so.rotation_euler = V((-d.x, -d.y, -d.z - 0.22)).to_track_quat('-Z', 'Y').to_euler()
        torus(f"bezel{s}", 0.074, 0.011, M['chrome'], m4 @ Matrix.Translation((0, 0, -0.004)), parent=body)

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

    # ---- steering ----
    wc = V((0, -0.175, 0.665)); wn = V((0, 0.80, 0.60)).normalized()
    m4 = frame(wc, wn)
    torus("steer_rim", 0.15, 0.023, M['seat'], m4, parent=body)
    v, f = tube([wc - wn * 0.01, wc - wn * 0.20], [0.028, 0.03], N=12)
    make_obj("steer_col", v, f, M['dark'], sub=1, parent=body)
    v, f = lathe([(0, 0.022), (0.04, 0.02), (0.055, 0.008), (0.055, -0.012), (0, -0.015)], segs=24, mat=m4)
    make_obj("steer_hub", v, f, M['orange'], sub=2, parent=body)
    for a in (0.0, pi, -pi / 2):
        d = m4.to_3x3() @ V((math.cos(a), math.sin(a), 0))
        v, f = tube([wc + d * 0.04, wc + d * 0.145], 0.012, N=8, ell=2.0, up=wn)
        make_obj("steer_spoke", v, f, M['chrome'], sub=1, parent=body)
    # top marker on the wheel
    tm = m4 @ Matrix.Translation((0, 0.15, 0))
    rbox("steer_mark", (0.03, 0.05, 0.05), M['orange'], tm, bevel=0.012, parent=body, sub=1)

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
PY = 0.20                      # torso axis y
HEAD = V((0, 0.165, 1.045))
HR = 0.275

def torso_r(z):
    t = (z - 0.20) / 0.64
    t = min(max(t, 0.0), 1.0)
    env = 0.285 * (1 - (abs(t - 0.42) / 0.60) ** 2.4) ** 0.5 if abs(t - 0.42) < 0.6 else 0.0
    return env

def build_penguin(body):
    P = empty("PENGUIN", body)
    PS = 1.14; piv = V((0, -0.10, 0.45))
    P.scale = (PS, PS, PS); P.location = piv * (1 - PS)
    # torso (jacket) with horizontal puffer rolls
    prof = []
    z0, z1 = 0.24, 0.845
    NR = 4
    n = 56
    for i in range(n + 1):
        t = i / n
        z = z0 + (z1 - z0) * t
        r = torso_r(z)
        seam = abs(math.sin(pi * NR * t)) ** 0.38
        r = r - 0.028 * (1 - seam)
        prof.append((max(r, 0.02), z))
    prof = [(0.0, z0)] + prof + [(0.0, z1 + 0.005)]
    Tm = Matrix.Translation((0, PY, 0)) @ Matrix.Diagonal((1.0, 0.92, 1.0, 1.0))
    v, f = lathe(prof, segs=40, mat=Tm)
    make_obj("jacket", v, f, M['jacket'], sub=2, parent=P)
    # hips (black) under the jacket
    sphere("hips", (0, PY, 0.36), (0.265, 0.245, 0.2), M['pblack'], parent=P)
    # zipper placket
    path = []
    for i in range(18):
        z = 0.33 + (0.80 - 0.33) * i / 17
        path.append(V((0, PY - torso_r(z) * 0.92 - 0.004, z)))
    v, f = tube(path, 0.013, N=8, ell=1.8, up=(1, 0, 0))
    make_obj("zipper", v, f, M['dark'], sub=1, parent=P)
    # chest patch (penguin's right = -X)
    zc = 0.62; ang = math.radians(-38)
    r = torso_r(zc)
    pos = V((r * math.sin(ang), PY - r * 0.92 * math.cos(ang), zc))
    nrm = V((math.sin(ang), -math.cos(ang), 0.12)).normalized()
    m4 = frame(pos + nrm * 0.001, nrm, (0, 0, 1))
    rbox("patch_frame", (0.105, 0.105, 0.018), M['dark'], m4, bevel=0.016, parent=P, sub=2)
    rbox("patch", (0.078, 0.078, 0.02), M['patch'], m4 @ Matrix.Translation((0, 0, 0.005)), bevel=0.012, parent=P, sub=2)

    # collar: chunky double roll
    for (zz, R, r) in ((0.835, 0.185, 0.072), (0.89, 0.155, 0.055)):
        torus("collar", R, r, M['collar'], Matrix.Translation((0, PY - 0.015, zz)) @ Matrix.Rotation(0.10, 4, 'X'), parent=P, sub=2)

    # head
    head = sphere("head", (0, 0, 0), (HR * 1.05, HR, HR * 0.97), M['head'], parent=P, segs=48, rings=24, sub=2)
    head.location = HEAD
    hp = empty("HEADPARTS", P, HEAD)
    def hpt(az, el, off):
        r = HR + off
        return V((r * 1.05 * math.cos(el) * math.sin(az), -r * math.cos(el) * math.cos(az), r * 0.97 * math.sin(el)))
    def lin(a, b, n): return [a + (b - a) * i / (n - 1) for i in range(n)]
    D = math.radians
    # goggle frame
    us = [D(-68), D(-65)] + lin(D(-58), D(58), 13) + [D(65), D(68)]
    vs = [D(-8), D(-6)] + lin(D(-2), D(16), 5) + [D(20), D(22)]
    v, f = shell_patch(hpt, us, vs, -0.01, 0.036)
    make_obj("goggle_frame", v, f, M['goggle'], sub=2, parent=hp)
    us = [D(-56), D(-53.5)] + lin(D(-47), D(47), 11) + [D(53.5), D(56)]
    vs = [D(-3), D(-1.2)] + lin(D(2), D(12), 4) + [D(15.2), D(17)]
    v, f = shell_patch(hpt, us, vs, 0.02, 0.046)
    make_obj("goggle_lens", v, f, M['lens'], sub=2, parent=hp)
    # strap
    us = lin(D(66), D(294), 26); vs = [D(1), D(3)] + lin(D(6), D(12), 3) + [D(15), D(17)]
    v, f = shell_patch(hpt, us, vs, -0.005, 0.014)
    make_obj("goggle_strap", v, f, M['strap'], sub=2, parent=hp)
    # beak
    rings = []
    for (y, z, a, b) in ((-0.20, -0.075, 0.085, 0.055), (-0.265, -0.080, 0.080, 0.050), (-0.315, -0.092, 0.062, 0.038),
                         (-0.36, -0.108, 0.040, 0.024), (-0.395, -0.124, 0.018, 0.011)):
        rings.append(sup_ring((0, y, z), (1, 0, 0), (0, 0, 1), a, b, e=2.0, N=16, b_low=b * 0.7))
    v, f = loft(rings)
    make_obj("beak", v, f, M['beak'], sub=2, parent=hp)

    # arms + mittens
    wc = V((0, -0.175, 0.665))
    for s in (-1, 1):
        sh = V((s * 0.235, PY - 0.01, 0.70)); el = V((s * 0.385, 0.03, 0.585)); wr = V((s * 0.215, -0.105, 0.655))
        path = []; rad = []
        n = 30
        for i in range(n + 1):
            t = i / n
            p = sh * (1 - t) ** 2 + el * 2 * t * (1 - t) + wr * t ** 2
            p = p + (el - (sh + wr) / 2) * (0.5 * 2 * t * (1 - t))
            seam = abs(math.sin(pi * 3 * t)) ** 0.4
            path.append(p); rad.append((0.108 - 0.022 * t) - 0.02 * (1 - seam))
        v, f = tube(path, rad, N=14)
        make_obj(f"arm{s}", v, f, M['jacket'], sub=2, parent=P)
        if s == -1:
            pp = path[5]; nn_ = V((-1.0, -0.55, 0.45)).normalized()
            pm = frame(pp + nn_ * (rad[5] + 0.004), nn_, (0, 0, 1))
            rbox("spatch_frame", (0.10, 0.10, 0.02), M['dark'], pm, bevel=0.016, parent=P, sub=2)
            rbox("spatch", (0.074, 0.074, 0.022), M['patch'], pm @ Matrix.Translation((0, 0, 0.005)), bevel=0.012, parent=P, sub=2)
        hand = V((s * 0.150, -0.185, 0.672))
        d = (hand - wr).normalized()
        torus(f"cuff{s}", 0.062, 0.03, M['collar'], frame(wr + d * 0.02, d), parent=P, sub=1, segs=24, rsegs=10)
        sphere(f"mitt{s}", hand, (0.082, 0.092, 0.088), M['pblack'], parent=P, rot=Matrix.Rotation(s * 0.5, 4, 'Z'))
        sphere(f"thumb{s}", hand + V((-s * 0.055, 0.035, 0.045)), (0.035, 0.05, 0.035), M['pblack'], parent=P, segs=16, rings=8)
        # legs + feet resting on the pods
        hip = V((s * 0.17, 0.02, 0.44)); knee = V((s * 0.33, -0.12, 0.50)); ank = V((s * 0.47, -0.22, 0.45))
        v, f = tube([hip, knee, ank], [0.085, 0.075, 0.06], N=12)
        make_obj(f"leg{s}", v, f, M['pblack'], sub=2, parent=P)
        fm = Matrix.Translation((s * 0.50, -0.30, 0.445)) @ Matrix.Rotation(s * 0.35, 4, 'Z') @ Matrix.Rotation(0.25, 4, 'X')
        rings = []
        for (y, a, b, z) in ((0.09, 0.05, 0.04, 0.0), (0.03, 0.078, 0.05, 0.0), (-0.05, 0.095, 0.046, -0.004), (-0.12, 0.10, 0.034, -0.012), (-0.165, 0.07, 0.02, -0.02)):
            rings.append(sup_ring(fm @ V((0, y, z)), fm.to_3x3() @ V((1, 0, 0)), fm.to_3x3() @ V((0, 0, 1)), a, b, e=2.4, N=16, b_low=b * 0.6))
        v, f = loft(rings)
        make_obj(f"foot{s}", v, f, M['beak'], sub=2, parent=P)
    return P

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
            sz = (0.003 + 0.016 * random.random() ** 5) * (1.15 - 0.6 * t)
            rot = Matrix.Rotation(random.random() * 6.28, 3, V((random.random(), random.random(), random.random() + 0.01)).normalized())
            sc = V((sz * (0.6 + random.random()), sz * (0.6 + random.random()), sz * (0.6 + random.random())))
            o = len(verts)
            vel = (d * 1.0 + V((0, 0, 0.9 * (1 - 1.6 * t)))).normalized()
            for v in iv:
                q = rot @ V((v.x * sc.x, v.y * sc.y, v.z * sc.z))
                q = q + vel * (q.dot(vel) * 2.2)
                verts.append(p + q)
            for f in ifc: faces.append(tuple(o + k for k in f))
        for i in range(26):
            t = (i + 0.5) / 26
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
YAW = math.radians(27)
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

face_world = root_m @ V((0, HEAD.y - 0.27, HEAD.z))
CAMS = {
    'square': add_camera("CamSquare", (-0.80, -3.85, 0.95), (0.03, -0.10, 0.66), 46, 4.0, face_world, roll=-4),
    'wide': add_camera("CamWide", (-1.25, -4.5, 0.85), (0.80, -0.1, 0.70), 34, 4.0, face_world, roll=-3),
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
