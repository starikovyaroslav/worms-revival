# For each icon: the icon + first hold frame + a few later frames of its row, to check identity.
import json, sys
sys.path.insert(0,'tools/sprites')
from PIL import Image, ImageDraw
from blobs import im
rows={r['icon']:r for r in json.load(open('tools/sprites/rows.json'))}
ICON={0:'rope',1:'banana',2:'cluster',3:'grenade',5:'bazooka',6:'mortar',9:'bat',10:'blowtorch',11:'handgun',12:'longbow',
 13:'(13)',14:'petrol',16:'(16)',17:'(17)',18:'(18)',19:'prod',20:'shotgun',22:'uzi',24:'mine',25:'dynamite',26:'madcow',27:'sheep',
 28:'skunk',29:'supersheep',32:'airstrike',43:'girder',45:'parachute',49:'donkey',51:'firepunch',58:'(58)',4:'(4)',8:'(8)',33:'(33)',34:'(34)',35:'(35)',36:'(36)'}
S=4
sheet=Image.new('RGB',(1500,len(ICON)*70),(0,48,128)); d=ImageDraw.Draw(sheet); y=0
for ic,name in ICON.items():
    r,c=divmod(ic,8); x0,y0=250+16*c,9+16*r
    icon=im.crop((x0,y0,x0+14,y0+14)).resize((14*S,14*S),Image.NEAREST); sheet.paste(icon,(4,y+4))
    d.text((70,y+4),f'{ic} {name}',fill=(255,255,0))
    x=160
    lines=rows.get(ic,{}).get('lines',[])
    frames=[f for l in lines for f in l]
    pick=frames[:2]+frames[9:11]+frames[11::3][:6] if len(frames)>12 else frames[:10]
    for f in pick:
        cimg=im.crop(tuple(f['box'])).convert('RGBA'); cimg=cimg.resize((cimg.width*S//2*2//2*2//2 if False else cimg.width*3,cimg.height*3),Image.NEAREST)
        if x+cimg.width>1490: break
        sheet.paste(cimg,(x,y+6),cimg); x+=cimg.width+8
    y+=70
sheet=sheet.crop((0,0,1500,y)); sheet.save('/tmp/verify.png'); print(sheet.size)
