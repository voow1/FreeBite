// Match the disc's actual easing; a continuous phase avoids restarting each swing.
const {spinSpeed}=require('./pet-player');
const STEP_MS=40;
function bounds(speed){
  const velocity=Math.abs(speed),strength=Math.min(1,velocity/1.6);
  const settle=Math.min(1,velocity/.06);
  return {near:(15+25*strength)*settle,far:(45+35*strength)*settle,period:440-200*strength};
}
function createPlayer(render,clock={now:()=>Date.now(),set:(f,t)=>setTimeout(f,t),clear:t=>clearTimeout(t)}){
  let timer=null,active=false,phase=-Math.PI/2,last=0,mode,spin,dragSpeed=0,dragAt=0,direction=1;
  function stop(){
    clock.clear(timer);timer=null;
    if(active)render(null);
    active=false;
  }
  function tick(){
    timer=null;if(!active)return;
    const now=clock.now(),elapsed=mode==='spin'?now-spin.at:now-dragAt;
    if(mode==='spin'?elapsed>=spin.duration:elapsed>=240){stop();return;}
    const speed=mode==='spin'?spinSpeed(spin.from,spin.to,spin.duration,elapsed):dragSpeed*Math.exp(-Math.max(0,elapsed-60)/70);
    const range=bounds(speed);
    phase+=(now-last)*Math.PI*2/range.period;last=now;
    const magnitude=range.near+(range.far-range.near)*(1+Math.sin(phase))/2;
    // At the top of the disc, clockwise travel is rightward; a hanging pointer
    // needs negative CSS rotation to lean right. Never recoil into the other side.
    render({angle:Number((-direction*magnitude).toFixed(2)),duration:STEP_MS});
    timer=clock.set(tick,STEP_MS);
  }
  function start(){
    if(active)return;
    active=true;phase=-Math.PI/2;last=clock.now();tick();
  }
  return {
    spin(from,to,duration){
      if(duration<=0||from===to){stop();return;}
      spin={from,to,duration,at:clock.now()};direction=Math.sign(to-from);mode='spin';start();
    },
    drag(speed,side){dragSpeed=Math.abs(speed);dragAt=clock.now();direction=side;mode='drag';start();},
    stop,
    status(){return {active,timer,phase};}
  };
}
module.exports={bounds,createPlayer};
