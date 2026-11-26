"""Finish and encode the original scroll film. Run after render-home-film.py.
Uses only the rendered geometry projections to place technical marks. The paper
net and guide-bore section are deliberately dimensionless concept annotations.
"""
import argparse
import json
import math
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
FILM = ROOT / 'images' / 'oem-film'
STOPS = ['drawing','die','blade','parts','assembly','packing','hanging']
TYPEFACE = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def dashed(draw, points, fill, width, dash=8, space=5):
    phase = 0.0
    for start, end in zip(points,points[1:]):
        dx, dy = end[0]-start[0], end[1]-start[1]
        length = math.hypot(dx,dy)
        if length < .001:continue
        pos = 0.0
        while pos < length-.001:
            on = phase < dash
            step = min(length-pos, (dash if on else dash+space)-phase)
            if on:
                draw.line([(start[0]+dx*pos/length,start[1]+dy*pos/length),
                           (start[0]+dx*(pos+step)/length,start[1]+dy*(pos+step)/length)],fill,width)
            pos += step
            phase = (phase+step) % (dash+space)
            if phase >= dash+space-.001:phase = 0
            elif abs(phase-dash) < .001:phase = dash

def annotate(image, guide, frame):
    w,h=image.size
    ratio=w/1152
    def point(uv):return (uv[0]*w,uv[1]*h)
    x,y=point(guide['point'])
    stage=min(6,math.floor(frame/24+.5))
    distance=abs(frame/24-stage)
    opacity=max(0,min(1,(.5-distance)/.2))
    if not opacity:return image
    ink=(51,68,57,round(208*opacity))
    muted=(65,77,69,round(138*opacity))
    paper=(241,240,231,round(216*opacity))
    rule=max(1,round(1.7*ratio))
    label=ImageFont.truetype(TYPEFACE,max(12,round(18*ratio)))
    layer=Image.new('RGBA',image.size)
    d=ImageDraw.Draw(layer)
    def line(coords,fill=muted):d.line(coords,fill=fill,width=rule)
    def ring(cx,cy,r):
        d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=ink,width=rule)
    def leader(end):
        ex,ey=end;knee=(ex+(.075*w if ex<x else -.075*w),ey)
        line([(x,y),knee,end]);ring(x,y,4*ratio)
    path=[point(uv) for uv in guide.get('path',[])]
    if stage==0:
        dashed(d,path,ink,rule,6*ratio,5*ratio)
        leader((.53*w,.085*h))
    elif stage==1:
        # Section through a circular guide hole: walls, void, material hatch.
        cx,cy=.175*w,.81*h;s=ratio
        leader((cx+50*s,cy-20*s))
        for side in [-1,1]:
            a,b=sorted([cx+side*16*s,cx+side*61*s])
            d.rectangle((a,cy-13*s,b,cy+12*s),fill=paper,outline=ink,width=rule)
            for j in range(5):
                xx=a+(j*7+2)*s
                line([(xx,cy+11*s),(min(b,xx+14*s),cy-12*s)])
        dashed(d,[(cx,cy-26*s),(cx,cy+22*s)],muted,rule,7*s,4*s)
        d.text((cx,cy+19*s),'A–A',font=label,fill=ink,anchor='mt')
    elif stage==2:
        # Optical detail sampled from this exact rendered angle and the ground edge.
        cx,cy=int(.795*w),int(.20*h);rad=int(.084*w);src=rad/2.4
        crop=image.crop((int(x-src),int(y-src),int(x+src),int(y+src))).resize((2*rad,2*rad),Image.Resampling.LANCZOS)
        mask=Image.new('L',crop.size);ImageDraw.Draw(mask).ellipse((0,0,2*rad-1,2*rad-1),fill=round(245*opacity))
        layer.paste(crop,(cx-rad,cy-rad),mask)
        ring(cx,cy,rad);leader((cx-rad*.67,cy+rad*.75))
    elif stage==3:
        if len(path)==2:
            a,b=path;vx,vy=b[0]-a[0],b[1]-a[1]
            dashed(d,[(a[0]-.20*vx,a[1]-.20*vy),(b[0]+.25*vx,b[1]+.25*vy)],ink,rule)
            for px,py in path:ring(px,py,8*ratio)
    elif stage==4:
        dashed(d,path,ink,rule,6*ratio,5*ratio)
        leader((.19*w,.77*h))
    elif stage==5:
        # The same carton footprint, depth and hang tab as the 3D packaging.
        cx,cy=.74*w,.125*h;bw,bh=.118*w,.118*w*3.34/10.17
        flap=bw*1.195/10.17
        fold=1-.62*min(1,max(0,frame/24-4.58))
        f=flap*fold
        outline=[(0,0),(bw,0),(bw,-f),(bw+bw,-f),(bw+bw,bh+f),(bw,bh+f),(bw,bh),(0,bh),(0,0)]
        def pt(p):return cx+p[0]-bw,cy+p[1]
        d.polygon([pt(p) for p in outline],fill=paper);line([pt(p) for p in outline],ink)
        for a,b in [((0,0),(0,bh)),((bw,0),(bw,bh)),((bw,0),(bw*2,0)),((bw,bh),(bw*2,bh))]:
            dashed(d,[pt(a),pt(b)],muted,rule,5*ratio,4*ratio)
        tab=[pt((bw*.34,0)),pt((bw*.40,-f*1.7)),pt((bw*.60,-f*1.7)),pt((bw*.66,0))]
        line(tab,ink)
        leader(pt((bw*.27,bh)))
    else:
        # The peg threads the carton slot. Annotate the slot rather than a seal.
        r=16*ratio;ring(x,y,r)
        leader((.77*w,.23*h))
    return Image.alpha_composite(image.convert('RGBA'),layer).convert('RGB')

def plate(source,idx):
    base=Image.open(source/f'{idx:03}.png').convert('RGB')
    # This Blender build is CPU-only; preserve fine strokes while reducing grain.
    photo=Image.blend(base,base.filter(ImageFilter.MedianFilter(3)),.66)
    return annotate(photo,json.loads((source/f'{idx:03}.json').read_text()),idx)

def encode(source):
    FILM.mkdir(exist_ok=True)
    with TemporaryDirectory(dir=source.parent,prefix='encoded-') as temporary:
        temporary=Path(temporary)
        for i in range(145):
            im=plate(source,i)
            im.save(temporary/f'{i:03}.png',compress_level=1)
            if i%24==0:
                im.save(FILM/(STOPS[i//24]+'.webp'),quality=90,method=6)
        common=['ffmpeg','-y','-v','error','-framerate','24','-i',str(temporary/'%03d.png'),'-an','-pix_fmt','yuv420p','-threads','6']
        subprocess.run(common+['-c:v','libx264','-preset','medium','-crf','21','-g','6','-keyint_min','6','-bf','0','-movflags','+faststart',str(FILM/'studio.mp4')],check=True)
        subprocess.run(common+['-c:v','libvpx-vp9','-row-mt','1','-cpu-used','5','-b:v','0','-crf','35','-g','6',str(FILM/'studio.webm')],check=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    args=parser.parse_args()
    encode(args.source)
