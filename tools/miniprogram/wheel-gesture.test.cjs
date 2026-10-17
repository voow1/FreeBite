const test=require('node:test');
const assert=require('node:assert/strict');
const gesture=require('../../miniprogram/utils/wheel-gesture');
const center={x:195,y:480},size=340;
const point=(r,a)=>({x:center.x+r*Math.cos(a),y:center.y+r*Math.sin(a)});

test('horizontal, vertical, diagonal and radial strokes work inside and outside the disc',()=>{
  for(const radius of [0,60,150,210])for(let a=0;a<8;a++)for(let d=0;d<8;d++){
    const start=point(radius,a*Math.PI/4),angle=d*Math.PI/4;
    const drag=gesture.begin(start,123,size,center);
    const end={x:start.x+70*Math.cos(angle),y:start.y+70*Math.sin(angle)};
    const update=gesture.move(drag,end);
    assert(update&&Number.isFinite(update.angle));assert.notEqual(update.angle,123);
    assert(gesture.shouldSpin(gesture.releaseSpeed(drag)));
  }
});

test('clockwise and anticlockwise full circles retain their direction across angle wraparound',()=>{
  for(const radius of [70,160,210])for(const direction of [-1,1]){
    const drag=gesture.begin(point(radius,0),10,size,center);
    for(let step=1;step<=72;step++){
      const result=gesture.move(drag,point(radius,direction*step*Math.PI/36));
      if(result)assert.equal(result.direction,direction);
    }
    assert(Math.abs(drag.angle-(10+direction*360))<0.001);
    assert(gesture.shouldSpin(gesture.releaseSpeed(drag)),'a fast closed arc releases even when its endpoints coincide');
    const reversed=gesture.move(drag,point(radius,direction*(2*Math.PI-Math.PI/12)));
    assert.equal(reversed.direction,-direction);
  }
});

test('crossing the center is bounded and direction remains stable along straight strokes',()=>{
  for(const y of [-120,-42,0,42,120]){
    const drag=gesture.begin({x:center.x-200,y:center.y+y},0,size,center);let direction;
    for(let x=-190;x<=200;x+=10){
      const update=gesture.move(drag,{x:center.x+x,y:center.y+y});
      assert(Math.abs(update.delta)<20,'no polar half-turn at the hub');
      direction??=update.direction;assert.equal(update.direction,direction);
    }
  }
});

test('tap jitter stays still and slow curved movement does not select dishes',()=>{
  const drag=gesture.begin(center,0,size,center);
  for(let i=0;i<100;i++)assert.equal(gesture.move(drag,{x:center.x+(i%2?2:-2),y:center.y+1}),null);
  assert(!gesture.shouldSpin(gesture.releaseSpeed(drag)));assert.equal(drag.angle,0);
  gesture.move(drag,{x:center.x,y:center.y+20},2000);assert(!gesture.shouldSpin(gesture.releaseSpeed(drag)));
  gesture.move(drag,{x:center.x+20,y:center.y+20},2400);assert(!gesture.shouldSpin(gesture.releaseSpeed(drag)));
});

test('missing layout still accepts every direction and offset layouts produce the same rotation',()=>{
  for(const end of [{x:60,y:0},{x:0,y:60},{x:60,y:60}]){
    const drag=gesture.begin({x:0,y:0},0,size,null);assert(gesture.move(drag,end));assert(gesture.shouldSpin(gesture.releaseSpeed(drag)));
  }
  const drag=gesture.begin(point(150,0),0,size,center),offset={x:31,y:250};
  const shift=p=>({x:p.x+offset.x,y:p.y+offset.y});
  const other=gesture.begin(shift(point(150,0)),0,size,shift(center));
  for(let i=1;i<10;i++){const p=point(150,i/5);gesture.move(drag,p);gesture.move(other,shift(p));}
  assert(Math.abs(drag.angle-other.angle)<0.0001);
});

test('release uses recent speed rather than total distance, including pauses and reversals',()=>{
  const long=gesture.begin({x:0,y:0},0,size,null);
  for(let i=1;i<=100;i++)gesture.move(long,{x:i*4,y:0},i*80);
  assert(!gesture.shouldSpin(gesture.releaseSpeed(long)),'400 slow pixels do not trigger');
  const short=gesture.begin({x:0,y:0},0,size,null);
  gesture.move(short,{x:12,y:0},24);assert(gesture.shouldSpin(gesture.releaseSpeed(short)),'12 fast pixels can trigger');
  assert.equal(gesture.releaseSpeed(short,150),0,'holding still before release removes momentum');
  const reverse=gesture.begin({x:0,y:0},0,size,null);
  gesture.move(reverse,{x:100,y:0},100);
  gesture.move(reverse,{x:80,y:0},120);gesture.move(reverse,{x:40,y:0},160);
  assert(gesture.releaseSpeed(reverse)>gesture.RELEASE_SPEED,'last movement determines release direction');
  gesture.move(reverse,{x:39,y:0},240);assert(!gesture.shouldSpin(gesture.releaseSpeed(reverse)),'fast earlier movement does not override a slow release');
});

test('subthreshold inertia decays smoothly in either direction and has a bounded end',()=>{
  for(const direction of [-1,1]){
    let previous=0,speed=1;
    for(let t=0;t<=900;t+=30){
      const step=gesture.coast(direction*0.1,t);
      assert(Math.abs(step.offset)>=previous);assert(Math.abs(step.speed)<=speed);
      previous=Math.abs(step.offset);speed=Math.abs(step.speed);
    }
    assert(gesture.coast(direction*0.1,900).done);
    assert(previous<18.1,'coast cannot become a long unintentional spin');
  }
});
