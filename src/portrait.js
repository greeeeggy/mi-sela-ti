const ease=t=>1-Math.pow(1-t,3);
export class CharacterPortrait{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.active=false;this.kind='her';this.finished=false;this.gentle=false;this.paintCache=null;}
  async load(kind='her'){
    this.kind=kind;const res=await fetch(`${import.meta.env.BASE_URL}portrait-${kind}.json`);if(!res.ok)throw new Error('Portrait could not load');this.data=await res.json();await document.fonts.load('20px Sela');this.layout();
  }
  layout(){
    const rect=this.canvas.getBoundingClientRect();this.w=Math.max(100,rect.width);this.h=Math.max(100,rect.height);this.ratio=Math.min(devicePixelRatio,2);
    this.canvas.width=this.w*this.ratio;this.canvas.height=this.h*this.ratio;this.ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
    const {width:cols,height:rows,colors}=this.data, cell=Math.min((this.w-12)/cols,(this.h-12)/rows*.74);this.cell=cell;this.ch=cell/ .74;
    const pw=cols*cell,ph=rows*this.ch;this.ox=(this.w-pw)/2;this.oy=(this.h-ph)/2;
    this.particles=[];const alphabet='miselatilumavoran';
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const i=(y*cols+x)*3,r=colors[i],g=colors[i+1],b=colors[i+2],lum=(r*.299+g*.587+b*.114)/255;
      if(Math.max(r,g,b)<6)continue;
      const color=`rgb(${Math.min(255,Math.round(r*1.15+55))},${Math.min(255,Math.round(g*1.15+45))},${Math.min(255,Math.round(b*1.1+35))})`;
      this.particles.push({x:this.ox+x*cell,y:this.oy+y*this.ch,char:alphabet[(x*7+y*13)%alphabet.length],color,lum,seed:((x*71+y*37)%997)/997,delay:((x*17+y*13)%53)/53*.18});
    }
    this.staticCanvas=document.createElement('canvas');this.staticCanvas.width=this.canvas.width;this.staticCanvas.height=this.canvas.height;const c=this.staticCanvas.getContext('2d');c.setTransform(this.ratio,0,0,this.ratio,0,0);this.configure(c);
    for(const p of this.particles){c.fillStyle=p.color;c.globalAlpha=.68+p.lum*.32;c.fillText(p.char,p.x,p.y);}c.globalAlpha=1;
    if(this.finished)this.drawStatic();
  }
  configure(c){c.font=`${Math.max(3,this.ch*1.28)}px Sela`;c.textAlign='left';c.textBaseline='top';}
  start(onDone){this.active=true;this.finished=false;this.startTime=performance.now();this.onDone=onDone;this.tick();}
  tick(){
    if(!this.active)return;const progress=Math.min(1,(performance.now()-this.startTime)/(this.gentle?3200:9000));const c=this.ctx;c.clearRect(0,0,this.w,this.h);this.configure(c);
    if(progress>=1){this.finished=true;this.active=false;this.drawStatic();this.onDone?.();return;}
    for(const p of this.particles){
      const v=Math.max(0,Math.min(1,(progress-p.delay)/(1-p.delay))),e=ease(v),a=p.seed*Math.PI*2+(1-e)*3.7,r=(1-e)*(this.w*.5+p.seed*this.w*.5);
      const originX=this.w*.5+Math.cos(a)*r,originY=this.h*.5+Math.sin(a)*r*.6;
      const x=originX*(1-e)+p.x*e,y=originY*(1-e)+p.y*e;
      if(x< -20||x>this.w+20||y< -20||y>this.h+20)continue;
      c.fillStyle=progress<.45?'#e3bf85':p.color;c.globalAlpha=(.2+e*.8)*(.62+p.lum*.38);c.fillText(p.char,x,y);
    }
    c.globalAlpha=1;this.raf=requestAnimationFrame(()=>this.tick());
  }
  drawStatic(){this.ctx.clearRect(0,0,this.w,this.h);this.ctx.drawImage(this.staticCanvas,0,0,this.w,this.h);}
  stop(){this.active=false;cancelAnimationFrame(this.raf);}
  save(){
    const width=1800,{width:cols,height:rows}=this.data,cell=width/cols,ch=cell/.74,canvas=document.createElement('canvas');canvas.width=width;canvas.height=rows*ch;const c=canvas.getContext('2d');c.fillStyle='#141e28';c.fillRect(0,0,canvas.width,canvas.height);c.font=`${ch*1.28}px Sela`;c.textBaseline='top';
    for(const p of this.particles){c.fillStyle=p.color;c.globalAlpha=.68+p.lum*.32;c.fillText(p.char,(p.x-this.ox)/this.cell*cell,(p.y-this.oy)/this.ch*ch);}
    canvas.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mi-sela-ti-${this.kind}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});
  }
}
