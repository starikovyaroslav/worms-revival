import sys, os
sys.path.insert(0,'tools/sprites')
from PIL import Image
from blobs import im, BG
CV=32; FX,FY=16,29
def keyed(c):
    c=c.convert('RGBA'); p=c.load()
    for y in range(c.height):
        for x in range(c.width):
            r,g,b,a=p[x,y]
            if abs(r-BG[0])<6 and abs(g-BG[1])<6 and abs(b-BG[2])<6: p[x,y]=(0,0,0,0)
    return c
def skin(c): r,g,b,a=c; return a>0 and r>150 and 90<g<200 and 90<b<200 and r-g>25 and abs(g-b)<45
def anchor(c):
    p=c.load(); pts=[(x,y) for y in range(c.height) for x in range(c.width) if skin(p[x,y])]
    if not pts: return c.width//2,c.height-1
    by=max(y for x,y in pts); xs=[x for x,y in pts if y>=by-3]
    return sum(xs)//len(xs),by
def place(c,anchored=True,center=False):
    out=Image.new('RGBA',(CV,CV),(0,0,0,0))
    if center: out.paste(c,((CV-c.width)//2,(CV-c.height)//2),c); return out
    ax,ay=anchor(c) if anchored else (c.width//2,c.height-1)
    ox,oy=FX-ax,FY-ay
    if oy+c.height>CV: oy=CV-c.height
    out.paste(c,(ox,oy),c); return out
