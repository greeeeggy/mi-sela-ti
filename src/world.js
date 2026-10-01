import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {BoatPhysics,surfaceHeight,waveGLSL,spring} from './physics.js';
import {palette,buildBoat,buildGirl,glowTexture,seeded,mesh,tube,batch} from './scene-assets.js';

const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+13.7;a*=.5;}return n;}
float wave(vec2 p,float time){float h=0.;${waveGLSL}return h;}
`;

export class LakeWorld {
  constructor(canvas,{onFrame,onError}){
    this.onFrame=onFrame;this.mode='intro';this.gentle=false;this.rowing=false;this.progress=0;
    this.physics=new BoatPhysics();this.time=0;this.speed=0;this.finale=0;this.turn={value:0,velocity:0};
    this.sway={value:0,velocity:0};this.lanternSwing={value:0,velocity:0};this.tailSwing={value:0,velocity:0};
    this.ripples=Array.from({length:8},()=>new T.Vector4(0,0,-100,0));this.rippleIndex=0;
    this.width=innerWidth;this.height=innerHeight;this.mobile=innerWidth<700;
    try{this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){onError(e);return;}
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.4:1.75));
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;
    this.scene=new T.Scene();this.scene.fog=new T.FogExp2('#997c7b',.0055);
    this.camera=new T.PerspectiveCamera(43,1,.1,550);this.look=new T.Vector3(-2,1,-4);
    this.camera.position.set(6,4,9);
    this.scene.add(new T.HemisphereLight('#f7d1ba','#294854',2.1));
    this.sunLight=new T.DirectionalLight('#ffc68c',3.4);this.sunLight.castShadow=true;
    this.sunLight.shadow.mapSize.set(1024,1024);this.sunLight.shadow.camera.left=-6;this.sunLight.shadow.camera.right=6;
    this.sunLight.shadow.camera.top=6;this.sunLight.shadow.camera.bottom=-6;this.sunLight.shadow.camera.near=1;this.sunLight.shadow.camera.far=70;
    this.sunLight.shadow.bias=-.00015;this.sunLight.shadow.normalBias=.012;this.scene.add(this.sunLight,this.sunLight.target);
    const fill=new T.DirectionalLight('#b4d8de',.9);fill.position.set(-8,7,9);this.scene.add(fill);
    this.glow=glowTexture();this.p=palette();this.sky();this.water();this.land();this.makeBoat();this.details();this.makeGlyphs();
    this.resize();window.addEventListener('resize',()=>this.resize());
    this.layoutObserver=new ResizeObserver(()=>this.readingWindow());
    for(const id of ['floating-letter','keyboard-dock']){const el=document.getElementById(id);if(el){this.layoutObserver.observe(el);el.addEventListener('animationend',()=>this.readingWindow());}}
    this.last=performance.now();this.renderer.setAnimationLoop(now=>this.frame(now));
    canvas.addEventListener('pointerdown',e=>this.touchWater(e));
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onError(new Error('Graphics context lost'));});
  }
  get distance(){return this.physics.distance;}
  set distance(d){this.physics.reset(d);}
  resize(){
    if(!this.renderer)return;this.width=innerWidth;this.height=innerHeight;this.mobile=innerWidth<700;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.4:1.75));this.renderer.setSize(this.width,this.height);
    this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.readingWindow();
  }
  readingWindow(){
    this.readCenter=null;if(this.mode!=='decode'||!this.mobile)return;
    const card=document.getElementById('floating-letter'),dock=document.getElementById('keyboard-dock');
    if(!card||!dock||dock.getBoundingClientRect().height===0)return;
    const upper=card.getBoundingClientRect().bottom,lower=dock.getBoundingClientRect().top;
    this.readCenter=(upper+lower)*.5;this.readGap=Math.max(40,lower-upper);
  }
  sky(){
    const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vP;uniform float time;${noiseGLSL}
      void main(){vec3 d=normalize(vP);float h=d.y;
        vec3 col=mix(vec3(.87,.34,.16),vec3(.36,.22,.32),smoothstep(-.03,.28,h));
        col=mix(col,vec3(.08,.18,.30),smoothstep(.17,.9,h));
        vec3 sun=normalize(vec3(-.53,.095,-1.));float sd=dot(d,sun);
        col+=vec3(1.,.37,.095)*pow(max(sd,0.),45.)*.35;
        float disc=smoothstep(.99942,.99965,sd);col=mix(col,vec3(2.7,1.55,.72),disc);
        vec2 cp=vec2(d.x/max(.07,h),d.z/max(.07,h));
        float clouds=fbm(cp*vec2(1.4,6.)+vec2(time*.0015,0.));
        float veil=smoothstep(.49,.73,clouds)*smoothstep(.055,.16,h)*(1.-smoothstep(.38,.58,h));
        col=mix(col,vec3(.76,.49,.46),veil*.4);col+=vec3(.24,.14,.075)*veil*pow(max(sd,0.),14.);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.skyMesh=new T.Mesh(new T.SphereGeometry(400,32,20),mat);this.scene.add(this.skyMesh);
  }
  water(){
    const shader={uniforms:{color:{value:new T.Color('#263c42')},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},time:{value:0},boat:{value:new T.Vector2()},velocity:{value:0},ripples:{value:this.ripples}},
      vertexShader:`uniform mat4 textureMatrix;uniform float time;varying vec4 vUv;varying vec3 vWorld;${noiseGLSL}
        void main(){vec4 w=modelMatrix*vec4(position,1.);w.y+=wave(w.xz,time);vWorld=w.xyz;vUv=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform vec2 boat;uniform float velocity;uniform vec4 ripples[8];varying vec4 vUv;varying vec3 vWorld;${noiseGLSL}
        void main(){vec2 p=vWorld.xz;float h=wave(p,time);float hx=wave(p+vec2(.07,0.),time)-h;float hz=wave(p+vec2(0.,.07),time)-h;
          vec2 slope=vec2(hx,hz)/.07;float shimmer=noise(p*3.+vec2(time*.08,-time*.06))-.5;
          slope+=vec2(sin(p.y*8.1+p.x*3.7-time*1.3),sin(p.x*7.3-p.y*2.2+time))*.012;
          float rings=0.;for(int i=0;i<8;i++){float age=time-ripples[i].z;float r=length(p-ripples[i].xy);float envelope=exp(-pow((r-age*.72)*3.6,2.))*exp(-age*.7)*step(0.,age);float ring=sin(r*18.-age*9.)*envelope*ripples[i].w;slope+=normalize(p-ripples[i].xy+vec2(.0001))*ring*.12;rings+=max(0.,ring)*.06;}
          vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),view=normalize(cameraPosition-vWorld);
          vec2 uv=vUv.xy/vUv.w;uv+=slope*.032/(1.+length(cameraPosition-vWorld)*.025);
          vec3 reflection=texture2D(tDiffuse,clamp(uv,.001,.999)).rgb;
          float fresnel=.085+.85*pow(1.-max(dot(n,view),0.),3.);
          vec3 col=mix(vec3(.031,.096,.105)+shimmer*.009,reflection,fresnel);
          vec3 sun=normalize(vec3(-.53,.095,-1.)),halfVector=normalize(view+sun);
          float spec=pow(max(dot(n,halfVector),0.),240.);col+=vec3(1.5,.75,.29)*spec*.8;
          vec2 delta=p-boat;float behind=delta.y-1.6;
          float wake=exp(-pow((abs(delta.x)-behind*.23)/.14,2.))*exp(-behind*.45)*step(0.,behind)*velocity;
          col+=vec3(.18,.23,.19)*(wake*.13+rings);
          float fog=1.-exp(-length(cameraPosition-vWorld)*.003);col=mix(col,vec3(.53,.39,.34),fog*.7);
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`};
    this.waterMesh=new Reflector(new T.PlaneGeometry(270,380,108,150),{textureWidth:this.mobile?512:768,textureHeight:this.mobile?512:768,clipBias:.003,multisample:2,shader});
    this.waterMesh.rotation.x=-Math.PI/2;this.waterMesh.position.z=-70;this.waterMesh.material.side=T.DoubleSide;
    this.waterMat=this.waterMesh.material;this.ripples=this.waterMat.uniforms.ripples.value;this.scene.add(this.waterMesh);
  }
  land(){
    const rnd=seeded(87);this.mountains=new T.Group();this.scene.add(this.mountains);
    for(let layer=0;layer<3;layer++){
      const geo=new T.PlaneGeometry(420,28,100,10);geo.rotateX(-Math.PI/2);const a=geo.attributes.position,colors=[];
      const dark=new T.Color(['#435b62','#766b73','#a18786'][layer]),light=dark.clone().lerp(new T.Color('#c6a28d'),.28);
      for(let i=0;i<a.count;i++){
        const x=a.getX(i),z=a.getZ(i),peak=6+layer*2.5+Math.sin(x*.044+layer*2)*3+Math.sin(x*.11+layer)*1.7+Math.cos(x*.23)*.55;
        const h=peak*Math.pow(Math.max(0,Math.cos(z/28*Math.PI)),1.8)-.45;a.setY(i,h);
        const c=dark.clone().lerp(light,clamp(h/14,0,1));colors.push(c.r,c.g,c.b);
      }
      geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
      const m=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));m.position.z=-98-layer*38;this.mountains.add(m);
    }
    const banks=new T.Group();this.scene.add(banks);const islands=new T.Group();banks.add(islands);
    const shore=new T.MeshStandardMaterial({color:'#4e5c51',roughness:1}),rock=new T.MeshStandardMaterial({color:'#716e65',roughness:1});
    for(const s of [-1,1])for(let i=0;i<18;i++){
      const z=21-i*14,x=s*(16+Math.sin(i*.67)*3);
      mesh(islands,new T.SphereGeometry(1,16,8),shore,[x+s*7,-1.7,z],[11,2,12]);
      for(let j=0;j<3;j++){const r=mesh(islands,new T.IcosahedronGeometry(1,1),rock,[x+s*(1+rnd()*3),-.1+rnd()*.17,z+(rnd()-.5)*9],[.5+rnd()*.8,.3+rnd()*.45,.5+rnd()*.7]);r.rotation.set(rnd(),rnd(),rnd());}
    }
    batch(islands);islands.traverse(m=>{m.castShadow=false;});
    const trunks=new T.Group();banks.add(trunks);const leafTrees=[];
    for(const s of [-1,1])for(let i=0;i<11;i++){
      const x=s*(16.5+Math.sin(i*.9)*2.5),z=12-i*23,h=4.6+rnd()*2.5;
      const tree=new T.Group();trunks.add(tree);const leaves=[];leafTrees.push({x,z,leaves});
      tube(tree,[[x,0,z],[x-s*.27,h*.42,z-.15],[x-s*.62,h*.73,z+.18],[x-s*.9,h,z]],this.p.bark,.13,14,5);
      for(let b=0;b<7;b++){
        const angle=b/7*Math.PI*2+rnd()*.4,reach=2+rnd()*1.7,endX=x+Math.cos(angle)*reach,endZ=z+Math.sin(angle)*reach;
        tube(tree,[[x-s*.5,h*.6,z],[x+Math.cos(angle)*reach*.5,h*.98,endZ*.3+z*.7],[endX,h*.78,endZ]],this.p.bark,.037,9,4);
        for(let crown=0;crown<90;crown++){
          const t=.2+rnd()*.85,a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.83;
          leaves.push({x:lerp(x,endX,t)+Math.cos(a)*r,y:h*(.92-t*.1)+(rnd()-.5)*.75,z:lerp(z,endZ,t)+Math.sin(a)*r,angle:rnd()*6,scale:.16+rnd()*.11});
        }
        for(let strand=0;strand<9;strand++){
          const sx=endX+(rnd()-.5)*1.8,sz=endZ+(rnd()-.5)*1.8,length=1.6+rnd()*2.2;
          if(strand%3===0)tube(tree,[[sx,h*.83,sz],[sx+s*.15,h*.61,sz],[sx+s*.22,h*.83-length,sz+.13]],this.p.leaf,.007,5,3);
          for(let j=0;j<16;j++){const t=j/16;leaves.push({x:sx+Math.sin(t*2)*s*.18+(rnd()-.5)*.29,y:h*.84-t*length,z:sz+(rnd()-.5)*.3,angle:rnd()*6,scale:.12+rnd()*.08});}
        }
      }
      batch(tree);tree.traverse(m=>{m.castShadow=false;});
    }
    const leafShape=new T.Shape();leafShape.moveTo(0,-1);leafShape.quadraticCurveTo(.42,-.35,0,1);leafShape.quadraticCurveTo(-.42,-.35,0,-1);
    const leafMat=this.p.leaf.clone();this.leafWind={value:0};leafMat.onBeforeCompile=s=>{s.uniforms.windTime=this.leafWind;s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(windTime*.65+instanceMatrix[3].z*.22+instanceMatrix[3].x)*.035;');};
    const leafGeo=new T.ShapeGeometry(leafShape,3),dummy=new T.Object3D();
    for(const {x,z,leaves} of leafTrees){
      const leafMesh=new T.InstancedMesh(leafGeo,leafMat,leaves.length);leafMesh.position.set(x,0,z);
      leaves.forEach((l,i)=>{dummy.position.set(l.x-x,l.y,l.z-z);dummy.rotation.set(.4,l.angle,-.3+Math.sin(l.angle)*.5);dummy.scale.set(l.scale,l.scale*1.7,l.scale);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);});leafMesh.computeBoundingSphere();banks.add(leafMesh);
    }
    const reedGeo=new T.PlaneGeometry(.035,1,1,5),rPos=reedGeo.attributes.position;
    for(let i=0;i<rPos.count;i++){const y=rPos.getY(i)+.5;rPos.setY(i,y);rPos.setX(i,rPos.getX(i)*(1-y)+y*y*.2);}reedGeo.computeVertexNormals();
    const reeds=new T.InstancedMesh(reedGeo,new T.MeshStandardMaterial({color:'#788266',roughness:1,side:T.DoubleSide}),720);
    for(let i=0;i<720;i++){const s=i%2?1:-1;dummy.position.set(s*(11.8+rnd()*3.9),-.03,19-rnd()*250);dummy.rotation.set(.04+rnd()*.2,rnd()*6,(rnd()-.5)*.22);dummy.scale.set(1,.38+rnd()*.8,1);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);}banks.add(reeds);
  }
  makeBoat(){
    Object.assign(this,buildBoat(this.scene,this.p,this.glow));this.character=buildGirl(this.boat,this.p);Object.assign(this,this.character);
    const shadow=new T.Mesh(new T.PlaneGeometry(2,4.7),new T.MeshBasicMaterial({map:this.glow,color:'#101f22',transparent:true,opacity:.38,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;this.scene.add(shadow);this.contactShadow=shadow;
  }
  details(){
    const rnd=seeded(112),lilies=new T.Group();this.scene.add(lilies);const blossoms=new T.Group();lilies.add(blossoms);
    const leafMat=new T.MeshStandardMaterial({color:'#65755c',roughness:.6,side:T.DoubleSide}),veinMat=new T.MeshStandardMaterial({color:'#93a37d',roughness:1});
    for(let i=0;i<82;i++){
      const s=i%2?1:-1,x=s*(3.6+rnd()*10.5),z=12-rnd()*235,r=.12+rnd()*.3;
      const pad=mesh(blossoms,new T.CircleGeometry(r,28,.08,Math.PI*1.91),leafMat,[x,.027,z]);pad.rotation.x=-Math.PI/2;pad.rotation.z=rnd()*6;
      for(let k=0;k<4;k++){const a=k*Math.PI*.42+.2;tube(blossoms,[[x,.029,z],[x+Math.sin(a)*r*.4,.03,z+Math.cos(a)*r*.4],[x+Math.sin(a)*r*.85,.03,z+Math.cos(a)*r*.85]],veinMat,.002,5);}
      if(i%4===0){for(let k=0;k<7;k++){const a=k/7*Math.PI*2;const petal=mesh(blossoms,new T.SphereGeometry(1,12,8),this.p.petal,[x+Math.sin(a)*.064,.078,z+Math.cos(a)*.064],[.033,.078,.02]);petal.rotation.set(Math.cos(a)*.55,0,-Math.sin(a)*.55);}mesh(blossoms,new T.SphereGeometry(.025,10,8),this.p.collar,[x,.094,z]);}
    }batch(blossoms);blossoms.traverse(m=>{m.castShadow=false;});
    const count=150,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(rnd()-.5)*33;pos[i*3+1]=.35+rnd()*4.4;pos[i*3+2]=20-rnd()*225;}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
    this.fireflies=new T.Points(geo,new T.PointsMaterial({map:this.glow,color:'#ffd49b',size:.22,transparent:true,opacity:.75,blending:T.AdditiveBlending,depthWrite:false}));this.scene.add(this.fireflies);
    this.wakeParticles=Array.from({length:90},()=>({age:10,x:0,z:0,side:0}));const wakeGeo=new T.BufferGeometry();wakeGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(270),3));
    this.wake=new T.Points(wakeGeo,new T.PointsMaterial({map:this.glow,color:'#dfdcc1',size:.1,transparent:true,opacity:.38,depthWrite:false}));this.scene.add(this.wake);this.wakeIndex=0;this.wakeTimer=0;
    this.marker=new T.Group();this.scene.add(this.marker);
    for(let r of [.62,.8]){const ring=mesh(this.marker,new T.TorusGeometry(r,.005,5,80),new T.MeshBasicMaterial({color:'#e4b97d',transparent:true,opacity:.52}));ring.castShadow=false;}
    const glow=new T.Sprite(new T.SpriteMaterial({map:this.glow,color:'#ffc987',transparent:true,blending:T.AdditiveBlending,depthWrite:false}));glow.scale.set(4,4,1);this.marker.add(glow);
  }
  async makeGlyphs(){
    await document.fonts.load('40px Sela');const c=document.createElement('canvas');c.width=1024;c.height=256;
    this.writing=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,color:'#ffe6be'}));this.writing.scale.set(4,1,1);this.marker.add(this.writing);this.updateFragment('mi sela ti');
    this.symbols=[];for(let i=0;i<30;i++){
      const tx=document.createElement('canvas');tx.width=tx.height=64;const ctx=tx.getContext('2d');ctx.font='48px Sela';ctx.fillStyle='#f8ce90';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('miselatiluma'[i%12],32,32);
      const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(tx),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));s.scale.set(.28,.28,1);s.visible=false;this.scene.add(s);this.symbols.push(s);
    }
  }
  updateFragment(text){
    if(!this.writing)return;const c=this.writing.material.map.image,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.fillStyle='#ffdfa6';ctx.font='42px Sela';
    const rows=[];let row='';for(const w of text.split(' ')){if((row+w).length>33){rows.push(row);row='';}row+=w+' ';}if(row)rows.push(row);rows.slice(0,3).forEach((r,i)=>ctx.fillText(r,512,60+i*65));this.writing.material.map.needsUpdate=true;
  }
  setMode(mode){this.mode=mode;if(mode==='finale')this.finale=0;requestAnimationFrame(()=>this.readingWindow());}
  ripple(x,z,strength=.75){this.ripples[this.rippleIndex++%8].set(x,z,this.time,strength);}
  touchWater(e){
    if(!['intro','travel','decode'].includes(this.mode))return;
    const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(e.clientX/this.width*2-1,1-e.clientY/this.height*2),this.camera);
    const hit=new T.Vector3();if(ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),hit)&&hit.distanceTo(this.camera.position)<35)this.ripple(hit.x,hit.z,1.5);
  }
  motion(dt){
    const rowing=this.mode==='travel'&&this.rowing,p=this.physics.step(dt,{rowing,anchored:this.mode!=='travel',gentle:this.gentle});
    this.time=p.time;this.speed=p.velocity/1.35;this.boat.position.set(p.x,p.heave.value,-p.distance);this.boat.rotation.set(p.pitch.value,p.yaw.value,p.roll.value);
    this.strokeBlend=lerp(this.strokeBlend||0,rowing?1:0,1-Math.exp(-dt*4));
    this.oars.forEach((o,i)=>{const s=i?1:-1;o.rotation.y=s*Math.cos(p.phase)*.30*this.strokeBlend;o.rotation.z=-s*(.12+Math.sin(p.phase)*.11*this.strokeBlend);o.rotation.x=Math.sin(p.phase-.7)*.1*this.strokeBlend;});
    const steps=Math.max(1,Math.ceil(dt*120));for(let i=0;i<steps;i++){
      const h=dt/steps;spring(this.turn,this.mode==='decode'?.82:Math.sin(this.time*.14)*.09,h,3.5,1);
      spring(this.sway,Math.cos(p.phase)*this.strokeBlend*.025,h,5,.86);spring(this.lanternSwing,-p.roll.value*1.8+Math.sin(p.phase)*p.stroke*.016,h,5,.6);spring(this.tailSwing,-this.sway.value*2.3+p.pitch.value*.8,h,5.5,.65);
    }
    this.girl.rotation.x=this.sway.value;this.head.rotation.set(.018+this.sway.value*.35,this.turn.value,Math.sin(this.time*.43)*.008);
    this.tail.rotation.x=this.tailSwing.value;this.tail.rotation.z=p.roll.value*.65;
    this.lanternPivot.rotation.z=this.lanternSwing.value;this.light.intensity=2.8+Math.sin(this.time*12.7)*.12;this.flame.scale.y=.033*(1+Math.sin(this.time*9)*.13);
    this.character.pose(this.oars,p.phase,this.strokeBlend,this.time);
    const power=Math.sin(p.phase);if(rowing&&power>.8&&(this.lastPower||0)<=.8){for(const s of [-1,1])this.ripple(p.x+s*2.65,-p.distance-.3,.9);}this.lastPower=power;
    this.wakeTimer+=dt*p.velocity;if(this.wakeTimer>.035){this.wakeTimer=0;for(const s of [-1,1]){const w=this.wakeParticles[this.wakeIndex++%90];Object.assign(w,{age:0,x:p.x+s*.39,z:-p.distance+1.72,side:s});}}
    const a=this.wake.geometry.attributes.position;this.wakeParticles.forEach((w,i)=>{w.age+=dt;const x=w.x+w.side*w.age*.13,z=w.z+w.age*.07;a.setXYZ(i,x,w.age>3?-2:surfaceHeight(x,z,this.time)+.024,z);});a.needsUpdate=true;
    this.contactShadow.position.set(p.x,.001,-p.distance);this.contactShadow.rotation.z=-p.yaw.value;
    this.sunLight.position.set(p.x-14,7,-p.distance-28);this.sunLight.target.position.set(p.x,.35,-p.distance);
  }
  composition(dt){
    const z=this.boat.position.z,x=this.boat.position.x,cp=new T.Vector3(),target=new T.Vector3();
    if(this.mode==='intro'){
      cp.set(this.mobile?5.2:5.8,this.mobile?3.1:3.5,this.mobile?8.3:8.4);target.set(this.mobile?-1.65:-3.2,this.mobile?.82:.8,-2.3);
    }else if(this.mode==='decode'){
      const fit=this.mobile?clamp(350/(this.readGap||190),1,5.5):1;
      cp.set(x+(this.mobile?4.2*fit:5.5),this.mobile?.77+1.43*fit:2.8,z+(this.mobile?5.1*fit:6.5));target.set(x+(this.mobile?0:1.9),.77,z-.15);
    }else{
      cp.set(x+(this.mobile?3.25:4.5),this.mobile?2.7:3.3,z+(this.mobile?7:8));target.set(x-.5,.88,z-1.8);
    }
    if(this.mode==='finale'){this.finale+=dt;cp.y+=Math.min(this.finale,4)*.45;if(!this.gentle&&this.finale>2&&this.finale<2.5){cp.x+=Math.sin(this.time*68)*.035;cp.y+=Math.cos(this.time*61)*.025;}}
    const ease=1-Math.exp(-dt*(this.gentle?.85:1.1));this.camera.position.lerp(cp,ease);this.look.lerp(target,ease);this.camera.lookAt(this.look);
    const desired=this.mode==='decode'&&this.mobile&&this.readCenter!==null?this.height*.5-this.readCenter:0;
    this.viewShift=lerp(this.viewShift||0,desired,1-Math.exp(-dt*2));
    if(Math.abs(this.viewShift)>.25)this.camera.setViewOffset(this.width,this.height,0,this.viewShift,this.width,this.height);else this.camera.clearViewOffset();
    this.skyMesh.position.copy(this.camera.position);this.mountains.position.z=z;this.waterMesh.position.z=z-70;
    this.marker.position.set(x+2.6,1.1+Math.sin(this.time*.75)*.07,z-(this.mode==='decode'?3.7:5+16*(1-this.progress)));
    this.marker.visible=['travel','decode'].includes(this.mode);this.marker.lookAt(this.camera.position);this.marker.rotation.z+=Math.sin(this.time*.24)*.035;
    for(let i=0;i<(this.symbols?.length||0);i++){
      const s=this.symbols[i];s.visible=this.mode==='finale';if(s.visible){const f=clamp(this.finale/4,0,1),a=i*2.4+this.time*.8;s.position.set(x+Math.cos(a)*(3*(1-f)+.2),1.2+f*4+i*.022,z-2+Math.sin(a)*2*(1-f));s.material.opacity=1-f*.3;}
    }
  }
  frame(now){
    const dt=Math.min(Math.max((now-this.last)/1000,0),.25);this.last=now;if(document.hidden||['letter','portrait'].includes(this.mode))return;
    this.motion(dt);this.composition(dt);this.waterMat.uniforms.time.value=this.time;this.waterMat.uniforms.boat.value.set(this.boat.position.x,this.boat.position.z);this.waterMat.uniforms.velocity.value=this.physics.velocity;
    this.leafWind.value=this.time;this.skyMesh.material.uniforms.time.value=this.time;this.fireflies.material.opacity=.6+Math.sin(this.time*.65)*.15;
    this.renderer.render(this.scene,this.camera);this.onFrame(dt,this.speed);
  }
}
