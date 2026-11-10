import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from render_lib import *
src,prefix,nx,ny=sys.argv[-4:]
bpy.ops.wm.read_factory_settings(use_empty=True)
setup_scene()
bpy.ops.import_scene.gltf(filepath=src)
objs=[o for o in bpy.context.scene.objects]
for o in objs:
    print('NODE',o.name,o.type,o.parent.name if o.parent else None,[round(x,3) for x in o.location],[round(x,3) for x in o.scale])
    if o.type=='MESH':
        print('  mats',[m.name for m in o.data.materials],'verts',len(o.data.vertices), 'vgroups',len(o.vertex_groups))
        for m in o.data.materials:
            if m and m.use_nodes:
                for n in m.node_tree.nodes:
                    if n.type=='TEX_IMAGE' and n.image: print('  tex',n.image.name,n.image.size[:])
mn,mx=bounds(objs); print('BOUNDS',[round(x,3) for x in mn],[round(x,3) for x in mx]); print('TRIS',tri_count(objs))
print('ANIMS',[a.name for a in bpy.data.actions])
render_angles(prefix,objs,(float(nx),float(ny)))
