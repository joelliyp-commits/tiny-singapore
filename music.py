import numpy as np, soundfile as sf, json
import sys
sr=44100; dur=float(sys.argv[1])+0.5
t=np.arange(int(sr*dur))/sr; out=np.zeros_like(t)
bpm=92; beat=60/bpm; bar=beat*4
n2f=lambda n:440*2**((n-69)/12)
chords=[[48,55,64,71],[45,52,60,67],[41,48,57,64],[43,50,59,65]]  # Cmaj7 Am7 Fmaj7 G7sus-ish
def env(L,a,r):
    e=np.ones(L); A=min(L,int(a*sr)); R=min(L,int(r*sr)); e[:A]=np.linspace(0,1,A); e[-R:]*=np.linspace(1,0,R); return e
nb=int(dur/bar)+1
for b in range(nb):
    ch=chords[b%4]; s=int(b*bar*sr)
    if s>=len(t): break
    L=int(bar*1.15*sr); e=min(len(t),s+L)
    tt=np.arange(e-s)/sr
    for n in ch:
        f=n2f(n); w=(np.sin(2*np.pi*f*tt)+.3*np.sin(2*np.pi*f*2.003*tt))*.05
        out[s:e]+=w*env(e-s,.8,.9)
    # pluck arpeggio, 8th notes
    for k in range(8):
        n=ch[[0,2,1,3,2,1,3,2][k]]+12; ps=s+int(k*beat/2*sr); pl=int(.6*sr); pe=min(len(t),ps+pl)
        if ps>=len(t): break
        tp=np.arange(pe-ps)/sr; f=n2f(n)
        out[ps:pe]+=np.sin(2*np.pi*f*tp)*np.exp(-tp*6)*.045*(0.8 if k%2 else 1)
    # soft kick on 1 and 3
    for k in (0,2):
        ks=s+int(k*beat*sr); ke=min(len(t),ks+int(.3*sr))
        if ks>=len(t): break
        tk=np.arange(ke-ks)/sr; out[ks:ke]+=np.sin(2*np.pi*(55+60*np.exp(-tk*30))*tk)*np.exp(-tk*12)*.12
fade=np.ones_like(t); fade[:sr]=np.linspace(0,1,sr); fade[-2*sr:]=np.linspace(1,0,2*sr)
out*=fade; out/=np.max(np.abs(out)); out*=.5
sf.write(sys.argv[2],np.stack([out,out],1),sr); print(round(dur,1))
