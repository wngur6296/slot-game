"""잭팟 연출 영상 생성 (PIL 프레임 -> ffmpeg H.264). 실행: python3 scripts/gen_video.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import subprocess, math, os, random
R=os.path.join(os.path.dirname(__file__),'..'); W=H=540; FPS=30; SEC=3.2
seven=Image.open(R+'/assets/img/seven.webp').convert('RGBA')
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
try: font=ImageFont.truetype(FONT,84)
except: font=ImageFont.load_default()
out=R+'/assets/video/jackpot.mp4'
p=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
 '-c:v','libx264','-pix_fmt','yuv420p','-profile:v','main','-crf','26','-preset','slow','-movflags','+faststart','-an',out],stdin=subprocess.PIPE)
random.seed(3); parts=[[random.uniform(0,W),random.uniform(-H,0),random.uniform(2,6),random.uniform(3,9)] for _ in range(90)]
def ease_back(x): c=1.70158; x=min(1,max(0,x)); return 1+(c+1)*(x-1)**3+c*(x-1)**2
for f in range(int(FPS*SEC)):
    tt=f/FPS; im=Image.new('RGB',(W,H),(20,4,30)); d=ImageDraw.Draw(im,'RGBA')
    # radial glow
    for r in range(380,0,-20): a=int(70*(1-r/380)); d.ellipse([W/2-r,H/2-r,W/2+r,H/2+r],fill=(255,160,30,a))
    # rotating rays
    rot=tt*40
    for k in range(16):
        a0=math.radians(rot+k*22.5); a1=a0+math.radians(9)
        d.polygon([(W/2,H/2),(W/2+600*math.cos(a0),H/2+600*math.sin(a0)),(W/2+600*math.cos(a1),H/2+600*math.sin(a1))],fill=(255,215,90,38))
    s=ease_back(tt/0.7)*(1+0.04*math.sin(tt*8)); sz=max(2,int(300*s))
    sv=seven.resize((sz,sz),Image.LANCZOS); im.paste(sv,(W//2-sz//2,H//2-sz//2-30),sv)
    # coins / sparkles
    for q in parts:
        q[1]+=q[3]*(1 if tt>0.5 else 0); y=q[1]%(H+40)-20 if tt>0.5 else -50
        d.ellipse([q[0]-q[2],y-q[2],q[0]+q[2],y+q[2]],fill=(255,220,80,230)); d.ellipse([q[0]-q[2]/2,y-q[2]/2,q[0],y],fill=(255,255,220,255))
    if tt>0.6:
        a=min(1,(tt-0.6)/0.3); txt='JACKPOT'; bb=d.textbbox((0,0),txt,font=font); tw=bb[2]-bb[0]
        y=H-150; sc=1+0.06*math.sin(tt*10)
        layer=Image.new('RGBA',(W,H),(0,0,0,0)); ld=ImageDraw.Draw(layer)
        ld.text(((W-tw)/2,y),txt,font=font,fill=(255,60,140,int(255*a)),stroke_width=10,stroke_fill=(255,60,140,int(200*a)))
        layer=layer.filter(ImageFilter.GaussianBlur(8)); im.paste(layer,(0,0),layer); d=ImageDraw.Draw(im,'RGBA')
        d.text(((W-tw)/2,y),txt,font=font,fill=(255,236,140,int(255*a)),stroke_width=4,stroke_fill=(120,40,0,int(255*a)))
    if tt<0.15: im=Image.blend(im,Image.new('RGB',(W,H),(255,255,255)),1-tt/0.15)
    p.stdin.write(im.tobytes())
p.stdin.close(); p.wait(); print(os.path.getsize(out))
