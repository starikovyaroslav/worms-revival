# Splits the ripped sheet into horizontal bands and blobs; writes /tmp/bands.json and chunk contact sheets.
import sys, json
sys.path.insert(0,'tools/sprites')
from PIL import Image, ImageDraw
from blobs import im, solid, W, H
bgrows=[any(solid(x,y) for x in range(0,W)) for y in range(H)]
bands=[]; y=0
while y<H:
    if bgrows[y] and y>=296:
        y0=y
        while y<H and bgrows[y]: y+=1
        bands.append((y0,y))
    else: y+=1
print(len(bands),'bands')
json.dump(bands,open('/tmp/bands.json','w'))
for i,(a,b) in enumerate(bands[:200]): print(i,a,b,b-a, end=' | ')
