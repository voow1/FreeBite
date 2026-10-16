const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const path=require('node:path');
const {createStore}=require('../../miniprogram/utils/store');
const {mascotPresets}=require('../../miniprogram/data/options');
const pointer=require('../../miniprogram/utils/wheel-pointer');
function harness(pet,reduceMotion=false,rects=null,navTop=700,layoutEnv=null){
  const store=createStore({getStorageSync:()=>null,setStorageSync(){}});
  store.state.mascotId=pet.id;store.state.settings.reduceMotion=reduceMotion;
  let page,clock=0,id=0;const timers=new Map();
  const filename=path.resolve(__dirname,'../../miniprogram/pages/kitchen/index.js');
  const nativeRequire=createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{
    Date:class extends Date{static now(){return clock;}},
    require:p=>p==='../../utils/ui'?{...nativeRequire(p),applyNavigation(){}}:nativeRequire(p),
    Page:p=>page=p,getApp:()=>({getStore:()=>store}),
    wx:{getWindowInfo:()=>layoutEnv?.screen||{},setNavigationBarColor(){},setBackgroundColor(){},pageScrollTo(o){page.lastScroll=o;o.complete?.();},createSelectorQuery:()=>{const selectors=[];return {in(){return this;},select(s){selectors.push(s);return this;},fields(){return this;},boundingClientRect(){return this;},exec:f=>f(selectors[0]==='.wheel-play-area'&&layoutEnv?[{height:layoutEnv.height}]:selectors[0]==='.home-scene .hero-photo'?[rects&&rects[1],{top:navTop}]:['.home-scene .menu-strip','.wheel-play-area'].includes(selectors[0])?[]:rects||[])};}},
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:clock+ms});return id;},clearTimeout:key=>timers.delete(key)
  },{filename});
  page.setData=function(patch,done){Object.assign(this.data,patch);done?.();};page.onLoad({});
  const advance=ms=>{const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=end;};
  return {page,store,advance};
}
const touch=(x,y=0)=>({touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}]});
const flightRects=[{left:168,top:360,width:48,height:30},{left:20,top:220,width:350,height:260}];
test('pet cards animate only on the selection tab and resume without restarting their phase',()=>{
  const {page,advance}=harness(mascotPresets[0]);
  page.setData({wheelOpen:false});
  const tab=name=>page.switchTab({currentTarget:{dataset:{tab:name}}});
  tab('mine');advance(400);
  assert(page.data.petPreviewFrame>0);
  const frame=page.data.petPreviewFrame;
  page.setPet({currentTarget:{dataset:{id:mascotPresets[2].id}}});
  assert.equal(page.data.petPreviewFrame,frame,'changing theme preserves animation phase');
  tab('home');advance(1000);assert.equal(page.data.petPreviewFrame,frame);
  tab('mine');advance(400);assert.notEqual(page.data.petPreviewFrame,frame);
  page.onHide();const hiddenFrame=page.data.petPreviewFrame;
  advance(1000);assert.equal(page.data.petPreviewFrame,hiddenFrame);
  page.onShow();advance(400);assert.notEqual(page.data.petPreviewFrame,hiddenFrame);
  page.onUnload();assert.equal(page.petPreviewPlayer.status().active,false);
});
test('winning dish flies from its label to the menu photo without changing the result',()=>{
  for(const direction of [-1,1]){
    const {page,store,advance}=harness(mascotPresets[0],false,flightRects);
    page.openWheel();page.spin({direction});
    const winner=page.wheelRecipes[page.data.flightIndex];
    page.flightImageReady({detail:{path:winner.image}});
    advance(5990);assert.equal(page.data.flightPhase,'seed');assert.equal(page.data.dishFlight.id,winner.id);
    assert.match(page.data.flightStyle,/left:158px;top:351px;width:68px;height:48px/);
    const selected=store.state.selectedIds.slice();assert(selected.includes(winner.id));assert.equal(page.lastScroll.scrollTop,0);assert.equal(page.lastScroll.duration,0);
    advance(40);assert.equal(page.data.flightPhase,'flying');assert.match(page.data.flightStyle,/left:20px;top:220px;width:350px;height:260px/);
    advance(680);assert.equal(page.data.dishFlight,null);assert(!page.data.wheelOpen);assert(!page.data.spinning);
    assert.equal(page.data.activeId,winner.id);assert.deepEqual(store.state.selectedIds,selected);page.onUnload();
  }
});
test('leaving during a dish flight cancels it and preserves the already selected menu',()=>{
  for(const delay of [5950,5990,6030,6250]){
    const {page,store,advance}=harness(mascotPresets[1],false,flightRects);
    page.spin();page.flightImageReady({detail:{path:page.data.flightRecipe.image}});advance(delay);
    const selected=store.state.selectedIds.slice();page.onHide();advance(10000);page.onShow();
    assert.equal(page.data.dishFlight,null);assert(!page.data.wheelOpen);assert(!page.data.spinning);assert.deepEqual(store.state.selectedIds,selected);page.onUnload();
  }
});
test('unready image or missing geometry falls back to a usable menu',()=>{
  for(const ready of [false,true]){
    const {page,store,advance}=harness(mascotPresets[2]);page.spin();
    if(ready)page.flightImageReady({detail:{path:page.data.flightRecipe.image}});
    advance(7000);assert.equal(page.data.dishFlight,null);assert(!page.data.spinning);assert(!page.data.wheelOpen);assert(store.state.selectedIds.length);page.onUnload();
  }
});
test('all four pets retain both running directions and completion before returning home',()=>{
  for(const pet of mascotPresets)for(const direction of [-1,1]){
    const {page,store,advance}=harness(pet);
    page.touchStart(touch(100));page.touchMove(touch(100+direction*50));
    assert.equal(page.data.petState,direction<0?'runRight':'runLeft');assert.equal(Math.floor(page.data.petRow/2),direction<0?1:2);
    assert.equal(Math.sign(page.data.angle),-direction,'right swipe turns counterclockwise; left swipe turns clockwise');
    page.touchEnd(touch(100+direction*50));assert(page.data.spinning);
    page.refresh();assert.equal(page.data.petState,direction<0?'runRight':'runLeft');assert.equal(Math.floor(page.data.petRow/2),direction<0?1:2);
    advance(4199);assert.equal(store.state.selectedIds.length,0);
    advance(1);assert.equal(page.data.petState,'done');assert.equal(Math.floor(page.data.petRow/2),3);assert(page.data.wheelOpen);
    advance(1680);assert(page.data.wheelOpen);advance(70);
    assert(!page.data.wheelOpen);assert.equal(page.data.petState,'idle');assert(store.state.selectedIds.length);
    page.onUnload();
  }
});
test('cancelled drags, vertical scrolling and leaving during a spin reset the mascot',()=>{
  const {page,store,advance}=harness(mascotPresets[0]);
  page.touchStart(touch(0));page.touchMove(touch(-20));page.touchCancel();assert.equal(page.data.petState,'idle');
  page.touchStart(touch(0));page.touchMove(touch(40,100));page.touchEnd(touch(40,100));assert(!page.data.spinning);
  page.spin();page.onHide();advance(6000);assert.equal(page.data.petState,'idle');assert.equal(store.state.selectedIds.length,0);
});
test('reduced motion skips directional running and celebration delays',()=>{
  const {page,store,advance}=harness(mascotPresets[0],true);
  page.touchStart(touch(0));page.touchMove(touch(-50));assert.equal(page.data.petState,'idle');
  page.touchEnd(touch(-50));assert.equal(page.data.petState,'idle');advance(0);
  assert(!page.data.spinning);assert(!page.data.wheelOpen);assert(store.state.selectedIds.length);
});

test('canvas-native x/y touch coordinates rotate left and right without scrolling',()=>{
  const {page}=harness(mascotPresets[0]);
  page.touchStart({touches:[{x:100,y:100}]});page.touchMove({touches:[{x:160,y:100}]});
  assert(page.data.angle<0);assert.equal(page.data.petState,'runLeft');
  page.touchMove({touches:[{x:80,y:100}]});assert(page.data.angle>0);assert.equal(page.data.petState,'runRight');
  page.touchCancel();assert(!page.data.spinning);assert.equal(page.data.petState,'idle');
});

test('pointer leans with travel direction, narrows with speed and settles at rest',()=>{
  assert.deepEqual(pointer.bounds(1.6),{near:40,far:80,period:240});
  const slow=pointer.bounds(.06);
  assert(slow.near>=15&&slow.near<17);assert(slow.far>=45&&slow.far<47);
  assert(slow.period>pointer.bounds(1.6).period);
  assert.equal(pointer.bounds(0).far,0);
  const right=harness(mascotPresets[0]),left=harness(mascotPresets[0]);
  right.page.startPointerSpin(0,2025,4200);left.page.startPointerSpin(0,-2025,4200);
  const early=[],late=[];
  for(let t=40;t<4200;t+=40){
    right.advance(40);left.advance(40);
    const angle=right.page.data.pointerMotion.angle;
    assert(angle<=0,'clockwise top-edge motion leans the pointer right');
    assert.equal(angle,-left.page.data.pointerMotion.angle);
    if(t<400)early.push(Math.abs(angle));
    if(t>3500)late.push(Math.abs(angle));
  }
  assert(Math.max(...early)>70);assert(Math.min(...early)>=40);
  assert(Math.max(...late)<20,'late spin narrows its sway');
  assert(late.at(-1)<1,'final frame nearly returns to center');
  right.advance(40);left.advance(40);
  assert.equal(right.page.data.pointerMotion,null);
  assert.equal(right.page.pointerPlayer.status().timer,null);
  right.page.onUnload();left.page.onUnload();
});

test('drag reversal changes the lean side and a stationary finger releases the pointer',()=>{
  const {page,advance}=harness(mascotPresets[0]);
  page.touchStart(touch(100));page.touchMove(touch(50));advance(40);
  assert(page.data.pointerMotion.angle<0);
  page.touchMove(touch(80));advance(40);assert(page.data.pointerMotion.angle>0);
  advance(240);assert.equal(page.data.pointerMotion,null);
  assert.equal(page.pointerPlayer.status().timer,null);page.onUnload();
});

test('pointer stops at selection and cannot resume after hiding or cancelling a drag',()=>{
  const {page,advance}=harness(mascotPresets[1]);
  page.spin();advance(300);assert(page.data.pointerMotion);
  page.onHide();advance(6000);assert.equal(page.data.pointerMotion,null);assert.equal(page.pointerPlayer.status().timer,null);
  page.onShow();page.spin();advance(4200);assert.equal(page.data.petState,'done');assert.equal(page.data.pointerMotion,null);
  advance(1750);page.openWheel();
  page.touchStart(touch(0));page.touchMove(touch(-100));assert(page.data.pointerMotion);
  page.touchCancel();assert.equal(page.data.pointerMotion,null);
  const reduced=harness(mascotPresets[1],true);reduced.page.spin();reduced.advance(0);
  assert.equal(reduced.page.pointerPlayer.status().timer,null);assert.equal(reduced.page.data.pointerMotion,null);
});

test('a short viewport scrolls only the amount needed before flying to the result',()=>{
  const {page,advance}=harness(mascotPresets[0],false,flightRects,450);
  page.spin();page.flightImageReady({detail:{path:page.data.flightRecipe.image}});
  advance(5990);assert.equal(page.lastScroll.scrollTop,42);assert.equal(page.data.flightPhase,'seed');
  page.onUnload();
});

test('dragging over the center cannot turn the release into an extra tap',()=>{
  const {page,advance}=harness(mascotPresets[2]);
  let spins=0;page.spin=()=>{spins++;};
  page.touchStart(touch(100,200));page.touchMove(touch(120,200));
  advance(800);page.touchEnd(touch(120,200));page.tapWheelCenter({});
  assert.equal(spins,0,'a short drag is not a center-button click');
  advance(501);page.tapWheelCenter({});assert.equal(spins,1,'a subsequent deliberate tap works');
  page.touchStart(touch(100,200));page.touchMove(touch(170,200));page.touchEnd(touch(170,200));
  page.tapWheelCenter({});assert.equal(spins,2,'a released swipe starts exactly one spin');
  page.onUnload();
});

test('wheel uses phone width and recovers from an undersized first layout',()=>{
  const env={screen:{windowWidth:390,windowHeight:844},height:270};
  const {page,advance}=harness(mascotPresets[3],false,null,700,env);
  page.openWheel();
  assert.equal(page._wheelPreferred.size,358);
  env.height=531;
  advance(420);
  assert.equal(page.data.wheelSize,358,'settled geometry restores the full-width disc');
  const settled=page.data.wheelSize;
  page.scheduleWheelLayout();page.onHide();env.height=150;advance(500);
  assert.equal(page.data.wheelSize,settled,'a hidden page cannot apply delayed measurements');
  page.onUnload();
});
test('short phone keeps a readable disc after compact header layout',()=>{
  const env={screen:{windowWidth:360,windowHeight:640},height:389.2};
  const {page,advance}=harness(mascotPresets[3],false,null,700,env);
  page.openWheel();advance(420);
  assert(page.data.wheelSize>=300);
  assert(page.data.wheelTop+page.data.wheelSize<=env.height-4);
  page.onUnload();
});
