import sys, json
sys.path.insert(0,'tools/sprites')
from PIL import Image, ImageDraw
from blobs import im
rows={r['icon']:r for r in json.load(open('tools/sprites/rows.json'))}
def view(icons,out,S=3,cols=24):
    cw=22*S; ch=24*S+10
    items=[]
    for ic in icons:
        r=rows[ic]
        for li,l in enumerate(r['lines']):
            items.append((f'#{ic}.{li}',None))
            for fi,f in enumerate(l): items.append((f'{ic}.{li}.{fi}',f['box']))
    # layout: new line starts a row
    y=0; x=0; W=1400
    cells=[]
    for lab,box in items:
        if box is None:
            if x>0: y+=ch; x=0
            cells.append((lab,None,x,y)); x+=cw; continue
        c=im.crop(tuple(box)); w=c.width*S+6
        if x+w>W: y+=ch; x=0
        cells.append((lab,c,x,y)); x+=w
    sheet=Image.new('RGB',(W,y+ch+10),(0,48,128)); d=ImageDraw.Draw(sheet)
    for lab,c,x,y in cells:
        d.text((x,y),lab,fill=(255,255,0))
        if c:
            r=c.resize((c.width*S,c.height*S),Image.NEAREST); sheet.paste(r,(x,y+10),r.convert('RGBA'))
    sheet.save(out)
if __name__=='__main__':
    view([int(a) for a in sys.argv[2:]],sys.argv[1])
