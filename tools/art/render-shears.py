"""Render the original Birdland bypass-pruner concept. Blender 4.3, Cycles CPU.
Artwork units describe an illustration and have no manufacturing scale.
Rebuild everything with: blender -b -t 7 -P tools/art/render-shears.py
Render a single stage with: blender -b -t 7 -P tools/art/render-shears.py -- drawing
"""
from pathlib import Path
import sys, math, json
from mathutils import Vector, Matrix
import bpy
from math import sin, cos, pi

OUTPUT=Path(__file__).resolve().parents[2]/'images'/'oem-process'
OUTPUT.mkdir(exist_ok=True)
scene=bpy.context.scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.cycles.use_denoising=False
scene.cycles.max_bounces=4
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='WEBP'
scene.render.image_settings.quality=91
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
world=bpy.data.worlds.new('Studio ambient')
scene.world=world
world.use_nodes=True
wn=world.node_tree.nodes
wl=world.node_tree.links
ambient=wn.get('Background')
ambient.inputs[0].default_value=(.53,.60,.68,1)
ambient.inputs[1].default_value=.42
backdrop=wn.new('ShaderNodeBackground')
switch=wn.new('ShaderNodeMixShader')
ray=wn.new('ShaderNodeLightPath')
wl.new(ray.outputs['Is Camera Ray'],switch.inputs[0])
wl.new(ambient.outputs[0],switch.inputs[1])
wl.new(backdrop.outputs[0],switch.inputs[2])
wl.new(switch.outputs[0],wn.get('World Output').inputs['Surface'])

def mat(name,color,metal=0,r=.38,grain=0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    nd,links=m.node_tree.nodes,m.node_tree.links
    bs=nd.get('Principled BSDF')
    for k,v in [('Base Color',(*color,1)),('Metallic',metal),('Roughness',r)]:bs.inputs[k].default_value=v
    if grain:
        n=nd.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=grain;n.inputs['Detail'].default_value=2
        tex=nd.new('ShaderNodeTexCoord'); links.new(tex.outputs['Object'],n.inputs[0])
        bump=nd.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.115;bump.inputs['Distance'].default_value=.012
        links.new(n.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],bs.inputs['Normal'])
    return m
STEEL=mat('Brushed chromium steel',(.255,.288,.312),.98,.225,215)
HONED=mat('Honed cutting bevel',(.80,.84,.87),.98,.16,270)
ALLOY=mat('Satin gunmetal forging',(.165,.183,.197),.94,.31,155)
PIN=mat('Blackened pivot',(.065,.075,.08),.83,.31,130)
def srgb(hex_value):
    v=[int(hex_value[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(a/12.92 if a<=.04045 else ((a+.055)/1.055)**2.4 for a in v)
GREEN=mat('Olive grip concept',srgb('596346'),.04,.42,200)
GRAPHITE=mat('Graphite rubber grip',srgb('353A34'),.01,.55,240)
RUBBER=mat('Compression bumper',(.024,.026,.024),.0,.53,80)
DIE=mat('Tool steel die',(.235,.26,.29),.89,.29,190)
groups={}
home={}
def add(o,g,m=None):
    if m:o.data.materials.append(m)
    groups.setdefault(g,[]).append(o)
    home[o.name]=o.location.copy()
    return o
def bevel(o,amount,segs=3):
    mod=o.modifiers.new('Edge radii','BEVEL');mod.width=amount;mod.segments=segs
    mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True
    return o
def solid(name,points,z0,z1,material,group,rad=.04):
    n=len(points);vs=[(x,y,z) for z in [z0,z1] for x,y in points]
    fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    # orient every normal outward, including contours originally authored clockwise
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
    add(o,group,material)
    if rad:bevel(o,rad)
    return o
def bez(start,*segments):
    p=Vector(start);out=[tuple(p)]
    for a,b,c in segments:
        a,b,c=map(Vector,(a,b,c))
        for i in range(1,12):
            t=i/11;s=1-t
            out.append(tuple(s**3*p+3*s*s*t*a+3*s*t*t*b+t**3*c))
        p=c
    if (Vector(out[0])-Vector(out[-1])).length<.001:out.pop()
    return out
def cylinder(name,pos,r,d,m,g,verts=64,b=.022):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d,location=pos)
    o=bpy.context.object;o.name=name;add(o,g,m)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    if b:bevel(o,b)
    return o
def bore(o,pos,radius,depth):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=pos)
    cut=bpy.context.object
    mod=o.modifiers.new('Pivot eye','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
    bpy.context.view_layer.objects.active=o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cut,do_unlink=True)
def tube(name,points,r,m,g):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=r;cv.bevel_resolution=4;cv.resolution_u=8;cv.use_fill_caps=True
    spline=cv.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,cv);scene.collection.objects.link(o);add(o,g,m)
    return o

# Two offset bypass members; each blade tapers into the opposite handle.
tip=(-3.64,1.00)
edge=bez(tip,((-3.20,.11),(-2.42,-.57),(-1.53,-.43)),((-.98,-.43),(-.61,-.25),(-.38,-.16)))
top=bez(tip,((-2.75,.65),(-2.12,.75),(-1.38,.78)),((-.78,.80),(-.51,.46),(-.18,.45)),((.28,.49),(.48,.16),(.51,-.14)),((.70,-.36),(1.0,-.56),(1.54,-.71)),((2.05,-.88),(2.65,-1.10),(3.28,-1.36)),((3.32,-1.44),(3.27,-1.64),(3.11,-1.68)),((2.31,-1.46),(1.48,-1.23),(.68,-.97)),((.06,-.80),(-.45,-.45),(-.38,-.16)))
def align_shank(path, upper):
    shaped=[]
    for x,y in path:
        if x>1.02:
            t=(x-1.08)/4.03
            center=(.71+.89*t+.19*sin(pi*t)) if upper else (-.75-.96*t-.08*sin(pi*t))
            previous=(.74+.16*(x-1.08)) if upper else (-.80-.33*(x-1.08))
            blend=min(1.,(x-1.02)/.42)
            y=y*(1-blend)+(center+.48*(y-previous))*blend
        shaped.append((x,y))
    return shaped
def trim_tang(points,xmax=1.58):
    out=[]
    for i,b in enumerate(points):
        a=points[i-1]
        if (a[0]<=xmax)!=(b[0]<=xmax):
            t=(xmax-a[0])/(b[0]-a[0]);out.append((xmax,a[1]+(b[1]-a[1])*t))
        if b[0]<=xmax:out.append(b)
    return out
fixings={'lower-grip':[(.77,-.564),(1.36,-.795)],'upper-grip':[(.79,.349),(1.36,.705)]}
top=trim_tang(align_shank(top,False))
arm=solid('Cutting member',top+list(reversed(edge))[1:-1],.015,.105,STEEL,'cutting')
bore(arm,(0,0,.10),.167,1)
# A varying-width bevel on the exposed (outer) surface, constructed off the cutting curve.
inside=[]
for i,(x,y) in enumerate(edge):
    f=i/(len(edge)-1); w=.23*max(0,sin(f*pi))**.67
    inside.append((x+.02*w,y+w))
crown=solid('Blade ground face',top+list(reversed(inside))[1:-1],.104,.18,STEEL,'cutting',.017)
bore(crown,(0,0,.15),.167,1)
vs=[(x,y,z) for row,z in [(edge,.103),(inside,.179)] for x,y in row]
n=len(edge);fs=[(i,i+1,n+i+1,n+i) for i in range(n-1)]
me=bpy.data.meshes.new('Honed strip');me.from_pydata(vs,[],fs);me.update()
band=bpy.data.objects.new('Honed strip',me);scene.collection.objects.link(band);add(band,'cutting',HONED)
for f in me.polygons:f.use_smooth=True
# Underside counterblade: a concave inner face cradles the stem and bypasses the upper blade.
counter=bez((-3.53,.18),((-3.25,-.39),(-2.58,-.93),(-1.83,-.98)),((-1.13,-1.06),(-.67,-.47),(-.29,-.43)),((-.05,-.35),(.21,-.31),(.46,-.17)),((.84,.19),(1.28,.48),(1.73,.56)),((2.30,.73),(2.86,.82),(3.20,.84)),((3.38,.88),(3.39,1.10),(3.27,1.23)),((2.63,1.15),(2.11,1.07),(1.49,1.00)),((.85,.98),(.58,.68),(.28,.40)),((.04,.52),(-.33,.43),(-.50,.19)),((-.71,-.14),(-1.19,-.61),(-1.90,-.65)),((-2.52,-.68),(-3.06,-.31),(-3.53,.18)))
counter=trim_tang(align_shank(counter,True))
back=solid('Counterblade member',counter,-.174,.010,ALLOY,'counter')
bore(back,(0,0,-.08),.167,1)
for member,group in [(arm,'lower-grip'),(crown,'lower-grip'),(back,'upper-grip')]:
    for x,y in fixings[group]:bore(member,(x,y,.05),.058,1)
# Sculpted molded grips with oval cross sections following the metal shanks.
def sleeve(group,upper):
    verts=[];faces=[];rings=60;sides=32
    for i in range(rings+1):
        t=i/rings
        x=1.62+3.49*t
        y=(.86+.76*t+.19*sin(pi*t)) if upper else (-.93-.79*t-.08*sin(pi*t))
        z=-.08 if upper else .10
        cap=min(1,math.sqrt(max(0,1-(max(0,t-.890)/.110)**2)))
        cap=max(.012,cap)
        endblend=min(1,(.10+t*18))
        rad_y=(.255+.083*sin(pi*t)**.7+.030*cos(2*pi*t)+.073*math.exp(-((t-.76)/.18)**2)-.038*math.exp(-((t-.19)/.095)**2))*cap*(.92+.08*endblend)
        rad_z=(.193+.066*sin(pi*t)**.76)*cap
        for j in range(sides):
            a=j*2*pi/sides
            lip=(1-min(1,t/.10))*.10*(1+(1 if upper else -1)*cos(a))*.5
            verts.append((x+lip,y+cos(a)*rad_y,z+sin(a)*rad_z))
    for i in range(rings):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(rings*sides,(rings+1)*sides))])
    me=bpy.data.meshes.new(group);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(group,me);scene.collection.objects.link(o);add(o,group,GREEN)
    for f in me.polygons:f.use_smooth=True
    # A shallow elastomer inlay follows the curved outer palm surface.
    inset=[];quads=[];ni,nj=39,13
    for ii in range(ni):
        t=.16+.71*ii/(ni-1);k=int(t*rings)
        cx=1.62+3.49*t
        cy=(.86+.76*t+.19*sin(pi*t)) if upper else (-.93-.79*t-.08*sin(pi*t))
        span=.75*max(.009,sin(pi*ii/(ni-1)))**.45
        for jj in range(nj):
            angle=(1.08 if upper else 1.87)+span*(2*jj/(nj-1)-1)
            jf=angle*sides/(2*pi);j=int(jf);u=jf-j;v=t*rings-k
            def point(k,j):return Vector(verts[k*sides+(j%sides)])
            pt=(point(k,j)*(1-u)+point(k,j+1)*u)*(1-v)+(point(k+1,j)*(1-u)+point(k+1,j+1)*u)*v
            pt+=Vector((0,cos(angle),sin(angle)))*.009
            inset.append(tuple(pt))
    for ii in range(ni-1):
        for jj in range(nj-1):
            h=ii*nj+jj;quads.append((h,h+1,h+1+nj,h+nj))
    gm=bpy.data.meshes.new('Grip inlay');gm.from_pydata(inset,[],quads);gm.update()
    ov=bpy.data.objects.new('Graphite palm panel '+group,gm);scene.collection.objects.link(ov);add(ov,group,GRAPHITE)
    for f in gm.polygons:f.use_smooth=True
for g,u in [('upper-grip',True),('lower-grip',False)]:sleeve(g,u)
# Separate grip attachment ears and the two distinct fastener pairs for each tang.
for g,upper in [('upper-grip',True),('lower-grip',False)]:
    pts=fixings[g];sgn=1 if upper else -1
    zlow=.012 if upper else .182
    profile=[(.59,pts[0][1]-.115),(.65,pts[0][1]-.16),(1.38,pts[1][1]-.16),(1.97,pts[1][1]+.13*sgn-.13),(2.12,pts[1][1]+.13*sgn+.12),(1.44,pts[1][1]+.16),(.72,pts[0][1]+.16),(.58,pts[0][1]+.078)]
    ear=solid('Grip mounting ear '+g,profile,zlow,zlow+.115,ALLOY,g,.035)
    fast=g+'-screws'
    for idx,(x,y) in enumerate(pts):
        bore(ear,(x,y,zlow),.059,1)
        # Separately grouped pieces in registered common axes, parked just above the holes in exploded view.
        screw=cylinder(g+' screw '+str(idx+1),(x,y,zlow+.126),.089,.045,STEEL,fast,32,.009)
        cylinder(g+' shank '+str(idx+1),(x,y,zlow-.02),.046,.25,PIN,fast,24,.005)
        tube('Drive slot '+g+str(idx),[(x-.039,y-.017,zlow+.150),(x+.039,y+.017,zlow+.150)],.008,PIN,fast)
        cylinder(g+' attached nut '+str(idx+1),(x,y,(-.203 if upper else -.015)),.087,.055,PIN,'counter' if upper else 'cutting',6,.006)

# A coaxial shoulder pivot through both eyes; washer, nut, head, and spring are external surfaces.
shaft=cylinder('Pivot shoulder',(0,0,0),.148,.52,PIN,'bolt')
head=cylinder('Button pivot head',(0,0,.259),.217,.101,STEEL,'bolt',64,.029)
# Recessed Allen socket is part of the fastener head.
bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.100,depth=.10,location=(0,0,.309));socket=bpy.context.object
md=head.modifiers.new('Internal hex drive','BOOLEAN');md.operation='DIFFERENCE';md.object=socket
bpy.context.view_layer.objects.active=head
for md in list(head.modifiers):bpy.ops.object.modifier_apply(modifier=md.name)
bpy.data.objects.remove(socket,do_unlink=True)
washer=cylinder('Front washer',(0,0,.200),.257,.038,PIN,'washer',64,.012)
bore(washer,(0,0,.21),.166,.9)
nut=cylinder('Rear locking nut',(0,0,-.288),.208,.14,ALLOY,'nut',6,.028)
bore(nut,(0,0,-.29),.133,.9)
# Helical compression spring between two inward-facing seats on the handles.
sx=1.37
spiral=[]
for i in range(257):
    t=i/256;a=t*7.25*2*pi
    spiral.append((sx+.126*cos(a),-.60+1.24*t,.015+.126*sin(a)))
tube('Return spring',spiral,.031,STEEL,'spring')
for y,g in [(-.612,'lower-grip'),(.642,'upper-grip')]:
    o=cylinder('Spring seat '+g,(sx,y,.025),.160,.13,PIN,g,48,.016);o.rotation_euler.x=pi/2

# The pivot screw-retainer sits on the counterblade side. It is not a safety latch.
plate_outline=[(.285*cos(pi*.50+j*pi/12),.285*sin(pi*.50+j*pi/12)) for j in range(13)]
plate_outline += [(.25,-.188),(.44,-.17),(.48,-.11),(.47,-.005),(.41,.069),(.225,.16),(.09,.27)]
plate=solid('Pivot screw-retaining plate',plate_outline,-.262,-.188,PIN,'retainer',.011)
# The six-flat aperture registers around the actual nut flats. A circular clearance hole would not restrain turning.
bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.216,depth=.55,location=(0,0,-.22));key_cut=bpy.context.object
md=plate.modifiers.new('Keyed nut engagement','BOOLEAN');md.operation='DIFFERENCE';md.object=key_cut
bpy.context.view_layer.objects.active=plate
for md in list(plate.modifiers):bpy.ops.object.modifier_apply(modifier=md.name)
bpy.data.objects.remove(key_cut,do_unlink=True)
ret=cylinder('Retainer screw',(.37,-.074,-.277),.064,.032,STEEL,'retainer',32,.012)
# The concept bumper occupies the inside of the grip, separate from its pivot and handle fixings.
cushion=cylinder('Graphite cushioning stop',(1.23,.52,.155),.105,.15,GRAPHITE,'upper-grip',40,.033);cushion.rotation_euler.x=pi/2
def ring(name,cx,cy,cz,r):
    return [(cx+r*cos(i*2*pi/80),cy+r*sin(i*2*pi/80),cz) for i in range(81)]
# Hard tooling scene: lower die with a single member-shaped impression, a separate matched upper tool.
block_shape=[(-4.2,-2.20),(3.88,-2.20),(3.88,1.80),(-4.2,1.80)]
block=solid('Die block',block_shape,-1.2,-.23,DIE,'die',.14)
def cavity_copy(shape,target,z):
    cutter=solid('Temporary cavity cutter',shape,z-.14,z+.40,STEEL,'transient',.035)
    mod=target.modifiers.new('Profile cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.context.view_layer.objects.active=target
    for md in list(target.modifiers):bpy.ops.object.modifier_apply(modifier=md.name)
    groups['transient'].remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
cavity_copy(top+list(reversed(edge))[1:-1],block,-.23)
for x,y in [(-3.8,-1.72),(-3.8,1.33),(3.48,-1.72),(3.48,1.33)]:
    bore(block,(x,y,-.65),.12,2)
# Single solid rough preform floats above its lower impression. Finishing later forms pivot bore and edge.
blank=solid('Unmachined preform',top+list(reversed(edge))[1:-1],.035,.25,ALLOY,'blank',.06)
def line_material():
    m=bpy.data.materials.new('Drawing ink');m.use_nodes=True
    ns=m.node_tree.nodes;em=ns.new('ShaderNodeEmission');em.inputs[0].default_value=(.57,.71,.77,1);em.inputs[1].default_value=1.2
    m.node_tree.links.new(em.outputs[0],ns.get('Material Output').inputs['Surface']);return m
INK=line_material()
# Drawing paths are derived from the exact solid silhouette, rather than independent artwork.
for name,path in [('Cutting profile',top+list(reversed(edge))[1:-1]),('Counterblade profile',counter)]:
    tube(name,[(x,y,.26) for x,y in path+[path[0]]],.016,INK,'drawing')
tube('Pivot bore',ring('hole',0,0,.27,.167),.012,INK,'drawing')
for upper in [True,False]:
    g=groups['upper-grip' if upper else 'lower-grip'][0].data
    vs=[tuple(v.co) for v in g.vertices]
    shell=vs[0::32]+list(reversed(vs[16::32]))
    tube('Grip projected',[(x,y,.27) for x,y,z in shell+[shell[0]]],.012,INK,'drawing')
tube('Spring projected',[(x,y,.26) for x,y,z in spiral],.008,INK,'drawing')
for pts in [[(-.75,0,.25),(.75,0,.25)],[(0,-.66,.25),(0,.66,.25)]]:
    tube('Drawing centerline',pts,.006,INK,'drawing')
for g,items in fixings.items():
    for x,y in items:
        tube('Mounting eye',ring('eye',x,y,.28,.063),.013,INK,'drawing')
        tube('Eye registration',[(x-.102,y,.27),(x+.102,y,.27)],.004,INK,'drawing')
        tube('Eye registration',[(x,y-.10,.27),(x,y+.10,.27)],.004,INK,'drawing')
for rr in [.20,.25]:tube('Pivot rim',ring('axis',0,0,.28,rr),.011,INK,'drawing')
tube('Ground face line',[(x,y,.27) for x,y in inside],.012,INK,'drawing')
for i in range(2,len(edge)-2,2):
    x,y=edge[i];xi,yi=inside[i]
    tube('Bevel hatching',[(x+.03,y+.016,.28),(xi-.02,yi-.019,.28)],.004,INK,'drawing')
for g in ['lower-grip','upper-grip']:
    obj=next(o for o in groups[g] if 'palm panel' in o.name)
    vv=[v.co for v in obj.data.vertices]
    out=vv[0::13]+list(reversed(vv[12::13]))
    tube('Palm panel profile',[(v.x,v.y,.3) for v in out+[out[0]]],.008,INK,'drawing')
# Drafting hierarchy: faint construction grid, separate datum dimensions, and mounting-ear outlines.
GRID=mat('Drawing construction grid',(.035,.048,.048),0,1)
GUIDES=mat('Construction leaders',(.18,.23,.19),0,.7)
for j in range(-8,11):
    x=j*.25
    tube('Fine vertical grid',[(x,-1.48,-.01),(x,1.65,-.01)],.0018 if j%4 else .0028,GRID,'drawing')
for i in range(-6,7):
    y=i*.25
    tube('Fine horizontal grid',[(-2.05,y,-.01),(2.56,y,-.01)],.0018 if i%4 else .0028,GRID,'drawing')
for gr in ['upper-grip','lower-grip']:
    pts=fixings[gr];sg=1 if gr=='upper-grip' else -1
    profile=[(.59,pts[0][1]-.115),(.65,pts[0][1]-.16),(1.38,pts[1][1]-.16),(1.97,pts[1][1]+.13*sg-.13),(2.12,pts[1][1]+.13*sg+.12),(1.44,pts[1][1]+.16),(.72,pts[0][1]+.16),(.58,pts[0][1]+.078)]
    # Only the portion in front of the overmould is visible in this projection.
    exposed=trim_tang(profile,1.66)
    tube('Drawn grip mounting ear',[(x,y,.28) for x,y in exposed+[exposed[0]]],.009,INK,'drawing')
for x,y in [(-3.64,1.00),(5.09,1.64),(0,0)]:
    for j in range(4):
        lo=.33+j*.18
        tube('Interrupted witness',[(x,y+lo,.025),(x,y+lo+.085,.025)],.0045,GUIDES,'drawing')
# Visible draft wash follows surfaces of the real geometry and uses the same projections.
def tonal(name,rgb,strength=1):
    m=bpy.data.materials.new(name);m.use_nodes=True
    ns=m.node_tree.nodes;em=ns.new('ShaderNodeEmission');em.inputs[0].default_value=(*rgb,1);em.inputs[1].default_value=strength
    m.node_tree.links.new(em.outputs[0],ns.get('Material Output').inputs['Surface'])
    return m
metal_wash=tonal('Graphite blade wash',(.055,.075,.077))
edge_wash=tonal('Edge study',(.140,.172,.169))
arm_wash=tonal('Handle construction tone',(.033,.044,.037))
faint=tonal('Motion study line',(.104,.124,.110))
shapes=[('Upper blade wash',top+list(reversed(inside))[1:-1],metal_wash),('Bevel wash',edge+list(reversed(inside)),edge_wash),('Counter wash',counter,arm_wash)]
for g in ['upper-grip','lower-grip']:
    mesh=groups[g][0].data;vv=[v.co for v in mesh.vertices]
    shell=vv[0::32]+list(reversed(vv[16::32]))
    shapes.append(('Grip wash',[(v.x,v.y) for v in shell],arm_wash))
for idx,(label,poly,tone) in enumerate(shapes):
    if len(poly)>2:solid(label,poly,-.047+idx*.002,-.046+idx*.002,tone,'drawing',0)
for start,ang in [(Vector((tip[0],tip[1],0)),6.5),(Vector((-3.53,.18,0)),-6.5)]:
    arc=[]
    for j in range(25):
        t=j/24;v=Matrix.Rotation(math.radians(ang*t),4,'Z')@start;arc.append((v.x,v.y,.3))
    tube('Jaw travel about common axis',arc,.008,faint,'drawing')
for shape,ang in [(edge,6.5),(counter[:22],-6.5)]:
    for j in range(0,len(shape)-2,3):
        seg=[]
        for x,y in shape[j:j+2]:
            v=Matrix.Rotation(math.radians(ang),4,'Z')@Vector((x,y,0));seg.append((v.x,v.y,.28))
        tube('Broken closed-position projection',seg,.006,faint,'drawing')
# Inspect clearance by looking at actual blade/pivot surfaces with a close camera.
def aim(o,at):o.rotation_euler=(Vector(at)-o.location).to_track_quat('-Z','Y').to_euler()
def light(name,pos,power,width,height,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=width;data.size_y=height;data.color=color
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=pos;aim(o,(.4,0,0))
light('Broad softbox',(-4,1,7),460,7,4,(1,.95,.88))
light('Silver rim',(1,6,3),820,6,1.4,(.83,.91,1))
light('Blade strip',(-4,-5,3),490,6,.6,(1,1,1))
light('Grip edge',(6,1,5),450,4,4,(.94,1,.88))
# Broad studio flags make metal read as reflective rather than a flat silver diffuse.
def flag(name,pos,size,reflectance):
    bpy.ops.mesh.primitive_plane_add(size=1,location=pos)
    o=bpy.context.object;o.name=name;aim(o,(0,0,0));o.scale=(size[0],size[1],1)
    o.visible_camera=False;o.visible_diffuse=False;o.visible_shadow=False;o.visible_transmission=False
    m=bpy.data.materials.new(name);m.use_nodes=True
    ns=m.node_tree.nodes;em=ns.new('ShaderNodeEmission');em.inputs[0].default_value=(*reflectance,1)
    m.node_tree.links.new(em.outputs[0],ns.get('Material Output').inputs['Surface']);o.data.materials.append(m)
flag('Negative fill',(-1,4,7),(5.5,10),(.008,.010,.014))
flag('Blade rim card',(-4,4,6),(1.1,10),(.95,.95,.98))
flag('Grip silver edge',(6,-3,5),(1.1,8),(.54,.60,.65))
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
def camera_at(target,delta,scale,roll):
    camera.location=Vector(target)+Vector(delta);aim(camera,target);camera.rotation_euler.rotate_axis('Z',roll*pi/180);camera.data.ortho_scale=scale
bpy.context.view_layer.update()
rest={o.name:o.matrix_world.copy() for objects in groups.values() for o in objects}
def reset(enabled):
    for group,objects in groups.items():
        for o in objects:
            o.hide_render=group not in enabled
            o.matrix_world=rest[o.name].copy()
def motion(group,delta,ratio):
    for o in groups[group]:o.location=home[o.name]+Vector(delta)*ratio
normal=['cutting','counter','upper-grip','lower-grip','upper-grip-screws','lower-grip-screws','bolt','nut','washer','spring','retainer']
offset={'cutting':(0,0,.70),'counter':(0,0,-.42),'upper-grip':(1.75,.65,-.42),'lower-grip':(1.80,-.68,.70),'upper-grip-screws':(1.75,.65,.65),'lower-grip-screws':(1.80,-.68,1.76),'retainer':(0,0,-.98),'bolt':(0,0,2.38),'washer':(0,0,1.48),'nut':(0,0,-1.75),'spring':(.02,0,1.25)}
def exploded(r):
    for g,delta in offset.items():motion(g,delta,r)
def render(name,width=1120,height=680,samples=26):
    scene.cycles.samples=samples;scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.filepath=str(OUTPUT/(name+'.webp'))
    bpy.ops.render.render(write_still=True)
def dark():
    backdrop.inputs[0].default_value=(.012,.014,.016,1);backdrop.inputs[1].default_value=1
def standard():camera_at((1.15,.0,.15),(.4,-9,13),11.95,-8)
def frame(r):
    reset(normal);standard();dark();exploded(r)
def close(angle):
    cut=Matrix.Rotation(math.radians(angle),4,'Z')
    counter=Matrix.Rotation(-math.radians(angle),4,'Z')
    for names,matrix in [(['cutting','lower-grip','lower-grip-screws'],cut),(['counter','upper-grip','upper-grip-screws','retainer'],counter)]:
        for name in names:
            for obj in groups[name]:obj.matrix_world=matrix@rest[obj.name]
    # Affine return-spring pose matches its two rotated seats exactly, with no axis stretch other than length.
    first=Vector((sx,-.60,.015));last=Vector((sx,.64,.015))
    new_first=cut@first;new_last=counter@last
    original=last-first;new=new_last-new_first
    rot=original.rotation_difference(new).to_matrix().to_4x4()
    stretch=Matrix.Diagonal(Vector((1.,new.length/original.length,1.,1.)))
    transform=Matrix.Translation(new_first)@rot@stretch@Matrix.Translation(-first)
    groups['spring'][0].matrix_world=transform@rest[groups['spring'][0].name]
    assert (transform@first-new_first).length<1e-5 and (transform@last-new_last).length<1e-5
    assert abs((cut@Vector((0,0,0))).length)<1e-6 and new.length<original.length
    return round(new.length/original.length,5)
def do(name):
    dark();standard()
    if name=='hero':
        reset(normal);backdrop.inputs[0].default_value=(1,1,1,1);backdrop.inputs[1].default_value=10
        camera_at((.74,.47,0),(0,-6.0,15),10.35,-13);render('hero',1600,830,48)
    elif name=='drawing':
        reset(['drawing']);camera_at((.74,.20,0),(0,0,15),10.6,-10);render(name,1600,850,32)
    elif name=='die':
        reset(['die','blank']);motion('blank',(0,0,1.05),1);camera_at((-.2,-.2,.04),(4,-8,9.5),10.0,-7);render(name)
    elif name=='blade':
        reset(['cutting']);camera_at((-.39,0,.06),(.0,-4.5,12),8.6,-16);render(name)
    elif name in ('parts','assembly'):
        frame(1 if name=='parts' else 0)
        if name=='assembly':close(6.5)
        render(name)
    elif name=='inspection':
        reset(normal);camera_at((-.48,-.08,0),(0,-4.8,12),5.1,-9);render(name)
    elif name=='finished':
        frame(0);close(6.5);camera_at((.72,.18,0),(.4,-9,13),10.12,-10);render(name)
    elif name=='metadata':
        frame(0)
        props={'product':'Illustrative bypass garden pruner, not a production drawing','method':'Orthographic images of one Blender scene','groups':normal,'assembly_states':13,'pack_states':13,'packing_poster':'pack-06.webp','hanging_poster':'pack-12.webp','pack_entry_matches':'assembly-12.webp','first_frame':'assembly-00.webp','fully_seated_closed':'assembly-12.webp','grip_fastener_count_per_handle':2,'palette_srgb':['#596346','#353A34'],'assembly_reference':'https://arscorporation.jp/wp-content/uploads/2026/10/ARS_PARTS_VS-7XZ_VS-8XZ_VS-9XZ-EX.pdf','member_offset':'Cutter front and counterblade rear with different Z planes; both pivot around world Z','tooling':'Lower half of concept forming die with single-member negative impression and a separate rough preform; pivot bore and bevel are later operations','spring':'One compression spring between the two inner handle seats','finished_half_angle_degrees':6.5,'finished_spring_fraction':close(6.5),'visual_asset_units':'Illustration only; no fabrication scale or tolerances'}
        (Path(__file__).with_name('shears-model.json')).write_text(json.dumps(props,indent=2)+'\n')
    elif name.startswith('pack') or name=='hanging':
        if 'render_pack' not in globals():exec((Path(__file__).parent/'pack_scene.py').read_text(),globals())
        render_pack(name)
    elif name=='assembly-frames':
        for i in range(13):
            frame(max(0,1-i/9))
            if i>9:close(6.5*(i-9)/3)
            render('assembly-%02d'%i,1120,680,22)
if __name__=='__main__':
    requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['drawing','die','blade','assembly-frames','pack-frames']
    for name in requested:do(name)
    do('metadata')
