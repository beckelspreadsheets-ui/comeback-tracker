# Side-by-side proof renders: any number of kart GLBs in one fixed studio.
#
#   blender -b -P render_compare.py -- <out prefix> <label>=<file.glb>:<nose>[:<file to take the size from>] [...]
#
# <nose> is the way the model's front points in its own file: +x or -x
# (glTF axes). Each kart is scaled to length 1, put on the ground and turned
# nose to +X, then rendered from the same three cameras under the same lights.
# Writes <prefix>-front34.jpg, -side.jpg, -rear34.jpg (one strip per view).
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import studio
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
prefix = os.path.abspath(argv[0])
karts = []
for a in argv[1:]:
    # optional third field: the file whose size goes on the label (the shipped
    # file, when the one rendered is a decoded copy)
    label, rest = a.split('=', 1)
    fields = rest.split(':')
    path, nose = fields[0], fields[1]
    karts.append((label, os.path.abspath(path), nose, os.path.abspath(fields[2] if len(fields) > 2 else path)))
tmp = prefix + '-tmp'
shots = {v[0]: [] for v in studio.VIEWS}
for i, (label, path, nose, sized) in enumerate(karts):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    studio.setup()
    bpy.ops.import_scene.gltf(filepath=path)
    objs = list(bpy.context.scene.objects)
    root = bpy.data.objects.new('norm', None); bpy.context.scene.collection.objects.link(root)
    for o in objs:
        if o.parent is None:
            o.parent = root
    # glTF -X is Blender -X; a kart with its nose on -X is turned half a turn
    root.rotation_euler = (0, 0, math.pi if nose == '-x' else 0.0)
    bpy.context.view_layer.update()
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3); tris = 0
    for o in objs:
        if o.type != 'MESH':
            continue
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            for k in range(3):
                mn[k] = min(mn[k], w[k]); mx[k] = max(mx[k], w[k])
    scale = 1.0 / (mx.x - mn.x)
    c = (mn + mx) / 2
    root.scale = (scale,) * 3
    root.location = (-c.x * scale, -c.y * scale, -mn.z * scale)
    print('KART', label, 'tris', tris, 'size', [round(v, 3) for v in (mx - mn) * scale], 'bytes', os.path.getsize(sized))
    cam, lights = studio.add_rig(label=f'{label}   {tris:,} tris   {os.path.getsize(sized) // 1024} KB')
    for view in studio.VIEWS:
        studio.aim(cam, lights, view)
        p = f'{tmp}-{i}-{view[0]}.png'
        studio.render(p); shots[view[0]].append(p)
for name, paths in shots.items():
    studio.hstack(paths, f'{prefix}-{name}.jpg', width=int(os.environ.get('COMPARE_WIDTH', '2400')))
    for p in paths:
        os.remove(p)
