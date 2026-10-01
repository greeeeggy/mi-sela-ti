import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function seeded(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function mesh(parent,geometry,material,pos=[0,0,0],scale=[1,1,1]){const m=new T.Mesh(geometry,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const ball=(p,m,pos,s)=>mesh(p,new T.SphereGeometry(1,24,18),m,pos,s);
const box=(p,m,pos,s)=>mesh(p,new T.BoxGeometry(...s),m,pos);
export function tube(p,pts,m,r=.025,segments=28,radial=6){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),segments,r,radial,false),m);}
export function batch(root){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map(),remove=[];
  root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&!o.userData.dynamic){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));g.deleteAttribute('color');const key=o.material.uuid;if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});groups.get(key).geometries.push(g);remove.push(o);}});
  for(const o of remove)o.removeFromParent();
  for(const {material,geometries} of groups.values()){const g=mergeGeometries(geometries);if(g){const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;root.add(m);}geometries.forEach(g=>g.dispose());}
}
function texture(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),rnd=seeded(kind==='wood'?45:19);
  ctx.fillStyle=kind==='wood'?'#b18961':kind==='cloth'?'#969696':'#5e5751';ctx.fillRect(0,0,256,256);
  if(kind==='wood'){
    for(let i=0;i<310;i++){const x=rnd()*256;ctx.strokeStyle=`rgba(${rnd()>.5?'54,28,11':'249,215,164'},${.06+rnd()*.12})`;ctx.lineWidth=.4+rnd()*1.3;ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<=256;y+=8)ctx.lineTo(x+Math.sin(y*.025+i)*3+Math.sin(y*.07)*.7,y);ctx.stroke();}
    for(let i=0;i<3;i++){const x=rnd()*256,y=rnd()*256;for(let k=0;k<9;k++){ctx.strokeStyle='#573a2128';ctx.beginPath();ctx.ellipse(x,y,2+k*.8,4+k*2.1,.03,0,Math.PI*2);ctx.stroke();}}
  }else if(kind==='cloth'){
    for(let i=0;i<256;i+=3){ctx.strokeStyle=i%2?'#ffffff14':'#00000012';ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
  }else{
    for(let i=0;i<1200;i++){ctx.fillStyle=rnd()>.5?'#fff1':'#0002';ctx.fillRect(rnd()*256,rnd()*256,1+rnd()*3,1+rnd()*5);}
  }
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
export function palette(){
  const wood=texture('wood'),cloth=texture('cloth'),bark=texture('bark');
  const timber=new T.MeshPhysicalMaterial({color:'#aa693e',map:wood,bumpMap:wood,bumpScale:.017,roughness:.36,clearcoat:.48,clearcoatRoughness:.3,side:T.DoubleSide});
  return {wood:timber,rim:new T.MeshPhysicalMaterial({color:'#dda76a',map:wood,roughness:.38,clearcoat:.5}),darkWood:new T.MeshStandardMaterial({color:'#805638',map:wood,roughness:.65}),brass:new T.MeshStandardMaterial({color:'#bfa370',metalness:.8,roughness:.3}),silver:new T.MeshStandardMaterial({color:'#d6d5ca',metalness:.8,roughness:.25}),skin:new T.MeshStandardMaterial({color:'#d39c81',roughness:.82}),skinBlush:new T.MeshStandardMaterial({color:'#ce8c7e',roughness:.87}),hair:new T.MeshPhysicalMaterial({color:'#272024',roughness:.46,clearcoat:.25}),strand:new T.MeshStandardMaterial({color:'#4a3430',roughness:.64}),shirt:new T.MeshStandardMaterial({color:'#23313b',bumpMap:cloth,bumpScale:.013,roughness:.91}),collar:new T.MeshStandardMaterial({color:'#deb751',bumpMap:cloth,bumpScale:.008,roughness:.84,side:T.DoubleSide}),linen:new T.MeshStandardMaterial({color:'#d9c8a5',bumpMap:cloth,bumpScale:.016,roughness:1}),pants:new T.MeshStandardMaterial({color:'#263039',bumpMap:cloth,bumpScale:.009,roughness:.95}),shoe:new T.MeshStandardMaterial({color:'#302a29',roughness:.61}),eyes:new T.MeshStandardMaterial({color:'#edd9c5',roughness:.35}),iris:new T.MeshStandardMaterial({color:'#48352b',roughness:.3}),black:new T.MeshStandardMaterial({color:'#1c191c',roughness:.4}),lip:new T.MeshStandardMaterial({color:'#a5645e',roughness:.71}),bark:new T.MeshStandardMaterial({color:'#5e5145',map:bark,roughness:1}),leaf:new T.MeshStandardMaterial({color:'#5c6950',roughness:.95,side:T.DoubleSide}),petal:new T.MeshStandardMaterial({color:'#e9c0a0',roughness:.75,side:T.DoubleSide})};
}
function hullGeometry(inner=false){
  const pos=[],uv=[],indices=[],nz=60,nc=24;
  for(let i=0;i<=nz;i++){const t=i/nz,z=t*3.9-1.95,w=(.03+.86*Math.pow(Math.sin(Math.PI*t),.65))*(inner?.89:1),up=.25+Math.pow(Math.abs(t-.5)*2,3)*.13,depth=inner?.43:.56;
    for(let j=0;j<=nc;j++){const a=j/nc*Math.PI;pos.push(Math.cos(a)*w,up-Math.sin(a)*depth,z);uv.push(j/nc*2,t*3);if(i<nz&&j<nc){const n=i*(nc+1)+j;indices.push(n,n+nc+1,n+1,n+1,n+nc+1,n+nc+2);}}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function ribbon(parent,material,points,width=.035){
  for(const s of [-1,1]){const ps=points.map(([x,y,z])=>[x+s*width*.5,y,z]);tube(parent,ps,material,.012);}
}
function oar(parent,side,p){
  const g=new T.Group();g.position.set(side*.72,.32,-.4);parent.add(g);
  const shaft=mesh(g,new T.CylinderGeometry(.026,.022,2.15,10),p.rim,[side*.76,0,0]);shaft.rotation.z=Math.PI/2;
  const bladeShape=new T.Shape();bladeShape.moveTo(-.12,-.08);bladeShape.quadraticCurveTo(.02,-.19,.27,-.16);bladeShape.quadraticCurveTo(.64,-.09,.65,.02);bladeShape.quadraticCurveTo(.54,.15,.27,.14);bladeShape.quadraticCurveTo(.03,.16,-.12,.06);bladeShape.closePath();
  const blade=mesh(g,new T.ExtrudeGeometry(bladeShape,{depth:.023,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.013,steps:1,curveSegments:12}),p.wood,[side*1.7,-.014,0]);blade.rotation.x=-Math.PI/2;if(side<0)blade.rotation.y=Math.PI;
  const grip=mesh(g,new T.CylinderGeometry(.037,.037,.25,12),p.darkWood,[-side*.25,0,0]);grip.rotation.z=Math.PI/2;
  batch(g);return g;
}
export function buildBoat(scene,p,glowTexture){
  const boat=new T.Group();scene.add(boat);const fixed=new T.Group();boat.add(fixed);
  mesh(fixed,hullGeometry(),p.wood);mesh(fixed,hullGeometry(true),p.darkWood);
  for(let s of [-1,1]){
    const gunwale=[],seams=[[],[],[]];for(let i=0;i<=80;i++){const t=i/80,w=.03+.86*Math.pow(Math.sin(Math.PI*t),.65),up=.25+Math.pow(Math.abs(t-.5)*2,3)*.13;gunwale.push([s*w,up+.02,t*3.9-1.95]);for(let j=0;j<3;j++){const a=(j+1)*.25;seams[j].push([s*w*Math.cos(a),up-.56*Math.sin(a),t*3.9-1.95]);}}
    tube(fixed,gunwale,p.rim,.036,64);seams.forEach(line=>tube(fixed,line,p.darkWood,.006,48));
    for(let z=-1.5;z<1.55;z+=.3){const t=(z+1.95)/3.9,w=.03+.86*Math.pow(Math.sin(Math.PI*t),.65);ball(fixed,p.brass,[s*w,.275+Math.pow(Math.abs(t-.5)*2,3)*.13,z],[.016,.01,.016]);}
    const lock=mesh(fixed,new T.TorusGeometry(.055,.009,8,20),p.brass,[s*.74,.32,-.4]);lock.rotation.x=Math.PI/2;
  }
  for(let x=-.55;x<=.55;x+=.14){const length=2.5-Math.abs(x)*1.2;const plank=box(fixed,p.darkWood,[x,-.12,.05],[.132,.055,length]);plank.rotation.z=x*.06;}
  for(let z of [-.37,.85]){box(fixed,p.rim,[0,.35,z],[1.3,.075,.25]);for(let x of [-.55,.55])ball(fixed,p.brass,[x,.393,z],[.012,.007,.012]);}
  // A book, a folded linen blanket, and a tied envelope on the rear seat.
  const blanket=box(fixed,p.linen,[-.27,.406,.87],[.48,.06,.28]);blanket.rotation.y=-.18;
  ribbon(fixed,p.darkWood,[[-.44,.442,.81],[-.25,.443,.8],[-.06,.443,.76]],.06);
  const book=box(fixed,p.shirt,[.29,.423,.93],[.3,.05,.23]);book.rotation.y=.18;box(fixed,p.linen,[.29,.418,.925],[.276,.034,.226]);
  const envelope=box(fixed,p.linen,[.25,.456,.93],[.21,.008,.14]);envelope.rotation.y=.18;ball(fixed,new T.MeshStandardMaterial({color:'#ae6053',roughness:.82}),[.25,.464,.93],[.029,.008,.029]);
  const rope=new T.MeshStandardMaterial({color:'#bfa783',roughness:1});for(let i=0;i<4;i++){const tor=mesh(fixed,new T.TorusGeometry(.095+i*.018,.01,5,24),rope,[-.23,.015,1.42]);tor.rotation.x=Math.PI/2;}
  const lanternPivot=new T.Group();lanternPivot.position.set(0,.17,1.4);boat.add(lanternPivot);
  const lantern=new T.Group();lanternPivot.add(lantern);box(lantern,p.brass,[0,.035,0],[.21,.04,.21]);
  mesh(lantern,new T.CylinderGeometry(.1,.12,.035,6),p.brass,[0,.33,0]);
  const glass=new T.MeshPhysicalMaterial({color:'#f4cc8b',transparent:true,opacity:.2,roughness:.1,depthWrite:false});box(lantern,glass,[0,.18,0],[.17,.27,.17]);
  for(let x of [-.088,.088])for(let z of [-.088,.088])box(lantern,p.brass,[x,.18,z],[.012,.27,.012]);
  tube(lantern,[[-.058,.35,0],[-.05,.45,0],[.05,.45,0],[.058,.35,0]],p.brass,.007);
  mesh(lantern,new T.CylinderGeometry(.026,.025,.08,10),p.linen,[0,.093,0]);
  const flame=ball(lantern,new T.MeshBasicMaterial({color:'#ffe2a3'}),[0,.153,0],[.016,.033,.012]);
  flame.userData.dynamic=true;
  const light=new T.PointLight('#ffd097',2.8,5,1.7);light.position.set(0,.35,1.4);boat.add(light);
  const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:'#ffc078',transparent:true,blending:T.AdditiveBlending,depthWrite:false}));glow.position.set(0,.17,0);glow.scale.set(.65,.65,1);lantern.add(glow);
  const oars=[oar(boat,-1,p),oar(boat,1,p)];batch(fixed);batch(lantern);
  return {boat,oars,lanternPivot,light,flame};
}
function faceGeometry(){
  const g=new T.SphereGeometry(1,40,32),a=g.attributes.position;
  for(let i=0;i<a.count;i++){
    let x=a.getX(i),y=a.getY(i),z=a.getZ(i),jaw=1-.25*Math.max(0,-y),front=Math.max(0,-z);
    x*=.207*jaw;y*=.264;z*=.183;
    if(front>.4&&y<.08&&y>-.08)z-=.013*Math.exp(-Math.pow(x/.14,2));
    if(y<-.15)z+=.012;
    a.setXYZ(i,x,y,z);
  }g.computeVertexNormals();return g;
}
function panel(parent,mat,points,depth=.004){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(parent,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:2,steps:1}),mat);}
function limb(parent,material,radius){return mesh(parent,new T.CapsuleGeometry(radius,1,5,12),material);}
function between(m,a,b,radius){const d=new T.Vector3().subVectors(b,a),len=d.length();m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,Math.max(.04,len/(1+radius*2)),1);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
export function buildGirl(boat,p){
  const girl=new T.Group();girl.position.set(0,.38,-.37);girl.rotation.y=Math.PI;boat.add(girl);const body=new T.Group();girl.add(body);
  const torsoPoints=[[.19,0],[.255,.10],[.25,.24],[.23,.38],[.20,.5],[.12,.56]].map(v=>new T.Vector2(...v));
  mesh(body,new T.LatheGeometry(torsoPoints,32),p.shirt,[0,.08,.025]);
  for(const s of [-1,1]){const sleeve=ball(body,p.shirt,[s*.235,.48,.018],[.1,.13,.1]);sleeve.rotation.z=-s*.15;tube(body,[[s*.185,.46,-.068],[s*.236,.394,-.075],[s*.288,.424,-.042]],p.collar,.006,14);}
  const shirtFront=panel(body,p.collar,[[-.025,.12],[.025,.12],[.025,.55],[-.025,.55]]);shirtFront.position.set(0,.045,-.223);
  for(const s of [-1,1]){const collar=panel(body,p.collar,[[0,0],[s*.095,-.112],[s*.19,-.06],[s*.113,.072]]);collar.position.set(s*.012,.623,-.12);collar.rotation.y=s*.18;}
  for(let y=.23;y<.57;y+=.105)ball(body,p.brass,[0,y,-.23],[.011,.011,.005]);
  tube(body,[[-.15,.18,-.187],[-.11,.2,-.222],[-.06,.19,-.228]],p.shirt,.006,12);
  ball(body,p.pants,[0,.065,.02],[.25,.12,.255]);
  for(const s of [-1,1]){tube(body,[[s*.13,.05,0],[s*.2,-.02,-.27],[s*.19,-.33,-.63]],p.pants,.079,16);ball(body,p.shoe,[s*.19,-.337,-.73],[.09,.065,.14]);tube(body,[[s*.15,-.297,-.66],[s*.2,-.293,-.66],[s*.23,-.301,-.68]],p.linen,.004,10);}
  ball(body,p.skin,[0,.68,0],[.076,.117,.073]);batch(body);
  const head=new T.Group();head.position.set(0,.916,-.012);girl.add(head);const headStatic=new T.Group();head.add(headStatic);
  mesh(headStatic,faceGeometry(),p.skin);
  // Cheeks, nose wings, lip contours, and ears sculpt the profile.
  for(const s of [-1,1]){
    ball(headStatic,p.skin,[s*.207,-.008,.002],[.026,.048,.035]);tube(headStatic,[[s*.218,.024,-.015],[s*.23,.008,-.025],[s*.222,-.024,-.018]],p.skinBlush,.005,12);
    ball(headStatic,p.skin,[s*.029,-.048,-.174],[.021,.013,.021]);
    tube(headStatic,[[s*.12,.066,-.135],[s*.081,.077,-.166],[s*.047,.062,-.161]],p.hair,.008,18);
    const e=mesh(headStatic,new T.TorusGeometry(.025,.0045,8,24),p.silver,[s*.223,-.062,-.002]);e.rotation.y=Math.PI/2;
  }
  ball(headStatic,p.skin,[0,-.033,-.177],[.025,.033,.03]);ball(headStatic,p.skin,[0,-.059,-.192],[.025,.016,.025]);
  tube(headStatic,[[-.044,-.108,-.143],[-.018,-.119,-.161],[0,-.116,-.168],[.018,-.119,-.161],[.044,-.108,-.143]],p.lip,.0065,20);
  tube(headStatic,[[-.035,-.119,-.146],[0,-.13,-.163],[.035,-.119,-.146]],p.skinBlush,.007,18);
  const eyeGroups=[];
  for(const s of [-1,1]){
    const g=new T.Group();g.position.set(s*.078,.012,-.182);g.rotation.y=-s*.15;head.add(g);
    ball(g,p.eyes,[0,0,0],[.044,.016,.012]);ball(g,p.iris,[0,0,-.01],[.014,.014,.006]);ball(g,p.black,[0,0,-.016],[.007,.01,.003]);ball(g,p.eyes,[-.004,.004,-.019],[.003,.003,.0015]);
    tube(g,[[-.045,0,-.005],[-.025,.016,-.01],[.009,.018,-.012],[.041,.004,-.005]],p.hair,.0045,16);
    for(let i=0;i<3;i++)tube(g,[[s*(.027+i*.005),.013-i*.003,-.006],[s*(.04+i*.008),.021-i*.006,-.006]],p.hair,.0025,6);
    batch(g);eyeGroups.push(g);
  }
  const capG=new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.53);const cap=mesh(headStatic,capG,p.hair,[0,.018,.01],[.217,.268,.198]);
  ball(headStatic,p.hair,[0,-.035,.137],[.203,.226,.079]);
  const fringe=ball(headStatic,p.hair,[-.109,.149,-.095],[.108,.121,.075]);fringe.rotation.z=-.39;
  for(let i=0;i<22;i++){
    const a=i/22*Math.PI*1.78+.2;
    tube(headStatic,[[Math.sin(a)*.03,.278,.008],[Math.sin(a)*.15,.205,Math.cos(a)*.13],[Math.sin(a)*.21,.057,Math.cos(a)*.181]],i%4===0?p.strand:p.hair,.0028,16);
  }
  tube(headStatic,[[-.006,.275,-.034],[-.03,.23,-.117],[-.055,.17,-.171]],p.strand,.004,16);
  batch(headStatic);
  const pony=new T.Group();pony.position.set(.012,-.035,.231);head.add(pony);ball(pony,p.hair,[0,-.015,.035],[.092,.09,.096]);
  const tie=mesh(pony,new T.TorusGeometry(.066,.008,7,24),p.collar,[0,-.043,.061]);tie.rotation.x=-.45;
  const tail=new T.Group();tail.position.set(0,-.05,.075);pony.add(tail);const points=[[0,0],[.07,.025],[.087,.12],[.065,.28],[.032,.39],[.009,.42]].map(([r,y])=>new T.Vector2(r,-y));mesh(tail,new T.LatheGeometry(points,18),p.hair,[0,0,0]);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;tube(tail,[[Math.sin(a)*.046,-.04,Math.cos(a)*.046],[Math.sin(a)*.08,-.15,Math.cos(a)*.08],[Math.sin(a)*.042,-.34,Math.cos(a)*.045],[0,-.415,0]],i%3===0?p.strand:p.hair,.003,16);}batch(tail);
  const arms=[];
  for(const s of [-1,1]){
    const upper=limb(girl,p.skin,.043),fore=limb(girl,p.skin,.036),hand=new T.Group();girl.add(hand);
    ball(hand,p.skin,[0,0,0],[.046,.025,.068]);for(let i=0;i<4;i++)tube(hand,[[-.025+i*.014,0,-.01],[-.023+i*.014,-.018,-.068],[-.023+i*.014,-.025,-.036]],p.skin,.009,10);ball(hand,p.skin,[s*.036,-.013,-.013],[.015,.024,.025]);batch(hand);arms.push({s,upper,fore,hand});
  }
  return {girl,head,tail,eyes:eyeGroups,arms,pose(oars,phase,stroke,time){
    for(let i=0;i<arms.length;i++){
      const {s,upper,fore,hand}=arms[i],o=oars[1-i];o.updateMatrixWorld(true);girl.updateMatrixWorld(true);
      const wrist=new T.Vector3(s*.25,0,0);o.localToWorld(wrist);girl.worldToLocal(wrist);
      const shoulder=new T.Vector3(s*.254,.449,.022),elbow=new T.Vector3(s*(.32+stroke*.035),.242+Math.cos(phase)*stroke*.025,-.066);
      between(upper,shoulder,elbow,.043);between(fore,elbow,wrist,.036);hand.position.copy(wrist);hand.rotation.set(.23,s*.26,-s*.12);
    }
    const cycle=time%4.7,blink=cycle>4.45?Math.max(.06,Math.abs((cycle-4.575)/.125)):1;eyeGroups.forEach(e=>e.scale.y=Math.min(1,blink));
  }};
}
export function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#ffffffee');g.addColorStop(.1,'#ffffff60');g.addColorStop(.4,'#ffffff13');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
