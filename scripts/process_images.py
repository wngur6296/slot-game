"""원본 생성 이미지(assets/src/*.jpg) -> 게임용 최적화 이미지(assets/img).
심볼: 검은 배경을 알파로 변환한 256px WebP + PNG 아이콘. 배경: 720px WebP."""
from PIL import Image, ImageChops, ImageFilter
import os
R=os.path.join(os.path.dirname(__file__),'..'); S=R+'/assets/src'; O=R+'/assets/img'
SYMS=['cherry','lemon','grape','bell','bar','seven','diamond','wild','scatter']
for n in SYMS:
    im=Image.open(f'{S}/{n}.jpg').convert('RGB')
    r,g,b=im.split(); m=ImageChops.lighter(ImageChops.lighter(r,g),b)
    a=m.point(lambda v: 0 if v<14 else min(255,int((v-14)*4.0)))
    im.putalpha(a); im=im.crop(im.getbbox() or (0,0,*im.size))
    w,h=im.size; s=max(w,h); c=Image.new('RGBA',(s,s),(0,0,0,0)); c.paste(im,((s-w)//2,(s-h)//2))
    c=c.resize((256,256),Image.LANCZOS); c.save(f'{O}/{n}.webp',quality=86,method=6)
bg=Image.open(f'{S}/bg.jpg').convert('RGB'); bg=bg.resize((720,int(720*bg.height/bg.width)),Image.LANCZOS)
bg.save(f'{O}/bg.webp',quality=78,method=6)
ic=Image.open(f'{S}/seven.jpg').convert('RGB')
for sz in (180,192,512): ic.resize((sz,sz),Image.LANCZOS).save(f'{O}/icon-{sz}.png',optimize=True)
