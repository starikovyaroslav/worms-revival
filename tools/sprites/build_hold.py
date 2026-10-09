# Worm-with-weapon aim frames (+ chute worm, tombstone, sheep walk) from the ripped sheet. Not committed.
import json, os, sys
sys.path.insert(0,'tools/sprites')
from PIL import Image
from common import *
OUT='apps/client/public/assets'
rows={r['icon']:r for r in json.load(open(f'{OUT}/rows.json'))}
man=json.load(open(f'{OUT}/manifest.json'))
def save(id_,img):
    path=f'{OUT}/{id_}.png'; os.makedirs(os.path.dirname(path),exist_ok=True); img.save(path)
    man['assets'][id_]={'file':f'{id_}.png','w':img.width,'h':img.height}
HOLD={'bazooka':5,'grenade':3,'cluster':2,'banana':1,'shotgun':20,'handgun':11,'uzi':22,'minigun':13,'mortar':6}
N=9
for name,icon in HOLD.items():
    r=rows.get(icon)
    if not r or not r['lines']: print('missing row',name,icon); continue
    first=r['lines'][0][:N]
    for i,f in enumerate(first): save(f'hold/{name}_{i}',place(keyed(im.crop(tuple(f['box'])))))
    print(name,icon,len(first),'frames')
# --- parachute worm (icon 45), tombstone (last blob of the face row, icon 21), sheep walk (27)
if 45 in rows:
    for i,f in enumerate(rows[45]['lines'][0][:10]): save(f'chute/{i}',place(keyed(im.crop(tuple(f['box']))),anchored=False))
json.dump(man,open(f'{OUT}/manifest.json','w'),indent=2)
# verification strip
S=5; names=list(HOLD)
sheet=Image.new('RGB',(9*CV*S//2+10,len(names)*CV*S//2+10),(0,48,128))
for ri,n in enumerate(names):
    for i in range(N):
        p=f'{OUT}/hold/{n}_{i}.png'
        if os.path.exists(p):
            c=Image.open(p).convert('RGBA'); c=c.resize((c.width*S//2,c.height*S//2),Image.NEAREST)
            sheet.paste(c,(i*CV*S//2,ri*CV*S//2),c)
sheet.save('/tmp/holdcheck.png')
