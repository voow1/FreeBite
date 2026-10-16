const test=require('node:test');
const assert=require('node:assert/strict');
const {createPlayer,spinSpeed,frameRate,DONE_MS}=require('../../miniprogram/utils/pet-player');
function harness(){
  let now=0,id=0;const tasks=new Map(),frames=[];
  const player=createPlayer(p=>frames.push({at:now,...p}),{now:()=>now,set:(f,t)=>{tasks.set(++id,{f,at:now+t});return id;},clear:id=>tasks.delete(id)});
  return {player,frames,tasks,advance(ms){const end=now+ms;while(true){const item=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;now=item[1].at;tasks.delete(item[0]);item[1].f();}now=end;}};
}
test('running cadence slows within 6–28 fps and stops only when the disc stops',()=>{
  const speeds=[0,1000,2000,3000,4100,4200].map(t=>spinSpeed(0,2000,4200,t));
  for(let i=1;i<speeds.length;i++)assert(speeds[i]<speeds[i-1]);
  assert.equal(speeds.at(-1),0);assert.equal(frameRate(0),0);
  assert(frameRate(speeds[0])<28);assert(frameRate(speeds[3])<frameRate(speeds[1]));
  const h=harness();h.player.spin(0,2000,4200);h.advance(4200);
  const early=h.frames.filter(f=>f.at<1000).length,late=h.frames.filter(f=>f.at>=3200).length;
  assert(early>=late*2);assert(h.frames.every(f=>f.petFrame>=0&&f.petFrame<16));
  for(const speed of [.000001,.001,.01,.1,.5,1,2,20]){
    assert(frameRate(speed)>=6&&frameRate(speed)<28);
    assert.equal(frameRate(-speed),frameRate(speed));
  }
  // Continuous response: small speed changes must change cadence, with no speed bands.
  let previous=frameRate(.0001);
  for(let speed=.001;speed<10;speed+=.013){
    const next=frameRate(speed);assert(next>previous);assert(next-previous<1);previous=next;
  }
  const gaps=h.frames.slice(1).map((f,i)=>f.at-h.frames[i].at);
  assert(Math.max(...gaps)<=180,'scheduler must not stretch late running poses to 300ms');
  const last=h.frames.length;h.advance(300);assert.equal(h.frames.length,last);
  h.player.stop();assert.equal(h.tasks.size,0);
});
test('drag speed updates, reversals and release preserve the ongoing gait phase',()=>{
  const h=harness();h.player.drag(1,1);h.advance(200);const phase=h.player.status().phase;
  assert(phase>0);h.player.drag(.15,-1);assert.equal(h.player.status().phase,phase);
  assert.equal(h.frames.at(-1).petRow,4+Math.floor(h.frames.at(-1).petFrame/8));
  h.player.spin(10,-1500,4200);assert.equal(h.player.status().phase,phase);
  assert.equal(h.tasks.size,1);h.player.stop();const count=h.frames.length;h.advance(5000);assert.equal(h.frames.length,count);
});
test('holding a drag stops stepping; idle and completion use deliberate slower timing',()=>{
  const h=harness();h.player.drag(1,1);h.advance(400);const phase=h.player.status().phase;
  h.advance(400);assert.equal(h.player.status().phase,phase);
  h.player.idle();h.advance(2880);assert(Math.abs(h.player.status().phase-16)<.001);
  h.player.done();h.advance(DONE_MS);assert.equal(h.frames.at(-1).petFrame,11);assert.equal(h.tasks.size,0);
  assert.equal(new Set(h.frames.filter(f=>f.petRow>=6).map(f=>f.petFrame)).size,12);
  h.player.done();assert.equal(h.frames.at(-1).petFrame,0,'completion restarts on the next draw');
});
