# CRRT Bunny, seated, built from scratch by script. No imported meshes, no textures.
# Blender axes: faces +X, +Z up. Normalised to height 1.0 (ear tips), feet at 0.
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from build_lib import *
from render_lib import *
out_glb,prefix=sys.argv[-2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
setup_scene()
BLK=mat('bunny_black',(0.022,0.022,0.024),0.8)
WHT=mat('bunny_white',(0.90,0.90,0.90),0.7)
SOLE=mat('bunny_sole',(0.80,0.76,0.72),0.8)
BEAK=mat('bunny_beak',(0.93,0.36,0.02),0.5)
PUP=mat('bunny_pupil',(0.01,0.01,0.012),0.3)
P=[]
HC=(0.02,0.0,0.56)
# head: one big round ball, a little wider than deep
P.append(blob('head',BLK,HC,(0.205,0.222,0.20)))
# ears: long flat paddles, leaning out and a touch back
for s in (-1,1):
    P.append(blob('ear',BLK,(-0.02,s*0.15,0.84),(0.036,0.078,0.175),rot=(-s*0.45,-0.12,0),sub=2))
    # eyes: big white ovals wrapped on the face, black pupil, white glint
    P.append(blob('eye',WHT,(0.14,s*0.098,0.59),(0.078,0.098,0.108),rot=(0,0,s*0.45)))
    P.append(blob('pupil',PUP,(0.2,s*0.07,0.578),(0.032,0.05,0.068),rot=(0,0,s*0.45),sub=2))
    P.append(blob('glint',WHT,(0.221,s*0.062,0.60),(0.008,0.012,0.013),sub=1))
    # arms held out in front, white mitts
    P.append(blob('arm',BLK,(0.07,s*0.205,0.335),(0.115,0.055,0.055),rot=(0,0.12,s*0.25),sub=2))
    P.append(blob('mitt',WHT,(0.185,s*0.235,0.325),(0.06,0.055,0.06),sub=2))
    # legs straight out, white feet with the soles facing forward
    P.append(blob('leg',BLK,(0.11,s*0.115,0.095),(0.16,0.075,0.08),rot=(0,0,s*0.15),sub=2))
    P.append(blob('foot',WHT,(0.265,s*0.135,0.11),(0.052,0.078,0.108),rot=(0,0.3,s*0.1),sub=2))
    P.append(blob('sole',SOLE,(0.296,s*0.14,0.105),(0.022,0.055,0.08),rot=(0,0.3,s*0.1),sub=2))
# beak: short, wide, orange
bk=lathe_x('beak',BEAK,[(0,0.055),(0.045,0.047),(0.115,0.0)],segs=10)
bk.scale=(1,1.25,0.68); bk.location=(0.185,0,0.475); bk.rotation_euler=(0,0.22,0); P.append(bk)
# body: black pear, white belly with a small chest tuft
P.append(blob('body',BLK,(-0.03,0,0.245),(0.18,0.205,0.205)))
P.append(blob('belly',WHT,(0.062,0,0.235),(0.108,0.118,0.135)))
P.append(blob('tuft',WHT,(0.158,0,0.315),(0.022,0.03,0.035),sub=2))
# round white tail
P.append(blob('tail',WHT,(-0.205,0,0.13),(0.062,0.062,0.062),sub=2))
body=bake_colours(join(P,'crrt_bunny'))
mn,mx=bounds([body]); h=mx.z-mn.z
for v in body.data.vertices:
    v.co.x=(v.co.x-(mn.x+mx.x)/2)/h; v.co.y=(v.co.y-(mn.y+mx.y)/2)/h; v.co.z=(v.co.z-mn.z)/h
bpy.context.view_layer.update()
mn,mx=bounds([body]); print('BOUNDS',[round(v,3) for v in mn],[round(v,3) for v in mx]); print('TRIS',tri_count([body]))
export_glb(out_glb,[body])
render_angles(prefix,[body],(0,-1))
