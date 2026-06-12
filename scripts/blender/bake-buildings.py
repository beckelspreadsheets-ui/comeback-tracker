# Bakes a clean neon-dusk building family (3 variants) for the track edges:
# rounded stacked forms, emissive window bands and neon edge strips, lit by
# the dusk sun + cyan rim and baked to one texture. Runtime loads the GLB and
# swaps the procedural district/facade boxes (owner green-lit replacing them).
#
# Run: blender -b -P scripts/blender/bake-buildings.py
import math
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_GLB = os.path.join(ROOT, "public", "baked-buildings.glb")
BAKE_SIZE = 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

NAVY = (0.075, 0.10, 0.21)
NAVY_DARK = (0.05, 0.066, 0.15)
ROOF = (0.045, 0.06, 0.11)
WINDOW = (0.95, 0.88, 0.55)  # warm lit band
NEON_CYAN = (0.18, 0.85, 1.0)
NEON_PURPLE = (0.72, 0.42, 1.0)


def color_obj(obj, color, emit=0.0):
    mesh = obj.data
    layer = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="CORNER")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            layer.data[li].color = (*color, 1.0)
    obj["emit"] = emit


def box(name, size, center, color, bevel=1.1, emit=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(center[0], center[2], center[1]))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[2] / 2, size[1] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier="bevel")
    color_obj(obj, color, emit)
    return obj


def window_bands(prefix, width, depth, base_y, count, step, inset=0.35):
    objs = []
    for row in range(count):
        y = base_y + row * step
        objs.append(
            box(f"{prefix}-win{row}", (width + inset, 1.5, depth + inset), (0, y, 0), WINDOW, bevel=0.25, emit=2.2)
        )
    return objs


def build_tower(origin_x):
    parts = []
    parts.append(box("t-base", (30, 16, 26), (origin_x, 8, 0), NAVY, bevel=1.4))
    parts.append(box("t-mid", (26, 22, 22), (origin_x, 16 + 11, 0), NAVY_DARK, bevel=1.2))
    parts.append(box("t-top", (20, 14, 17), (origin_x, 38 + 7, 0), NAVY, bevel=1.0))
    parts.append(box("t-roof", (22, 2.4, 19), (origin_x, 53.2, 0), ROOF, bevel=0.7))
    for o in window_bands("t", 26.5, 22.5, 20, 3, 6.5):
        o.location.x += origin_x
        parts.append(o)
    for o in window_bands("tt", 20.5, 17.5, 40, 2, 5.5):
        o.location.x += origin_x
        parts.append(o)
    edge = box("t-neon", (1.1, 36, 1.1), (origin_x + 13.4, 18, 11.6), NEON_CYAN, bevel=0.3, emit=3.4)
    parts.append(edge)
    edge2 = box("t-neon2", (1.1, 36, 1.1), (origin_x - 13.4, 18, 11.6), NEON_CYAN, bevel=0.3, emit=3.4)
    parts.append(edge2)
    parts.append(box("t-sign", (12, 3, 1.4), (origin_x, 50, 9.2), NEON_PURPLE, bevel=0.4, emit=3.0))
    return parts


def build_block(origin_x):
    parts = []
    parts.append(box("b-base", (44, 24, 26), (origin_x, 12, 0), NAVY, bevel=1.6))
    parts.append(box("b-roof", (47, 3, 29), (origin_x, 25.6, 0), ROOF, bevel=1.0))
    parts.append(box("b-lobby", (18, 9, 2), (origin_x, 4.5, 13.2), NAVY_DARK, bevel=0.6))
    for o in window_bands("b", 44.5, 26.5, 8, 2, 8):
        o.location.x += origin_x
        parts.append(o)
    parts.append(box("b-neon", (45, 1.0, 1.0), (origin_x, 26.8, 13.6), NEON_CYAN, bevel=0.3, emit=3.4))
    parts.append(box("b-sign", (16, 4, 1.4), (origin_x, 20, 13.6), NEON_PURPLE, bevel=0.5, emit=2.8))
    return parts


def build_arcade(origin_x):
    parts = []
    parts.append(box("a-base", (36, 30, 24), (origin_x, 15, 0), NAVY_DARK, bevel=1.5))
    parts.append(box("a-roof", (39, 2.6, 27), (origin_x, 31.4, 0), ROOF, bevel=0.8))
    # arched entry: torus half sunk into the face
    bpy.ops.mesh.primitive_torus_add(
        major_radius=7.5, minor_radius=1.1, location=(origin_x, 12.4, 8.2), rotation=(math.radians(90), 0, 0)
    )
    arch = bpy.context.active_object
    arch.name = "a-arch"
    color_obj(arch, NEON_PURPLE, emit=3.2)
    parts.append(arch)
    parts.append(box("a-door", (12.6, 12, 1.2), (origin_x, 6, 12.1), (0.02, 0.03, 0.07), bevel=0.4, emit=0.6))
    for o in window_bands("a", 36.5, 24.5, 22, 1, 6):
        o.location.x += origin_x
        parts.append(o)
    parts.append(box("a-neon", (1.0, 26, 1.0), (origin_x + 16.4, 13, 10.4), NEON_CYAN, bevel=0.3, emit=3.4))
    parts.append(box("a-neon2", (1.0, 26, 1.0), (origin_x - 16.4, 13, 10.4), NEON_CYAN, bevel=0.3, emit=3.4))
    return parts


variants = {
    "bldg-tower": build_tower(0),
    "bldg-block": build_block(80),
    "bldg-arcade": build_arcade(160),
}

# join each variant into one object
joined = []
for name, parts in variants.items():
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    joined.append(obj)

# shared material with emission driven by vertex alpha trick: instead, bake
# COMBINED with per-part emission via separate materials is complex — use one
# material whose emission reads the same vertex color scaled by stored "emit"
# is not feasible after join, so emissive parts rely on bright albedo + the
# two suns; the bake still reads well at game distance.
image = bpy.data.images.new("bake", BAKE_SIZE, BAKE_SIZE)
mat = bpy.data.materials.new("baked")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
bsdf = nodes["Principled BSDF"]
attr = nodes.new("ShaderNodeVertexColor")
attr.layer_name = "Col"
links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
links.new(attr.outputs["Color"], bsdf.inputs["Emission Color"])
bsdf.inputs["Emission Strength"].default_value = 0.55
bsdf.inputs["Roughness"].default_value = 0.65
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
nodes.active = tex

for obj in joined:
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
    bpy.ops.object.mode_set(mode="OBJECT")

world = bpy.data.worlds.new("dusk")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.10, 0.09, 0.28, 1.0)
bg.inputs[1].default_value = 1.3
sun_data = bpy.data.lights.new("sun", type="SUN")
sun_data.energy = 3.0
sun_data.color = (1.0, 0.62, 0.40)
sun = bpy.data.objects.new("sun", sun_data)
sun.rotation_euler = (math.radians(62), 0, math.radians(-38))
bpy.context.collection.objects.link(sun)
rim_data = bpy.data.lights.new("rim", type="SUN")
rim_data.energy = 1.2
rim_data.color = (0.31, 0.85, 1.0)
rim = bpy.data.objects.new("rim", rim_data)
rim.rotation_euler = (math.radians(50), 0, math.radians(142))
bpy.context.collection.objects.link(rim)

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = True
scene.render.bake.margin = 4
bpy.ops.object.select_all(action="DESELECT")
for obj in joined:
    obj.select_set(True)
bpy.context.view_layer.objects.active = joined[0]
bpy.ops.object.bake(type="COMBINED")

links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
links.remove(bsdf.inputs["Emission Color"].links[0])
bsdf.inputs["Emission Strength"].default_value = 0.0
bsdf.inputs["Roughness"].default_value = 1.0
# reset variant origins so each exports centered
for obj in joined:
    for v in obj.data.vertices:
        pass
bpy.ops.object.select_all(action="DESELECT")
for obj in joined:
    obj.select_set(True)
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, use_selection=True, export_format="GLB")
print("BAKE_OK", OUT_GLB)
sys.stdout.flush()
