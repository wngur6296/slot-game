"""슬롯별 BGM/특수 효과음 (gen_audio.py의 합성 함수 재사용). 실행: python3 scripts/gen_audio_themes.py"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from gen_audio import *   # 기본 효과음도 함께 재생성됨
B=R+'/assets/bgm/'
def track(bpm,bars,fn):
    beat=60/bpm; L=bars*4*beat; out=np.zeros(int(L*SR)+2*SR)
    def add(sec,x,g=1.):
        o=int(sec*SR); n=min(len(x),len(out)-o)
        if n>0: out[o:o+n]+=x[:n]*g
    fn(add,beat); tail=out[int(L*SR):]; out=out[:int(L*SR)]; out[:len(tail)]+=tail; return out
def marimba(f,d): x=t(d); return (np.sin(2*np.pi*f*x)+.3*np.sin(2*np.pi*f*4*x)*np.exp(-x*30))*np.exp(-x*7)*env(len(x),.002,.02)
def pluck(f,d,bright=6):
    x=t(d); s=sum(np.sin(2*np.pi*f*k*x)/k*np.exp(-x*bright*k*.5) for k in range(1,9)); return s*env(len(x),.002,.03)
def saw(f,d,n=10): x=t(d); return sum(np.sin(2*np.pi*f*k*x)/k for k in range(1,n))
shaker=lp(noise(.05),.95)-lp(noise(.05),.4); shaker*=adsr_exp(len(shaker),.015)
kick=np.sin(2*np.pi*np.cumsum(50+100*np.exp(-t(.3)*28))/SR)*adsr_exp(int(.3*SR),.1)
clap=lp(noise(.18),.7)*adsr_exp(int(.18*SR),.04)
# 과일 파티: 밝은 마림바 F장조
def fruit(add,beat):
    ch=[[65,69,72],[62,65,69],[58,62,65],[60,64,67]]; bass=[41,38,34,36]
    mel=[77,76,74,72,74,76,77,79, 74,72,70,69,70,72,74,72, 70,72,74,77,79,77,76,74, 72,74,76,79,84,79,76,72]
    for b in range(8):
        t0=b*4*beat; c=ch[b%4]
        for i in range(8): add(t0+i*beat/2,marimba(N(c[i%3]+12),beat*.6),.18)
        for i in (0,1.5,2,3.5): add(t0+i*beat,pluck(N(bass[b%4]),beat*.8,4),.4)
        for i in range(8): add(t0+i*beat/2,shaker,.15 if i%2 else .08)
        for i in (0,2): add(t0+i*beat,kick,.35)
        for j in range(4): add(t0+j*beat,marimba(N(mel[(b*4+j)%32]+12),beat),.22)
save(reverb(track(132,8,fruit),.25),B+'fruit_loop',0.012)
# 드래곤: 펜타토닉 + 징 + 북
def gong_snd(d=3.0):
    x=t(d); return sum(a*np.sin(2*np.pi*f*x+2*np.sin(2*np.pi*f*.5*x)*np.exp(-x))*np.exp(-x/dc) for f,a,dc in [(110,1,1.5),(163,.6,1.2),(227,.4,.9),(311,.3,.7)])*env(len(x),.01,.3)
def taiko(): x=t(.5); return np.sin(2*np.pi*np.cumsum(60+80*np.exp(-x*20))/SR)*np.exp(-x*7)+lp(noise(.5),.3)*np.exp(-x*30)*.4
def dragon(add,beat):
    pent=[57,60,62,64,67,69,72,74,76]; mel=[4,5,4,3,2,3,1,0, 2,3,5,6,5,3,2,3, 4,6,7,6,5,4,3,2, 1,2,3,2,1,0,1,0]
    add(0,gong_snd(),.35)
    for b in range(8):
        t0=b*4*beat
        for i in (0,1.5,2,3,3.5): add(t0+i*beat,taiko(),.45 if i in (0,2) else .25)
        add(t0,pluck(N(45 if b%2==0 else 43),beat*3.5,2),.4)
        for j in range(4): n=pent[mel[(b*4+j)%32]]+12; add(t0+j*beat,pluck(N(n),beat*1.4,5),.25); add(t0+(j+.5)*beat,pluck(N(n+7),beat*.6,8),.08)
    add(4*4*beat,gong_snd(),.25)
save(reverb(track(92,8,dragon),.4),B+'dragon_loop',0.015)
# 메가 잭팟: 마이너 브라스 스탭 + 스트링 패드
def brass2(f,d): x=t(d); return saw(f,d,12)*env(len(x),.02,.1)*(0.5+0.5*np.minimum(1,x*10))
def mega(add,beat):
    ch=[[57,60,64],[53,57,60],[55,59,62],[52,56,59]]
    for b in range(8):
        t0=b*4*beat; c=ch[b%4]
        for n in c: add(t0,lp(saw(N(n),beat*4,8),.15)*env(int(beat*4*SR),.4,.6),.07)
        for i in (0,1.5,3): add(t0+i*beat,sum(brass2(N(n+12),beat*.35) for n in c),.07)
        for i in range(4): add(t0+i*beat,kick,.4 if i%2==0 else 0); add(t0+i*beat,clap,.2 if i%2 else 0); add(t0+(i+.5)*beat,shaker,.1)
        add(t0,pluck(N(c[0]-24),beat*1.8,3),.5); add(t0+2*beat,pluck(N(c[0]-24),beat*1.8,3),.5)
save(reverb(track(108,8,mega),.3),B+'mega_loop',0.012)
# 바니 나이트: 신스웨이브 디스코 (4온더플로어 + 아르페지오)
def bunny(add,beat):
    ch=[[61,65,68],[58,61,65],[54,58,61],[56,60,63]]   # C#m 계열 화려한 진행
    for b in range(8):
        t0=b*4*beat; c=ch[b%4]
        for n in c: add(t0,lp(saw(N(n),beat*4,9),.12)*env(int(beat*4*SR),.3,.5)*(0.6+0.4*np.abs(np.sin(np.pi*t(beat*4)/beat))),.06)  # 펌핑 패드
        for i in range(16): n=c[i%3]+(12 if (i//3)%2 else 24); add(t0+i*beat/4,pluck(N(n),beat*.3,9),.09)
        for i in range(4): add(t0+i*beat,kick,.5); add(t0+(i+.5)*beat,shaker,.18); add(t0+i*beat,clap,.25 if i%2 else 0)
        for i in range(8): add(t0+i*beat/2,pluck(N(c[0]-24+(12 if i%2 else 0)),beat*.45,5),.35)
save(reverb(track(124,8,bunny),.3),B+'bunny_loop',0.015)
# 특수 효과음
S2=R+'/assets/sfx/'
save(reverb(mix(at(0,marimba(N(84),.3)),at(.06,marimba(N(88),.3)),at(.12,marimba(N(91),.4)))),S2+'fruit_pop',0.004)
save(reverb(gong_snd(2.5),.4),S2+'gong',0.01)
vault=mix(at(0,np.sin(2*np.pi*55*t(.6))*adsr_exp(int(.6*SR),.2)),at(0,lp(noise(.3),.4)*adsr_exp(int(.3*SR),.05)),*[at(.3+i*.09,bell_tone(N(n),.8,.3)*.5) for i,n in enumerate([72,76,79,84,88,91])])
save(reverb(vault,.4),S2+'vault',0.01)
save(reverb(mix(*[at(i*.05,bell_tone(N(n),.6,.25)*.7) for i,n in enumerate([85,89,92,97,101])]),.35),S2+'bunny_heart',0.006)
d=.7; x=t(d); up=np.sin(2*np.pi*np.cumsum(300+1500*(x/d)**2)/SR)*env(len(x),.02,.2)*.5+lp(noise(d),.2)*np.sin(np.pi*x/d)
save(reverb(up,.3),S2+'expand',0.008)
print('themes ok')
