# Hero kart, built from scratch by script. No imported meshes, no textures.
# Blender axes: +X nose, +Y left, +Z up. Unit length (1.0), like the current GLB.
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from build_lib import *
from render_lib import *
out_glb,prefix=sys.argv[-2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
setup_scene()
RED=mat('kart_red',(0.62,0.008,0.008),0.5)
REDD=mat('kart_red_dark',(0.50,0.02,0.02),0.45)
BLK=mat('kart_black',(0.025,0.025,0.03),0.55)
GRY=mat('kart_frame',(0.09,0.09,0.10),0.6)
TYR=mat('kart_tyre',(0.055,0.055,0.06),0.9)
WHT=mat('kart_white',(0.92,0.92,0.92),0.4)
CYN=mat('kart_light',(0.02,0.55,1.0),0.3,emit=1.6)
CHR=mat('kart_chrome',(0.75,0.77,0.8),0.25,metal=1.0)
P=[]
# --- floor and under-frame
P.append(loft('floor',BLK,[(-0.43,0.17,0.055,0.10,0.015),(0.40,0.17,0.055,0.10,0.015)]))
# --- nose: a wedge that widens back to the cowl
hood=[(0.475,0.150,0.105,0.165,0.035),(0.40,0.195,0.095,0.215,0.045),(0.27,0.215,0.095,0.262,0.05),(0.17,0.205,0.095,0.285,0.05)]
P.append(loft('hood',RED,hood,bevel=0.007))
# twin white stripes riding the hood top
for yc in (-0.022,0.022):
    P.append(loft('stripe',WHT,[(x-0.002 if i==0 else x,0.011,zt-0.004,zt+0.003,0.0005) for i,(x,w,zb,zt,ch) in enumerate(hood[:3])]+[(0.19,0.011,0.276,0.283,0.0005)],yc=yc,bevel=0))
# front splitter, bumper and lights
P.append(loft('bumper',BLK,[(0.50,0.20,0.05,0.115,0.02),(0.43,0.245,0.05,0.125,0.02)]))
P.append(cube('grille',GRY,(0.478,0,0.128),(0.03,0.20,0.035),bevel=0.004))
P.append(cube('light_fc',CYN,(0.494,0,0.128),(0.012,0.12,0.02),bevel=0.002))
P.append(loft('tub',BLK,[(0.10,0.16,0.10,0.19,0.01),(-0.30,0.16,0.10,0.17,0.01)],bevel=0.004))
for s in (-1,1):
    P.append(cube('light_f',CYN,(0.462,s*0.172,0.128),(0.03,0.10,0.04),rot=(0,0,s*0.45),bevel=0.004))
    P.append(cube('light_f_frame',BLK,(0.45,s*0.176,0.128),(0.04,0.125,0.062),rot=(0,0,s*0.45),bevel=0.004))
    P.append(loft('wall_trim',BLK,[(0.19,0.008,0.10,0.15,0.002),(-0.31,0.008,0.10,0.15,0.002)],yc=s*0.228,bevel=0))
    P.append(cube('hood_vent',BLK,(0.30,s*0.13,0.243),(0.11,0.035,0.012),rot=(0,0.3,0),bevel=0.003))
    P.append(lathe_x('tip',CHR,[(0.43,0.0),(0.43,0.02),(0.475,0.016),(0.498,0.008),(0.498,0.0)],segs=8,smooth=False))
    P[-1].location=(0,s*0.225,0.055)
    # front suspension arms
    P.append(tube('arm_f',GRY,[(0.33,s*0.16,0.16),(0.30,s*0.27,0.14)],0.016,sides=4))
    P.append(tube('arm_f2',GRY,[(0.25,s*0.16,0.12),(0.30,s*0.27,0.13)],0.014,sides=4))
    # cockpit side walls: step up toward the rear, like the current body
    P.append(loft('wall',RED,[(0.19,0.035,0.10,0.275,0.02),(0.06,0.035,0.10,0.255,0.02),(-0.02,0.035,0.10,0.225,0.02),(-0.14,0.035,0.10,0.235,0.02),(-0.24,0.04,0.10,0.30,0.02),(-0.31,0.04,0.10,0.315,0.02)],yc=s*0.195,bevel=0.006))
    # side pod and sill
    P.append(loft('pod',RED,[(0.13,0.055,0.105,0.175,0.022),(0.05,0.065,0.10,0.20,0.025),(-0.17,0.065,0.10,0.205,0.025),(-0.215,0.055,0.105,0.19,0.022)],yc=s*0.285,bevel=0.006))
    P.append(loft('sill',BLK,[(0.12,0.05,0.04,0.10,0.012),(-0.21,0.05,0.04,0.10,0.012)],yc=s*0.30,bevel=0.005))
    P.append(cube('pod_vent',BLK,(0.10,s*0.285,0.16),(0.05,0.085,0.045),rot=(0,0.5,0),bevel=0.004))
    # rear fender blocks and tail lights
    P.append(loft('fender',RED,[(-0.30,0.05,0.14,0.30,0.025),(-0.40,0.06,0.13,0.285,0.03),(-0.465,0.05,0.14,0.24,0.03)],yc=s*0.20,bevel=0.007))
    P.append(cube('light_r_frame',BLK,(-0.475,s*0.165,0.185),(0.04,0.125,0.06),bevel=0.005))
    P.append(cube('light_r',CYN,(-0.492,s*0.165,0.185),(0.014,0.095,0.03),bevel=0.003))
    P.append(tube('arm_r',GRY,[(-0.36,s*0.14,0.14),(-0.36,s*0.27,0.14)],0.022,sides=6))
    # roll-hoop stays
    P.append(tube('stay',GRY,[(-0.30,s*0.15,0.40),(-0.43,s*0.15,0.23)],0.015,sides=6,ref=(0,1,0)))
    # seat bolsters
    P.append(cube('bolster',BLK,(-0.13,s*0.118,0.185),(0.17,0.035,0.085),bevel=0.012))
# --- cowl / dash and steering
P.append(loft('cowl',BLK,[(0.185,0.165,0.20,0.30,0.035),(0.115,0.15,0.20,0.315,0.035),(0.09,0.14,0.22,0.30,0.03)],bevel=0.006))
P.append(tube('column',GRY,[(0.10,0,0.285),(0.045,0,0.318)],0.012,sides=6))
ring=[(0.035+0.0*math.cos(a),0.062*math.cos(a),0.325+0.062*math.sin(a)) for a in [2*math.pi*k/12 for k in range(12)]]
sw=tube('steer',BLK,ring,0.011,sides=6,closed=True); P.append(sw)
sw.location=(0.035,0,0.325)
for v in sw.data.vertices: v.co.x-=0.035; v.co.z-=0.325
sw.rotation_euler=(0,-0.42,0)
P.append(cube('steer_hub',BLK,(0.04,0,0.322),(0.012,0.10,0.022),rot=(0,-0.42,0),bevel=0.003))
# --- seat
P.append(cube('seat_base',BLK,(-0.12,0,0.135),(0.20,0.21,0.07),rot=(0,-0.08,0),bevel=0.014))
P.append(cube('seat_back',BLK,(-0.235,0,0.255),(0.055,0.25,0.23),rot=(0,-0.2,0),bevel=0.018,taper=(1,0.84)))
for sy in (-1,1): P.append(cube('seat_wing',BLK,(-0.205,sy*0.118,0.24),(0.07,0.03,0.15),rot=(0,-0.2,sy*0.25),bevel=0.012))
P.append(cube('seat_pad',GRY,(-0.21,0,0.255),(0.02,0.15,0.15),rot=(0,-0.2,0),bevel=0.008))
P.append(cube('headrest',BLK,(-0.268,0,0.405),(0.045,0.12,0.075),rot=(0,-0.2,0),bevel=0.012))
# --- roll hoop (chamfered arch) 
hoop=[(-0.305,-0.16,0.20),(-0.30,-0.16,0.42),(-0.297,-0.135,0.468),(-0.295,-0.09,0.485),(-0.295,0.09,0.485),(-0.297,0.135,0.468),(-0.30,0.16,0.42),(-0.305,0.16,0.20)]
P.append(tube('hoop',GRY,hoop,0.03,sides=8,ref=(1,0,0),flat=0.6))
# --- engine deck and rear
P.append(loft('deck',BLK,[(-0.29,0.15,0.10,0.235,0.03),(-0.44,0.15,0.10,0.225,0.03)],bevel=0.006))
P.append(loft('deck_cover',RED,[(-0.36,0.085,0.20,0.262,0.02),(-0.47,0.075,0.14,0.235,0.025)],bevel=0.006))
P.append(loft('rear_bumper',BLK,[(-0.455,0.235,0.075,0.15,0.02),(-0.50,0.20,0.085,0.14,0.02)],bevel=0.005))
P.append(cube('diffuser',GRY,(-0.485,0,0.10),(0.03,0.16,0.05),bevel=0.004))
body=join(P,'kart_body')
# --- wheels: each under a hub that carries the axle direction, so the wheel
# node itself has no rotation and the game can spin it about its own X axis.
def wheel(name,x,y,r,hw,side):
    o=hw
    tyre=lathe_x('t',TYR,[(-hw,r*0.60),(-hw,r*0.80),(-hw*0.86,r*0.95),(-hw*0.6,r),(hw*0.6,r),(hw*0.86,r*0.95),(hw,r*0.80),(hw,r*0.60),(hw-0.012,r*0.57)],segs=24,caps=False)
    ring=lathe_x('rim',RED,[(o-0.014,r*0.50),(o-0.002,r*0.52),(o-0.002,r*0.61),(o-0.014,r*0.62)],segs=24,smooth=False,caps=False)
    dish=lathe_x('dish',BLK,[(-hw,r*0.60),(-hw+0.01,r*0.2),(-hw+0.01,0.0)],segs=24,caps=False)
    face=lathe_x('face',BLK,[(o-0.012,r*0.57),(o-0.045,r*0.50),(o-0.05,r*0.24),(o-0.018,r*0.20),(o-0.018,0.0)],segs=24,caps=False)
    parts=[tyre,ring,dish,face]
    for k in range(5):
        a=2*math.pi*k/5+0.3
        parts.append(cube('spoke',GRY,(o-0.03,-0.36*r*math.sin(a),0.36*r*math.cos(a)),(0.02,0.045,0.36*r),rot=(a,0,0),bevel=0.004))
    w=join(parts,name)
    hub=bpy.data.objects.new(name.replace('wheel','hub'),None); bpy.context.scene.collection.objects.link(hub)
    hub.location=(x,y,r); hub.rotation_euler=(0,0,math.radians(90*side))
    w.parent=hub
    return hub,w
objs=[body]
for name,x,side in (('wheel_front_l',0.30,1),('wheel_front_r',0.30,-1),('wheel_rear_l',-0.36,1),('wheel_rear_r',-0.36,-1)):
    r=0.138 if 'front' in name else 0.142
    hub,w=wheel(name,x,side*0.338,r,0.085,side); objs+=[hub,w]
root=bpy.data.objects.new('hero_kart',None); bpy.context.scene.collection.objects.link(root)
body.parent=root
for o in objs:
    if o.type=='EMPTY': o.parent=root
allo=[root]+objs
bpy.context.view_layer.update()
mn,mx=bounds(allo); print('BOUNDS',[round(v,3) for v in mn],[round(v,3) for v in mx]); print('TRIS',tri_count(allo))
export_glb(out_glb,allo)
render_angles(prefix,allo,(1,0))
