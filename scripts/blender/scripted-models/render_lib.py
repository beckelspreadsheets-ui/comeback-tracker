import bpy, math, mathutils
def setup_scene(res=(900,675)):
    sc=bpy.context.scene
    sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x,sc.render.resolution_y=res
    sc.render.film_transparent=False
    w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True
    bg=w.node_tree.nodes['Background']; bg.inputs[0].default_value=(0.55,0.58,0.62,1); bg.inputs[1].default_value=0.9
    sc.view_settings.view_transform='Standard'
    return sc
def bounds(objs):
    mn=mathutils.Vector((1e9,)*3); mx=mathutils.Vector((-1e9,)*3)
    for o in objs:
        if o.type!='MESH': continue
        for c in o.bound_box:
            v=o.matrix_world@mathutils.Vector(c)
            for i in range(3): mn[i]=min(mn[i],v[i]); mx[i]=max(mx[i],v[i])
    return mn,mx
def render_angles(prefix, objs, nose_dir, angles=None):
    """nose_dir: unit XY vector the model's front points to (Blender coords)."""
    sc=bpy.context.scene
    mn,mx=bounds(objs); c=(mn+mx)/2; size=(mx-mn).length
    # ground
    bpy.ops.mesh.primitive_plane_add(size=size*20, location=(c.x,c.y,mn.z))
    g=bpy.context.object; m=bpy.data.materials.new('ground'); m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(0.5,0.53,0.57,1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=0.9
    g.data.materials.append(m)
    base=math.atan2(nose_dir[1],nose_dir[0])
    cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
    cam.data.lens=60
    def light(name,ang,elev,energy):
        l=bpy.data.objects.new(name,bpy.data.lights.new(name,'SUN')); sc.collection.objects.link(l)
        l.data.energy=energy; l.data.angle=0.3
        d=mathutils.Vector((math.cos(ang)*math.cos(elev),math.sin(ang)*math.cos(elev),math.sin(elev)))
        l.rotation_euler=d.to_track_quat('Z','Y').to_euler()
        return l
    key=light('key',0,0.9,3.2); fill=light('fill',0,0.4,1.0)
    for name,off,elev in (angles or [('front34',math.radians(38),0.38),('side',math.radians(90),0.16),('rear34',math.radians(145),0.38)]):
        a=base+off
        d=mathutils.Vector((math.cos(a)*math.cos(elev),math.sin(a)*math.cos(elev),math.sin(elev)))
        cam.location=c+d*size*2.1
        cam.rotation_euler=(cam.location-c).to_track_quat('Z','Y').to_euler()
        for l,da,e in ((key,a+0.7,0.9),(fill,a-0.9,0.35)):
            dd=mathutils.Vector((math.cos(da)*math.cos(e),math.sin(da)*math.cos(e),math.sin(e)))
            l.rotation_euler=dd.to_track_quat('Z','Y').to_euler()
        sc.render.filepath=f'{prefix}-{name}.png'
        bpy.ops.render.render(write_still=True)
def tri_count(objs):
    n=0
    dg=bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type!='MESH': continue
        me=o.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); n+=len(me.loop_triangles)
    return n
