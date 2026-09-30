import {phonetic} from './language.js';
export class Soundtrack {
  constructor(){this.ctx=null;this.enabled=false;this.tick=0;this.nodes=[];}
  async start(){
    if(!this.ctx){
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();this.master.gain.value=.2;this.master.connect(this.ctx.destination);
      const length=this.ctx.sampleRate*3, buffer=this.ctx.createBuffer(2,length,this.ctx.sampleRate);
      for(let c=0;c<2;c++){const b=buffer.getChannelData(c);for(let i=0;i<length;i++)b[i]=(Math.random()*2-1)*Math.exp(-i/(length*.27));}
      this.reverb=this.ctx.createConvolver();this.reverb.buffer=buffer;this.reverb.connect(this.master);
      const noise=this.ctx.createBuffer(1,this.ctx.sampleRate*4,this.ctx.sampleRate), arr=noise.getChannelData(0);
      let last=0;for(let i=0;i<arr.length;i++){last=(last+Math.random()*.04-.02)/1.015;arr[i]=last;}
      const source=this.ctx.createBufferSource();source.buffer=noise;source.loop=true;
      const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;
      const gain=this.ctx.createGain();gain.gain.value=.08;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();
      this.timer=setInterval(()=>this.schedule(),1800);
    }
    await this.ctx.resume();this.enabled=true;this.master.gain.setTargetAtTime(.22,this.ctx.currentTime,.4);this.schedule();
  }
  mute(){this.enabled=false;if(this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.25);}
  note(freq,delay=0,duration=4,volume=.1){
    if(!this.ctx||!this.enabled)return;
    const now=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(volume,now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    o.connect(g);g.connect(this.master);g.connect(this.reverb);o.start(now);o.stop(now+duration+.1);
    const overtone=this.ctx.createOscillator(),og=this.ctx.createGain();overtone.type='sine';overtone.frequency.value=freq*2.001;og.gain.setValueAtTime(volume*.12,now);og.gain.exponentialRampToValueAtTime(.0001,now+duration*.45);overtone.connect(og);og.connect(this.reverb);overtone.start(now);overtone.stop(now+duration);
  }
  schedule(){if(!this.enabled)return;const chords=[[130.81,196,261.63,329.63],[110,164.81,220,261.63],[87.31,130.81,174.61,220],[98,146.83,196,246.94]],c=chords[Math.floor(this.tick/4)%4];this.note(c[this.tick%4],0,5,.07);if(this.tick%3===0)this.note(c[(this.tick+2)%4]*2,.35,4,.035);this.tick++;}
  collected(){[261.63,329.63,392,523.25].forEach((f,i)=>this.note(f,i*.16,3,.08));}
  reveal(){[130.81,196,261.63,329.63,392,523.25].forEach((f,i)=>this.note(f,i*.13,7,.1));}
}
export function speak(text,onUnavailable){
  if(!('speechSynthesis' in window)){onUnavailable?.('This browser has no voice. The pronunciation guide is still available.');return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(phonetic(text));u.lang='en-US';u.rate=.72;u.pitch=1.08;
  const voices=window.speechSynthesis.getVoices();
  u.voice=voices.find(v=>v.lang.startsWith('en')&&/Samantha|Google US|Aria|Jenny|Zira/.test(v.name))||voices.find(v=>v.lang.startsWith('en'))||null;
  u.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')onUnavailable?.('The voice could not play. Try again with sound enabled.');};
  window.speechSynthesis.speak(u);
}
