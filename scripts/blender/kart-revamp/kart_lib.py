# Shared helpers for the premium kart rebuilds (scripts/blender/kart-revamp).
# Blender 5.1, headless. Everything is procedural: no imported meshes, no
# external images. A kart script builds parts with these helpers, joins them
# into one body mesh plus four wheels, bakes one small texture atlas
# (colour with ambient occlusion, roughness/metal, emissive) and exports a GLB
# the game can drop in.
#
# Kart frame while building: +X nose, +Y left, +Z up, length 1.0, ground z=0.
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix

V = Vector
pi = math.pi
coll = None


def reset_scene():
    global coll
    bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.context.scene.collection
    MATS.clear()
    return bpy.context.scene


# ----------------------------------------------------------------------------
# source materials: plain values the bake reads. `pattern(tree, colour socket)`
# may paint extra colour (stripes, panel lines) in kart coordinates.
# ----------------------------------------------------------------------------
MATS = {}


def mat(name, color, rough=0.5, metal=0.0, emit=None, emit_strength=0.0, pattern=None, toplight=True, ao_floor=0.34, edge=0.5,
        protect=None):
    """`protect`: this material keeps its own colour under a racer wash or a
    bought paint (gold, brass, lamps, cargo). Lamps (anything emissive) are
    protected unless told otherwise. See stamp_paint_protect."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    MATS[name] = dict(color=color, rough=rough, metal=metal, emit=emit, emit_strength=emit_strength, pattern=pattern,
                      toplight=toplight, ao_floor=ao_floor, edge=edge,
                      protect=bool(emit) if protect is None else bool(protect))
    return m


# node helpers ---------------------------------------------------------------
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


def mth(tree, op, a, b=None, clamp=False):
    n = nd(tree, 'ShaderNodeMath', operation=op)
    n.use_clamp = clamp
    setin(tree, n.inputs[0], a)
    if b is not None:
        setin(tree, n.inputs[1], b)
    return n.outputs[0]


def smooth(tree, v, lo, hi):
    n = nd(tree, 'ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
    setin(tree, n.inputs['Value'], v)
    n.inputs['From Min'].default_value = lo
    n.inputs['From Max'].default_value = hi
    return n.outputs[0]


def band(tree, v, lo, hi, soft=0.0015):
    a = smooth(tree, v, lo - soft, lo + soft)
    b = smooth(tree, v, hi - soft, hi + soft)
    return mth(tree, 'SUBTRACT', a, b, clamp=True)


def mixc(tree, fac, a, b, blend='MIX'):
    n = nd(tree, 'ShaderNodeMix', data_type='RGBA', blend_type=blend)
    setin(tree, n.inputs[0], fac)
    setin(tree, n.inputs[6], a if isinstance(a, bpy.types.NodeSocket) else (*a, 1.0)[:4])
    setin(tree, n.inputs[7], b if isinstance(b, bpy.types.NodeSocket) else (*b, 1.0)[:4])
    return n.outputs[2]


def objcoord(tree):
    tc = nd(tree, 'ShaderNodeTexCoord')
    sep = nd(tree, 'ShaderNodeSeparateXYZ')
    tree.links.new(tc.outputs['Object'], sep.inputs[0])
    return sep.outputs[0], sep.outputs[1], sep.outputs[2]


def normal_z(tree):
    g = nd(tree, 'ShaderNodeNewGeometry')
    sep = nd(tree, 'ShaderNodeSeparateXYZ')
    tree.links.new(g.outputs['Normal'], sep.inputs[0])
    return sep.outputs[2]


# ----------------------------------------------------------------------------
# geometry helpers (same family as scripts/blender/key-art/white-kart-hero.py)
# ----------------------------------------------------------------------------
def make_obj(name, verts, faces, material, sub=0, sharp=40, bevel=0.0, bevel_segs=2, recalc=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    if recalc:
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.update()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    me.materials.append(material)
    if bevel > 0:
        bv = ob.modifiers.new('bev', 'BEVEL')
        bv.width = bevel
        bv.segments = bevel_segs
        bv.limit_method = 'ANGLE'
        bv.angle_limit = math.radians(30)
    if sub:
        md = ob.modifiers.new('sub', 'SUBSURF')
        md.levels = sub
        md.render_levels = sub
    ob['sharp'] = sharp
    return ob


def sgnpow(v, e):
    return math.copysign(abs(v) ** e, v)


def sup_ring(c, u, v, a, b, e=2.5, N=16, b_low=None):
    """superellipse ring round centre c in the plane (u, v)"""
    c = V(c); u = V(u); v = V(v)
    pts = []
    for k in range(N):
        th = 2 * pi * k / N
        cx = sgnpow(math.cos(th), 2.0 / e)
        sy = sgnpow(math.sin(th), 2.0 / e)
        bb = b if (sy >= 0 or b_low is None) else b_low
        pts.append(c + u * (a * cx) + v * (bb * sy))
    return pts


def loft(rings, cap0=True, cap1=True, closed=True):
    n = len(rings[0]); verts = []; faces = []
    for r in rings:
        verts += [V(p) for p in r]
    for i in range(len(rings) - 1):
        for j in range(n if closed else n - 1):
            a = i * n + j; b = i * n + (j + 1) % n
            faces.append((a, b, b + n, a + n))
    if cap0:
        c = sum(rings[0], V((0, 0, 0))) / n; verts.append(c); ci = len(verts) - 1
        for j in range(n):
            faces.append((ci, (j + 1) % n, j))
    if cap1:
        c = sum(rings[-1], V((0, 0, 0))) / n; verts.append(c); ci = len(verts) - 1
        o = (len(rings) - 1) * n
        for j in range(n):
            faces.append((ci, o + j, o + (j + 1) % n))
    return verts, faces


def xloft(name, material, sections, N=16, sub=1, sharp=45, yc=0.0):
    """sections along X: (x, half width, top z, bottom z, exponent[, y centre])"""
    rings = []
    for s in sections:
        x, hw, top, bot, ex = s[:5]
        c = s[5] if len(s) > 5 else yc
        zc = bot + 0.45 * (top - bot)
        rings.append(sup_ring((x, c, zc), (0, 1, 0), (0, 0, 1), hw, top - zc, e=ex, N=N, b_low=zc - bot))
    v, f = loft(rings)
    return make_obj(name, v, f, material, sub=sub, sharp=sharp)


def tube(name, material, path, radii, N=8, round_ends=False, ell=1.0, up=None, sub=0, sharp=50, closed=False):
    path = [V(p) for p in path]
    n = len(path)
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * n
    tans = []
    for i in range(n):
        if closed:
            a = path[i - 1]; b = path[(i + 1) % n]
        else:
            a = path[max(i - 1, 0)]; b = path[min(i + 1, n - 1)]
        tans.append((b - a).normalized())
    t0 = tans[0]
    ref = V(up) if up else (V((0, 0, 1)) if abs(t0.z) < 0.9 else V((1, 0, 0)))
    nrm = (ref - t0 * ref.dot(t0)).normalized()
    frames = []
    for i, p in enumerate(path):
        t = tans[i]
        nrm = (nrm - t * nrm.dot(t)).normalized()
        frames.append((p, t, nrm, t.cross(nrm)))

    def ring(p, nr, bn, r):
        return [p + nr * (r * math.cos(2 * pi * k / N)) + bn * (r * ell * math.sin(2 * pi * k / N)) for k in range(N)]
    rings = []
    if round_ends and not closed:
        p, t, nr, bn = frames[0]; r = radii[0]
        for a in (60, 25):
            rings.append(ring(p - t * (r * math.sin(math.radians(a))), nr, bn, r * math.cos(math.radians(a))))
    for (p, t, nr, bn), r in zip(frames, radii):
        rings.append(ring(p, nr, bn, r))
    if round_ends and not closed:
        p, t, nr, bn = frames[-1]; r = radii[-1]
        for a in (25, 60):
            rings.append(ring(p + t * (r * math.sin(math.radians(a))), nr, bn, r * math.cos(math.radians(a))))
    if closed:
        rings.append(rings[0])
        v, f = loft(rings, cap0=False, cap1=False)
        ob = make_obj(name, v, f, material, sub=sub, sharp=sharp)
        bm = bmesh.new(); bm.from_mesh(ob.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bm.to_mesh(ob.data); bm.free()
        return ob
    v, f = loft(rings)
    return make_obj(name, v, f, material, sub=sub, sharp=sharp)


def lathe(name, material, profile, segs=24, M4=None, rmod=None, sub=0, sharp=40, recalc=True):
    """revolve an (r, h) profile round local Z, then transform by M4. r == 0 is a pole."""
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
            if len(A) == 1 and len(B) == 1:
                continue
            if len(A) == 1:
                faces.append((A[0], B[k], B[k2]))
            elif len(B) == 1:
                faces.append((A[k], B[0], A[k2]))
            else:
                faces.append((A[k], B[k], B[k2], A[k2]))
    if M4 is not None:
        verts = [M4 @ v for v in verts]
    return make_obj(name, verts, faces, material, sub=sub, sharp=sharp, recalc=recalc)


def frame(origin, zdir, xhint=(1, 0, 0)):
    z = V(zdir).normalized(); x = V(xhint)
    x = x - z * x.dot(z)
    if x.length < 1e-5:
        x = V((0, 1, 0)); x = x - z * x.dot(z)
    x.normalize(); y = z.cross(x)
    return Matrix(((x.x, y.x, z.x, origin[0]), (x.y, y.y, z.y, origin[1]), (x.z, y.z, z.z, origin[2]), (0, 0, 0, 1)))


def T(x, y, z):
    return Matrix.Translation((x, y, z))


def R(angle, axis):
    return Matrix.Rotation(angle, 4, axis)


def rbox(name, size, material, M4=None, bevel=0.01, segs=2, taper=None, sub=0, sharp=35):
    sx, sy, sz = [s / 2 for s in size]
    verts = [V((x * sx, y * sy, z * sz)) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    if taper:
        verts = [taper(v) for v in verts]
    if M4 is not None:
        verts = [M4 @ v for v in verts]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    ob = make_obj(name, verts, faces, material, sub=sub, sharp=sharp)
    if bevel > 0:
        bv = ob.modifiers.new('bev', 'BEVEL')
        bv.width = bevel; bv.segments = segs; bv.limit_method = 'NONE'
        ob.modifiers.move(len(ob.modifiers) - 1, 0)
    return ob


def torus(name, material, Rr, r, M4=None, segs=20, rsegs=8, ell=1.0, sharp=60):
    verts = []; faces = []
    for i in range(segs):
        a = 2 * pi * i / segs
        for j in range(rsegs):
            b = 2 * pi * j / rsegs
            rr = Rr + r * math.cos(b)
            verts.append(V((rr * math.cos(a), rr * math.sin(a), r * ell * math.sin(b))))
    for i in range(segs):
        for j in range(rsegs):
            a = i * rsegs + j; b = i * rsegs + (j + 1) % rsegs
            c = ((i + 1) % segs) * rsegs + (j + 1) % rsegs; d = ((i + 1) % segs) * rsegs + j
            faces.append((a, b, c, d))
    if M4 is not None:
        verts = [M4 @ v for v in verts]
    return make_obj(name, verts, faces, material, sharp=sharp)


def bolt(name, material, pos, nrm, r):
    return lathe(name, material, [(0, r * 0.7), (r * 0.62, r * 0.66), (r, r * 0.3), (r, -r * 0.6)], segs=6, M4=frame(pos, nrm), sharp=30)


def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    coll.objects.link(e)
    e.parent = parent; e.location = loc; e.rotation_euler = rot
    return e


def mark_sharp(me, angle_deg):
    bm = bmesh.new(); bm.from_mesh(me)
    lim = math.radians(angle_deg)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            e.smooth = e.calc_face_angle() <= lim
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me); bm.free()


def join(parts, name, weighted=True):
    """apply every part's modifiers, mark its sharp edges, then join into one mesh"""
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.convert(target='MESH')
    for o in parts:
        mark_sharp(o.data, o.get('sharp', 40))
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name; o.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if weighted:
        md = o.modifiers.new('wn', 'WEIGHTED_NORMAL')
        md.keep_sharp = True; md.weight = 60
        bpy.ops.object.modifier_apply(modifier='wn')
    return o


def tri_count(objs):
    n = 0
    for o in objs:
        if o.type == 'MESH':
            o.data.calc_loop_triangles(); n += len(o.data.loop_triangles)
    return n


def bounds(objs):
    mn = V((1e9,) * 3); mx = V((-1e9,) * 3)
    for o in objs:
        if o.type != 'MESH':
            continue
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                mn[i] = min(mn[i], w[i]); mx[i] = max(mx[i], w[i])
    return mn, mx


# ----------------------------------------------------------------------------
# atlas: unwrap, bake, final material
# ----------------------------------------------------------------------------
def unwrap(objs, margin=0.004, angle=66):
    """one shared UV space for every object, islands sized by surface area"""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        if not o.data.uv_layers:
            o.data.uv_layers.new(name='UVMap')
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')


def _bake_tree(m, mode, image, d):
    t = m.node_tree
    t.nodes.clear()
    out = nd(t, 'ShaderNodeOutputMaterial')
    em = nd(t, 'ShaderNodeEmission')
    t.links.new(em.outputs[0], out.inputs['Surface'])
    if mode == 'color':
        col = nd(t, 'ShaderNodeRGB'); col.outputs[0].default_value = (*d['color'], 1)
        c = col.outputs[0]
        if d['pattern']:
            c = d['pattern'](t, c)
        if d['emit']:
            # a lamp is painted at full brightness: the race shader has no
            # emissive slot, so the glow has to live in the colour map too
            lamp = tuple(min(1.0, 0.35 + 0.65 * v) for v in d['emit'])
            setin(t, em.inputs['Color'], (*lamp, 1))
        else:
            ao = nd(t, 'ShaderNodeAmbientOcclusion', samples=12)
            ao.inputs['Distance'].default_value = 0.16
            shade = smooth(t, ao.outputs['AO'], 0.0, 1.0)
            shade = mth(t, 'ADD', mth(t, 'MULTIPLY', shade, 1.0 - d['ao_floor']), d['ao_floor'])
            if d['toplight']:
                nz = normal_z(t)
                top = mth(t, 'ADD', mth(t, 'MULTIPLY', smooth(t, nz, -1.0, 1.0), 0.30), 0.76)
                shade = mth(t, 'MULTIPLY', shade, top)
            lit = mixc(t, 1.0, c, shade, blend='MULTIPLY')
            if d['edge'] > 0:
                # soft highlight along edges: where a rounded normal differs
                # from the true one. Ambient occlusion keeps it off creases.
                bev = nd(t, 'ShaderNodeBevel', samples=6)
                bev.inputs['Radius'].default_value = 0.012
                g = nd(t, 'ShaderNodeNewGeometry')
                dot = nd(t, 'ShaderNodeVectorMath', operation='DOT_PRODUCT')
                t.links.new(bev.outputs[0], dot.inputs[0]); t.links.new(g.outputs['Normal'], dot.inputs[1])
                e = mth(t, 'MULTIPLY', mth(t, 'SUBTRACT', 1.0, dot.outputs['Value']), 9.0, clamp=True)
                e = mth(t, 'MULTIPLY', mth(t, 'MULTIPLY', e, ao.outputs['AO']), d['edge'])
                hi = mixc(t, 0.35, c, (1, 1, 1))
                lit = mixc(t, e, lit, hi)
            t.links.new(lit, em.inputs['Color'])
    elif mode == 'orm':
        setin(t, em.inputs['Color'], (1.0, d['rough'], d['metal'], 1))
    elif mode == 'emit':
        e = d['emit'] or (0, 0, 0)
        k = min(1.0, d['emit_strength']) if d['emit'] else 0.0
        setin(t, em.inputs['Color'], (e[0] * k, e[1] * k, e[2] * k, 1))
    img = nd(t, 'ShaderNodeTexImage')
    img.image = image
    t.nodes.active = img
    img.select = True


# The game recolours every saturated texel of a kart (racer wash, bought
# paint). Gold, brass and lamps must not follow the body, and colour alone
# cannot say which is which (a sand body and a gold coin are the same hue), so
# the kart says it per vertex: a float attribute, 1.0 on every vertex of a
# face whose material has protect=True, 0.0 elsewhere. It exports as the glTF
# attribute _PAINT_PROTECT; the game reads it in src/game/race/render/
# paintProtect.js. Parts are never welded to each other, so a vertex belongs
# to one material and the edge between gold and paint is exact at any distance.
PROTECT_ATTRIBUTE = '_PAINT_PROTECT'


def stamp_paint_protect(objs):
    """call while the source materials are still assigned (bake_atlas does)"""
    total = 0
    for o in objs:
        me = o.data
        flags = [0.0] * len(me.vertices)
        for p in me.polygons:
            slot = me.materials[p.material_index] if me.materials else None
            if slot and MATS.get(slot.name, {}).get('protect'):
                for vi in p.vertices:
                    flags[vi] = 1.0
        old = me.attributes.get(PROTECT_ATTRIBUTE)
        if old:
            me.attributes.remove(old)
        me.attributes.new(PROTECT_ATTRIBUTE, 'FLOAT', 'POINT').data.foreach_set('value', flags)
        total += int(sum(flags))
    return total


def dump_paint_protect(objs, path):
    """every UV corner of the unwrapped kart with its protect flag, in glTF
    UV space (v down). paint-protect.mjs uses it to stamp a GLB that was
    packed before the attribute existed, without rebuilding it."""
    corners = {}
    for o in objs:
        me = o.data
        uv = me.uv_layers.active.data
        flag = me.attributes[PROTECT_ATTRIBUTE].data
        for loop in me.loops:
            u, v = uv[loop.index].uv
            key = (round(u, 6), round(1.0 - v, 6))
            corners[key] = max(corners.get(key, 0), int(flag[loop.vertex_index].value))
    with open(path, 'w') as handle:
        json.dump({'attribute': PROTECT_ATTRIBUTE, 'corners': [[u, v, f] for (u, v), f in corners.items()]}, handle)
    print('PAINT PROTECT', path, len(corners), 'uv corners,', sum(corners.values()), 'protected')


def bake_atlas(groups, sizes, samples=24, ground=True):
    """groups: list of object lists baked together; objects outside a group are
    hidden from it, so a wheel's ambient occlusion comes only from the wheel
    (it has to stay right while the wheel spins) and the body's from everything.
    groups[0] is the body group and sees every other object.
    Returns {'color','orm','emit'} images. Also stamps the paint-protect
    attribute, the last moment the source materials are on the meshes.
    KART_PROTECT_DUMP=<json> writes the protect flags by UV and stops there
    (no bake): see dump_paint_protect."""
    stamp_paint_protect([o for g in groups for o in g])
    if os.environ.get('KART_PROTECT_DUMP'):
        dump_paint_protect([o for g in groups for o in g], os.environ['KART_PROTECT_DUMP'])
        sys.exit(0)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.bake.margin = 12
    sc.render.bake.use_clear = False
    sc.view_settings.view_transform = 'Standard'
    images = {}
    for mode in ('color', 'orm', 'emit'):
        im = bpy.data.images.new('atlas_' + mode, sizes[mode], sizes[mode], alpha=False)
        im.generated_color = (0.03, 0.03, 0.035, 1) if mode == 'color' else ((1, 0.6, 0, 1) if mode == 'orm' else (0, 0, 0, 1))
        if mode == 'orm':
            im.colorspace_settings.name = 'Non-Color'
        images[mode] = im
    gp = None
    if ground:
        bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -0.002))
        gp = bpy.context.object
    everything = [o for g in groups for o in g]
    defs = dict(MATS)
    for mode in ('color', 'orm', 'emit'):
        sc.cycles.samples = samples if mode == 'color' else 1
        for name, d in defs.items():
            _bake_tree(bpy.data.materials[name], mode, images[mode], d)
        for gi, g in enumerate(groups):
            for o in everything:
                o.hide_render = not (o in g or gi == 0)
            if gp:
                gp.hide_render = gi != 0
            for o in g:
                bpy.ops.object.select_all(action='DESELECT')
                o.select_set(True)
                bpy.context.view_layer.objects.active = o
                bpy.ops.object.bake(type='EMIT')
    for o in everything:
        o.hide_render = False
    if gp:
        bpy.data.objects.remove(gp)
    return images


def save_image(im, path, fmt='PNG', quality=90):
    sc = bpy.context.scene
    s = sc.render.image_settings
    old = (s.file_format, s.quality, s.color_mode)
    s.file_format = fmt; s.quality = quality; s.color_mode = 'RGB'
    im.save_render(path, scene=sc)
    s.file_format, s.quality, s.color_mode = old


def final_material(name, images, tmpdir):
    """one glTF-friendly material that reads the three baked maps"""
    os.makedirs(tmpdir, exist_ok=True)
    loaded = {}
    for mode, im in images.items():
        p = os.path.join(tmpdir, f'{name}_{mode}.png')
        im.filepath_raw = p; im.file_format = 'PNG'; im.save()
        li = bpy.data.images.load(p)
        if mode == 'orm':
            li.colorspace_settings.name = 'Non-Color'
        loaded[mode] = li
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    t = m.node_tree
    b = t.nodes['Principled BSDF']
    c = nd(t, 'ShaderNodeTexImage'); c.image = loaded['color']
    t.links.new(c.outputs['Color'], b.inputs['Base Color'])
    o = nd(t, 'ShaderNodeTexImage'); o.image = loaded['orm']
    sep = nd(t, 'ShaderNodeSeparateColor')
    t.links.new(o.outputs['Color'], sep.inputs[0])
    t.links.new(sep.outputs[1], b.inputs['Roughness'])
    t.links.new(sep.outputs[2], b.inputs['Metallic'])
    e = nd(t, 'ShaderNodeTexImage'); e.image = loaded['emit']
    t.links.new(e.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Emission Strength'].default_value = 1.0
    return m


def assign_single(o, material):
    me = o.data
    for p in me.polygons:
        p.material_index = 0
    me.materials.clear()
    me.materials.append(material)


def mirrored_copy(o, name):
    """copy with X flipped in mesh data (same UVs, so it shares the atlas)"""
    me = o.data.copy(); me.name = name
    bm = bmesh.new(); bm.from_mesh(me)
    for v in bm.verts:
        v.co.x = -v.co.x
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(name, me)
    coll.objects.link(n)
    # custom normals do not survive the flip; rebuild them the same way
    bpy.ops.object.select_all(action='DESELECT')
    n.select_set(True); bpy.context.view_layer.objects.active = n
    md = n.modifiers.new('wn', 'WEIGHTED_NORMAL'); md.keep_sharp = True; md.weight = 60
    bpy.ops.object.modifier_apply(modifier='wn')
    return n


def export_glb(path, objs, jpeg_quality=88):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_image_format='JPEG', export_image_quality=jpeg_quality, export_jpeg_quality=jpeg_quality,
                              export_vertex_color='NONE', export_tangents=False, export_extras=False,
                              export_attributes=True)   # _PAINT_PROTECT
