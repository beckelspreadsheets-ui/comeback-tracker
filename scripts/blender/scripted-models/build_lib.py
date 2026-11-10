import bpy, bmesh, math, mathutils
V=mathutils.Vector
_mats={}
def mat(name,color,rough=0.5,metal=0.0,emit=0.0):
    if name in _mats: return _mats[name]
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*color,1)
    b.inputs['Roughness'].default_value=rough
    b.inputs['Metallic'].default_value=metal
    if emit>0:
        b.inputs['Emission Color'].default_value=(*color,1)
        b.inputs['Emission Strength'].default_value=emit
    _mats[name]=m; return m
def _obj(name,bm,material,smooth=True,bevel=0.0,angle=35):
    me=bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(material)
    if bevel>0:
        md=o.modifiers.new('bev','BEVEL'); md.width=bevel; md.segments=1; md.limit_method='ANGLE'; md.angle_limit=math.radians(30)
    if smooth:
        for p in me.polygons: p.use_smooth=True
        md=o.modifiers.new('wn','WEIGHTED_NORMAL'); md.keep_sharp=True
        try:
            # sharp edges by angle
            bm2=bmesh.new(); bm2.from_mesh(me)
            for e in bm2.edges:
                if len(e.link_faces)==2 and e.calc_face_angle()>math.radians(angle): e.smooth=False
            bm2.to_mesh(me); bm2.free()
        except Exception as ex: print('sharp fail',ex)
    return o
def loft(name,material,sections,yc=0.0,bevel=0.006,smooth=False):
    """sections: (x, half_w, z_bottom, z_top, chamfer[, yc override])"""
    bm=bmesh.new(); rings=[]
    for s in sections:
        x,w,zb,zt,ch=s[:5]; c=s[5] if len(s)>5 else yc
        pts=[(-w,zb),(-w,zt-ch),(-w+ch,zt),(w-ch,zt),(w,zt-ch),(w,zb)]
        rings.append([bm.verts.new((x,c+y,z)) for y,z in pts])
    for a,b in zip(rings,rings[1:]):
        n=len(a)
        for i in range(n):
            bm.faces.new((a[i],a[(i+1)%n],b[(i+1)%n],b[i]))
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    return _obj(name,bm,material,smooth=smooth,bevel=bevel)
def cube(name,material,loc,size,rot=(0,0,0),bevel=0.006,taper=None):
    bm=bmesh.new(); bmesh.ops.create_cube(bm,size=1.0)
    for v in bm.verts:
        v.co.x*=size[0]; v.co.y*=size[1]; v.co.z*=size[2]
        if taper and v.co.z>0: v.co.x*=taper[0]; v.co.y*=taper[1]
    o=_obj(name,bm,material,smooth=False,bevel=bevel)
    o.location=loc; o.rotation_euler=rot; return o
def tube(name,material,points,radius,sides=6,bevel=0.0,closed=False,ref=None,flat=1.0):
    bm=bmesh.new(); rings=[]; pts=[V(p) for p in points]; n=len(pts)
    for i,p in enumerate(pts):
        if closed: t=(pts[(i+1)%n]-pts[i-1]).normalized()
        elif i==0: t=(pts[1]-p).normalized()
        elif i==n-1: t=(p-pts[i-1]).normalized()
        else: t=((pts[i+1]-p).normalized()+(p-pts[i-1]).normalized()).normalized()
        rf=V(ref) if ref else (V((0,1,0)) if abs(t.y)<0.9 else V((1,0,0)))
        w=(rf-t*rf.dot(t)).normalized(); u=w.cross(t).normalized()
        rings.append([bm.verts.new(p+(u*math.cos(a)+w*math.sin(a)*flat)*radius) for a in [2*math.pi*k/sides+math.pi/sides for k in range(sides)]])
    pairs=list(zip(rings,rings[1:]))+([(rings[-1],rings[0])] if closed else [])
    for a,b in pairs:
        for i in range(sides): bm.faces.new((a[i],a[(i+1)%sides],b[(i+1)%sides],b[i]))
    if not closed: bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    return _obj(name,bm,material,smooth=sides>6,bevel=bevel)
def lathe_x(name,material,profile,segs=20,smooth=True,caps=True):
    """profile: list of (x, r) revolved around the X axis."""
    bm=bmesh.new(); rings=[]
    for x,r in profile:
        rings.append([bm.verts.new((x,r*math.cos(2*math.pi*k/segs),r*math.sin(2*math.pi*k/segs))) for k in range(segs)])
    for a,b in zip(rings,rings[1:]):
        for i in range(segs): bm.faces.new((a[i],a[(i+1)%segs],b[(i+1)%segs],b[i]))
    if caps and profile[0][1]>1e-6: bm.faces.new(rings[0])
    if caps and profile[-1][1]>1e-6: bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-6)
    return _obj(name,bm,material,smooth=smooth,angle=28)
def blob(name,material,loc,scale,rot=(0,0,0),sub=3):
    bm=bmesh.new(); bmesh.ops.create_icosphere(bm,subdivisions=sub,radius=1.0)
    o=_obj(name,bm,material,smooth=True,angle=80)
    o.location=loc; o.scale=scale; o.rotation_euler=rot; return o
def arc_band(name,material,center,radius,z0,z1,a0,a1,thick,segs=16,radius_top=None,bevel=0.004):
    """band wrapped round a vertical axis from angle a0..a1 (deg, 0 = +X)."""
    rt=radius_top if radius_top is not None else radius
    bm=bmesh.new(); rings=[]
    for k in range(segs+1):
        a=math.radians(a0+(a1-a0)*k/segs); c,s=math.cos(a),math.sin(a)
        rings.append([bm.verts.new((center[0]+r*c,center[1]+r*s,z)) for r,z in ((radius,z0),(radius+thick,z0),(rt+thick,z1),(rt,z1))])
    full=abs(a1-a0)>=360
    for a,b in zip(rings,rings[1:]):
        for i in range(4): bm.faces.new((a[i],a[(i+1)%4],b[(i+1)%4],b[i]))
    if not full: bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    else: bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-6)
    return _obj(name,bm,material,smooth=True,bevel=bevel,angle=40)
def join(objs,name):
    bpy.ops.object.select_all(action='DESELECT')
    dg=bpy.context.evaluated_depsgraph_get()
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.convert(target='MESH')  # applies modifiers
    bpy.ops.object.join()
    o=bpy.context.view_layer.objects.active; o.name=name; o.data.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return o
def export_glb(path,objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
