# Builds apps/client/public/assets/worm/*.png and updates manifest.json from the source sheet in raw/.
import json, os, sys
sys.path.insert(0,'tools/sprites')
from PIL import Image
from common import *
boxes=json.load(open('/tmp/rows.json'))
CANVAS=CV
OUT='apps/client/public/assets'
MAP={}
MAP['idle_0']=11; MAP['idle_1']=12; MAP['idle_2']=13; MAP['idle_3']=12
for i,b in enumerate(range(12,25)): MAP[f'walk_{i}']=b
MAP['jump']=25; MAP['fall']=27; MAP['land']=24
MAP['hurt_0']=48; MAP['hurt_1']=49
for i,b in enumerate([50,51,52,53,54,38,37,49]): MAP[f'tumble_{i}']=b
os.makedirs(f'{OUT}/worm',exist_ok=True)
manifest=json.load(open(f'{OUT}/manifest.json'))
manifest['assets']={k:v for k,v in manifest['assets'].items() if not k.startswith('worm/')}
for name,idx in MAP.items():
    x0,y0,x1,y1=boxes[idx]
    c=keyed(im.crop((x0,y0,x1,y1)))
    out=place(c,center=name.startswith('tumble'))
    out.save(f'{OUT}/worm/{name}.png')
    manifest['assets'][f'worm/{name}']={'file':f'worm/{name}.png','w':CANVAS,'h':CANVAS}
json.dump(manifest,open(f'{OUT}/manifest.json','w'),indent=2)
print(len(MAP),'frames')
