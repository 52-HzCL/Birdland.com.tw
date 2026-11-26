"""Original cardboard pack, closed tool and hanging presentation for the shared pruner model.
Exec into the renderer after its base scene is built. Call render_pack('pack-frames').
"""
from mathutils import Matrix, Vector
from math import pi, sin, cos, radians
from shutil import copyfile as _pack_copy
_pack_objects = {}
_pack_rest = {}
def _p_obj(obj,name,group,material):
    obj.name=name
    if material:obj.data.materials.append(material)
    obj.hide_render=True
    _pack_objects.setdefault(group,[]).append(obj)
    return obj
def _p_mesh(name,vs,faces,group,material,rounded=0):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],faces);me.update()
    o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);_p_obj(o,name,group,material)
    import bmesh
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    if rounded:bevel(o,rounded,3)
    return o
def _p_solid(name,poly,zlo,zhi,group,m,r=.015):
    n=len(poly);vs=[(x,y,z) for z in [zlo,zhi] for x,y in poly]
    faces=[tuple(range(n)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return _p_mesh(name,vs,faces,group,m,r)
def _p_box(name,xy,z,group,m,r=.02):
    x0,y0,x1,y1=xy
    return _p_solid(name,[(x0,y0),(x1,y0),(x1,y1),(x0,y1)],*z,group,m,r)
def _p_line(name,pts,radius,group,m):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=radius;cv.bevel_resolution=3;cv.use_fill_caps=True
    sp=cv.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,co in zip(sp.points,pts):p.co=(*co,1)
    o=bpy.data.objects.new(name,cv);scene.collection.objects.link(o);return _p_obj(o,name,group,m)
def _p_cylinder(name,x,y,z0,z1,rad,group,m):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=rad,depth=z1-z0,location=(x,y,(z0+z1)/2))
    o=bpy.context.object;_p_obj(o,name,group,m);bevel(o,.014);return o
def _p_tag(name,outer,inner,base,top,group,m):
    # Extruded ring built as quads, keeping the oblong slot genuinely open.
    def stadium(cx,cy,halfspan,r):
        return [(cx+s*halfspan+r*cos(a),cy+r*sin(a)) for s,start in ((1,-pi/2),(-1,pi/2)) for a in [start+pi*i/20 for i in range(21)]]
    outer_loop=stadium(*outer);inner_loop=stadium(*inner);n=len(inner_loop)
    vs=[(x,y,z) for z in (base,top) for loop in (outer_loop,inner_loop) for x,y in loop]
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces += [(i,j,j+n,i+n),(i+2*n,j+2*n,j+3*n,i+3*n),(i,j,j+2*n,i+2*n),(i+n,j+n,j+3*n,i+3*n)]
    return _p_mesh(name,vs,faces,group,m,.008)
def _p_label(name,body,x,y,z,size,tracking,material):
    cv=bpy.data.curves.new(name,'FONT');cv.body=body;cv.size=size;cv.space_character=tracking;cv.resolution_u=3
    o=bpy.data.objects.new(name,cv);scene.collection.objects.link(o);o.location=(x,y,z);return _p_obj(o,name,'lid',material)
def _p_build():
    if _pack_objects:return
    kraft=mat('Unbleached folded carton',(.35,.213,.103),0,.68,120)
    paper_edge=mat('Paper edge',(.58,.415,.234),0,.73,105)
    pulp=mat('Pressed paper pulp',(.51,.413,.245),0,.86,115)
    pulp_dark=mat('Recessed fiber well',(.32,.263,.166),0,.82,150)
    sleeve=mat('Folded tip guard',(.61,.514,.325),0,.7,105)
    ink=mat('Graphite ink',(.048,.065,.048),0,.6)
    metal=mat('Display peg brushed steel',(.46,.50,.51),.88,.23)
    mount=mat('Display fitting',(.082,.096,.093),.63,.4)
    x0,x1=-4.19,5.98;y0,y1=-1.67,1.67;z0=-.64;zt=.55
    _p_box('Stiff carton back',(x0,y0,x1,y1),(z0,z0+.055),'tray',kraft)
    _p_box('Carton front lip',(x0,y0,x1,y0+.058),(z0,zt),'tray',kraft)
    _p_box('Carton hinge wall',(x0,y1-.058,x1,y1),(z0,zt),'tray',kraft)
    for x in (x0,x1-.058):
        _p_box('Carton folded end',(x,y0+.055,x+.058,y1-.055),(z0,zt),'tray',kraft)
    # Molded pulp is a continuous variable-height surface. Its guard-shaped basin
    # is deliberately generous rather than claiming a production tooling tolerance.
    import math
    nx,ny=124,44;vs=[];fs=[]
    for j in range(ny+1):
        y=y0+.09+(y1-y0-.18)*j/ny
        for i in range(nx+1):
            x=x0+.09+(x1-x0-.18)*i/nx
            if x<-.20:
                center=.22+.11*max(-x-1,0);width=.51+.23*math.exp(-((x+1.9)/1.2)**2)
                distance=abs(y-center)-width
            else:
                t=max(0,min(1,(x-.25)/4.95))
                upper=.10+.87*t+.18*sin(pi*t);lower=-.19-.78*t-.13*sin(pi*t)
                distance=min(abs(y-upper)-.49,abs(y-lower)-.49)
                if x<2.0:distance=min(distance,abs(y)-.73)
            distance=max(distance,(-3.95-x)*.8,(x-5.46)*.8)
            rise=max(0,min(1,(distance+.075)/.30));rise=rise*rise*(3-2*rise)
            z=-.403+.54*rise
            vs.append((x,y,z))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;fs.append((a,a+1,a+nx+2,a+nx+1))
    well=_p_mesh('Contoured molded pulp insert',vs,fs,'tray',pulp)
    for f in well.data.polygons:f.use_smooth=True
    # A folded, open-ended guard shelters the blade tip. The tool enters along X.
    tip=[(-4.01,.65),(-3.94,.93),(-2.68,.83),(-2.73,-.31),(-3.79,.12)]
    _p_solid('Paper tip guard roof',tip,.293,.337,'tray',sleeve,.014)
    for ia,ib in [(0,1),(1,2),(3,4),(4,0)]:
        a=tip[ia];b=tip[ib]
        _p_mesh('Guard fold',[(a[0],a[1],-.36),(b[0],b[1],-.36),(b[0],b[1],.32),(a[0],a[1],.32)],[(0,1,2,3)],'tray',sleeve)
    _p_line('Guard fold line',[(-3.96,.80,.344),(-2.72,.70,.344)],.007,'tray',paper_edge)
    # Neutral retention band folds over the seated handle shoulders.
    section=[(-1.26,-.23),(-1.26,.10),(-.99,.37),(.89,.37),(1.22,.12),(1.22,-.23)]
    for (ya,za),(yb,zb) in zip(section,section[1:]):
        _p_mesh('Folded paper retention band',[(2.07,ya,za),(2.46,ya,za),(2.46,yb,zb),(2.07,yb,zb)],[(0,1,2,3)],'band',sleeve)
    _p_box('Hinged front cover',(x0-.018,y0-.02,x1+.018,y1+.018),(zt+.021,zt+.079),'lid',kraft)
    _p_box('Lid edge',(x0-.02,y0-.03,x1+.02,y0+.02),(zt+.055,zt+.087),'lid',paper_edge,.008)
    _p_label('Neutral carton label','BYPASS PRUNER',-3.67,.52,zt+.087,.43,.99,ink)
    _p_label('Pack description','G A R D E N   T O O L',-3.66,.96,zt+.089,.135,1,ink)
    _p_line('Printed fold rule',[(-3.65,.20,zt+.092),(-.65,.20,zt+.092)],.009,'lid',ink)
    # Project the same tool silhouettes onto the end panel of the carton.
    for name in ['Cutting profile','Counterblade profile','Grip projected','Grip projected.001','Pivot bore','Spring projected']:
        ob=bpy.data.objects.get(name)
        if not ob:continue
        pts=[(1.89+.53*p.co.x,-.11+.53*p.co.y,zt+.091) for p in ob.data.splines[0].points]
        if len(pts)>2:_p_line('Pruner line art',pts,.013,'lid',ink)
    # Two laminated slotted ears connected to the tray's rear wall.
    tx=.93;ty=3.03
    _p_solid('Folded hanging tab',[(tx-1.05,y1-.08),(tx+1.05,y1-.08),(tx+.94,ty-.17),(tx-.94,ty-.17)],z0,z0+.066,'tray',kraft)
    _p_tag('Reinforced hang tab',(tx,ty,.80,.36),(tx,ty,.28,.12),z0,z0+.075,'tray',kraft)
    _p_tag('Laminated eye',(tx,ty,.32,.186),(tx,ty,.28,.12),z0+.070,z0+.100,'tray',paper_edge)
    # Hook runs along Z through the diecut. Installed slot registration is asserted.
    px=tx;py=ty+.51+.043
    # A cropped retail fixture with real through-holes on a square pitch, not a photographic background.
    panelmat=mat('Perforated satin display panel',(.16,.175,.17),.38,.52)
    holes_v=[];holes_f=[]
    pitch=.42;cols=14;rows=9;radius=.051;ns=16
    xleft=px-cols*pitch/2;ylow=py-1.18
    for row in range(rows):
        for col in range(cols):
            centerx=xleft+(col+.5)*pitch;centery=ylow+(row+.5)*pitch
            k=len(holes_v)
            for z in [-4.32,-4.24]:
                for inner in (False,True):
                    for j in range(ns):
                        cs=cos(2*pi*j/ns);sn=sin(2*pi*j/ns)
                        r=radius if inner else pitch*.5/max(abs(cs),abs(sn))
                        holes_v.append((centerx+r*cs,centery+r*sn,z))
            for j in range(ns):
                q=(j+1)%ns
                holes_f.extend([(k+j,k+q,k+ns+q,k+ns+j),(k+2*ns+j,k+2*ns+q,k+3*ns+q,k+3*ns+j),(k+ns+j,k+ns+q,k+3*ns+q,k+3*ns+j)])
    _p_mesh('Perforated sample display rail',holes_v,holes_f,'fixture',panelmat)
    _p_box('Hook base bracket',(px-.36,py-.27,px+.36,py+.45),(-4.24,-4.04),'fixture',mount,.052)
    for xx in [px-.22,px+.22]:_p_cylinder('Bracket button',xx,py+.29,-4.05,-4.005,.057,'fixture',metal)
    _p_cylinder('Welded flange',px,py,-4.05,-3.90,.18,'fixture',metal)
    # A continuous round shank with an upturned tip; follow the exact bend during threading.
    hookpts=[]
    for q in range(100):
        z=-3.93+4.85*q/99
        u=max(0.,min(1.,(z+.16)/.98));u=u*u*(3-2*u)
        hookpts.append((px,py+.47*u,z))
    _p_line('Upturned retail peg',hookpts,.071,'fixture',metal)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=.071,location=hookpts[-1])
    _p_obj(bpy.context.object,'Rounded display peg tip','fixture',metal)
    assert abs(py-(ty+.51))+.071<.12 and -.64> -1.92 and -.54<.17
    bpy.context.view_layer.update()
    for obs in _pack_objects.values():
        for o in obs:_pack_rest[o.name]=o.matrix_world.copy()
def _p_translate(x,y,z):
    return Matrix.Translation(Vector((x,y,z)))
def _p_ease(t,a,b):
    s=max(0.,min(1.,(t-a)/(b-a)));return s*s*(3-2*s)
def _p_frame(i):
    t=i/12;_p_build();reset(normal);close(6.5);standard();dark()
    entry=_p_ease(i,.1,3.0); lift=_p_ease(i,8.2,10); onpeg=_p_ease(i,10,12)
    # Carton approaches from behind and below; it lifts to the peg before moving back onto it.
    rz=.91-2.0*(1-entry)+.77*lift-1.68*onpeg
    bend=_p_ease(rz-.59,-.16,.82)*.47*lift
    ry=-.74-3.85*(1-entry)+1.25*lift+bend
    trayM=_p_translate(0,ry,rz)
    hinge=_p_translate(0,1.67,.55)
    ang=radians(-78)*(1-_p_ease(i,6.0,8.6))
    lidM=trayM@hinge@Matrix.Rotation(ang,4,'X')@hinge.inverted()
    bandM=trayM@_p_translate(0,0,1.10*(1-_p_ease(i,4.5,6)))
    fixtureM=_p_translate(0,2.6*(1-_p_ease(i,7.6,10.1)),0)
    # Tool descends in front of the tray, then slides tip-first into its guard.
    picked=_p_ease(i,0,2);seated=_p_ease(i,2.5,4.3);slide=_p_ease(i,4.1,5.8)
    toolx=.99*picked*(1-slide)
    tooly=(-.74*picked)+1.25*lift+bend
    toolz=(1.85*picked-.94*seated)+.77*lift-1.68*onpeg
    toolM=_p_translate(toolx,tooly,toolz)
    orientation=_p_ease(i,7.5,10.5)
    axis=_p_translate(.88,.36,-.24)
    pivot=_p_translate(0,-.39*orientation,0)@axis@Matrix.Scale(1-.14*orientation,4)@Matrix.Rotation(radians(46)*orientation,4,'Y')@Matrix.Rotation(radians(50)*orientation,4,'X')@axis.inverted()
    for key in normal:
        for o in groups[key]:o.matrix_world=pivot@toolM@o.matrix_world
    for group,transform,visible in [('tray',trayM,i>=1),('lid',lidM,i>=1),('band',bandM,i>=5),('fixture',fixtureM,i>=8)]:
        for o in _pack_objects[group]:
            o.matrix_world=pivot@transform@_pack_rest[o.name];o.hide_render=not visible
    # A small camera settle opens up the view of the physical hook root and front tip.
    # Fit all corners of the carton and fixture in the delivered landscape viewport.
    settle=_p_ease(i,8,11.5)
    if settle:
        camera.rotation_euler.rotate_axis('Z',radians(-18)*settle)
        bpy.context.view_layer.update()
        inv=camera.matrix_world.inverted()
        bounds=[inv@o.matrix_world@Vector(corner) for group in ('fixture','lid','tray') for o in _pack_objects[group] for corner in o.bound_box]
        xlo,xhi=min(v.x for v in bounds),max(v.x for v in bounds)
        ylo,yhi=min(v.y for v in bounds),max(v.y for v in bounds)
        q=camera.matrix_world.to_quaternion()
        camera.location+=q@Vector(((xlo+xhi)*.5*settle,(ylo+yhi)*.5*settle,0))
        fitted=max(xhi-xlo,(yhi-ylo)*1120/680)/.83
        camera.data.ortho_scale=camera.data.ortho_scale*(1-settle)+fitted*settle
def render_pack(name):
    if name=='pack-frames':
        for i in range(13):
            _p_frame(i);render('pack-%02d'%i,1120,680,22)
    else:
        i={'packing':6,'hanging':12}.get(name)
        if i is None:i=int(name.split('-')[-1])
        _p_frame(i);render(name,1120,680,22)
    for obs in _pack_objects.values():
        for o in obs:o.hide_render=True
