"""효과음/BGM 합성기 (numpy만 사용). 실행: python3 scripts/gen_audio.py
결과: assets/sfx/*.mp3, assets/bgm/casino_loop.mp3 (ffmpeg 필요). 파라미터를 바꿔 재생성하세요."""
import numpy as np, wave, subprocess, os
SR=44100; R=os.path.join(os.path.dirname(__file__),'..')
def t(d): return np.arange(int(SR*d))/SR
def env(n,a=0.005,r=0.1,d=None):
    e=np.ones(n); A=int(a*SR); Rn=int(r*SR)
    if A: e[:A]=np.linspace(0,1,A)
    if Rn and Rn<n: e[-Rn:]*=np.linspace(1,0,Rn)**2
    return e
def adsr_exp(n,decay): return np.exp(-np.arange(n)/SR/decay)
def sine(f,d,ph=0): return np.sin(2*np.pi*f*t(d)+ph)
def bell_tone(f,d,dec=0.4):
    x=t(d); s=sum(a*np.sin(2*np.pi*f*m*x)*np.exp(-x/(dec/m**0.5)) for m,a in [(1,1),(2.01,.5),(3.02,.25),(4.2,.15),(5.4,.08)])
    return s*env(len(x),0.002,0.02)
def noise(d): return np.random.default_rng(1).standard_normal(int(SR*d))
def lp(x,a): # one-pole lowpass
    y=np.empty_like(x); s=0.
    for i,v in enumerate(x): s+=a*(v-s); y[i]=s
    return y
def mix(*parts,dur=None):
    L=max(o+len(p) for o,p in parts) if dur is None else int(dur*SR); out=np.zeros(L)
    for o,p in parts: o=int(o); n=min(len(p),L-o); out[o:o+n]+=p[:n]
    return out
def at(sec,x): return (int(sec*SR),x)
def reverb(x,mixv=.25):
    out=x.copy()
    for dl,g in [(0.029,.5),(0.037,.45),(0.041,.4),(0.053,.35),(0.067,.3),(0.079,.25)]:
        d=int(dl*SR); y=np.zeros(len(x)+d*8)
        y[:len(x)]=x
        for k in range(1,8): y[d*k:d*k+len(x)]+=x*(g**k)
        out=np.pad(out,(0,max(0,len(y)-len(out)))); out[:len(y)]+=y*mixv/6
    return out
def save(x,path,stereo_w=0.0):
    x=x/ (np.max(np.abs(x))+1e-9)*0.89
    L=x; Rr=np.roll(x,int(stereo_w*SR)) if stereo_w else x
    pcm=(np.stack([L,Rr],1)*32767).astype(np.int16)
    wav=path+'.wav'
    with wave.open(wav,'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',wav,'-codec:a','libmp3lame','-b:a','96k',path+'.mp3']); os.remove(wav)
N=lambda f:440*2**((f-69)/12)
S=R+'/assets/sfx/'
# click: soft UI tick
save(sine(1800,0.05)*adsr_exp(int(.05*SR),.01)+lp(noise(.05),.3)*adsr_exp(int(.05*SR),.004)*.4,S+'click')
# spin start: rising whoosh + ratchet
d=.6; x=t(d); wh=lp(noise(d),0.08)*np.sin(np.pi*x/d)**2
rat=np.zeros(len(x))
for k in range(18): o=int((k*0.033)*SR); rat[o:o+300]+=np.sin(2*np.pi*2400*np.arange(300)/SR)*np.exp(-np.arange(300)/60)
save(wh*1.2+rat*.35+sine(1,d)*0,S+'spin',0.008)
# reel stop: thunk
d=.25; x=t(d); f=140*np.exp(-x*18)+60
th=np.sin(2*np.pi*np.cumsum(f)/SR)*adsr_exp(len(x),.07)+lp(noise(d),.5)*adsr_exp(len(x),.006)*.6+np.sin(2*np.pi*3200*x)*adsr_exp(len(x),.012)*.15
save(th,S+'stop')
# coin: two-tone metallic ding
c=mix(at(0,bell_tone(N(88),.5,.18)),at(.06,bell_tone(N(93),.6,.22)))
save(reverb(c),S+'coin',0.004)
# small win: major arpeggio bells
notes=[72,76,79,84]; save(reverb(mix(*[at(i*.08,bell_tone(N(n),.7,.3)*.8) for i,n in enumerate(notes)])),S+'win_small',0.006)
# big win: fanfare (brassy saw stack) + bells
def brass(f,d):
    x=t(d); s=sum(np.sin(2*np.pi*f*k*x)/k*(1 if k<6 else .5) for k in range(1,12))
    vib=1; return s*env(len(x),0.03,0.15)*(0.6+0.4*np.minimum(1,x*8))
fan=mix(at(0,brass(N(67),.18)),at(.18,brass(N(72),.18)),at(.36,brass(N(76),.18)),at(.54,brass(N(79),.9)),
        at(.54,brass(N(72),.9)*.6),at(.54,brass(N(76),.9)*.5),*[at(.54+i*.07,bell_tone(N(84+(i%4)*3),.6,.25)*.5) for i in range(10)])
save(reverb(fan,.35),S+'win_big',0.01)
# jackpot: long fanfare + coin shower + sub boom
jp=[at(0,np.sin(2*np.pi*45*t(1.2))*adsr_exp(int(1.2*SR),.35)*1.2)]
seq=[(60,0),(64,.15),(67,.3),(72,.45),(67,.65),(72,.8),(76,.95),(79,1.1)]
jp+= [at(s,brass(N(n),.3 if s<1.1 else 1.6)) for n,s in seq]+[at(1.1,brass(N(n),1.6)*.55) for n in (72,76,84)]
rng=np.random.default_rng(7)
jp+= [at(1.1+rng.random()*1.6,bell_tone(N(rng.choice([84,88,91,96])),.4,.12)*.35) for _ in range(40)]
save(reverb(mix(*jp),.4),S+'jackpot',0.012)
# free spins trigger: magical rising sweep + chord
d=1.4; x=t(d); sw=sum(np.sin(2*np.pi*(300+900*x**2)*k*x)/k for k in (1,2,3))*env(len(x),.02,.4)*.4
fs=mix(at(0,sw),*[at(.1+i*.06,bell_tone(N(n),.9,.35)*.6) for i,n in enumerate([72,76,79,83,86,91,95,98])])
save(reverb(fs,.4),S+'freespins',0.01)
# near-miss tension: heartbeat-ish rising pulse
d=1.2; x=t(d); f=200+400*x/d; tn=np.sin(2*np.pi*np.cumsum(f)/SR)*(0.5+0.5*np.sin(2*np.pi*8*x))*env(len(x),.05,.1)*.5
save(tn,S+'tension')
# level up
save(reverb(mix(*[at(i*.1,bell_tone(N(n),.8,.35)) for i,n in enumerate([67,72,76,79,84])])),S+'levelup',0.006)

# ---- BGM: 120bpm lounge/casino loop, 8 bars (16s), ii-V-I-vi in C ----
bpm=118; beat=60/bpm; bars=8; L=bars*4*beat; out=np.zeros(int(L*SR)+SR)
def add(sec,x,g=1.):
    o=int(sec*SR); n=min(len(x),len(out)-o); out[o:o+n]+=x[:n]*g
chords=[[62,65,69,72],[67,71,74,77],[60,64,67,71],[57,60,64,67]]*2  # Dm7 G7 Cmaj7 Am7
bass=[[38,45,41,45],[43,50,47,50],[36,43,40,43],[33,40,36,40]]*2
def epiano(f,d):
    x=t(d); s=np.sin(2*np.pi*f*x+1.2*np.sin(2*np.pi*f*x)*np.exp(-x*3))*np.exp(-x*1.6)
    return s*env(len(x),0.004,0.08)
def pluckbass(f,d):
    x=t(d); s=sum(np.sin(2*np.pi*f*k*x)/(k**1.6) for k in range(1,6))*np.exp(-x*4)
    return s*env(len(x),.004,.05)
hat=lp(noise(.06),.9)-lp(noise(.06),.2); hat*=adsr_exp(len(hat),.012)
kick=np.sin(2*np.pi*np.cumsum(55+90*np.exp(-t(.3)*30))/SR)*adsr_exp(int(.3*SR),.09)
snr=lp(noise(.2),.6)*adsr_exp(int(.2*SR),.05)+np.sin(2*np.pi*190*t(.2))*adsr_exp(int(.2*SR),.03)*.5
mel=[76,74,72,74,76,79,77,76, 74,72,71,72,74,77,76,74, 72,71,72,76,79,84,83,79, 76,77,76,72,69,72,71,69]
for b in range(bars):
    t0=b*4*beat
    for k,n in enumerate(chords[b]):  # comp on 2 and 4 (swing)
        for bt in (1,2.66,3): add(t0+bt*beat,epiano(N(n),beat*0.9),.11)
    for i,n in enumerate(bass[b]): add(t0+i*beat,pluckbass(N(n),beat*.95),.55)
    for i in range(4):
        add(t0+i*beat,kick,.35 if i in (0,2) else 0); add(t0+i*beat,snr,.18 if i in (1,3) else 0)
        add(t0+i*beat,hat,.12); add(t0+(i+.66)*beat,hat,.08)
    for j in range(4):
        n=mel[(b*4+j)%len(mel)]; add(t0+j*beat+(0.0 if j%2==0 else .16*beat),bell_tone(N(n),beat*1.5,.5),.16)
# wrap tail for seamless loop
tail=out[int(L*SR):]; out=out[:int(L*SR)]; out[:len(tail)]+=tail
out=reverb(out,.3)[:int(L*SR)]
save(out,R+'/assets/bgm/casino_loop',0.015)
print('ok')
