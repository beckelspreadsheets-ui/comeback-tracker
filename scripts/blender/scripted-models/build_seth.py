# Seth Penguin, seated, built from scratch by script. No imported meshes, no textures.
# Blender axes: he faces +X, +Z up. Normalised to height 1.0 like the current GLB.
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from build_lib import *
from render_lib import *
out_glb,prefix=sys.argv[-2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
setup_scene()
NAVY=mat('seth_navy',(0.012,0.016,0.035),0.75)
WHT=mat('seth_white',(0.88,0.89,0.9),0.7)
ORG=mat('seth_orange',(0.95,0.27,0.01),0.6)
BEAK=mat('seth_beak',(1.0,0.42,0.02),0.5)
BLK=mat('seth_black',(0.02,0.02,0.024),0.6)
CYN=mat('seth_visor',(0.02,0.62,0.95),0.2,emit=0.7)
P=[]
HC=(0.0,0.0,0.70)   # head centre
# head: a big hood-like dome, slightly taller than wide
P.append(blob('head',NAVY,HC,(0.285,0.30,0.30)))
# white face: a mask pushed through the front of the head, split at the top
# by a navy widow's peak
P.append(blob('face',WHT,(0.05,0,0.668),(0.268,0.25,0.262)))
P.append(blob('peak',NAVY,(0.20,0,0.885),(0.085,0.05,0.075),rot=(0,0.5,0),sub=2))
# goggles: black frame band, cyan lens, strap round the back
P.append(arc_band('goggle_frame',BLK,(0.02,0,0.70),0.285,0.66,0.785,-66,66,0.04,segs=14,bevel=0.01))
P.append(arc_band('goggle_lens',CYN,(0.02,0,0.70),0.312,0.684,0.762,-52,52,0.02,segs=14,bevel=0.004))
P.append(arc_band('goggle_strap',BLK,HC,0.274,0.695,0.75,65,295,0.022,segs=18,bevel=0.004))
# beak: a short wedge, pointing forward and a little down
bk=lathe_x('beak',BEAK,[(0,0.058),(0.05,0.05),(0.115,0.0)],segs=10)
bk.scale=(1,1.25,0.7); bk.location=(0.275,0,0.615); bk.rotation_euler=(0,0.22,0); P.append(bk)
# collar: a puffy black scarf
P.append(blob('collar',BLK,(-0.005,0,0.452),(0.25,0.275,0.072)))
P.append(blob('collar_knot',BLK,(0.20,0.0,0.44),(0.07,0.10,0.06),sub=2))
# jacket: orange puffer torso, with a hem band and a zip
P.append(blob('jacket',ORG,(-0.01,0,0.325),(0.255,0.315,0.185)))
P.append(blob('jacket_lower',ORG,(0.0,0,0.25),(0.25,0.30,0.14)))
P.append(blob('hem',BLK,(0.0,0,0.178),(0.262,0.305,0.05)))
P.append(cube('zip',BLK,(0.243,0,0.30),(0.02,0.022,0.21),rot=(0,0.12,0),bevel=0.004))
P.append(cube('zip_pull',WHT,(0.262,0,0.385),(0.012,0.03,0.04),bevel=0.004))
# shoulder patch (his right shoulder)
P.append(cube('patch',CYN,(0.10,-0.362,0.36),(0.075,0.02,0.07),rot=(0.2,0,0.35),bevel=0.006))
P.append(cube('patch_frame',BLK,(0.098,-0.355,0.36),(0.092,0.02,0.086),rot=(0.2,0,0.35),bevel=0.006))
# arms: orange sleeve, black cuff, navy mitt held out in front
for s in (-1,1):
    P.append(blob('sleeve',ORG,(0.07,s*0.285,0.335),(0.13,0.085,0.10),rot=(0,0.25,s*-0.35),sub=2))
    P.append(blob('cuff',BLK,(0.165,s*0.235,0.30),(0.065,0.078,0.088),rot=(0,0.25,s*-0.35),sub=2))
    P.append(blob('mitt',NAVY,(0.225,s*0.205,0.305),(0.085,0.075,0.095),rot=(0,0.2,s*-0.3),sub=2))
# seat / hips and legs
P.append(blob('hips',NAVY,(-0.02,0,0.13),(0.265,0.29,0.135)))
P.append(blob('belly',WHT,(0.17,0,0.135),(0.10,0.105,0.085),sub=2))
for s in (-1,1):
    P.append(blob('leg',NAVY,(0.17,s*0.15,0.10),(0.16,0.10,0.10),sub=2))
    P.append(cube('foot',BEAK,(0.325,s*0.155,0.105),(0.075,0.135,0.185),rot=(0,0.12,s*0.12),bevel=0.03,taper=(0.75,0.9)))
body=join(P,'seth_penguin')
# normalise: feet on the ground, height 1.0, centred like the current GLB
mn,mx=bounds([body]); h=mx.z-mn.z
for v in body.data.vertices:
    v.co.x=(v.co.x-(mn.x+mx.x)/2)/h; v.co.y=(v.co.y-(mn.y+mx.y)/2)/h; v.co.z=(v.co.z-mn.z)/h
bpy.context.view_layer.update()
mn,mx=bounds([body]); print('BOUNDS',[round(v,3) for v in mn],[round(v,3) for v in mx]); print('TRIS',tri_count([body]))
export_glb(out_glb,[body])
render_angles(prefix,[body],(0,-1))
