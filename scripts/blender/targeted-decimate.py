import argparse
import json
import math
import sys

import bpy


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--target-triangles", type=int, required=True)
    parser.add_argument("--remove-doubles-threshold", type=float, default=0.0001)
    parser.add_argument("--dissolve-angle-degrees", type=float, default=0)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def count_polygons(objects):
    return sum(len(obj.data.polygons) for obj in objects)


def apply_remove_doubles(obj, threshold):
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=threshold)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def apply_modifier(obj, modifier):
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def apply_planar_dissolve(obj, angle_degrees):
    if angle_degrees <= 0:
        return
    modifier = obj.modifiers.new(name="pipeline-planar-dissolve", type="DECIMATE")
    modifier.decimate_type = "DISSOLVE"
    modifier.angle_limit = math.radians(angle_degrees)
    apply_modifier(obj, modifier)


def apply_collapse(obj, ratio):
    modifier = obj.modifiers.new(name="pipeline-target-collapse", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = max(0.001, min(1.0, ratio))
    modifier.use_collapse_triangulate = True
    apply_modifier(obj, modifier)


def main():
    args = parse_args()
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=args.input)
    objects = mesh_objects()
    if not objects:
        raise RuntimeError("No mesh objects were imported")

    before_polygons = count_polygons(objects)
    for obj in objects:
        apply_remove_doubles(obj, args.remove_doubles_threshold)
        apply_planar_dissolve(obj, args.dissolve_angle_degrees)

    after_cleanup_polygons = count_polygons(objects)
    ratio = args.target_triangles / max(1, after_cleanup_polygons)
    if ratio < 1:
        for obj in objects:
            apply_collapse(obj, ratio)

    after_decimate_polygons = count_polygons(objects)
    bpy.ops.export_scene.gltf(filepath=args.output, export_format="GLB", use_visible=True)

    print(json.dumps({
        "input": args.input,
        "output": args.output,
        "targetTriangles": args.target_triangles,
        "removeDoublesThreshold": args.remove_doubles_threshold,
        "dissolveAngleDegrees": args.dissolve_angle_degrees,
        "beforePolygons": before_polygons,
        "afterCleanupPolygons": after_cleanup_polygons,
        "collapseRatio": ratio,
        "afterDecimatePolygons": after_decimate_polygons,
        "blenderVersion": bpy.app.version_string,
    }))


if __name__ == "__main__":
    main()
