# Splits the ripped sheet into weapon rows (found via their leading icon) and sprite lines.
import json, sys
sys.path.insert(0,'tools/sprites')
from PIL import Image
from blobs import im, blobs, W, H, solid
px=im.load()
def is_skin(c):
    r,g,b,a=c
    return r>150 and 90<g<200 and 90<b<200 and r-g>25 and abs(g-b)<45
def skin_ratio(box):
    n=s=0
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            if solid(x,y):
                n+=1
                if is_skin(px[x,y]): s+=1
    return s/max(1,n), s
# grid icons
def cellimg(idx):
    r,c=divmod(idx,8); x,y=250+16*c,9+16*r
    return im.crop((x+1,y+1,x+13,y+13)).convert('RGB')
cells={i:cellimg(i) for i in range(70) if i%8<7}
def diff(a,b):
    pa,pb=a.load(),b.load(); d=0
    for y in range(12):
        for x in range(12): d+=sum(abs(pa[x,y][k]-pb[x,y][k]) for k in range(3))
    return d
strip=blobs(0,296,48,H,join=1)
icons=[b for b in strip if 13<=b[2]-b[0]<=18 and 13<=b[3]-b[1]<=18]
icons.sort(key=lambda b:b[1])
matched=[]
for b in icons:
    c=im.crop((b[0]+2,b[1]+2,b[0]+14,b[1]+14)).convert('RGB')
    best=min(cells,key=lambda i:diff(c,cells[i]))
    if diff(c,cells[best])<=400: matched.append((best,b))
rows=[]
for k,(best,b) in enumerate(matched):
    ytop=b[1]-6
    ybot=(matched[k+1][1][1]-6) if k+1<len(matched) else H
    rows.append({'icon':best,'iconbox':b,'y0':ytop,'y1':ybot})
out=[]
for r in rows:
    bs=blobs(b[2]+0 if False else r['iconbox'][2]+3,r['y0'],W,r['y1'],join=2)
    def is_text(b):
        n=d=0
        for y in range(b[1],b[3]):
            for x in range(b[0],b[2]):
                if solid(x,y):
                    n+=1
                    r,g,bb,a=px[x,y]
                    if r<50 and g<50 and bb<50: d+=1
        return n>0 and d/n>0.9 and (b[2]-b[0])<40
    bs=[x for x in bs if (x[2]-x[0])*(x[3]-x[1])>=12 and not (x[0]>300 and is_text(x))]
    bs.sort(key=lambda x:(x[1]+x[3])//2)
    # split into lines by vertical gaps of centres
    lines=[]
    for x in bs:
        cy=(x[1]+x[3])/2
        for ln in lines:
            if abs(ln['cy']-cy)<9: ln['b'].append(x); ln['cy']=sum((q[1]+q[3])/2 for q in ln['b'])/len(ln['b']); break
        else: lines.append({'cy':cy,'b':[x]})
    ls=[]
    for ln in lines:
        ln['b'].sort(key=lambda x:x[0])
        ls.append([{'box':q,'skin':round(skin_ratio(q)[0],2)} for q in ln['b']])
    out.append({'icon':r['icon'],'y0':r['y0'],'y1':r['y1'],'lines':ls})
json.dump(out,open('tools/sprites/rows.json','w'))
for r in out:
    print(r['icon'],'y',r['y0'],'lines',[ (len(l),''.join('W' if f['skin']>0.25 else '.' for f in l)) for l in r['lines']])
