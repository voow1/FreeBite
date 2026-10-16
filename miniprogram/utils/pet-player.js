// A single phase clock drives the sprite, so changing speed never restarts a GIF.
const DONE_MS=1750;
const ROWS={idle:0,runRight:1,runLeft:2,done:3};
function cubic(t,a,b){const s=1-t;return 3*s*s*t*a+3*s*t*t*b+t*t*t;}
function derivative(t,a,b){const s=1-t;return 3*s*s*a+6*s*t*(b-a)+3*t*t*(1-b);}
function spinSpeed(from,to,duration,elapsed){
  if(duration<=0||elapsed>=duration)return 0;
  const x=Math.max(0,elapsed/duration);let lo=0,hi=1;
  for(let i=0;i<22;i++){const t=(lo+hi)/2;if(cubic(t,.12,.12)<x)lo=t;else hi=t;}
  const t=(lo+hi)/2;
  return Math.abs(to-from)/duration*derivative(t,.72,1)/derivative(t,.12,.12);
}
function frameRate(speed){
  const velocity=Math.abs(speed);
  // Keep the gait legible at the end of a spin without holding individual poses.
  return velocity>0?6+22*velocity/(velocity+.35):0;
}
function createPlayer(render,clock={now:()=>Date.now(),set:(f,t)=>setTimeout(f,t),clear:t=>clearTimeout(t)}){
  let timer=null,state='idle',phase=0,last=0,started=0,mode='idle',spin,dragSpeed=0,dragAt=0,active=false,lastKey='';
  function paint(){
    const frame=state==='done'?Math.min(11,Math.floor((clock.now()-started)/140)):Math.floor(phase)%16;
    const key=state+':'+frame;
    if(key!==lastKey){lastKey=key;render({petFrame:frame,petColumn:frame%8,petRow:ROWS[state]*2+Math.floor(frame/8)});}
  }
  function tick(){
    timer=null;if(!active)return;
    const now=clock.now(),dt=Math.min(100,Math.max(0,now-last));last=now;
    let fps=1000/180;
    if(mode==='spin')fps=frameRate(spinSpeed(spin.from,spin.to,spin.duration,now-spin.at));
    else if(mode==='drag')fps=frameRate(now-dragAt>220?0:dragSpeed*Math.exp(-Math.max(0,now-dragAt-60)/70));
    phase+=dt*fps/1000;paint();
    if(state==='done'&&now-started>=1680){active=false;return;}
    timer=clock.set(tick,20);
  }
  function start(next,nextMode){
    const wasRunning=state==='runRight'||state==='runLeft';
    const willRun=next==='runRight'||next==='runLeft';
    if(next!==state&&!(wasRunning&&willRun)){phase=0;started=clock.now();last=started;}
    state=next;mode=nextMode;
    if(!active){active=true;last=clock.now();started=last;}
    paint();if(timer===null)timer=clock.set(tick,20);
  }
  return {
    idle(){start('idle','idle');},
    drag(speed,direction){dragSpeed=Math.abs(speed);dragAt=clock.now();start(direction>0?'runRight':'runLeft','drag');},
    spin(from,to,duration){spin={from,to,duration,at:clock.now()};start(to>from?'runRight':'runLeft','spin');},
    done(){phase=0;started=clock.now();start('done','done');},
    stop(){active=false;clock.clear(timer);timer=null;},
    reset(){this.stop();state='idle';phase=0;lastKey='';paint();},
    status(){return {active,state,phase,mode};}
  };
}
module.exports={createPlayer,spinSpeed,frameRate,DONE_MS};
