import json, sys
sys.path.insert(0,'tools/sprites')
from PIL import Image
from blobs import im, blobs
bands=json.load(open('/tmp/bands.json'))
# grid icons 14x14 inner
def cellimg(idx):
    r,c=divmod(idx,8); x,y=250+16*c,9+16*r
    return im.crop((x+1,y+1,x+13,y+13)).convert('RGB')
cells={i:cellimg(i) for i in range(70) if i%8<7}
def diff(a,b):
    pa,pb=a.load(),b.load(); d=0
    for y in range(12):
        for x in range(12):
            d+=sum(abs(pa[x,y][k]-pb[x,y][k]) for k in range(3))
    return d
res={}
extra=[(0,140,300)]  # region above bands handled separately
for bi,(y0,y1) in enumerate(bands):
    bs=blobs(0,y0,60,y1+1,join=1)
    icon=[b for b in bs if b[0]<40 and 13<=b[2]-b[0]<=18 and 13<=b[3]-b[1]<=18]
    if not icon: res[bi]=None; continue
    b=sorted(icon,key=lambda b:b[1])[0]
    c=im.crop((b[0]+2,b[1]+2,b[0]+14,b[1]+14)).convert('RGB')
    best=min(cells,key=lambda i:diff(c,cells[i]))
    res[bi]=(best,diff(c,cells[best]),b)
for bi,v in res.items(): print(bi, bands[bi], v if v is None else (v[0],v[1]))
json.dump({k:(v and [v[0],v[1],v[2]]) for k,v in res.items()},open('/tmp/match.json','w'))
