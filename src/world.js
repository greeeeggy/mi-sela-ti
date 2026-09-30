import * as THREE from 'three';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=THREE.MathUtils.lerp;
function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.85,...extra});}
function sphere(parent,mat,pos,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
function box(parent,mat,pos,size){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);parent.add(m);return m;}
function tube(parent,pts,mat,r=.025){const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,6,false),mat);parent.add(m);return m;}
function seeded(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export class LakeWorld{
  constructor(canvas,{onFrame,onError}){
    this.onFrame=onFrame;this.mode='intro';this.time=0;this.distance=0;this.speed=0;this.side=0;this.gentle=false;this.finale=0;
    try{this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){onError(e);return;}
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2('#746872',.009);
    this.camera=new THREE.PerspectiveCamera(47,1,.1,600);this.camera.position.set(9,5.6,13);
    this.scene.add(new THREE.HemisphereLight('#ffd8b3','#283c50',2));
    const sunLight=new THREE.DirectionalLight('#ffbd77',2.8);sunLight.position.set(20,20,-40);this.scene.add(sunLight);
    const fill=new THREE.DirectionalLight('#aac4dd',.7);fill.position.set(-10,8,10);this.scene.add(fill);
    this.sky();this.water();this.land();this.makeBoat();this.details();this.makeGlyphs();
    this.resize();window.addEventListener('resize',()=>this.resize());
    this.last=performance.now();this.renderer.setAnimationLoop(now=>this.frame(now));
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onError(new Error('Graphics context lost'));});
  }
  resize(){if(!this.renderer)return;this.mobile=innerWidth<700;this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
  sky(){
    const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float time;void main(){vec3 dir=normalize(vP);float h=dir.y;vec3 low=vec3(.91,.55,.38);vec3 mid=vec3(.48,.40,.46);vec3 high=vec3(.12,.23,.36);vec3 col=mix(low,mid,smoothstep(-.04,.24,h));col=mix(col,high,smoothstep(.1,.85,h));vec3 s=normalize(vec3(-32.,10.,-95.));float sd=dot(dir,s);col+=vec3(1.,.55,.22)*pow(max(sd,0.),110.)*.45;float clouds=sin(dir.x*35.+dir.z*22.)*sin(dir.z*39.-dir.x*12.)*.5+.5;col=mix(col,vec3(.79,.53,.48),smoothstep(.68,.98,clouds)*smoothstep(.02,.09,h)*(1.-smoothstep(.2,.32,h))*.2);gl_FragColor=vec4(col,1.);}`});
    const sky=new THREE.Mesh(new THREE.SphereGeometry(350,32,16),mat);this.scene.add(sky);this.skyMesh=sky;
    this.sun=new THREE.Mesh(new THREE.CircleGeometry(3.3,64),new THREE.MeshBasicMaterial({color:'#ffcf91',fog:false,depthTest:false,depthWrite:false}));this.sun.renderOrder=1;this.sun.position.set(-32,10,-95);this.scene.add(this.sun);
    const glowC=document.createElement('canvas');glowC.width=glowC.height=128;const c=glowC.getContext('2d');const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,182,91,.4)');g.addColorStop(.2,'rgba(255,157,67,.22)');g.addColorStop(1,'rgba(255,157,67,0)');c.fillStyle=g;c.fillRect(0,0,128,128);this.glowTexture=new THREE.CanvasTexture(glowC);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:'#ffca96',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));glow.scale.set(36,36,1);glow.position.copy(this.sun.position);glow.position.z+=.1;this.scene.add(glow);this.sunGlow=glow;
  }
  water(){
    this.waterMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},travel:{value:0},boat:{value:new THREE.Vector2(0,0)}},vertexShader:`uniform float time;varying vec3 vWorld;void main(){vec3 p=position;vec4 world=modelMatrix*vec4(p,1.);world.y+=sin(world.x*.4+world.z*.3+time*.7)*.045+sin(world.z*.8-time)*.018;vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`uniform float time;uniform float travel;uniform vec2 boat;varying vec3 vWorld;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=vWorld.xz;float d=length(cameraPosition-vWorld);float w=sin(p.x*2.3+p.y*1.7+time*1.1)*sin(p.y*5.-time*1.3);float w2=sin(p.x*7.+p.y*2.8+time*.8);float far=smoothstep(10.,110.,d);vec3 c=mix(vec3(.075,.18,.24),vec3(.5,.33,.31),far);c+=w*.014+w2*.006;float sunX=-32.*clamp(-(p.y+travel)/95.,0.,1.);float path=exp(-pow((p.x-sunX)/(1.0+-(p.y+travel)*.055),2.));float bands=pow(max(0.,sin(p.y*6.5+w*2.+time*.7)),12.);float fine=pow(max(0.,sin(p.y*16.+p.x*11.+time*2.)),26.);c+=vec3(.94,.49,.21)*path*(bands*.5+fine*.28)*smoothstep(5.,35.,-(p.y+travel));float bow=length(p-boat);float ripple=sin(bow*7.-time*3.);c+=vec3(.12,.19,.18)*pow(max(ripple,0.),24.)*exp(-bow*.5)*.4;gl_FragColor=vec4(c,1.);}`});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000,90,90),this.waterMat);m.rotation.x=-Math.PI/2;m.position.y=-.05;this.scene.add(m);
  }
  land(){
    const rnd=seeded(87);
    this.mountains=new THREE.Group();this.scene.add(this.mountains);
    for(let layer=0;layer<4;layer++){
      const vertices=[],indices=[],z=-75-layer*28;
      for(let i=0;i<=80;i++){const x=-230+i*5.8;const height=3+layer*2+Math.sin(i*.26+layer)*3+Math.sin(i*.57)*1.6+rnd()*1.1;vertices.push(x,-1,z,x,height,z);if(i<80){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const colors=['#3f4d5a','#555461','#776672','#92757b'];const mountain=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:colors[layer],fog:true}));this.mountains.add(mountain);
    }
    this.banks=new THREE.Group();this.scene.add(this.banks);
    const treeMat=material('#253b43');const trunk=material('#37464a');
    for(let side of [-1,1])for(let i=0;i<30;i++){
      const z=15-i*8,x=side*(17+rnd()*7),h=2+rnd()*5;
      const island=new THREE.Mesh(new THREE.SphereGeometry(1,12,6),material('#344950'));island.scale.set(7+rnd()*4,.65,8);island.position.set(x+side*4,-.55,z);this.banks.add(island);
      if(i%2===0){const t=new THREE.Group();t.position.set(x+side*3,0,z);box(t,trunk,[0,h*.45,0],[.16,h*.9,.16]);for(let j=0;j<3;j++){const con=new THREE.Mesh(new THREE.ConeGeometry(h*(.25-j*.035),h*.56,9),treeMat);con.position.y=h*.45+j*h*.19;t.add(con);}this.banks.add(t);}
    }
  }
  makeBoat(){
    this.boat=new THREE.Group();this.scene.add(this.boat);
    const wood=material('#936449'),rimMat=material('#d6a36b'),inside=material('#694632');
    const shape=new THREE.Shape();shape.moveTo(0,-1.85);shape.bezierCurveTo(-.8,-1.3,-.86,.65,-.45,1.55);shape.quadraticCurveTo(0,1.95,.45,1.55);shape.bezierCurveTo(.86,.65,.8,-1.3,0,-1.85);
    const hull=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.38,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.14,bevelThickness:.12,curveSegments:24}),wood);hull.rotation.x=Math.PI/2;hull.position.y=.2;this.boat.add(hull);
    const floor=new THREE.Mesh(new THREE.ShapeGeometry(shape,24),inside);floor.rotation.x=-Math.PI/2;floor.scale.set(.82,.87,.82);floor.position.y=.22;this.boat.add(floor);
    const rimPoints=shape.getPoints(80).map(p=>[p.x,.26,-p.y]);tube(this.boat,rimPoints,rimMat,.055);
    for(let x=-.55;x<.6;x+=.15)tube(this.boat,[[x,.232,-1.05],[x,.232,.8]],material('#977354'),.013);
    box(this.boat,wood,[0,.37,.8],[1.15,.09,.22]);box(this.boat,rimMat,[0,.46,-.2],[1.27,.09,.26]);
    const skin=material('#d49c7f'),shirt=material('#30383f'),yellow=material('#f3c350'),hair=material('#282528'),pants=material('#24303a'),white=material('#f5e7dc'),eye=material('#292127');
    this.girl=new THREE.Group();this.girl.position.set(0,.47,-.18);this.boat.add(this.girl);
    sphere(this.girl,pants,[0,.09,.12],[.25,.15,.32]);
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,.54,24),shirt);torso.position.set(0,.4,0);this.girl.add(torso);
    box(this.girl,yellow,[0,.43,-.235],[.065,.51,.025]);
    const collarA=box(this.girl,yellow,[-.115,.657,-.15],[.18,.09,.18]);collarA.rotation.z=.28;const collarB=box(this.girl,yellow,[.115,.657,-.15],[.18,.09,.18]);collarB.rotation.z=-.28;
    sphere(this.girl,skin,[0,.73,0],[.09,.11,.08]);
    this.head=new THREE.Group();this.head.position.set(0,.96,-.015);this.girl.add(this.head);
    sphere(this.head,skin,[0,0,0],[.215,.265,.19]);
    // Open-faced hair cap, a swept fringe, and a small tied ponytail.
    const cap=new THREE.Mesh(new THREE.SphereGeometry(1,28,20,0,Math.PI*2,0,Math.PI*.54),hair);cap.scale.set(.229,.28,.206);cap.position.set(0,.012,.013);this.head.add(cap);
    sphere(this.head,hair,[0,-.04,.137],[.214,.226,.11]);
    const fringe=sphere(this.head,hair,[-.1,.145,-.1],[.12,.14,.1]);fringe.rotation.z=-.45;
    sphere(this.head,hair,[.018,-.04,.29],[.13,.11,.19]);sphere(this.head,hair,[.025,-.19,.35],[.095,.18,.11]);
    const tie=new THREE.Mesh(new THREE.TorusGeometry(.065,.018,8,20),yellow);tie.position.set(.02,-.08,.29);this.head.add(tie);
    for(const s of [-1,1]){
      sphere(this.head,skin,[s*.207,-.01,0],[.028,.054,.034]);
      sphere(this.head,white,[s*.075,.008,-.174],[.044,.025,.016]);sphere(this.head,eye,[s*.075,.007,-.188],[.014,.019,.009]);
      tube(this.head,[[s*.112,.065,-.17],[s*.077,.073,-.185],[s*.046,.066,-.18]],hair,.009);
      const earring=new THREE.Mesh(new THREE.TorusGeometry(.027,.005,8,16),rimMat);earring.position.set(s*.225,-.069,-.01);earring.rotation.y=Math.PI/2;this.head.add(earring);
    }
    sphere(this.head,skin,[0,-.037,-.196],[.027,.036,.025]);tube(this.head,[[-.042,-.102,-.17],[0,-.12,-.184],[.042,-.102,-.17]],material('#986655'),.009);
    for(const side of [-1,1]){
      const sleeve=sphere(this.girl,shirt,[side*.253,.5,0],[.095,.135,.115]);sleeve.rotation.z=side*.25;
      tube(this.girl,[[side*.29,.47,0],[side*.37,.26,-.09],[side*.45,.3,-.28]],skin,.047);
      sphere(this.girl,skin,[side*.45,.3,-.28],[.047,.037,.06]);
      tube(this.girl,[[side*.14,.1,.12],[side*.18,-.02,-.18],[side*.17,-.15,-.48]],pants,.085);
    }
    this.oars=[];
    for(let side of [-1,1]){
      const o=new THREE.Group();o.position.set(side*.48,.42,-.42);o.rotation.z=side*.14;
      box(o,rimMat,[side*.58,-.1,.1],[1.32,.045,.045]);const blade=box(o,wood,[side*1.28,-.13,.1],[.42,.035,.2]);blade.rotation.y=side*.25;this.boat.add(o);this.oars.push(o);
    }
    const lantern=new THREE.Group();lantern.position.set(0,.38,1.25);this.boat.add(lantern);
    box(lantern,rimMat,[0,.04,0],[.19,.06,.19]);box(lantern,rimMat,[0,.27,0],[.2,.035,.2]);
    box(lantern,new THREE.MeshBasicMaterial({color:'#ffcf7b',transparent:true,opacity:.86}),[0,.16,0],[.135,.2,.135]);
    for(let x of [-.087,.087])for(let z of [-.087,.087])box(lantern,wood,[x,.16,z],[.018,.22,.018]);
    tube(lantern,[[-.06,.3,0],[-.06,.37,0],[.06,.37,0],[.06,.3,0]],rimMat,.008);
    const light=new THREE.PointLight('#ffc277',2.3,5,2);light.position.set(0,.6,1.2);this.boat.add(light);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,transparent:true,color:'#ffa950',blending:THREE.AdditiveBlending,depthWrite:false}));glow.position.set(0,.55,1.25);glow.scale.set(1.1,1.1,1);this.boat.add(glow);
  }
  details(){
    const rnd=seeded(112);this.lilies=new THREE.Group();this.scene.add(this.lilies);
    const leaf=material('#506752'),flower=material('#f2c9ad');
    for(let i=0;i<65;i++){
      const s=i%2?1:-1,x=s*(3.5+rnd()*15),z=12-rnd()*225,r=.13+rnd()*.3;
      const disc=new THREE.Mesh(new THREE.CircleGeometry(r,14,0,Math.PI*1.88),leaf);disc.rotation.x=-Math.PI/2;disc.rotation.z=rnd()*6;disc.position.set(x,.015,z);this.lilies.add(disc);
      if(i%4===0){for(let k=0;k<5;k++){const p=sphere(this.lilies,flower,[x+Math.sin(k*1.25)*.065,.075,z+Math.cos(k*1.25)*.065],[.034,.075,.025]);p.rotation.z=Math.sin(k)*.5;}}
    }
    const count=130,pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){pos[i*3]=(rnd()-.5)*45;pos[i*3+1]=.5+rnd()*4;pos[i*3+2]=15-rnd()*200;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));this.fireflies=new THREE.Points(geo,new THREE.PointsMaterial({color:'#ffd89a',size:.08,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));this.scene.add(this.fireflies);
    // A few thin reeds on the close shores, rather than a repeating wall.
    const reeds=material('#6b6e56');for(let i=0;i<32;i++){const s=i%2?1:-1,x=s*(12+rnd()*5),z=8-rnd()*175;for(let j=0;j<4;j++){const h=.5+rnd()*.8;tube(this.lilies,[[x+j*.08,0,z],[x+j*.08+.06,h*.6,z],[x+j*.08+.1,h,z]],reeds,.012);}}
    const wakeGeo=new THREE.BufferGeometry();wakeGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(60*3),3));this.wake=new THREE.Points(wakeGeo,new THREE.PointsMaterial({color:'#c7d3bf',size:.045,transparent:true,opacity:.25,depthWrite:false}));this.scene.add(this.wake);
    this.marker=new THREE.Group();this.scene.add(this.marker);this.marker.position.set(2,1,-4);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.85,.009,8,80),new THREE.MeshBasicMaterial({color:'#e6b77f',transparent:true,opacity:.4}));this.marker.add(ring);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.set(3.5,3.5,1);this.marker.add(glow);this.markerGlow=glow;
  }
  async makeGlyphs(){
    await document.fonts.load('40px Sela');
    const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.font='58px Sela';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffda9d';for(let i=0;i<12;i++)ctx.fillText('miselati luma'.replace(/ /g,'')[i%11],44+i*84,64);
    this.glyphTexture=new THREE.CanvasTexture(c);const mat=new THREE.SpriteMaterial({map:this.glyphTexture,transparent:true,depthWrite:false,color:'#ffe9c2'});
    this.writing=new THREE.Sprite(mat);this.writing.scale.set(5,.625,1);this.marker.add(this.writing);
    this.symbols=[];for(let i=0;i<24;i++){
      const tx=document.createElement('canvas');tx.width=tx.height=64;const t=tx.getContext('2d');t.font='48px Sela';t.fillStyle='#f5ca87';t.textAlign='center';t.textBaseline='middle';t.fillText('miselatiluma'[i%12],32,32);
      const m=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(tx),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const s=new THREE.Sprite(m);s.scale.set(.35,.35,1);s.visible=false;this.scene.add(s);this.symbols.push(s);
    }
  }
  updateFragment(text){if(!this.writing)return;const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.textAlign='center';ctx.fillStyle='#ffdb9e';ctx.font='44px Sela';const words=text.split(' '),rows=[];let row='';for(const w of words){if((row+w).length>35){rows.push(row);row='';}row+=w+' ';}if(row)rows.push(row);rows.slice(0,3).forEach((r,i)=>ctx.fillText(r,512,64+i*63));this.writing.material.map.dispose();this.writing.material.map=new THREE.CanvasTexture(c);this.writing.scale.set(5,1.25,1);}
  setMode(mode){this.mode=mode;this.side=mode==='decode'?1:0;if(mode==='finale')this.finale=0;}
  frame(now){
    const dt=Math.min((now-this.last)/1000,.2);this.last=now;if(document.hidden)return;this.time+=dt;
    const t=this.time,targetSpeed=this.mode==='travel'&&this.rowing?1:0;this.speed=lerp(this.speed,targetSpeed,1-Math.exp(-dt*2));
    if(this.mode==='travel')this.distance+=this.speed*dt*1.3;
    this.boat.position.set(Math.sin(this.distance*.075)*1.2,.24+Math.sin(t*1.25)*.035,-this.distance);
    this.boat.rotation.z=Math.sin(t*.95)*.013+this.speed*Math.sin(t*2.4)*.018;this.boat.rotation.x=Math.sin(t*.7)*.008;
    this.boat.rotation.y=Math.cos(this.distance*.075)*-.08;
    this.oars.forEach((o,i)=>{o.rotation.y=Math.sin(t*2.5+i*.5)*.25*this.speed;o.rotation.z=(i?1:-1)*(.14+Math.sin(t*2.5)*.09*this.speed);});
    this.head.rotation.y=lerp(this.head.rotation.y,this.mode==='decode'?-1.05:Math.sin(t*.2)*.15,dt*2);
    this.head.rotation.z=Math.sin(t*.6)*.018;
    const z=this.boat.position.z;const side=this.side;this.cameraShift=lerp(this.cameraShift||0,side,1-Math.exp(-dt*.9));const s=this.gentle?this.cameraShift*.55:this.cameraShift;
    let target=new THREE.Vector3(),cp=new THREE.Vector3();
    if(this.mode==='intro'){
      cp.set(this.mobile?5.3:8.5,this.mobile?5:5.7,this.mobile?11:12.5);target.set(this.mobile?-3.5:-3.2,this.mobile?1.4:1.3,-5);
    }else{
      cp.set(lerp(this.mobile?4.3:5.8,this.mobile?6.5:8.0,s),lerp(this.mobile?4.7:4.2,3.4,s),z+lerp(this.mobile?10.5:10,6.4,s));target.set(lerp(0,this.mobile?-2:2.4,s),this.mobile&&s>.2?-4:1.0,z-4);
    }
    if(this.mode==='finale'){this.finale+=dt;cp.y+=Math.min(this.finale,4)*.4;if(!this.gentle&&this.finale>1.9&&this.finale<2.5){cp.x+=Math.sin(t*70)*.035;cp.y+=Math.cos(t*64)*.025;}}
    this.camera.position.lerp(cp,1-Math.exp(-dt*.9));this.look=this.look||target.clone();this.look.lerp(target,1-Math.exp(-dt*.9));this.camera.lookAt(this.look);
    this.sun.position.z=z-95;this.sunGlow.position.copy(this.sun.position);this.sunGlow.position.z+=.1;this.mountains.position.z=z;this.sun.lookAt(this.camera.position);this.skyMesh.position.set(this.camera.position.x,0,this.camera.position.z);this.waterMat.uniforms.time.value=t;this.waterMat.uniforms.travel.value=this.distance;this.waterMat.uniforms.boat.value.set(this.boat.position.x,z);
    this.marker.position.set(2.5,1.35+Math.sin(t*.75)*.12,z-(this.mode==='decode'?3.6:6+((this.progress||0)<.8?16*(1-(this.progress||0)):0)));
    this.marker.visible=['travel','decode'].includes(this.mode);this.marker.rotation.z=Math.sin(t*.25)*.05;
    if(this.symbols)for(let i=0;i<this.symbols.length;i++){
      const p=this.symbols[i];p.visible=this.mode==='finale';if(p.visible){const f=clamp(this.finale/4),a=i*2.4+t*.8;p.position.set(Math.cos(a)*(3*(1-f)+.3),1.2+f*4+i*.03,z-3+Math.sin(a)*(2*(1-f)));p.material.opacity=1-f*.4;}
    }
    const w=this.wake.geometry.attributes.position;for(let i=0;i<60;i++){const a=i/60;w.setXYZ(i,this.boat.position.x+Math.sin(i*9)*(a*.5),.02+Math.sin(t*3+i)*.02,z+1.6+a*3*this.speed);}w.needsUpdate=true;this.wake.material.opacity=this.speed*.25;
    this.fireflies.material.opacity=.32+Math.sin(t*.65)*.16;
    this.renderer.render(this.scene,this.camera);this.onFrame(dt,this.speed);
  }
}
