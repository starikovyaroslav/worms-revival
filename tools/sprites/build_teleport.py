# Teleport use frames (worm inside a yellow ring, then the dome) -> act/teleport_N. Run from the repo root.
import json, os, sys
sys.path.insert(0,'tools/sprites')
from common import *
OUT='apps/client/public/assets'
rows={r['icon']:r for r in json.load(open('tools/sprites/rows.json'))}
man=json.load(open(f'{OUT}/manifest.json'))
os.makedirs(f'{OUT}/act',exist_ok=True)
for i,b in enumerate(rows[67]['lines'][0]):
    out=place(keyed(im.crop(tuple(b['box']))),anchored=False)
    out.save(f'{OUT}/act/teleport_{i}.png')
    man['assets'][f'act/teleport_{i}']={'file':f'act/teleport_{i}.png','w':CV,'h':CV}
json.dump(man,open(f'{OUT}/manifest.json','w'),indent=2)
print(len(rows[67]['lines'][0]),'frames')
