# Headless Blender bake spike: builds a banked, beveled road segment (the gym
# sweeper) with curbs and a lightmapped building around the EXACT gameplay
# centerline, bakes Cycles lighting+AO into one texture, exports a GLB the
# runtime renders unlit (MeshBasicMaterial) — the MK8 "pay lighting once
# offline" pipeline, proven on one corner before committing to a full pass.
#
# Run: blender -b -P scripts/blender/bake-spike-segment.py
import json
import math
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SEGMENT = os.path.join(ROOT, "tmp", "baked-spike", "segment.json")
OUT_GLB = os.path.join(ROOT, "public", "baked-spike.glb")
BAKE_SIZE = 2048

with open(SEGMENT) as handle:
    data = json.load(handle)
samples = data["samples"]
half = data["roadWidth"] * 0.5

# ---- clean scene -------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Game world: x→x, y(height)→blender z, z→blender -y (GLB exporter flips back
# with +Y up convention). We build in blender coords (x, -z_game, y_game).
def lane_height(s, lane):
    # Superelevation: tilt the deck toward the corner's inside. Outside edge
    # (opposite the curvature sign) rises by up to ~2.2 units.
    bank = max(-1.0, min(1.0, s["curvature"] * 700.0)) * 2.2
    return -lane * bank

def vert(s, lane, lift=0.0):
    x = s["x"] + s["nx"] * lane * half
    z_game = s["z"] + s["nz"] * lane * half
    y = s["y"] + lift + lane_height(s, lane)
    return (x, -z_game, y)

def make_mesh(name, verts, faces, face_colors):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    layer = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="CORNER")
    for poly in mesh.polygons:
        color = face_colors[poly.index]
        for li in poly.loop_indices:
            layer.data[li].color = (*color, 1.0)
    return obj

# ---- road deck (crowned + banked) --------------------------------------------
ASPHALT = (0.058, 0.075, 0.135)
ASPHALT_EDGE = (0.045, 0.058, 0.105)
lanes = [-1.0, -0.86, -0.4, 0.0, 0.4, 0.86, 1.0]
crown = {0.0: 0.34, 0.4: 0.22, -0.4: 0.22, 0.86: 0.06, -0.86: 0.06, 1.0: 0.0, -1.0: 0.0}
verts, faces, colors = [], [], []
for s in samples:
    for lane in lanes:
        verts.append(vert(s, lane, 0.3 + crown[lane]))
cols = len(lanes)
for i in range(len(samples) - 1):
    for j in range(cols - 1):
        a = i * cols + j
        faces.append((a, a + 1, a + cols + 1, a + cols))
        colors.append(ASPHALT_EDGE if j in (0, cols - 2) else ASPHALT)
road = make_mesh("road", verts, faces, colors)

# ---- beveled curbs with red/white stripes -------------------------------------
CURB_RED = (0.86, 0.16, 0.13)
CURB_WHITE = (0.92, 0.95, 1.0)
for side in (-1, 1):
    verts, faces, colors = [], [], []
    profile = [(1.0, 0.0), (1.02, 0.55), (1.06, 0.72), (1.12, 0.72), (1.16, 0.5), (1.16, 0.0)]
    for s in samples:
        for lane_mul, lift in profile:
            verts.append(vert(s, side * lane_mul, 0.3 + lift))
    cols = len(profile)
    for i in range(len(samples) - 1):
        stripe = CURB_RED if (i // 3) % 2 == 0 else CURB_WHITE
        for j in range(cols - 1):
            a = i * cols + j
            if side > 0:
                faces.append((a, a + 1, a + cols + 1, a + cols))
            else:
                faces.append((a, a + cols, a + cols + 1, a + 1))
            colors.append(stripe)
    make_mesh(f"curb{side}", verts, faces, colors)

# ---- ground apron -------------------------------------------------------------
GRASS = (0.10, 0.24, 0.18)
verts, faces, colors = [], [], []
for s in samples:
    for lane in (-3.4, -1.16, 1.16, 3.4):
        verts.append(vert(s, lane, 0.02))
for i in range(len(samples) - 1):
    for j, pair in enumerate(((0, 1), (2, 3))):
        a = i * 4
        b = (i + 1) * 4
        faces.append((a + pair[0], a + pair[1], b + pair[1], b + pair[0]))
        colors.append(GRASS)
make_mesh("apron", verts, faces, colors)

# ---- one neon-district building -----------------------------------------------
BUILDING_BASE = (0.13, 0.30, 0.21)
BUILDING_ROOF = (0.07, 0.10, 0.15)
BUILDING_SIGN = (0.45, 0.95, 0.45)
mid = samples[len(samples) // 2]
bx = mid["x"] + mid["nx"] * -half * 2.6
bz = mid["z"] + mid["nz"] * -half * 2.6
heading = math.atan2(mid["nx"], mid["nz"])
def add_box(name, size, center, color, bevel=1.4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(center[0], -center[2], center[1]))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[2] / 2, size[1] / 2)
    obj.rotation_euler = (0, 0, -heading)
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = 2
    bpy.ops.object.modifier_apply(modifier="bevel")
    mesh = obj.data
    layer = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="CORNER")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            layer.data[li].color = (*color, 1.0)
    return obj

add_box("bldg", (46, 44, 20), (bx, 22, bz), BUILDING_BASE)
add_box("roof", (50, 4, 23), (bx, 46.5, bz), BUILDING_ROOF, bevel=0.9)
add_box("sign", (18, 3, 1.6), (bx, 50.5, bz), BUILDING_SIGN, bevel=0.5)

# ---- join, UV, material -------------------------------------------------------
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = bpy.data.objects["road"]
bpy.ops.object.join()
shell = bpy.context.active_object
shell.name = "baked-spike"
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")

image = bpy.data.images.new("bake", BAKE_SIZE, BAKE_SIZE)
mat = bpy.data.materials.new("baked")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
bsdf = nodes["Principled BSDF"]
attr = nodes.new("ShaderNodeVertexColor")
attr.layer_name = "Col"
links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.7
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
nodes.active = tex
shell.data.materials.clear()
shell.data.materials.append(mat)

# ---- neon-dusk lighting -------------------------------------------------------
world = bpy.data.worlds.new("dusk")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.10, 0.09, 0.28, 1.0)  # navy-purple ambient
bg.inputs[1].default_value = 1.4
sun_data = bpy.data.lights.new("sun", type="SUN")
sun_data.energy = 3.2
sun_data.color = (1.0, 0.62, 0.40)  # low warm dusk sun
sun = bpy.data.objects.new("sun", sun_data)
sun.rotation_euler = (math.radians(64), 0, math.radians(-40))
bpy.context.collection.objects.link(sun)
rim_data = bpy.data.lights.new("rim", type="SUN")
rim_data.energy = 1.1
rim_data.color = (0.31, 0.85, 1.0)  # cyan rim
rim = bpy.data.objects.new("rim", rim_data)
rim.rotation_euler = (math.radians(55), 0, math.radians(140))
bpy.context.collection.objects.link(rim)

# ---- bake ---------------------------------------------------------------------
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = True
scene.render.bake.margin = 6
bpy.ops.object.select_all(action="DESELECT")
shell.select_set(True)
bpy.context.view_layer.objects.active = shell
bpy.ops.object.bake(type="COMBINED")

# ---- rewire to baked texture and export ---------------------------------------
links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 1.0
bpy.ops.object.select_all(action="DESELECT")
shell.select_set(True)
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, use_selection=True, export_format="GLB")
print("BAKE_OK", OUT_GLB)
sys.stdout.flush()
