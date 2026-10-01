// A small deterministic boat simulation. The renderer samples the same waves.
export const WAVES = [
  {amplitude:.055,kx:.54,kz:.30,frequency:1.08,phase:0},
  {amplitude:.027,kx:-.92,kz:.62,frequency:1.48,phase:1.9},
  {amplitude:.014,kx:.23,kz:1.61,frequency:1.91,phase:4.1},
];
export function surfaceHeight(x,z,time){return WAVES.reduce((h,w)=>h+w.amplitude*Math.sin(w.kx*x+w.kz*z-w.frequency*time+w.phase),0);}
export const waveGLSL=WAVES.map(w=>`h += ${w.amplitude.toFixed(4)} * sin(p.x * ${w.kx.toFixed(4)} + p.y * ${w.kz.toFixed(4)} - time * ${w.frequency.toFixed(4)} + ${w.phase.toFixed(4)});`).join('\n');
export function spring(state,target,dt,frequency=7,damping=1){
  state.velocity+=(frequency*frequency*(target-state.value)-2*damping*frequency*state.velocity)*dt;
  state.value+=state.velocity*dt;
  return state.value;
}
export class BoatPhysics {
  constructor(){this.time=0;this.distance=0;this.velocity=0;this.phase=0;this.accumulator=0;this.mass=115;this.x=0;this.stroke=0;this.heave={value:0,velocity:0};this.pitch={value:0,velocity:0};this.roll={value:0,velocity:0};this.yaw={value:0,velocity:0};}
  reset(distance=0){this.distance=distance;this.velocity=0;this.x=0;this.phase=0;this.accumulator=0;this.stroke=0;for(const axis of [this.heave,this.pitch,this.roll,this.yaw]){axis.value=0;axis.velocity=0;}}
  step(elapsed,{rowing=false,anchored=false,gentle=false}={}){
    this.accumulator+=Math.min(Math.max(elapsed,0),.25);
    const dt=1/120;
    while(this.accumulator+1e-10>=dt){
      this.accumulator-=dt;this.time+=dt;this.phase+=dt*(rowing?2.8:.45);
      const power=Math.max(0,Math.sin(this.phase));
      this.stroke=rowing?power:0;
      const thrust=rowing?75*power:0;
      const drag=(12+(anchored?115:0))*this.velocity+5.5*this.velocity*Math.abs(this.velocity);
      this.velocity=Math.max(0,this.velocity+(thrust-drag)/this.mass*dt);
      if(this.velocity<.00005&&!rowing)this.velocity=0;
      this.distance+=this.velocity*dt;
      const pathX=Math.sin(this.distance*.031)*1.45;
      this.x+=(pathX-this.x)*dt*1.1;
      const z=-this.distance,front=surfaceHeight(this.x,z-1.55,this.time),back=surfaceHeight(this.x,z+1.55,this.time),left=surfaceHeight(this.x-.72,z,this.time),right=surfaceHeight(this.x+.72,z,this.time);
      const scale=gentle?.32:1;
      spring(this.heave,(front+back+left+right)*.25*scale,dt,7,.86);
      spring(this.pitch,Math.atan2(front-back,3.1)*scale-this.stroke*.012,dt,6,.85);
      spring(this.roll,Math.atan2(right-left,1.44)*scale+Math.sin(this.phase)*this.stroke*.008,dt,5.5,.9);
      spring(this.yaw,-Math.cos(this.distance*.031)*.042+Math.sin(this.phase)*this.stroke*.012,dt,3,1);
    }
    return this;
  }
}
