"""Trace original generated letterforms into a real TrueType/WOFF2 display font.

Raster ingestion is handled by comic-font-cells.mjs and ImageMagick. This script
builds native font outlines/metrics; it does not synthesize raster artwork.
Requires fonttools==4.67.0 and brotli==1.2.0 or compatible.
"""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from fontTools.svgLib.path import parse_path
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

ROOT = Path(__file__).resolve().parents[2]
CELLS = ROOT / 'assets-in/comic-font-cells'
OUT = ROOT / 'apps/client/public/fonts'
SOURCES = ROOT / 'docs/design/concepts/comic-menu-v2/font/outlines'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES.mkdir(parents=True, exist_ok=True)
entries = json.loads((CELLS / 'glyphs.json').read_text())
glyphs, metrics, cmap = {}, {}, {}

def empty():
    return TTGlyphPen(None).glyph()

glyphs['.notdef'] = empty()
metrics['.notdef'] = (600, 0)
glyphs['space'] = empty()
metrics['space'] = (280, 0)
cmap[32] = cmap[160] = 'space'

for entry in entries:
    name, char, w, h = entry['name'], entry['char'], entry['w'], entry['h']
    svg = SOURCES / f'{name}.svg'
    cap = 700
    bottom = -90 if char in 'ДЦЩ' else (-40 if char == 'Q' else 0)
    # Accented capitals extend above the cap line, not shrink their base letter.
    height = 880 if char in 'ЁЙ' else cap - bottom
    sy = height / h
    sx = sy * 0.86  # condensed display proportions like the approved lettering
    pen = TTGlyphPen(None)
    quadratic = Cu2QuPen(pen, max_err=0.7, reverse_direction=False)
    for element in ET.parse(svg).iter():
        if not element.tag.endswith('path') or not element.get('d'):
            continue
        tx = ty = 0
        translate = re.search(r'translate\(([-\d.]+)[ ,]+([-\d.]+)\)', element.get('transform', ''))
        if translate:
            tx, ty = map(float, translate.groups())
        transform = Transform(sx, 0, 0, -sy, 24 + tx * sx, height + bottom - ty * sy)
        parse_path(element.get('d'), TransformPen(quadratic, transform))
    glyphs[name] = pen.glyph()
    metrics[name] = (round(w * sx + 48), 24)
    cmap[ord(char)] = name
    if char.isalpha():
        cmap[ord(char.lower())] = name  # intentional unicase display typeface

def polygon(pen, points):
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()

def rect(pen, x, y, w, h):
    polygon(pen, [(x,y),(x,y+h),(x+w,y+h),(x+w,y)])

# Original native punctuation, using the same wedge/dry-cut graphic vocabulary.
for char in '.:,;!?-–—_+×=<>/\\()[]{}%#|…\'"':
    pen = TTGlyphPen(None)
    width = 400
    dot = [(80,0),(90,90),(180,105),(170,10)]
    if char in '.,:;…':
        polygon(pen, dot)
        if char in ':;': polygon(pen, [(x,y+330) for x,y in dot])
        if char in ',;': polygon(pen, [(100,20),(170,20),(85,-130),(50,-130)])
        if char == '…':
            polygon(pen, [(x+200,y) for x,y in dot]); polygon(pen, [(x+400,y) for x,y in dot]); width=650
        else: width=240
    elif char == '!':
        polygon(pen, dot); polygon(pen, [(100,180),(160,700),(290,700),(190,180)]); width=330
    elif char == '?':
        polygon(pen, dot)
        polygon(pen, [(90,190),(115,390),(310,520),(300,610),(180,620),(80,550),(40,650),(165,720),(365,680),(420,570),(365,445),(210,330),(190,190)])
        width=450
    elif char in '-–—_=':
        width = 720 if char == '—' else (520 if char == '–' else 420)
        rect(pen, 20, -110 if char=='_' else 270, width-40, 85)
        if char == '=': rect(pen,20,440,width-40,85)
    elif char in '+×':
        if char == '+': rect(pen,35,290,440,95); rect(pen,210,105,95,460)
        else:
            polygon(pen,[(30,120),(100,50),(485,560),(410,620)])
            polygon(pen,[(40,560),(110,625),(475,115),(400,50)])
        width=520
    elif char in '/\\':
        points=[(20,0),(120,0),(440,700),(340,700)]
        if char=='\\': points=[(460-x,y) for x,y in points]
        polygon(pen,points); width=480
    elif char in '<>':
        points=[(330,90),(400,180),(160,350),(410,530),(340,610),(30,350)]
        if char=='>': points=[(450-x,y) for x,y in points]
        polygon(pen,points); width=460
    elif char in '()[]{}':
        points=[(250,-70),(320,-30),(165,270),(180,470),(335,720),(260,770),(70,490),(55,260)]
        if char in '[{': points=[(300,-60),(300,25),(145,25),(145,680),(300,680),(300,765),(45,765),(45,-60)]
        if char in ')]}': points=[(370-x,y) for x,y in points]
        polygon(pen,points); width=380
    elif char in '\'"':
        polygon(pen,[(70,490),(120,720),(230,720),(160,490)])
        if char=='"': polygon(pen,[(260,490),(310,720),(420,720),(350,490)]); width=450
        else: width=260
    elif char == '|': rect(pen,100,-70,100,835); width=300
    elif char == '#':
        rect(pen,20,210,550,85); rect(pen,20,430,550,85)
        polygon(pen,[(100,0),(190,0),(300,700),(210,700)])
        polygon(pen,[(320,0),(410,0),(520,700),(430,700)]); width=600
    else:  # percent: two open diamond rings and a diagonal slash
        for x,y in [(30,440),(310,30)]:
            polygon(pen,[(x,y+80),(x+80,y+180),(x+180,y+80),(x+80,y-20)])
            polygon(pen,[(x+70,y+65),(x+100,y+65),(x+100,y+95),(x+70,y+95)])
        polygon(pen,[(90,0),(180,0),(520,700),(430,700)]); width=580
    name=f'uni{ord(char):04X}'
    glyphs[name]=pen.glyph(); metrics[name]=(width,20); cmap[ord(char)]=name

for char, original in [('«','<'),('»','>'),('−','-'),('‑','-'),('·','.'),('’',"'"),('‘',"'"),('“','"'),('”','"'),('№','#')]:
    cmap[ord(char)]=cmap[ord(original)]

fb=FontBuilder(1000,isTTF=True)
fb.setupGlyphOrder(list(glyphs))
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=950,descent=-200,lineGap=30)
fb.setupNameTable({'familyName':'Revival Brush','styleName':'Bold','uniqueFontIdentifier':'WormsRevival-RevivalBrush-1.0',
  'fullName':'Revival Brush Bold','psName':'RevivalBrush-Bold','version':'Version 1.000',
  'copyright':'Original glyph artwork and font assembly for Worms revival, 2026. Generated source sheets retained in repository.'})
fb.setupOS2(sTypoAscender=950,sTypoDescender=-200,sTypoLineGap=30,usWinAscent=1000,usWinDescent=220,
  sxHeight=700,sCapHeight=700,usWeightClass=700,fsSelection=0x20)
fb.setupPost()
fb.font['head'].macStyle=1
fb.setupMaxp()
fb.font.recalcTimestamp=False
fb.font['head'].created=fb.font['head'].modified=3870000000
kerning=[]
for left,right,value in [('А','У',-55),('Т','А',-55),('Г','А',-45),('А','Т',-40),('У','А',-60),('A','V',-65),('T','A',-55),('W','A',-45)]:
    kerning.append(f'pos {cmap[ord(left)]} {cmap[ord(right)]} {value};')
addOpenTypeFeaturesFromString(fb.font,'feature kern { '+' '.join(kerning)+' } kern;')
fb.font.save(OUT/'revival-brush-bold.ttf')
fb.font.flavor='woff2'
fb.font.save(OUT/'revival-brush-bold.woff2')
(SOURCES.parent/'coverage.json').write_text(json.dumps({'family':'Revival Brush','unicase':True,
  'glyphs':len(glyphs),'codepoints':sorted(cmap),'source':'original generated sheets + original punctuation'},indent=2)+'\n')
print(f'Built Revival Brush: {len(glyphs)} glyphs, {len(cmap)} codepoints.')
