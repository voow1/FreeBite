// The pointer is nudged by passing sector edges, using the disc's easing curve.
// One scheduled update per visible nudge; CSS handles each spring return.
const MIN_GAP=150;
function bezier(t,a,b){const s=1-t;return 3*s*s*t*a+3*s*t*t*b+t*t*t;}
function timeAtProgress(progress){
  let lo=0,hi=1;
  for(let i=0;i<24;i++){const t=(lo+hi)/2;if(bezier(t,.72,1)<progress)lo=t;else hi=t;}
  return bezier((lo+hi)/2,.12,.12);
}
function pulse(speed,direction){
  const strength=Math.min(1,Math.max(0,Math.abs(speed)/1.6));
  const kick=Number((-direction*(.6+7.4*Math.sqrt(strength))).toFixed(2));
  return {kick,recoil:Number((-kick*.2).toFixed(2)),duration:Math.round(160+180*(1-strength))};
}
function plan(from,to,count,duration){
  if(!count||duration<=0||from===to)return [];
  const direction=Math.sign(to-from),step=360/count,travel=Math.abs(to-from),ticks=[];
  let edge=direction>0?(Math.floor(from/step)+1)*step:(Math.ceil(from/step)-1)*step;
  let last=-MIN_GAP;
  for(;direction*(to-edge)>0;edge+=direction*step){
    const progress=Math.abs(edge-from)/travel;
    const at=Math.round(timeAtProgress(progress)*duration);
    if(at-last<MIN_GAP)continue;
    const before=timeAtProgress(Math.max(0,progress-.0005))*duration;
    const after=timeAtProgress(Math.min(1,progress+.0005))*duration;
    const speed=travel*.001/Math.max(1,after-before);
    const effect=pulse(speed,direction);
    // Finish the spring return before the disc stops, including short spins.
    effect.duration=Math.min(effect.duration,duration-at);
    ticks.push({at,...effect});last=at;
  }
  return ticks;
}
module.exports={plan,pulse,timeAtProgress};
