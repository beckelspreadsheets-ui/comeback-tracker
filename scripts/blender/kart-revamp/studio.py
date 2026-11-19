# One fixed studio (camera, lights, ground) so every kart is judged in the
# same picture. Karts are normalised to length 1 with the nose on +X before
# rendering, so the camera never moves between models.
import bpy, math
import numpy as np
from mathutils import Vector

VIEWS = (('front34', 38, 0.36), ('side', 90, 0.14), ('rear34', 145, 0.36))


def setup(res=(800, 600), samples=32):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    try:
        sc.eevee.taa_render_samples = samples
        sc.eevee.use_shadows = True
        sc.eevee.use_raytracing = True
    except Exception as ex:
        print('eevee opt', ex)
    w = bpy.data.worlds.new('studio'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.60, 0.66, 0.78, 1); bg.inputs[1].default_value = 0.85
    sc.view_settings.view_transform = 'Standard'
    return sc


def _look(obj, direction):
    obj.rotation_euler = Vector(direction).to_track_quat('Z', 'Y').to_euler()


def add_rig(label=None):
    """ground, camera, key/fill/rim. Returns (camera, lights)."""
    sc = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    g = bpy.context.object; g.name = 'studio_ground'
    m = bpy.data.materials.new('studio_ground'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.36, 0.39, 0.45, 1); b.inputs['Roughness'].default_value = 0.85
    g.data.materials.append(m)
    cam = bpy.data.objects.new('studio_cam', bpy.data.cameras.new('studio_cam'))
    sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 60
    lights = []
    for name, energy, size in (('key', 3.6, 0.25), ('fill', 1.1, 0.6), ('rim', 2.2, 0.3)):
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
        sc.collection.objects.link(l); l.data.energy = energy; l.data.angle = size
        lights.append(l)
    lights[0].data.color = (1.0, 0.96, 0.9); lights[2].data.color = (0.75, 0.9, 1.0)
    if label:
        bpy.ops.object.text_add()
        t = bpy.context.object; t.name = 'studio_label'; t.data.body = label; t.data.size = 0.026
        tm = bpy.data.materials.new('studio_label'); tm.use_nodes = True
        nt = tm.node_tree; nt.nodes.clear()
        o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission')
        e.inputs[0].default_value = (1, 1, 1, 1); e.inputs[1].default_value = 1.0
        nt.links.new(e.outputs[0], o.inputs[0]); t.data.materials.append(tm)
        t.parent = cam; t.location = (-0.285, -0.205, -1.0)
        t.visible_shadow = False
    return cam, lights


def aim(cam, lights, view, centre=(0, 0, 0.17), dist=2.25):
    name, off, elev = view
    a = math.radians(off)
    c = Vector(centre)
    d = Vector((math.cos(a) * math.cos(elev), math.sin(a) * math.cos(elev), math.sin(elev)))
    cam.location = c + d * dist
    _look(cam, cam.location - c)
    for l, da, e in ((lights[0], a + 0.75, 0.95), (lights[1], a - 0.9, 0.4), (lights[2], a + 2.6, 0.5)):
        _look(l, (math.cos(da) * math.cos(e), math.sin(da) * math.cos(e), math.sin(e)))


def render(path):
    sc = bpy.context.scene
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def hstack(paths, out, quality=90, width=None):
    """side-by-side strip of equally sized PNGs, saved as JPEG"""
    arrs = []
    for p in paths:
        im = bpy.data.images.load(p)
        w, h = im.size
        a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a)
        arrs.append(a.reshape(h, w, 4)); bpy.data.images.remove(im)
    gap = np.ones((arrs[0].shape[0], 6, 4), dtype=np.float32)
    parts = []
    for i, a in enumerate(arrs):
        if i:
            parts.append(gap)
        parts.append(a)
    full = np.concatenate(parts, axis=1)
    h, w = full.shape[:2]
    im = bpy.data.images.new('strip', w, h, alpha=False)
    im.pixels.foreach_set(full.ravel())
    if width and width < w:
        im.scale(width, int(h * width / w))
    sc = bpy.context.scene
    s = sc.render.image_settings
    s.file_format = 'JPEG'; s.quality = quality; s.color_mode = 'RGB'
    old = sc.view_settings.view_transform
    sc.view_settings.view_transform = 'Standard'
    im.save_render(out, scene=sc)
    sc.view_settings.view_transform = old
    bpy.data.images.remove(im)
