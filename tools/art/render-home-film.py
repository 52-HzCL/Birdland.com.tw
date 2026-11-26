"""Camera and staging for the Birdland OEM homepage. The product and packaging
come from render-shears.py. All distances are concept-art units, never tolerances.

    blender -b -t 8 -P tools/art/render-home-film.py -- /path/to/frames
    python3 tools/art/encode-home-film.py /path/to/frames
"""
from pathlib import Path
from math import cos, sin, radians
import importlib.util
import sys
import json

import bpy
from mathutils import Matrix, Vector

here = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("shears", here / "render-shears.py")
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)
exec(compile((here / "pack_scene.py").read_text(), "pack_scene.py", "exec"), model.__dict__)
model._p_build()
scene = model.scene
camera = model.camera

# Each interval is one business promise. Interpolate the actual lens and object
# matrices. A continuous camera basis keeps the horizon stable across the back face.
# progress, orbit about tool spine, axial glance, roll, scale, target x/y/z
shots = [
    (0,     14,  -6, -19, 10.7,  .72, .08, .02),
    (1,     65,  13, -12, 12.4, -.02,   0, .80),
    (2,     29,  20, -20,  7.6, -.96,   0, .14),
    (2.45,  69,  17, -18, 10.5,  .55,   0, .36),
    (3,    137,  10, -15, 13.2, 1.45,   0, .32),
    (3.5,  223,  -7, -16, 12.5, 1.15,   0, .17),
    (4,    321, -12, -17, 10.3,  .74,   0, .02),
    (4.75, 382,   5, -12, 13.5,  .84,   0, .44),
    (5,    393,   4,  -8, 13.8,  .86,   0, .52),
    (6,    398,   1,  -7, 12.7,  .88,   0, .15),
]

def ease(value, start, end):
    t = min(1, max(0, (value - start) / (end - start)))
    return t * t * (3 - 2 * t)

def shot_at(t):
    # Cubic interpolation with bounded tangents. The orbit glides across the
    # intermediate shots; it stops at reversals and at either end of the film.
    i = next((n for n in range(len(shots)-1) if t <= shots[n+1][0]), len(shots)-2)
    a, b = shots[i], shots[i+1]
    span = b[0]-a[0]
    u = max(0, min(1, (t-a[0])/span))
    def slope(index, column):
        if index in (0, len(shots)-1):
            return 0
        prev, curr, nxt = shots[index-1:index+2]
        before = (curr[column]-prev[column])/(curr[0]-prev[0])
        after = (nxt[column]-curr[column])/(nxt[0]-curr[0])
        return 2*before*after/(before+after) if before*after > 0 else 0
    return [ (2*u**3-3*u*u+1)*a[j] + (-2*u**3+3*u*u)*b[j] +
             (u**3-2*u*u+u)*span*slope(i,j) + (u**3-u*u)*span*slope(i+1,j)
             for j in range(1,len(a)) ]

def place_camera(t):
    orbit, glance, roll, scale, x, y, z = shot_at(t)
    orbit, glance = radians(orbit), radians(glance)
    normal = Vector((sin(glance), -sin(orbit)*cos(glance), cos(orbit)*cos(glance)))
    right = (Vector((1, 0, 0)) - normal*normal.x).normalized()
    up = normal.cross(right)
    basis = Matrix((right, up, normal)).transposed().to_4x4()
    camera.matrix_world = (Matrix.Translation(Vector((x,y,z)) + normal*18) @ basis
                           @ Matrix.Rotation(radians(roll),4,'Z'))
    camera.data.ortho_scale = scale

# A matte sweep follows the lens behind the exploded assembly, as in a turntable
# studio. Side lighting, reflection flags and occlusion supply the depth.
stage = model.mat("Warm grey studio sweep", (.63,.626,.595), 0, .86)
stage_bs = stage.node_tree.nodes.get("Principled BSDF")
stage_bs.inputs["Emission Color"].default_value = (.6,.59,.55,1)
stage_bs.inputs["Emission Strength"].default_value = .30
bpy.ops.mesh.primitive_plane_add(size=160)
sweep = bpy.context.object
sweep.name = "Seamless studio sweep"
sweep.data.materials.append(stage)
sweep.visible_glossy = False
model.ambient.inputs[0].default_value = (.76,.78,.78,1)
model.ambient.inputs[1].default_value = .68
model.scene.view_settings.look = 'AgX - Medium High Contrast'

def emitter(name, color):
    mat = bpy.data.materials[name]
    node = next(n for n in mat.node_tree.nodes if n.type == 'EMISSION')
    node.inputs[0].default_value = (*color,1)
    node.inputs[1].default_value = 1
emitter("Drawing ink", (.025,.031,.024))
emitter("Graphite blade wash", (.138,.154,.149))
emitter("Edge study", (.33,.35,.33))
emitter("Handle construction tone", (.30,.32,.245))
emitter("Motion study line", (.18,.20,.17))
model.GRID.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (.65,.65,.62,1)
model.GUIDES.node_tree.nodes.get("Principled BSDF").inputs['Base Color'].default_value = (.15,.17,.15,1)

# The instrument paper and the tooling share the blade-axis datum in the scene.
paper_mat = model.mat('Uncoated drafting sheet',(.77,.757,.69),0,.8,145)
paper = model.solid('Instrument paper',[(-4.44,-2.40),(5.82,-2.40),(5.82,2.32),(-4.44,2.32)],-.11,-.085,paper_mat,'drawing',.025)
graphite = model.mat('Registration graphite',(.12,.14,.12),0,.8)
for x in [-4.1, 5.48]:
    for y in [-2.03,1.98]:
        model.tube('Draft register',[(x-.09,y,-.064),(x+.09,y,-.064)],.007,graphite,'drawing')
        model.tube('Draft register',[(x,y-.09,-.064),(x,y+.09,-.064)],.007,graphite,'drawing')
# Upper die shoe and its underside impression. Both halves use the same rough
# blank contour, including the unbored tang; the polished blade appears later.
upper = model.solid('Upper die shoe',model.block_shape,.49,.99,model.DIE,'upper-die',.10)
model.cavity_copy(model.top+list(reversed(model.edge))[1:-1],upper,.32)
for x,y in [(-3.8,-1.72),(-3.8,1.33),(3.48,-1.72),(3.48,1.33)]:
    model.bore(upper,(x,y,.66),.12,1.4)
bpy.context.view_layer.update()
for group in ['drawing','upper-die']:
    for obj in model.groups[group]:
        model.rest[obj.name] = obj.matrix_world.copy()

# Rough blank and finished cutter occupy the same datum while the finish is
# revealed. Give those meshes their own material controls so fasteners keep theirs.
def dissolve_groups(names):
    controls = []
    copies = {}
    for name in names:
        for obj in model.groups[name]:
            for slot in obj.material_slots:
                original = slot.material
                if not original: continue
                if original not in copies:
                    mat = original.copy()
                    copies[original] = mat
                    ns, links = mat.node_tree.nodes, mat.node_tree.links
                    dest = next(n for n in ns if n.type=='OUTPUT_MATERIAL').inputs['Surface']
                    shader = dest.links[0].from_socket
                    mix = ns.new('ShaderNodeMixShader')
                    links.new(ns.new('ShaderNodeBsdfTransparent').outputs[0], mix.inputs[1])
                    links.new(shader, mix.inputs[2])
                    links.new(mix.outputs[0], dest)
                    controls.append(mix.inputs[0])
                slot.material = copies[original]
    return controls
opacity = {key:dissolve_groups(names) for key,names in
           [('rough',['blank']),('finish',['cutting']),('draft',['drawing'])]}
def alpha(key, value):
    for socket in opacity[key]: socket.default_value = value

def move(group, delta):
    transform = Matrix.Translation(Vector(delta))
    for obj in model.groups[group]:
        obj.matrix_world = transform @ model.rest[obj.name]

def pose(t):
    for objects in model._pack_objects.values():
        for obj in objects: obj.hide_render = True
    capture = lambda: place_camera(t)
    model.standard = capture
    for key in opacity:alpha(key,1)
    if t < 4:
        shown = []
        if t < .90:shown.append('drawing')
        if .06 < t < 1.75:shown += ['die','upper-die','blank']
        if t >= 1.49:shown.append('cutting')
        if t >= 1.82:shown += [group for group in model.normal if group != 'cutting']
        model.reset(shown)
        move('drawing',(3.8*ease(t,.12,.9),2.7*ease(t,.12,.9),0))
        alpha('draft',1-ease(t,.15,.88))
        die_dist = 12*(1-ease(t,.10,.92)) + 13*ease(t,1.10,1.75)
        move('die',(0, .32*die_dist, -.93-die_dist))
        move('upper-die',(0,.10*die_dist,2.65+die_dist))
        lift = .85*ease(t,.05,.9) * (1-ease(t,1.12,1.75))
        move('blank',(0,0,lift))
        alpha('rough',ease(t,.1,.70)*(1-ease(t,1.49,1.74)))
        alpha('finish',ease(t,1.49,1.74))
        entry = 1-ease(t,1.82,3)
        spread = 1-ease(t,3.06,3.82)
        # Hardware follows its assembly axis. Larger items approach from outside
        # the shot and keep the same blade, tang, grip and spring relationship.
        for group in model.normal:
            delta = Vector(model.offset[group])*spread
            if group == 'cutting':
                delta *= ease(t,1.66,2.55)
            else:
                out = Vector(model.offset[group]).normalized()
                if group == 'counter':out = Vector((-.35,-.16,-1)).normalized()
                if group == 'spring':out = Vector((.3,-.16,1)).normalized()
                delta += out*(14*entry)
            move(group,delta)
        if t >= 3.82:model.close(6.5*ease(t,3.82,4))
        capture()
    else:
        # Share the approved same-tool paper-tray, retention band, lid and peg rig.
        pack_time = (t-4)*6
        model._p_frame(pack_time)
        # Each sheet and fixture travels in from outside this shot. Preserve the
        # established tray, hinge, guard and hook motion once the item is seated.
        view = camera.matrix_world.to_quaternion()
        for name,start,stop,arrival in [
            ('tray',0,2.4,(0,-10,0)),('lid',0,2.4,(0,-10,0)),
            ('band',3.4,5.6,(1,9,0)),('fixture',6.8,10.1,(0,13,0))
        ]:
            shift = Matrix.Translation(view @ Vector(arrival)*(1-ease(pack_time,start,stop)))
            for obj in model._pack_objects[name]:
                obj.hide_render = pack_time <= start
                obj.matrix_world = shift @ obj.matrix_world

    bpy.context.view_layer.update()
    q = camera.matrix_world.to_quaternion()
    depth = 1.45 + 4.40*ease(t,0,.82) + 1.0*ease(t,4.6,5.7)
    sweep.matrix_world = Matrix.Translation(camera.location + q@Vector((0,0,-18-depth))) @ q.to_matrix().to_4x4()
    # The fixture must not pass in front of the sweep as the final camera settles.
    if t >= 5.45:
        sweep.location += q @ Vector((0,0,-4*ease(t,5.45,6)))

def artwork_guides(t):
    """Capture guide points in the actual lens for the multilingual film plates."""
    from bpy_extras.object_utils import world_to_camera_view
    def pixel(co):
        uv = world_to_camera_view(scene,camera,Vector(co))
        return [round(uv.x,5),round(1-uv.y,5)]
    def on(obj,coords):
        return [pixel(obj.matrix_world @ Vector(co)) for co in coords]
    chosen = min(6,int(t+.5))
    if chosen == 0:
        grip = bpy.data.objects['Grip projected']
        coords = [p.co.xyz for p in grip.data.splines[0].points]
        prior = []
        for i,p in enumerate(coords):
            along = max(0,min(1,(p.x-1.62)/3.49))
            # Two candidate grip widths share their ends and centreline.
            side = 1 if i < len(coords)//2 else -1
            prior.append((p.x,p.y+side*.15*sin(3.14159*along),p.z))
        return dict(point=on(grip,[coords[28]])[0],path=on(grip,prior))
    if chosen == 1:
        return dict(point=on(model.block,[(-3.8,-1.72,-.23)])[0])
    if chosen == 2:
        p=model.inside[len(model.inside)//2]
        return dict(point=on(model.arm,[(p[0],p[1],.17)])[0])
    if chosen == 3:
        ends = [pixel(o.matrix_world.translation) for o in (model.head,model.nut)]
        return dict(point=ends[0],path=ends)
    if chosen == 4:
        # Trace the signed-sample silhouette in the tool's own datum. The
        # finished overlay is illustrative and is also carried into the carton.
        angle = 6.5
        base = model.arm.matrix_world @ model.rest[model.arm.name].inverted()
        if t < 4:
            base = Matrix.Rotation(radians(angle),4,'Z')
        coords=[(x,y,.18) for x,y in model.top+list(reversed(model.edge))[1:-1]]
        return dict(point=pixel(base@Vector((*model.tip,.18))),path=[pixel(base@Vector(p)) for p in coords+[coords[0]]])
    obj = model._pack_objects['tray'][0]
    transform=obj.matrix_world@model._pack_rest[obj.name].inverted()
    if chosen == 5:return dict(point=pixel(transform@Vector((2.28,-.94,.28))))
    return dict(point=pixel(transform@Vector((.93,3.03,-.55))))

def extend_fixture():
    tile = next(o for o in model._pack_objects['fixture'] if o.name.startswith('Perforated sample'))
    others=[]
    for dx,dy in ((-1,0),(1,0),(-1,-1),(0,-1),(1,-1)):
        obj=tile.copy()
        obj.name='Continuous retail fixture'
        scene.collection.objects.link(obj)
        others.append((obj,(dx*14*.42,dy*9*.42,0)))
    return tile,others

fixture_tile,fixture_extensions = extend_fixture()

def main():
    args = sys.argv[sys.argv.index('--')+1:]
    output = Path(args[0]);output.mkdir(parents=True,exist_ok=True)
    guides_only = '--guides' in args
    if guides_only:args.remove('--guides')
    indices = [int(n) for n in args[1:]] or range(145)
    proof = bool(args[1:]) and not guides_only
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    scene.render.image_settings.compression = 12
    scene.render.resolution_x,scene.render.resolution_y = (768,512) if proof else (1152,768)
    scene.cycles.samples = 8 if proof else 18
    scene.cycles.use_denoising = False
    scene.cycles.seed = 5
    scene.render.use_persistent_data = True
    for index in indices:
        path = output/f'{index:03}.png'
        if path.is_file() and not guides_only:continue
        pose(index/24)
        for obj,delta in fixture_extensions:
            obj.hide_render = fixture_tile.hide_render
            obj.matrix_world = fixture_tile.matrix_world @ Matrix.Translation(Vector(delta))
        bpy.context.view_layer.update()
        path.with_suffix('.json').write_text(json.dumps(artwork_guides(index/24)))
        if guides_only:continue
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    main()
