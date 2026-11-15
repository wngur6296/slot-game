"""테이블/카드/인스턴트 게임 효과음 합성. python3 scripts/gen_table_audio.py"""
import sys, os
sys.path.insert(0, '/tmp')
from audio_lib import SR, t, env, adsr_exp, sine, bell_tone, noise, lp, mix, at, reverb, save, N
import numpy as np
S=os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx') + '/'
B=os.path.join(os.path.dirname(__file__), '..', 'assets', 'bgm') + '/'

def add(a, b, o=0):
    if len(b)+o > len(a):
        a = np.pad(a, (0, len(b)+o-len(a)))
    a[o:o+len(b)] += b
    return a

# card deal
d=.18; x=t(d)
wh=lp(noise(d),0.15)*np.sin(np.pi*x/d)**2*0.7
tap=np.sin(2*np.pi*(420+80*np.exp(-x*40))*x)*adsr_exp(len(x),.04)*0.5
wh=add(wh, lp(noise(.04),.4)*adsr_exp(int(.04*SR),.008)*.4)
save(wh+tap, S+'card_deal')

# card flip
d=.22; x=t(d)
fl=lp(noise(d),.25)*np.sin(np.pi*x/d*2)*np.exp(-x*8)
tick=np.sin(2*np.pi*1800*x)*adsr_exp(len(x),.015)*.35 + np.sin(2*np.pi*900*x)*adsr_exp(len(x),.03)*.25
save(fl+tick, S+'card_flip')

# chip clack
d=.2; x=t(d)
clk=np.sin(2*np.pi*(900*np.exp(-x*12)+220)*x)*adsr_exp(len(x),.04)
clk=add(clk, lp(noise(.08),.5)*adsr_exp(int(.08*SR),.01)*.5)
clk=add(clk, np.sin(2*np.pi*2400*x)*adsr_exp(len(x),.01)*.15)
save(mix(at(0,clk),at(.03,clk*.55)), S+'chip')

# wheel
d=2.6; x=t(d)
clicks=np.zeros(len(x))
for i in range(90):
    tt=(i/90)**1.4 * 2.4
    o=int(tt*SR)
    if o>=len(clicks)-800: break
    n=600
    clicks[o:o+n]+=np.sin(2*np.pi*2200*np.arange(n)/SR)*np.exp(-np.arange(n)/80)*(.25+0.15*(i%3==0))
hum=lp(noise(d),.05)*(0.15+0.2*np.sin(2*np.pi*x*2))*env(len(x),.05,.4)
save(clicks+hum, S+'wheel')

# ball
d=.5; x=t(d)
bd=np.sin(2*np.pi*(700*np.exp(-x*8)+180)*x)*adsr_exp(len(x),.08)
bd=add(bd, lp(noise(.12),.3)*adsr_exp(int(.12*SR),.02)*.4)
bd=add(bd, np.sin(2*np.pi*1400*x)*adsr_exp(len(x),.03)*.2)
save(reverb(bd,.2), S+'ball')

# squeeze
d=.5; x=t(d)
sq=lp(noise(d),.2)*(0.3+0.7*x/d)*env(len(x),.05,.08)
sq+=np.sin(2*np.pi*(400+200*x)*x)*adsr_exp(len(x),.2)*.15
save(sq, S+'squeeze')

# hold
d=.12; x=t(d)
hd=sine(880,.12)*adsr_exp(len(x),.03)+sine(1320,.12)*adsr_exp(len(x),.02)*.4
save(hd, S+'hold')

# crash tick
d=.06; x=t(d)
tk=sine(920,.06)*adsr_exp(len(x),.02)+sine(1380,.06)*adsr_exp(len(x),.015)*.3
save(tk, S+'crash_tick')

# crash boom
d=1.1; x=t(d)
boom=np.sin(2*np.pi*(70*np.exp(-x*3)+40)*x)*adsr_exp(len(x),.35)*1.2
boom=add(boom, lp(noise(d),.08)*np.exp(-x*3)*0.9)
boom=add(boom, np.sin(2*np.pi*180*x)*adsr_exp(len(x),.15)*.3)
save(reverb(boom,.3), S+'crash_boom')

# recoup
save(reverb(mix(at(0,bell_tone(N(79),.5,.2)),at(.07,bell_tone(N(84),.55,.25)),at(.14,bell_tone(N(91),.7,.3)))), S+'recoup')

# plinko peg
d=.07; x=t(d)
pg=np.sin(2*np.pi*1650*x)*adsr_exp(len(x),.012)
pg=add(pg, lp(noise(.03),.5)*adsr_exp(int(.03*SR),.006)*.35)
save(pg, S+'plinko_peg')

# plinko land
d=.4
ln=mix(at(0,bell_tone(N(76),.4,.15)),at(.05,bell_tone(N(83),.5,.2)))
ln=add(ln, lp(noise(.1),.3)*adsr_exp(int(.1*SR),.02)*.3)
save(reverb(ln,.2), S+'plinko_land')

# mine gem
save(reverb(mix(at(0,bell_tone(N(84),.45,.2)),at(.08,bell_tone(N(88),.5,.22)))), S+'mine_gem')

# mine boom
d=.7; x=t(d)
mb=np.sin(2*np.pi*(90*np.exp(-x*5)+35)*x)*adsr_exp(len(x),.22)
mb=add(mb, lp(noise(d),.1)*np.exp(-x*4))
save(reverb(mb,.25), S+'mine_boom')

# table BGM 10s loop
d=10.0; x=t(d)
def pad(f,d,ph=0):
    xx=t(d)
    s=sum(np.sin(2*np.pi*f*k*xx+ph)/k*np.exp(-(k-1)*0.25) for k in (1,2,3,4))
    return s*env(len(xx),.4,.4)*0.22
bg=pad(N(48),d)+pad(N(52),d,0.3)+pad(N(55),d,0.7)+pad(N(59),d,1.1)*.7
bg+=pad(N(50),d,2)*(0.5+0.5*np.sin(2*np.pi*x/d))
pulse=np.sin(2*np.pi*N(36)*x)*(0.12*(0.5+0.5*np.sin(2*np.pi*x*0.5)))*env(len(x),.3,.3)
bgm=reverb(bg+pulse,.4)
for i,n in enumerate([72,76,79,83,79,76]):
    bgm=mix(at(0,bgm), at(0.8+i*1.4, bell_tone(N(n),.9,.4)*.12))
save(bgm, B+'table_loop', 0.012)
print('table audio done')
for n in ['card_deal','card_flip','chip','wheel','ball','squeeze','hold','crash_tick','crash_boom','recoup','plinko_peg','plinko_land','mine_gem','mine_boom']:
    print(n, os.path.getsize(S+n+'.mp3'))
print('bgm', os.path.getsize(B+'table_loop.mp3'))
