# Weapon icons, crates, parachute canopy and barrel from the ripped sheet. Not committed.
import json, os, sys
sys.path.insert(0,'tools/sprites')
from PIL import Image
from blobs import im, BG, blobs
OUT='apps/client/public/assets'
man=json.load(open(f'{OUT}/manifest.json'))
def save(id_,img):
    path=f'{OUT}/{id_}.png'; os.makedirs(os.path.dirname(path),exist_ok=True); img.save(path)
    man['assets'][id_]={'file':f'{id_}.png','w':img.width,'h':img.height}
def keyed(c):
    c=c.convert('RGBA'); px=c.load()
    for y in range(c.height):
        for x in range(c.width):
            r,g,b,a=px[x,y]
            if abs(r-BG[0])<6 and abs(g-BG[1])<6 and abs(b-BG[2])<6: px[x,y]=(0,0,0,0)
    return c
# --- weapon icons: 7-column grid of 14x14 cells (index = row*8+col)
ICON={0:'rope',1:'banana',2:'cluster',3:'grenade',5:'bazooka',6:'mortar',9:'bat',10:'blowtorch',11:'handgun',
      12:'longbow',14:'petrol',19:'prod',20:'shotgun',22:'uzi',24:'mine',25:'dynamite',26:'madcow',27:'sheep',
      28:'skunk',29:'supersheep',32:'airstrike',43:'girder',45:'parachute',49:'donkey',51:'firepunch'}
# Only icons whose weapon is confirmed by the frames of their own row are used; the rest fall back.
for idx,name in ICON.items():
    r,c=divmod(idx,8)
    x,y=250+16*c,9+16*r
    save(f'weapons/icon/{name}',im.crop((x,y,x+14,y+14)).convert('RGBA'))
# --- crates
b=json.load(open('/tmp/crates.json'))
def blob(i): return keyed(im.crop(tuple(b[i])))
save('objects/crate-health',blob(14))
save('objects/crate-weapon',blob(24))
for i in range(12): save(f'objects/crate-health-chute_{i}',blob(i))
canopy=blob(0); canopy=canopy.crop((0,0,canopy.width,19)); save('objects/parachute',canopy)
# --- barrel
bb=json.load(open('/tmp/barrel.json'))
if bb: save('objects/barrel',keyed(im.crop(tuple(bb[0]))))
json.dump(man,open(f'{OUT}/manifest.json','w'),indent=2)
print(len(man['assets']),'assets')
