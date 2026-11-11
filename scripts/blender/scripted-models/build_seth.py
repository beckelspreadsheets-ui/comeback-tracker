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
ORG=mat('seth_orange',(0.78,0.15,0.008),0.6)
BEAK=mat('seth_beak',(0.90,0.30,0.012),0.5)
BLK=mat('seth_black',(0.02,0.02,0.024),0.6)
CHAR=mat('seth_charcoal',(0.035,0.036,0.042),0.8)
CYN=mat('seth_visor',(0.03,0.50,0.80),0.2,emit=0.7)
P=[]
HC=(0.0,0.0,0.72)   # head centre
FC=(0.06,0.0,0.70)  # face centre: the white mask is a ball pushed out of the front
# head: a big round hood, wider than it is deep
P.append(blob('head',NAVY,HC,(0.30,0.32,0.305)))
# white face: shows where it clears the head, a disc about 0.26 across; the
# navy widow's peak splits its top into two lobes
P.append(blob('face',WHT,FC,(0.275,0.275,0.278)))
P.append(blob('peak',NAVY,(0.25,0,0.885),(0.135,0.055,0.024),rot=(0,0.96,0),sub=2))
# goggles: ski-goggle block across the middle of the face, chunky black
# frame, inset cyan lens, strap round the back of the head
P.append(arc_band('goggle_frame',BLK,FC,0.270,0.625,0.775,-48,48,0.05,segs=14,bevel=0.014))
P.append(arc_band('goggle_lens',CYN,FC,0.308,0.655,0.75,-38,38,0.018,segs=14,bevel=0.004))
P.append(arc_band('goggle_strap',BLK,HC,0.305,0.68,0.73,38,322,0.02,segs=20,bevel=0.004))
# beak: short and wide, tucked under the goggles
bk=lathe_x('beak',BEAK,[(0,0.062),(0.05,0.052),(0.12,0.0)],segs=10)
bk.scale=(1,1.3,0.72); bk.location=(0.305,0,0.598); bk.rotation_euler=(0,0.25,0); P.append(bk)
# collar: a thick charcoal scarf, wider than the neck
P.append(blob('collar',CHAR,(-0.005,0,0.482),(0.295,0.33,0.085)))
P.append(blob('collar_back',CHAR,(-0.12,0,0.52),(0.20,0.27,0.09),sub=2))
P.append(blob('collar_front',CHAR,(0.20,0.0,0.462),(0.10,0.17,0.07),sub=2))
# jacket: one smooth orange torso, black hem, black zip placket
P.append(blob('jacket',ORG,(-0.005,0,0.33),(0.27,0.335,0.19)))
P.append(blob('jacket_lower',ORG,(0.0,0,0.255),(0.265,0.32,0.13)))
P.append(blob('hem',BLK,(0.0,0,0.185),(0.272,0.325,0.045)))
P.append(cube('zip',BLK,(0.255,0,0.315),(0.03,0.05,0.23),rot=(0,0.12,0),bevel=0.006))
P.append(cube('zip_pull',WHT,(0.275,0,0.40),(0.012,0.022,0.04),bevel=0.004))
# shoulder patch (his right shoulder)
P.append(cube('patch',CYN,(0.085,-0.385,0.385),(0.07,0.02,0.065),rot=(0.35,0,0.3),bevel=0.006))
P.append(cube('patch_frame',WHT,(0.083,-0.378,0.385),(0.086,0.02,0.08),rot=(0.35,0,0.3),bevel=0.006))
# arms: orange shoulder and sleeve, black cuff, big navy mitt held out in front
for s in (-1,1):
    P.append(blob('shoulder',ORG,(0.0,s*0.295,0.385),(0.135,0.115,0.115),sub=2))
    P.append(blob('sleeve',ORG,(0.10,s*0.30,0.335),(0.14,0.098,0.105),rot=(0,0.3,s*-0.3),sub=2))
    P.append(blob('cuff',BLK,(0.175,s*0.265,0.315),(0.07,0.10,0.108),rot=(0,0.3,s*-0.3),sub=2))
    P.append(blob('mitt',NAVY,(0.25,s*0.235,0.31),(0.105,0.095,0.11),rot=(0,0.2,s*-0.3),sub=2))
# seat / hips, legs and wide flipper feet turned up at the toes
P.append(blob('hips',NAVY,(-0.02,0,0.13),(0.27,0.30,0.135)))
P.append(blob('belly',WHT,(0.185,0,0.14),(0.10,0.10,0.09),sub=2))
for s in (-1,1):
    P.append(blob('leg',NAVY,(0.19,s*0.16,0.105),(0.19,0.115,0.105),sub=2))
    P.append(blob('foot',BEAK,(0.375,s*0.175,0.11),(0.05,0.11,0.13),rot=(0,0.5,s*0.15),sub=2))
body=bake_colours(join(P,'seth_penguin'))
# normalise: feet on the ground, height 1.0, centred like the current GLB
mn,mx=bounds([body]); h=mx.z-mn.z
for v in body.data.vertices:
    v.co.x=(v.co.x-(mn.x+mx.x)/2)/h; v.co.y=(v.co.y-(mn.y+mx.y)/2)/h; v.co.z=(v.co.z-mn.z)/h
bpy.context.view_layer.update()
mn,mx=bounds([body]); print('BOUNDS',[round(v,3) for v in mn],[round(v,3) for v in mx]); print('TRIS',tri_count([body]))
export_glb(out_glb,[body])
render_angles(prefix,[body],(0,-1))
