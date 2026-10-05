"""Original procedural 3D archery cutscene; no downloaded character/IP assets.

Run with Blender --background --factory-startup --python this_file --
  --profile desktop|mobile|mobile-lite|all --preview | --render
Meshes, articulated limbs, bow deformation, hair shape keys and camera tracks
are baked into an editable .blend. The website plays the encoded local movie.
"""
import argparse
import json
import hashlib
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'renders'
ASSETS = ROOT / 'assets' / 'video'
PROFILES = {'desktop': (1920, 1080), 'mobile': (1080, 1920), 'mobile-lite': (720, 1280)}
FPS, FRAMES = 30, 300
random.seed(4127)
args = argparse.ArgumentParser()
args.add_argument('--profile', choices=[*PROFILES, 'all'], default='desktop')
args.add_argument('--preview', action='store_true')
args.add_argument('--render', action='store_true')
args.add_argument('--test-frame', type=int)
args = args.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'master').mkdir(exist_ok=True)
(OUT / 'previews').mkdir(exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 32
scene.eevee.use_raytracing = False
scene.eevee.shadow_ray_count = 2
scene.eevee.volumetric_samples = 24
scene.render.resolution_x, scene.render.resolution_y = PROFILES['desktop']
scene.render.resolution_percentage = 100
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.film_transparent = False
scene.render.use_motion_blur = False  # articulated poses stay legible; arrow has a physical trail
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = .15
scene.world.color = (.018, .025, .045)
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.016, .026, .06, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .22


def material(name, color, rough=.5, metal=0, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if glow:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = glow
    return m


M = {
    'ivory': material('Cream woven tournament tunic', (.78, .76, .65), .72),
    'navy': material('Midnight blue fitted fabric', (.025, .043, .10), .62),
    'red': material('Korean red accent fabric', (.42, .028, .048), .66),
    'blue': material('Korean blue accent fabric', (.026, .12, .34), .65),
    'gold': material('Brushed antique gold', (.59, .34, .09), .3, .75),
    'skin': material('Warm natural skin', (.51, .30, .21), .64),
    'hair': material('Black hair', (.006, .009, .015), .60),
    'hair2': material('Cool hair highlights', (.010, .015, .025), .58),
    'leather': material('Charcoal leather gloves and boots', (.020, .024, .032), .5),
    'wood': material('Bow polished walnut', (.13, .044, .021), .32),
    'stone': material('Arena blue stone', (.055, .075, .105), .81),
    'stone2': material('Arena blue stone highlight', (.095, .115, .155), .74),
    'floor': material('Night arena floor', (.034, .046, .067), .4, .12),
    'string': material('Bowstring silver fiber', (.62, .68, .70), .5, .18),
    'white': material('Target parchment white', (.81, .77, .63), .92),
    'targetblue': material('Target muted royal blue', (.03, .15, .36), .85),
    'targetred': material('Target red', (.52, .025, .037), .82),
    'targetgold': material('Bullseye ochre gold', (.80, .43, .055), .7),
    'black': material('Target charcoal ring', (.010, .015, .023), .8),
    'torch': material('Warm torch flame', (1, .26, .035), .3, 0, 5),
    'spark': material('Gold impact flecks', (1, .48, .07), .2, .2, 4),
    'blueglow': material('Cold arena lamps', (.05, .32, 1), .2, 0, 3),
}
# Subtle micro-surface, not a smooth plastic mannequin.
for key in ['ivory', 'navy', 'red', 'blue', 'leather']:
    nodes, links = M[key].node_tree.nodes, M[key].node_tree.links
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 185
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .13
    bump.inputs['Distance'].default_value = .008
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])
for key in ['hair','hair2']:
    nodes,links=M[key].node_tree.nodes,M[key].node_tree.links
    nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.13
    coord=nodes.new('ShaderNodeTexCoord')
    stretch=nodes.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY'
    stretch.inputs[1].default_value=(45,45,1.5)
    links.new(coord.outputs['Generated'],stretch.inputs[0])
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=2
    links.new(stretch.outputs[0],noise.inputs['Vector'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.006
    links.new(noise.outputs['Fac'],bump.inputs['Height'])
    links.new(bump.outputs[0],nodes.get('Principled BSDF').inputs['Normal'])


def mesh(name, vertices, faces, mat, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for p in data.polygons:
        p.use_smooth = smooth
    return obj


def box(name, pos, size, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
        mod.width, mod.segments = bevel, 2
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def ellipsoid(name, pos, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=pos)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def loft(name, rings, mat, sides=24):
    verts, faces = [], []
    for z, rx, ry, cy in rings:
        for i in range(sides):
            angle = 2 * math.pi * i / sides
            verts.append((math.cos(angle) * rx, cy + math.sin(angle) * ry, z))
    for j in range(len(rings) - 1):
        for i in range(sides):
            a = j * sides + i
            b = j * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces += [tuple(reversed(range(sides))), tuple((len(rings) - 1) * sides + i for i in range(sides))]
    return mesh(name, verts, faces, mat)


def tube(name, points, radius, mat, sides=8):
    verts, faces = [], []
    for j, p in enumerate(points):
        tangent = Vector(points[min(j + 1, len(points) - 1)]) - Vector(points[max(0, j - 1)])
        if tangent.length < .0001:
            tangent = Vector((0, 0, 1))
        tangent.normalize()
        axis = tangent.cross(Vector((0, 1, 0)))
        if axis.length < .01:
            axis = tangent.cross(Vector((1, 0, 0)))
        axis.normalize()
        other = tangent.cross(axis).normalized()
        r = radius[j] if isinstance(radius, list) else radius
        for i in range(sides):
            v = Vector(p) + r * (axis * math.cos(2 * math.pi * i / sides) + other * math.sin(2 * math.pi * i / sides))
            verts.append(tuple(v))
    for j in range(len(points) - 1):
        for i in range(sides):
            a = j * sides + i
            b = j * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    return mesh(name, verts, faces, mat)


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions, data.resolution_u = '3D', 1
    data.bevel_depth, data.bevel_resolution = radius, 2
    spline = data.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, value in zip(spline.points, points):
        p.co = (*value, 1)
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj, spline


def pose(obj, start, end, frame, radius=1):
    start, end = Vector(start), Vector(end)
    obj.location = start
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (end - start).to_track_quat('Z', 'Y')
    obj.scale = (radius, radius, (end - start).length)
    for prop in ['location', 'rotation_quaternion', 'scale']:
        obj.keyframe_insert(data_path=prop, frame=frame)


def keyed(obj, prop, value, frame):
    setattr(obj, prop, value)
    obj.keyframe_insert(data_path=prop, frame=frame)


def smooth(x):
    x = max(0, min(1, x))
    return x * x * (3 - 2 * x)


def light(name, kind, pos, color, energy, size=1, aim=None):
    data = bpy.data.lights.new(name, kind)
    data.energy, data.color = energy, color
    data.use_shadow = kind != 'POINT'
    if kind == 'AREA':
        data.shape, data.size = 'DISK', size
    elif kind == 'POINT':
        data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = pos
    if aim:
        obj.rotation_euler = (Vector(aim) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    return obj


# A stone tournament arena, with physical lights and receding architectural depth.
box('Arena floor', (0, 12, -.13), (26, 60, .24), M['floor'], .04)
for x in [-.65, .65]:
    box('Narrow inlaid shooting lane', (x, 9, .001), (.018, 24, .008), M['gold'])
for y in range(-2, 30, 2):
    box('Floor expansion joint', (0, y, .003), (25, .012, .008), M['stone'])
for side in [-1, 1]:
    for row in range(3):
        box('Receding audience terrace', (side * (6.8 + row * .8), 12, .18 + row * .55), (1.2, 40, .35), M['stone'], .06)
    for y in [-3, 3, 9, 15, 21, 27]:
        box('Stone arena buttress', (side * 9, y, 3), (.9, 1.1, 6), M['stone2'], .09)
        box('Gilt column capital', (side * 9, y, 5.3), (1.25, 1.4, .2), M['gold'], .025)
        flame = loft('Tapered torch flame', [(0,.055,.055,0),(.13,.083,.061,0),(.29,.043,.032,.015),(.42,.001,.001,.028)], M['torch'], 12)
        flame.location = (side * 5.7,y,2.60)
        box('Torch black bracket', (side * 5.7, y, 2.4), (.11, .11, .58), M['leather'], .01)
        light('Warm stadium torch', 'POINT', (side * 5.7, y, 2.85), (1, .35, .12), 105, .28)
        for frame in range(1, FRAMES + 1, 10):
            keyed(flame, 'scale', (1,1,.94+.12*math.sin(frame*.11+y)), frame)
    # Small silhouetted audience geometry; the camera's DOF separates it from the subject.
    for j in range(65):
        y, row = -2 + j * .46, j % 3
        ellipsoid('Audience silhouette head', (side * (6.7 + row * .8), y, .99 + row * .55), (.075,.08,.10), M['navy'])
        ellipsoid('Audience seated shoulders', (side * (6.7 + row * .8), y, .73 + row * .55), (.14,.10,.23), M['navy'])
box('Far arena wall', (0, 30, 3.5), (25, 1.2, 7), M['stone'], .1)
for x in range(-8, 9, 4):
    box('Far wall arch pillar', (x, 29.25, 3), (.65, .5, 6), M['stone2'], .06)
    light('Distant blue arch glow', 'POINT', (x, 28.4, 2.7), (.10, .25, 1), 130, .7)
light('Archer soft key', 'AREA', (-2.4, 1.8, 4.5), (.76, .86, 1), 700, 3, (0, 0, 1.3))
light('Archer gold side light', 'AREA', (-2.8, -1.2, 2.6), (1, .64, .40), 180, 2, (0, 0, 1.5))
light('Archer cool hair rim', 'AREA', (1.3, 2.2, 3.4), (.20, .44, 1), 380, 2.5, (0, 0, 1.4))
light('Target soft spotlight', 'AREA', (-1.6, 15, 4.4), (1, .79, .46), 800, 2.5, (-.28, 18, 1.49))
light('Target blue edge', 'AREA', (1.8, 20, 3.4), (.15, .35, 1), 1000, 3, (-.28, 18, 1.49))

# Original adult archer. Clothing covers anatomical joins; long layered hair is a deformed mesh.
loft('Fitted cream tunic', [(.90,.16,.12,0),(1.02,.18,.13,0),(1.13,.15,.11,.005),(1.28,.18,.12,.015),(1.40,.215,.13,.025),(1.49,.23,.105,.015),(1.53,.16,.09,0)], M['ivory'])
loft('Charcoal hip trousers', [(.78,.18,.115,0),(.88,.19,.12,0),(1.04,.18,.12,0)], M['navy'])
loft('Deep red fitted waist sash', [(1.035,.184,.127,0),(1.08,.172,.12,0)], M['red'])
box('Original gold wing belt clasp', (0, -.128, 1.062), (.08,.015,.025), M['gold'], .006)
for x in [-.10, .10]:
    upper = loft('Fitted trouser thigh', [(0,.075,.067,0),(.12,.083,.07,0),(.32,.091,.077,0),(.48,.078,.067,0)], M['navy'])
    upper.location = (x, 0, .45)
    boot = loft('Tall charcoal boot', [(.04,.064,.062,0),(.14,.058,.062,0),(.31,.065,.067,0),(.46,.068,.063,0)], M['leather'])
    boot.location.x = x
    ellipsoid('Boot shaped toe', (x, .045, .075), (.069,.14,.071), M['leather'])
    curve('Gold boot piping', [(x-.059,-.04,.12),(x-.059,-.044,.33),(x-.047,-.043,.43)], .004, M['gold'])
neck = ellipsoid('Archer neck', (0, .014, 1.58), (.065,.063,.10), M['skin'])
head = ellipsoid('Archer head', (0, .015, 1.74), (.108,.103,.151), M['skin'])
ellipsoid('Hair crown', (0, -.004, 1.782), (.118,.112,.132), M['hair'])
for x in [-.108, .108]:
    ellipsoid('Ear', (x, .01, 1.73), (.018,.021,.033), M['skin'])
    ellipsoid('Original gold stud', (x * 1.02, -.001, 1.709), (.007,.007,.009), M['gold'])
# Structured shoulder collar and original red/blue trim; no commercial symbols.
loft('Tournament collar', [(1.50,.102,.093,0),(1.55,.082,.078,0),(1.57,.077,.073,0)], M['navy'])
curve('Left red shoulder piping', [(-.20,-.085,1.48),(-.12,-.096,1.48),(-.055,-.072,1.53)], .007, M['red'])
curve('Right blue shoulder piping', [(.20,-.085,1.48),(.12,-.096,1.48),(.055,-.072,1.53)], .007, M['blue'])
for side in [-1,1]:
    curve('Tunic back tailoring seam', [(side*.10,-.121,1.08),(side*.12,-.116,1.30),(side*.15,-.101,1.43)], .002, M['gold'])
hair_keys = []
main_hair=loft('Continuous flowing long hair volume',[(1.08,.03,.009,-.18),(1.14,.095,.025,-.18),(1.31,.145,.035,-.155),(1.55,.131,.049,-.12),(1.73,.113,.083,-.077),(1.84,.091,.071,-.035),(1.91,.015,.015,-.004)],M['hair'],32)
main_hair.shape_key_add(name='Rest')
main_wind=main_hair.shape_key_add(name='Hair body release follow-through')
for v in main_wind.data:
    t=max(0,min(1,(1.85-v.co.z)/.77))
    v.co.y-=.26*t*t
    v.co.x+=.075*t*t
    v.co.z+=.035*t*t
for frame,weight in [(1,0),(90,.015),(135,0),(141,.12),(151,1),(167,.48),(185,.05),(205,0),(300,0)]:
    main_wind.value=weight
    main_wind.keyframe_insert(data_path='value',frame=frame)
for strand in range(26):
    angle = (strand / 25 - .5) * 2.55
    sx = math.sin(angle) * .115
    length = .63 + .12 * math.sin(strand * 1.61) ** 2
    pts = [(sx*(.50+.70*smooth(t/.3))+.011*math.sin(t*4+strand)*t, -.023-.14*math.cos(angle)*smooth(t/.25)-.041*t, 1.875-length*t) for t in [j/10 for j in range(11)]]
    radii = [.009 * (1-.78*j/10) for j in range(11)]
    obj = tube('Long layered hair lock %02d' % strand, pts, radii, M['hair2'] if strand % 6 == 0 else M['hair'], 6)
    obj.shape_key_add(name='Rest')
    wind = obj.shape_key_add(name='Release hair whip')
    for i, v in enumerate(wind.data):
        t = (i // 6) / 10
        v.co.x += .19 * t*t * math.sin(strand*.23 + .7)
        v.co.y -= .27 * t*t
        v.co.z += .045 * t*t
    for frame, weight in [(1,0),(90,.025),(135,0),(141,.12),(151,1),(167,.48),(185,.05),(205,0),(300,0)]:
        wind.value = weight
        wind.keyframe_insert(data_path='value', frame=frame)
    hair_keys.append(obj)

# Four separately articulated arm segments, with anatomical taper and glove fingers.
arms = {}
for side in ['bow', 'draw']:
    arms[side+'upper'] = loft(side+' upper sleeve', [(0,.055,.055,0),(.10,.061,.057,0),(.70,.051,.049,0),(1,.043,.042,0)], M['ivory'], 16)
    arms[side+'fore'] = loft(side+' tapered forearm bracer', [(0,.044,.043,0),(.15,.044,.043,0),(.75,.032,.033,0),(1,.027,.029,0)], M['leather'], 16)
    glove = bpy.data.objects.new(side+' glove articulated wrist', None)
    scene.collection.objects.link(glove)
    palm = ellipsoid(side+' glove palm', (0,.018,0), (.036,.057,.027), M['leather'])
    palm.parent = glove
    for digit in range(4):
        finger = tube(side+' bent glove finger', [((digit-1.5)*.017,.041,.011),((digit-1.5)*.018,.069,.004),((digit-1.5)*.017,.072,-.023)], [.008,.007,.006], M['ivory'], 6)
        finger.parent = glove
    thumb = tube(side+' glove thumb', [(-.031,.006,.005),(-.047,.030,-.002),(-.033,.046,-.018)], [.009,.009,.007], M['ivory'], 6)
    thumb.parent = glove
    arms[side+'hand'] = glove

# Recurve bow: its limb mesh bends, while the V-shaped string follows the drawing hand.
BOW_GRIP = Vector((-.28,.74,1.49))
bow_keys = []
for sign in [-1,1]:
    pts = [tuple(BOW_GRIP + Vector((0, .115*math.sin(t*math.pi)-.065*t, sign*.58*t))) for t in [j/14 for j in range(15)]]
    obj = tube('Flexible recurved bow limb', pts, [.019*(1-j/20) for j in range(15)], M['wood'], 8)
    obj.shape_key_add(name='Rest')
    flex = obj.shape_key_add(name='String tension bend')
    for i,v in enumerate(flex.data):
        t = (i//8)/14
        v.co.y -= .09*t*t
        v.co.z -= sign*.020*t*t
    bow_keys.append(flex)
    ellipsoid('Gold bow tip', pts[-1], (.018,.018,.034), M['gold'])
bowgrip = box('Leather-wrapped bow grip', BOW_GRIP, (.046,.045,.125), M['leather'], .015)
for z in [-.035,0,.035]:
    curve('Gold grip winding', [(-.303,.714,1.49+z),(-.255,.714,1.49+z)], .0025, M['gold'])
string, string_spline = curve('Three-point physical bowstring', [(-.28,.675,.91),(-.28,.60,1.49),(-.28,.675,2.07)], .0018, M['string'])

arrow = bpy.data.objects.new('Animated arrow root', None)
scene.collection.objects.link(arrow)
shaft = tube('Arrow carbon shaft', [(0,0,0),(0,.91,0)], .0035, M['leather'])
shaft.parent = arrow
tip = tube('Arrow steel head', [(0,.90,0),(0,.945,0)], [.012,0], M['gold'])
tip.parent = arrow
for i,mat in enumerate([M['ivory'], M['blue'], M['red']]):
    a = i*2*math.pi/3
    radial = Vector((math.cos(a),0,math.sin(a)))
    verts = [tuple(Vector((0,.04,0))), tuple(Vector((0,.17,0))), tuple(Vector((0,.12,0))+radial*.035), tuple(Vector((0,.04,0))+radial*.023)]
    vane = mesh('Original tricolor arrow fletching', verts, [(0,1,2,3)], mat, False)
    vane.parent = arrow

TARGET = Vector((-.28,18,1.49))
target_root = bpy.data.objects.new('Bullseye target physical impact rig', None)
scene.collection.objects.link(target_root)
target_root.location = TARGET
for radius, depth, mat in [(.66,.045,M['wood']),(.63,-.004,M['white']),(.505,-.007,M['black']),(.38,-.010,M['targetblue']),(.255,-.013,M['targetred']),(.128,-.016,M['targetgold'])]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=.007 if depth<0 else .09, location=(0,depth,0), rotation=(math.pi/2,0,0))
    obj = bpy.context.object
    obj.name = 'Concentric target ring'
    obj.parent = target_root
    obj.data.materials.append(mat)
    mod = obj.modifiers.new('Soft ring edge','BEVEL')
    mod.width, mod.segments = .002, 2
for angle in [0,math.pi/2,math.pi,3*math.pi/2]:
    rivet = ellipsoid('Target brass rim rivet', (math.cos(angle)*.64,-.055,math.sin(angle)*.64), (.009,.009,.009), M['gold'])
    rivet.parent = target_root
for x in [-.45,.45]:
    tube('Target tripod support', [(TARGET.x+x,18.18,.05),(TARGET.x+x*.5,18.07,1.9)], .035, M['wood'])
box('Target stand crossbeam', (TARGET.x,18.1,.7), (1.1,.065,.08), M['wood'], .01)


def draw_amount(frame):
    if frame < 61:
        return .06
    if frame <= 120:
        return .06+.94*smooth((frame-61)/59)
    if frame <= 135:
        return 1
    if frame < 150:
        return .18*math.exp(-(frame-136)/5)*math.cos((frame-136)*1.2)
    return 0


def arrow_position(frame):
    if frame < 136:
        return Vector((-.28,.60-.55*max(0,draw_amount(min(frame,135))),1.49))
    p = max(0,min(1,(frame-136)/60))
    return Vector((-.28,.05+(17.036-.05)*p,1.49+.08*math.sin(math.pi*p)))


for frame in range(1, FRAMES+1):
    d = draw_amount(frame)
    nock = Vector((-.28,.60-.55*d,1.49))
    bow_elbow = (-.30,.38,1.475+.007*math.sin(frame*.028))
    draw_elbow = Vector((.30+.15*d,.41-.58*d,1.38+.08*d))
    draw_hand = nock + Vector((.015,-.018,0))
    if frame > 135:
        q = smooth((frame-135)/20)
        draw_hand = Vector((-.265,.032,1.49)).lerp(Vector((.16,-.14,1.51)),q)
        draw_elbow = Vector((.45,-.17,1.46)).lerp(Vector((.48,-.24,1.43)),q)
    pose(arms['bowupper'],(-.22,.015,1.47),bow_elbow,frame)
    pose(arms['bowfore'],bow_elbow,BOW_GRIP,frame)
    pose(arms['drawupper'],(.22,.015,1.47),draw_elbow,frame)
    pose(arms['drawfore'],draw_elbow,draw_hand,frame)
    for side, hand, direction in [('bow',BOW_GRIP,Vector((0,0,1))),('draw',draw_hand,Vector((-.18,.8,.1)))]:
        group = arms[side+'hand']
        group.rotation_mode = 'QUATERNION'
        keyed(group,'location',hand,frame)
        keyed(group,'rotation_quaternion',direction.to_track_quat('Y','Z'),frame)
    for key in bow_keys:
        key.value = d
        key.keyframe_insert(data_path='value',frame=frame)
    for i, value in enumerate([(-.28,.675-.09*d,.93),tuple(nock),(-.28,.675-.09*d,2.05)]):
        string_spline.points[i].co = (*value,1)
        string_spline.points[i].keyframe_insert(data_path='co',frame=frame)
    keyed(arrow,'location',arrow_position(frame),frame)
    arrow.rotation_mode = 'QUATERNION'
    direction = Vector((0,1,.08*math.pi/16.986*math.cos(math.pi*max(0,min(1,(frame-136)/60))))) if 136<=frame<196 else Vector((0,1,0))
    keyed(arrow,'rotation_quaternion',direction.to_track_quat('Y','Z'),frame)
    # Impact is at the target face, with only a restrained 0.2-second vibration.
    hit = max(0,frame-196)
    angle = math.exp(-hit/2.2)*.012*math.sin(hit*2.1) if 0<hit<12 else 0
    keyed(target_root,'rotation_euler',(angle,0,angle*.7),frame)

# Small gold/wood particles, never a target explosion.
for i in range(16):
    particle = box('Bullseye impact particle', tuple(TARGET+Vector((0,-.04,0))), (.014,.010,.013), M['spark'] if i%3 else M['wood'], .002)
    theta = random.uniform(0,2*math.pi)
    speed = random.uniform(.12,.34)
    for frame in [1,195,196,200,205,211,218,300]:
        t = max(0,(frame-196)/30)
        point = TARGET+Vector((math.cos(theta)*speed*t,-.04-.6*t,math.sin(theta)*speed*t-.45*t*t))
        keyed(particle,'location',point,frame)
        scale = (1,1,1) if 196<=frame<=211 else (0,0,0)
        keyed(particle,'scale',scale,frame)
flash = light('Brief bullseye warm flash','POINT',tuple(TARGET+Vector((0,-.2,0))),(1,.60,.2),0,.3)
for f,e in [(1,0),(195,0),(196,160),(198,50),(201,0),(300,0)]:
    flash.data.energy=e
    flash.data.keyframe_insert(data_path='energy',frame=f)

# One scene and one animated cast. Six cameras coexist in the editable master.
camera_collection = bpy.data.collections.new('CAMERAS')
scene.collection.children.link(camera_collection)
camera_sets, focus_sets, portal_sets, portal_metadata = {}, {}, {}, {}
for profile in ['desktop', 'mobile']:
    names = (['Camera_Desktop', 'Camera_Arrow_Desktop', 'Camera_Target_Desktop']
             if profile == 'desktop' else ['Camera_Mobile', 'Camera_Arrow_Mobile', 'Camera_Target_Mobile'])
    camera_sets[profile], focus_sets[profile] = [], []
    for i, name in enumerate(names):
        data = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, data)
        camera_collection.objects.link(cam)
        focus = bpy.data.objects.new(name + '_Focus', None)
        camera_collection.objects.link(focus)
        data.dof.use_dof = True
        data.dof.focus_object = focus
        data.dof.aperture_fstop = 4.5 if i == 0 else 5.6
        data.sensor_fit = 'HORIZONTAL' if profile == 'desktop' else 'VERTICAL'
        camera_sets[profile].append(cam)
        focus_sets[profile].append(focus)
    cameras, focuses = camera_sets[profile], focus_sets[profile]
    for frame in range(1, FRAMES + 1):
        t = smooth((frame - 1) / 134)
        if profile == 'desktop':
            cameras[0].location = Vector((-1.06, -3.8, 1.80)).lerp(Vector((-.90, -3.20, 1.78)), t)
            look = Vector((-.12, .78, 1.48))
            cameras[0].data.lens = 43 + 2*t
        else:
            # Elevated rear view: distant target above head, bow/shoulders below.
            # Framing is camera-only; no character or target position is changed.
            cameras[0].location = Vector((0, -3.75, 2.65)).lerp(Vector((0, -3.40, 2.60)), t)
            look = Vector((0, 3.0, 1.66))
            cameras[0].data.lens = 31 + t
        cameras[0].rotation_euler = (look - cameras[0].location).to_track_quat('-Z', 'Y').to_euler()
        focuses[0].location = (0, .16, 1.48)
        p = arrow_position(frame)
        if profile == 'desktop':
            cameras[1].location = (1.0, p.y - 1.8, 1.63)
            flight_focus = p + Vector((0, .6, 0))
            cameras[1].data.lens = 43
        else:
            # Chase along the depth axis, not a horizontal screen crossing.
            cameras[1].location = p + Vector((.075, -1.8, .34))
            flight_focus = p + Vector((0, .35, .10))
            cameras[1].data.lens = 30
        cameras[1].rotation_euler = (flight_focus - cameras[1].location).to_track_quat('-Z', 'Y').to_euler()
        focuses[1].location = p + Vector((0, .55, 0))
        if profile == 'desktop':
            cameras[2].location, cameras[2].data.lens = (-.62, 13.3, 2.01), 57
        else:
            # Full target diameter about 58% of the narrow 9:16 width.
            # Its entire silhouette remains inside even a tall phone's cover crop.
            cameras[2].location, cameras[2].data.lens = (-.28, 12.25, 1.70), 34
        cameras[2].rotation_euler = (TARGET - cameras[2].location).to_track_quat('-Z', 'Y').to_euler()
        focuses[2].location = TARGET
        if 196 < frame < 204:
            cameras[2].location.x += .009*math.sin((frame-196)*2.4)
            cameras[2].location.z += .007*math.cos((frame-196)*2.2)
        for cam, focus in zip(cameras, focuses):
            cam.keyframe_insert(data_path='location', frame=frame)
            cam.keyframe_insert(data_path='rotation_euler', frame=frame)
            cam.data.keyframe_insert(data_path='lens', frame=frame)
            focus.keyframe_insert(data_path='location', frame=frame)


def select_profile(profile):
    base = 'desktop' if profile == 'desktop' else 'mobile'
    scene.render.resolution_x, scene.render.resolution_y = PROFILES[profile]
    cameras = camera_sets[base]
    scene.timeline_markers.clear()
    for name, frame, cam in [('REAR / DRAW / RELEASE', 1, cameras[0]),
                             ('ARROW FOLLOW', 156, cameras[1]), ('BULLSEYE / PIXEL PORTAL', 196, cameras[2])]:
        marker = scene.timeline_markers.new(name, frame=frame)
        marker.camera = cam
    scene.camera = cameras[0]
    for name, collection in portal_sets.items():
        collection.hide_render = name != base
        collection.hide_viewport = name != base
    scene['render_profile'] = profile


palette = [(8,10,24),(13,18,48),(18,24,59),(23,31,75),(51,66,122),(255,245,207),
           (255,216,77),(255,73,108),(72,199,255),(38,88,217),(97,57,35),(148,92,47)]


def build_pixel_portal(profile):
    select_profile(profile)
    cols, rows = (256,144) if profile == 'desktop' else (144,256)
    cx, cy = cols*.5, rows*.5
    scene.frame_set(220)
    bpy.context.view_layer.update()
    cam = camera_sets[profile][2]
    center = world_to_camera_view(scene, cam, TARGET)
    rim = world_to_camera_view(scene, cam, TARGET + Vector((0,0,.66)))
    tail = world_to_camera_view(scene, cam, arrow_position(220))
    radius = (rim.y-center.y)*rows
    arrow_dx, arrow_dy = (tail.x-center.x)*cols, (tail.y-center.y)*rows
    arrow_length = max(.001, math.hypot(arrow_dx, arrow_dy))
    aspect = scene.render.resolution_x / scene.render.resolution_y
    if profile == 'desktop':
        width = cam.data.sensor_width / cam.data.lens
        height = width / aspect
    else:
        height = cam.data.sensor_height / cam.data.lens
        width = height * aspect
    vertices, faces, colors, thresholds = [], [], [], []
    # Metric stretches sideways distance on portrait: after the target converts,
    # the wave visibly opens upward/downward before it fills the outer corners.
    def metric(dx, dy):
        return math.hypot(dx*(1.50 if profile == 'mobile' else 1), dy)
    far = metric(cols/2, rows/2)
    for y in range(rows):
        for x in range(cols):
            dx, dy = x+.5-cx, y+.5-cy
            r = math.hypot(dx, dy)
            color = 1
            if y < rows*.27:
                color = 0 if int(x/12+y/8)%2 else 2
            elif y < rows*.39:
                color = 2 if int(x/9)%2 else 0
            else:
                color = 2 if int(x/22+y/10)%2 else 1
                if x%22 < 1 and y > rows*.65: color = 4
                if (x*13+y*37)%809 == 0: color = 6
            if abs(dx) < radius*.65 and rows*.08 < y < cy-radius and abs(abs(dx)-radius*.42) < 2:
                color = 10
            if r < radius+3:
                color = 11
                for fraction, index in [(1,5),(.80,0),(.60,9),(.40,7),(.20,6)]:
                    if r < radius*fraction: color = index
                if abs(r-radius*.81) < .9 or abs(r-radius*.41) < .7: color = 4
            along = (dx*arrow_dx+dy*arrow_dy)/(arrow_length*arrow_length)
            across = (dx*arrow_dy-dy*arrow_dx)/arrow_length
            if 0 <= along <= 1 and abs(across) < .65: color = 5
            if .70 < along < 1.13 and abs(across) < 1.65: color = 8 if across > 0 else 7
            if r <= radius+4:
                threshold = r/(radius+4)*.43
            else:
                angle_scale = metric(dx,dy)/max(r,.001)
                threshold = .43+(r-radius-4)*angle_scale/(far-radius-4)*.55
            threshold = max(.002, min(.98, threshold+.009*math.sin(x*18.41+y*7.33)))
            index = len(vertices)
            for ox, oy in [(0,0),(1,0),(1,1),(0,1)]:
                vertices.append((((x+ox)/cols-.5)*width, ((y+oy)/rows-.5)*height, -1))
                colors.append(tuple((v/255)**2.2 for v in palette[color])+(1,))
                thresholds.append(threshold)
            faces.append((index,index+1,index+2,index+3))
    mat = bpy.data.materials.new('Pixel portal '+profile)
    mat.use_nodes = True
    mat.surface_render_method = 'DITHERED'
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    colorattr = nodes.new('ShaderNodeAttribute'); colorattr.attribute_name = 'PixelColor'
    threshold = nodes.new('ShaderNodeAttribute'); threshold.attribute_name = 'RevealAt'
    progress = nodes.new('ShaderNodeValue'); progress.name = 'Portal expansion'
    greater = nodes.new('ShaderNodeMath'); greater.operation = 'GREATER_THAN'
    links.new(progress.outputs[0], greater.inputs[0]); links.new(threshold.outputs['Fac'], greater.inputs[1])
    emission = nodes.new('ShaderNodeEmission'); emission.inputs['Strength'].default_value = .8
    links.new(colorattr.outputs['Color'], emission.inputs['Color'])
    transparent = nodes.new('ShaderNodeBsdfTransparent')
    mix = nodes.new('ShaderNodeMixShader')
    links.new(greater.outputs[0], mix.inputs[0]); links.new(transparent.outputs[0], mix.inputs[1])
    links.new(emission.outputs[0], mix.inputs[2]); links.new(mix.outputs[0], output.inputs['Surface'])
    collection = bpy.data.collections.new('PIXEL_PORTAL_'+profile.upper())
    scene.collection.children.link(collection)
    portal = mesh('Camera-specific authored pixel portal '+profile, vertices, faces, mat, False)
    scene.collection.objects.unlink(portal)
    collection.objects.link(portal)
    portal.parent = cam
    portal_sets[profile] = collection
    attr = portal.data.color_attributes.new(name='PixelColor', type='FLOAT_COLOR', domain='POINT')
    attr.data.foreach_set('color', [v for color in colors for v in color])
    attr = portal.data.attributes.new(name='RevealAt', type='FLOAT', domain='POINT')
    attr.data.foreach_set('value', thresholds)
    for frame, value in [(1,-1),(220,-1),(221,0),(232,.08),(245,.29),(262,.52),(280,.84),(287,1),(300,1)]:
        progress.outputs[0].default_value = value
        progress.outputs[0].keyframe_insert(data_path='default_value', frame=frame)
    for frame, value in [(1,True),(220,True),(221,False),(300,False)]:
        keyed(portal,'hide_render',value,frame)
    for frame, value in [(1,True),(219,True),(220,False),(300,False)]:
        cam.data.dof.use_dof = value
        cam.data.dof.keyframe_insert(data_path='use_dof', frame=frame)
    portal_metadata[profile] = {'pixelTargetRadius': round(radius,4),
                               'pixelArrowTail': [round(arrow_dx,4),round(arrow_dy,4)], 'pixelQuads': cols*rows}


build_pixel_portal('desktop')
build_pixel_portal('mobile')
shared_signature = hashlib.sha256('\n'.join(sorted(obj.name for obj in scene.objects
    if obj.type != 'CAMERA' and not obj.name.startswith('Camera_') and 'pixel portal' not in obj.name)).encode()).hexdigest()


def film_settings(profile):
    if hasattr(scene.render.image_settings, 'media_type'):
        scene.render.image_settings.media_type = 'VIDEO'
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'HIGH' if profile != 'mobile-lite' else 'MEDIUM'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
    scene.render.ffmpeg.audio_codec = 'NONE'
    scene.render.filepath = str(OUT / ('pixel-clash-intro-'+profile+'.mp4'))


def projected(camera, point):
    p = world_to_camera_view(scene, camera, Vector(point))
    return [round(p.x,5), round(1-p.y,5)]


def verification_metadata(profile):
    base = 'desktop' if profile == 'desktop' else 'mobile'
    cameras = camera_sets[base]
    samples = []
    for frame in [45,115,145,176,210]:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        cam = cameras[0 if frame < 156 else 1 if frame < 196 else 2]
        points = {'target': projected(cam,TARGET), 'arrow': projected(cam,arrow_position(frame)+Vector((0,.45,0)))}
        if frame < 156:
            points.update({'head': projected(cam,(0,0,1.91)), 'hairLeft': projected(cam,(-.16,-.2,1.25)),
                           'hairRight': projected(cam,(.16,-.2,1.25)), 'bowTop': projected(cam,(-.28,.60,2.07)),
                           'bowBottom': projected(cam,(-.28,.60,.91)), 'drawHand': projected(cam,(-.28,.60-.55*max(0,draw_amount(frame)),1.49)),
                           'drawElbow': projected(cam,(.45,-.17,1.46)), 'hairTip': projected(cam,(.08,-.30,1.10))})
        if frame == 210:
            points.update({key:projected(cam,TARGET+Vector(offset)) for key,offset in
                           [('rimLeft',(-.66,0,0)),('rimRight',(.66,0,0)),('rimTop',(0,0,.66)),('rimBottom',(0,0,-.66))]})
        samples.append({'frame':frame,'camera':cam.name,'points':points})
    scene.frame_set(220)
    return {'profile':profile,'duration':10,'fps':FPS,'frames':FRAMES,'resolution':list(PROFILES[profile]),
            'masterScene':'renders/master/pixel-clash-intro-master.blend','sharedSceneObjects':True,
            'sceneCount':len(bpy.data.scenes),'sharedObjectSignature':shared_signature,
            'cameras':[cam.name for cams in camera_sets.values() for cam in cams],
            'activeCameras':[cam.name for cam in cameras], 'cameraCuts':[1,156,196],
            'impactFrame':196,'transformStartFrame':221,'transformCompleteFrame':287,
            'bullseyeScreen':projected(cameras[2],TARGET), 'originalMeshes':True,
            'jointAnimation':True,'flexingBow':True,'hairShapeKeys':26,'audio':False,
            'safeAreaSamples':samples, 'pixelReveal':'target-first, center-out; portrait vertical expansion',
            **portal_metadata[base]}


scene['cutscene'] = 'Original 3D archery into the PIXEL CLASH world'
scene['duration_seconds'] = 10
scene['palette'] = 'Korean flag-inspired cream / charcoal / deep red / blue, gold accents'
scene['profile_resolutions'] = json.dumps(PROFILES)
select_profile('desktop')
film_settings('desktop')
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'master' / 'pixel-clash-intro-master.blend'))

# Both full-resolution movies are rendered from this same scene in one invocation.
# Lite uses the exact same mobile camera/animation, not a crop of the desktop.
profiles = list(PROFILES) if args.profile == 'all' else [args.profile]
for profile in profiles:
    select_profile(profile)
    metadata = verification_metadata(profile)
    (ASSETS / ('metadata-'+profile+'.json')).write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    print('CAMERA_CHECK',json.dumps(metadata),flush=True)
    if args.preview or args.test_frame:
        if hasattr(scene.render.image_settings,'media_type'):
            scene.render.image_settings.media_type = 'IMAGE'
        scene.render.image_settings.file_format = 'PNG'
        # Full-res master stays untouched; previews use 50% render scale.
        scene.render.resolution_percentage = 50
        for frame in ([args.test_frame] if args.test_frame else [45,115,145,176,210,245,300]):
            scene.frame_set(frame)
            scene.render.filepath = str(OUT / 'previews' / ('preview-'+profile+'-%03d.png'%frame))
            bpy.ops.render.render(write_still=True)
            print('PREVIEW_OK',profile,frame,flush=True)
        scene.render.resolution_percentage = 100
    elif args.render:
        film_settings(profile)
        scene.frame_set(1)
        print('RENDER_START',profile,flush=True)
        bpy.ops.render.render(animation=True)
        print('RENDER_COMPLETE',profile,flush=True)
    else:
        print('SCENE_READY',profile,flush=True)
