const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const path=require('node:path');
const {createStore}=require('../../miniprogram/utils/store');
const {mascotPresets}=require('../../miniprogram/data/options');
const pointer=require('../../miniprogram/utils/wheel-pointer');
function harness(pet,reduceMotion=false){
  const store=createStore({getStorageSync:()=>null,setStorageSync(){}});
  store.state.mascotId=pet.id;store.state.settings.reduceMotion=reduceMotion;
  let page,clock=0,id=0;const timers=new Map();
  const filename=path.resolve(__dirname,'../../miniprogram/pages/kitchen/index.js');
  const nativeRequire=createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{
    Date:class extends Date{static now(){return clock;}},
    require:p=>p==='../../utils/ui'?{...nativeRequire(p),applyNavigation(){}}:nativeRequire(p),
    Page:p=>page=p,getApp:()=>({getStore:()=>store}),
    wx:{setNavigationBarColor(){},setBackgroundColor(){},pageScrollTo(){},createSelectorQuery:()=>({in(){return this;},select(){return this;},fields(){return this;},exec:f=>f([])})},
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:clock+ms});return id;},clearTimeout:key=>timers.delete(key)
  },{filename});
  page.setData=function(patch,done){Object.assign(this.data,patch);done?.();};page.onLoad({});
  const advance=ms=>{const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn();}clock=end;};
  return {page,store,advance};
}
const touch=(x,y=0)=>({touches:[{clientX:x,clientY:y}],changedTouches:[{clientX:x,clientY:y}]});
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

test('pointer nudges follow sector edges, slow down, shrink and reverse with the disc',()=>{
  const right=pointer.plan(0,2025,8,4200),left=pointer.plan(0,-2025,8,4200);
  assert(right.length>5&&right.length<28,'limit bridge updates to visible nudges');
  assert.deepEqual(right.map(t=>t.at),left.map(t=>t.at));
  for(let i=0;i<right.length;i++){
    assert.equal(right[i].kick,-left[i].kick);
    assert(right[i].at+right[i].duration<=4200,'return to rest by the actual stop');
    if(i){assert(right[i].at-right[i-1].at>=150);assert(Math.abs(right[i].kick)<=Math.abs(right[i-1].kick));}
  }
  assert(right.at(-1).at-right.at(-2).at>2*(right[1].at-right[0].at));
  assert(Math.abs(right.at(-1).kick)<Math.abs(right[0].kick)/2);
  // Independent easing reference: cubic-bezier parameter .5 gives x=.215, y=.77.
  assert(Math.abs(pointer.timeAtProgress(.77)-.215)<.00001);
  assert.deepEqual(pointer.plan(12,12,8,4200),[]);
  assert.deepEqual(pointer.plan(0,2025,8,0),[]);
});

test('pointer stops at selection and cannot resume after hiding or cancelling a drag',()=>{
  const {page,advance}=harness(mascotPresets[1]);
  page.spin();advance(300);assert(page.data.pointerMotion);
  page.onHide();advance(6000);assert.equal(page.data.pointerMotion,null);assert.equal(page.pointerTimer,null);
  page.onShow();page.spin();advance(4200);assert.equal(page.data.petState,'done');assert.equal(page.data.pointerMotion,null);
  advance(1750);page.openWheel();
  page.touchStart(touch(0));page.touchMove(touch(-100));assert(page.data.pointerMotion);
  page.touchCancel();assert.equal(page.data.pointerMotion,null);
  const reduced=harness(mascotPresets[1],true);reduced.page.spin();reduced.advance(0);
  assert.equal(reduced.page.pointerTimer,null);assert.equal(reduced.page.data.pointerMotion,null);
});
