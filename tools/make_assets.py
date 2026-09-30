"""Build the original Sela font and photo-derived character data.
The original photographs are never copied into the published project.
Run locally with the two user-provided photos in Downloads.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
import math, json

root = Path(__file__).resolve().parents[1]
pub = root / 'public'
curves = {
 'v':[[(-10,0),(-52,27),(-35,105),(0,101)],[(0,101),(38,97),(42,62),(12,40)],[(12,40),(-3,28),(10,9),(27,-12)]],
 'e':[[(-29,77),(-58,15),(9,-35),(31,0)],[(31,0),(54,36),(3,69),(-17,45)],[(-17,45),(-39,17),(-3,18),(5,48)],[(5,48),(14,67),(3,91),(13,112)]],
 'l':[[ (24,-10),(-21,-36),(-48,12),(-14,45)],[(-14,45),(11,68),(25,92),(-12,111)],[(-14,45),(7,18),(37,25),(32,49)]],
 'u':[[ (26,9),(-15,-24),(-58,20),(-26,60)],[(-26,60),(9,94),(48,47),(20,28)],[(20,28),(-6,8),(-15,48),(9,51)],[(9,51),(30,62),(13,96),(39,99)]]
}
def samples(seg):
 out=[]
 for j in range(41):
  t=j/40; a=(1-t)**3; b=3*(1-t)**2*t; c=3*(1-t)*t*t; d=t**3
  out.append((a*seg[0][0]+b*seg[1][0]+c*seg[2][0]+d*seg[3][0],a*seg[0][1]+b*seg[1][1]+c*seg[2][1]+d*seg[3][1]))
 return out
def polygon(pen,points):
 pen.moveTo(points[0])
 for p in points[1:]:pen.lineTo(p)
 pen.closePath()
def stroke(pen,pts):
 left=[];right=[];r=23
 for i,(x,y) in enumerate(pts):
  a=pts[max(0,i-1)];b=pts[min(len(pts)-1,i+1)]
  dx=b[0]-a[0];dy=b[1]-a[1];ln=max(0.001,math.hypot(dx,dy));nx=-dy/ln*r;ny=dx/ln*r
  left.append((x+nx,y+ny));right.append((x-nx,y-ny))
 polygon(pen,left+right[::-1])
 for x,y in [pts[0],pts[-1]]:
  polygon(pen,[(x+r*math.cos(i*math.tau/12),y+r*math.sin(i*math.tau/12)) for i in range(12)])
def glyph(letter):
 pen=TTGlyphPen(None)
 if letter in curves:
  for seg in curves[letter]:stroke(pen,[(310+x*4,590-y*4) for x,y in samples(seg)])
 else:
  n=ord(letter)-97
  # Related calligraphic family: flowing open curves with distinctive branches.
  stem=[[(12,-8),(-42+n%4*7,-16),(-46,30),(0,53)],[(0,53),(33,77),(24,101),(-18,110)]]
  if n%3==0:stem=[[(24,-5),(-44,-18),(-51,76),(7,97)],[(7,97),(43,110),(52,40),(12,42)]]
  if n%3==1:stem=[[(12,-10),(-34,17),(30,33),(-10,64)],[(-10,64),(-40,88),(-12,117),(23,104)]]
  for seg in stem:stroke(pen,[(310+x*4,590-y*4) for x,y in samples(seg)])
  y=120+(n//3%3)*140
  side=1 if n%2==0 else -1
  stroke(pen,[(305,y),(305+side*75,y+40),(305+side*105,y+80)])
  if n//9:
   x=470 if n%2 else 160
   polygon(pen,[(x+19*math.cos(i*math.tau/12),620+19*math.sin(i*math.tau/12)) for i in range(12)])
 return pen.glyph()
order=['.notdef','space']+list('abcdefghijklmnopqrstuvwxyz')
fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(order)
blank=TTGlyphPen(None).glyph();gs={'.notdef':blank,'space':blank}
gs.update({c:glyph(c) for c in order[2:]});fb.setupGlyf(gs)
fb.setupHorizontalMetrics({c:(640,25) for c in order[2:]}|{'.notdef':(640,0),'space':(330,0)})
fb.setupHorizontalHeader(ascent=800,descent=-180)
fb.setupCharacterMap({ord(c):c for c in order[2:]}|{ord(c.upper()):c for c in order[2:]}|{32:'space'})
fb.setupNameTable({'familyName':'Sela','styleName':'Regular','uniqueFontIdentifier':'Sela-original-2026','fullName':'Sela Regular','psName':'Sela-Regular'})
fb.setupOS2(sTypoAscender=800,sTypoDescender=-180,usWinAscent=850,usWinDescent=200)
fb.setupPost();fb.setupMaxp();fb.save(pub/'sela.ttf')
font=TTFont(pub/'sela.ttf');font.flavor='woff';font.save(pub/'sela.woff')

downloads=Path.home()/'Downloads'
for key,filename in [('her','MVIMG_20260913_155542.jpg'),('us','MVIMG_20260913_155548.jpg')]:
 photo=ImageOps.exif_transpose(Image.open(downloads/filename)).convert('RGB');w,h=photo.size
 if key=='her':
  crop=photo.crop((int(w*.40),int(h*.175),int(w*.965),int(h*.87)))
 else:crop=photo.crop((int(w*.035),int(h*.185),int(w*.98),int(h*.91)))
 crop=ImageEnhance.Contrast(crop).enhance(1.1)
 width=112 if key=='her' else 140
 height=round(width*crop.height/crop.width*.72)
 small=crop.resize((width,height),Image.Resampling.LANCZOS)
 rgb=list(small.getdata());data=[]
 subject=None
 if key=='her':
  subject=Image.new('L',(width,height),0)
  outline=[(.35,.005),(.62,.015),(.75,.06),(.81,.16),(.82,.28),(.75,.43),(.82,.48),(.97,.53),(1,.63),(1,1),(.39,1),(.31,.86),(.19,.73),(.17,.6),(.16,.49),(.085,.4),(.03,.34),(.025,.27),(.09,.20),(.09,.14),(.20,.06)]
  ImageDraw.Draw(subject).polygon([(int(x*width),int(y*height)) for x,y in outline],fill=255)
  subject=subject.filter(ImageFilter.GaussianBlur(.8))
 # A soft oval vignette keeps attention on her face; the couple image uses a wider frame.
 for y in range(height):
  for x in range(width):
   r,g,b=rgb[y*width+x]
   edge=max(0,min(1,((1.15-((x/width-.5)/.64)**2-((y/height-.5)/.8)**2)*5)))
   if subject:edge*=subject.getpixel((x,y))/255
   if edge<.08:data.extend([0,0,0]);continue
   data.extend([round(r*edge),round(g*edge),round(b*edge)])
 (pub/f'portrait-{key}.json').write_text(json.dumps({'width':width,'height':height,'colors':data},separators=(',',':')))
 # QA preview only, ignored and never uploaded.
 qa=root/'.local';qa.mkdir(exist_ok=True);crop.resize((500,round(500*crop.height/crop.width))).save(qa/f'crop-{key}.jpg')
print('Original glyph font and two character-portrait datasets created.')
