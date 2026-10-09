# Action frames, spinning projectiles, heading sets, tombstone etc. from the ripped sheet. Not committed.
import json, math, os, sys
sys.path.insert(0,'tools/sprites')
from common import *
OUT='apps/client/public/assets'
rows={r['icon']:r for r in json.load(open(f'{OUT}/rows.json'))}
man=json.load(open(f'{OUT}/manifest.json'))
def blob(ic,li,fi): return keyed(im.crop(tuple(rows[ic]['lines'][li][fi]['box'])))
def save(id_,img,**extra):
    path=f'{OUT}/{id_}.png'; os.makedirs(os.path.dirname(path),exist_ok=True); img.save(path)
    man['assets'][id_]={'file':f'{id_}.png','w':img.width,'h':img.height,**extra}
def centroid(c,pred):
    p=c.load(); pts=[(x,y) for y in range(c.height) for x in range(c.width) if p[x,y][3]>0 and pred(p[x,y])]
    if not pts: return None
    return (sum(x for x,y in pts)/len(pts), sum(y for x,y in pts)/len(pts), len(pts))
RED=lambda c: c[0]>170 and c[1]<90 and c[2]<90
BLUE=lambda c: c[2]>190 and c[0]<90
WHITE=lambda c: c[0]>205 and c[1]>205 and c[2]>205
ANY=lambda c: True
def heading_rocket(c):
    r,b=centroid(c,RED),centroid(c,BLUE)
    if r and b: return math.atan2(r[1]-b[1],r[0]-b[0])
    a=centroid(c,ANY)
    if r: return math.atan2(r[1]-a[1],r[0]-a[0])
    if b: return math.atan2(a[1]-b[1],a[0]-b[0])
    return 0.0
def heading_sheep(c):
    r,w,a=centroid(c,RED),centroid(c,WHITE),centroid(c,ANY)
    if r and w: return math.atan2(w[1]-r[1],w[0]-r[0])
    return 0.0
# ---- spinning projectiles (cycled in any order)
def spin(name,items):
    for i,(ic,li,fi) in enumerate(items): save(f'spin/{name}_{i}',blob(ic,li,fi))
spin('grenade',[(3,0,k) for k in range(10,16)]+[(3,1,k) for k in range(7)])
spin('cluster',[(2,0,k) for k in range(10,14)]+[(2,1,k) for k in range(5)])
spin('banana',[(1,0,k) for k in range(10,18)]+[(1,1,k) for k in range(8)])
spin('mortar',[(6,0,k) for k in range(9,13)])
# ---- heading sets: the game picks the frame closest to the flight direction
for i,k in enumerate(list(range(9,15))): c=blob(5,0,k); save(f'head/rocket_{i}',c,angle=heading_rocket(c))
for i,k in enumerate(range(6)): c=blob(5,1,k); save(f'head/rocket_{6+i}',c,angle=heading_rocket(c))
for i,k in enumerate(range(4,20)): c=blob(29,0,k); save(f'head/supersheep_{i}',c,angle=heading_sheep(c))
# ---- creatures and placed things
for i in range(3): save(f'proj/sheep_{i}',blob(27,0,1+i))
for i in range(3): save(f'proj/sheepwalk_{i}',blob(29,0,1+i))
for i in range(2): save(f'proj/dynamite_{i}',blob(25,0,1+i))
save('objects/mine',blob(24,0,1))
save('objects/tombstone',blob(21,0,20))
# ---- worm action frames (worm pose while using a weapon), on the shared canvas
def act(name,items):
    for i,(ic,li,fi) in enumerate(items): save(f'act/{name}_{i}',place(blob(ic,li,fi)))
act('dynamite',[(25,0,0)]); act('mine',[(24,0,0)]); act('sheep',[(27,0,0)]); act('supersheep',[(29,0,0)])
act('prod',[(19,1,k) for k in range(3)])
act('firepunch',[(51,0,k) for k in range(10)])
act('blowtorch',[(10,0,k) for k in range(26)])
act('surrender',[(68,0,k) for k in range(5)])
# ---- flying worm (blasted): 12 curled frames replace the rotated tumble set, centred on the canvas
for i in range(12): save(f'worm/tumble_{i}',place(blob(66,0,i),center=True))
# ---- fire/throw frame: the 10th hold frame where the row has one
for name,ic in {'grenade':3,'cluster':2,'banana':1}.items():
    save(f'act/{name}_0',place(blob(ic,0,9)))
json.dump(man,open(f'{OUT}/manifest.json','w'),indent=2)
print(len(man['assets']),'assets')
for i in range(12): print('rocket',i,round(math.degrees(man['assets'][f'head/rocket_{i}']['angle'])))
for i in range(16): print('sheep',i,round(math.degrees(man['assets'][f'head/supersheep_{i}']['angle'])),end='; ')
