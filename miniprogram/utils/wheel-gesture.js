// All directions share one gesture model in native WeChat and browser preview.
const START_DISTANCE=6, RELEASE_SPEED=0.12, SPEED_WINDOW=60;
function begin(point,angle,size,center,time=0){
  return {start:point,last:point,angle,size:Math.max(100,size||300),center,moved:false,direction:0,samples:[{time,angle}]};
}
function sample(drag,time){
  const samples=drag.samples;
  samples.push({time:Math.max(time,samples[samples.length-1].time),angle:drag.angle});
  while(samples.length>2&&samples[1].time<time-SPEED_WINDOW)samples.shift();
  if(samples.length>64)samples.splice(1,samples.length-64);
}
function move(drag,point,time=drag.samples[drag.samples.length-1].time+16){
  const dx=point.x-drag.last.x,dy=point.y-drag.last.y,distance=Math.hypot(dx,dy);
  if(!drag.moved&&Math.hypot(point.x-drag.start.x,point.y-drag.start.y)<START_DISTANCE){sample(drag,time);return null;}
  if(distance<0.5){sample(drag,time);return null;}
  // Straight radial strokes and strokes through the hub have no polar angle.
  // Give those a distance-based response without a 180-degree center jump.
  let delta=(Math.abs(dx)>=Math.abs(dy)?-Math.sign(dx):Math.sign(dy))*distance*180/drag.size;
  if(drag.center){
    const ax=drag.last.x-drag.center.x,ay=drag.last.y-drag.center.y;
    const bx=point.x-drag.center.x,by=point.y-drag.center.y;
    const radiusA=Math.hypot(ax,ay),radiusB=Math.hypot(bx,by),inner=drag.size*0.12;
    const startX=drag.start.x-drag.center.x,startY=drag.start.y-drag.center.y;
    if(Math.abs(dx)>=Math.abs(dy)&&Math.abs(startY)>=inner)delta=-Math.sign(startY)*Math.sign(dx)*distance*180/drag.size;
    else if(Math.abs(dy)>Math.abs(dx)&&Math.abs(startX)>=inner)delta=Math.sign(startX)*Math.sign(dy)*distance*180/drag.size;
    const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(distance*distance)));
    const closest=Math.hypot(ax+t*dx,ay+t*dy);
    const polar=Math.atan2(ax*by-ay*bx,ax*bx+ay*by);
    if(closest>=inner&&Math.min(radiusA,radiusB)>=inner&&Math.abs(polar)*Math.max(radiusA,radiusB)>=distance*0.2){
      delta=polar*180/Math.PI;
    }
  }
  drag.last=point;drag.moved=true;drag.angle+=delta;drag.direction=Math.sign(delta);sample(drag,time);
  return {angle:drag.angle,delta,direction:drag.direction};
}
function releaseSpeed(drag,time=drag.samples[drag.samples.length-1].time){
  if(!drag.moved)return 0;
  sample(drag,time);
  const samples=drag.samples,end=samples[samples.length-1],cutoff=end.time-SPEED_WINDOW;
  let start=samples[0];
  for(let i=1;i<samples.length;i++){
    const next=samples[i];
    if(next.time>cutoff){
      if(start.time<cutoff){const ratio=(cutoff-start.time)/(next.time-start.time);start={time:cutoff,angle:start.angle+(next.angle-start.angle)*ratio};}
      break;
    }
    start=next;
  }
  return (end.angle-start.angle)/Math.max(16,end.time-start.time);
}
function shouldSpin(speed){return Math.abs(speed)>=RELEASE_SPEED;}
function coast(speed,elapsed){const decay=Math.exp(-elapsed/180);return {offset:speed*180*(1-decay),speed:speed*decay,done:elapsed>=900||Math.abs(speed*decay)<0.003};}
module.exports={begin,move,releaseSpeed,shouldSpin,coast,RELEASE_SPEED};
