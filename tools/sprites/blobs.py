# Finds every sprite (connected blob) in a region of the ripped sheet and writes a numbered contact sheet.
import sys, json
from PIL import Image, ImageDraw
from collections import deque
SRC='tools/sprites/raw/gba-wwp-worms.gif'
im=Image.open(SRC).convert('RGBA'); W,H=im.size; px=im.load()
BG=(0,48,128)
def solid(x,y):
    r,g,b,a=px[x,y]; return not (abs(r-BG[0])<6 and abs(g-BG[1])<6 and abs(b-BG[2])<6)
def blobs(x0,y0,x1,y1,join=2):
    mask=[[solid(x,y) for x in range(x0,x1)] for y in range(y0,y1)]
    w,h=x1-x0,y1-y0; lab=[[0]*w for _ in range(h)]; out=[]
    for sy in range(h):
        for sx in range(w):
            if not mask[sy][sx] or lab[sy][sx]: continue
            q=deque([(sx,sy)]); lab[sy][sx]=len(out)+1; bx0=bx1=sx; by0=by1=sy; n=0
            while q:
                x,y=q.popleft(); n+=1
                bx0=min(bx0,x);bx1=max(bx1,x);by0=min(by0,y);by1=max(by1,y)
                for dy in range(-join,join+1):
                    for dx in range(-join,join+1):
                        nx,ny=x+dx,y+dy
                        if 0<=nx<w and 0<=ny<h and mask[ny][nx] and not lab[ny][nx]:
                            lab[ny][nx]=len(out)+1; q.append((nx,ny))
            if n>=6: out.append((x0+bx0,y0+by0,x0+bx1+1,y0+by1+1))
    return out
if __name__=='__main__':
    x0,y0,x1,y1=map(int,sys.argv[1:5]); name=sys.argv[5]
    bs=blobs(x0,y0,x1,y1)
    # reading order: rows by y centre, then x
    bs.sort(key=lambda b:((b[1]+b[3])//2//18,b[0]))
    json.dump(bs,open(f'/tmp/{name}.json','w'))
    S=4; cols=14; cw=88; ch=100
    rows=(len(bs)+cols-1)//cols
    sheet=Image.new('RGB',(cols*cw,rows*ch),(0,48,128)); d=ImageDraw.Draw(sheet)
    for i,b in enumerate(bs):
        c=im.crop(b); c=c.resize((c.width*S,c.height*S),Image.NEAREST)
        cx,cy=(i%cols)*cw,(i//cols)*ch
        sheet.paste(c,(cx+4,cy+14),c)
        d.text((cx+4,cy+1),f'{i}',fill=(255,255,0))
    sheet.save(f'/tmp/{name}.png'); print(len(bs),'blobs')
