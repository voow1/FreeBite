const test=require('node:test');
const assert=require('node:assert/strict');
const {decorate}=require('../../miniprogram/utils/motion');
function harness(){
  let id=0,now=0;const tasks=new Map(),writes=[];
  const clock={setTimeout(fn,ms){tasks.set(++id,{fn,at:now+ms});return id;},clearTimeout(id){tasks.delete(id);}};
  const page=decorate({data:{settings:{reduceMotion:false},filtersOpen:false},setServing(){this.count=(this.count||0)+1;},openFilters(){this.setData({filtersOpen:true});},onHide(){this.hidden=true;},onUnload(){this.unloaded=true;}},clock);
  page.setData=function(p){writes.push(p);Object.assign(this.data,p);};page.store={state:{settings:page.data.settings}};page.onLoad({});
  return {page,tasks,writes,advance(ms){now+=ms;for(const [id,t]of [...tasks])if(t.at<=now){tasks.delete(id);t.fn();}}};
}
test('rapid repeated actions replay feedback while timers and touch nodes stay bounded',()=>{
  const {page,tasks,advance}=harness();let previous=page.data.qBeat;
  for(let i=0;i<200;i++){
    const e={timeStamp:i+1,currentTarget:{dataset:{count:2}},detail:{x:100,y:200}};
    page.setServing(e);assert.notEqual(page.data.qBeat,previous);previous=page.data.qBeat;
    page.qTap(e);assert(tasks.size<=2);assert.equal(page.data.qTouch.x,100);
  }
  assert.equal(page.count,200,'business handlers must execute every time');advance(600);
  assert.equal(tasks.size,0);assert.equal(page.data.qTouch,null);assert.equal(page.data.qAction,'');
});
test('hiding a page finishes pending closes once and cancels every animation timer',()=>{
  const {page,tasks,writes,advance}=harness();let saves=0;
  page.openFilters();page.qClose('filtersOpen',()=>saves++);page.qTap({detail:{x:1,y:2}});
  assert(page.data.filtersOpen);page.onHide();assert(page.hidden);assert.equal(saves,1);
  assert.equal(page.data.filtersOpen,false);assert.equal(tasks.size,0);assert(page.data.qPaused);
  const n=writes.length;advance(1000);assert.equal(writes.length,n);
  page.onShow();assert(!page.data.qPaused);page.openFilters();assert(page.data.filtersOpen);
});
test('reopening during an exit cannot let a stale timer close the new sheet',()=>{
  const {page,advance}=harness();let saves=0;
  page.openFilters();page.qClose('filtersOpen',()=>saves++);page.openFilters();
  advance(1000);assert.equal(saves,1);assert(page.data.filtersOpen);assert.equal(page.data.qClosing,'');
});
test('reduced motion clears active effects and performs closes immediately',()=>{
  const {page,tasks}=harness();page.openFilters();page.qTap({detail:{x:1,y:2}});
  page.store.state.settings.reduceMotion=true;page.qSync();assert.equal(tasks.size,0);
  page.qClose('filtersOpen');assert(!page.data.filtersOpen);page.setServing();assert.equal(page.count,1);
  assert.equal(page.data.qAction,'');assert.equal(page.data.qTouch,null);assert.equal(tasks.size,0);
});
test('unloaded pages cannot receive delayed feedback or stale data writes',()=>{
  const {page,tasks,writes,advance}=harness();page.setServing();page.onUnload();
  const n=writes.length;advance(1000);page.qPulse('success');page.qTap({detail:{x:1,y:1}});
  assert(page.unloaded);assert.equal(tasks.size,0);assert.equal(writes.length,n);
});
