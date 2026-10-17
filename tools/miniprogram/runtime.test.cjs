const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {createStore}=require('../../miniprogram/utils/store');

function clock(){
  let time=0,id=0;const tasks=new Map();
  return {setTimeout(fn,ms){tasks.set(++id,{fn,at:time+ms});return id;},clearTimeout(id){tasks.delete(id);},
    advance(ms){const end=time+ms;while(true){const next=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;tasks.delete(next[0]);next[1].fn();}time=end;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

for(const packageName of [...Array.from({length:14},(_,i)=>'media'+String(i).padStart(2,'0')),'petmotion'])test(packageName+' readiness handles failed downloads, changed actions and detached views',async()=>{
  const timer=clock();let definition;const requests=[];
  const nativeRequire={async:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../miniprogram/components/asset-image/index.js'),'utf8'),{
    require:nativeRequire,Component:c=>definition=c,...timer});
  const component={...definition.methods,data:{...definition.data,path:'/'+packageName+'/idle.png'},setData(p,done){Object.assign(this.data,p);done?.();}};
  definition.lifetimes.attached.call(component);
  assert.equal(component.data.resolved,'');requests[0].reject(new Error('download interrupted'));await flush();assert(component.data.failed);
  component.retry();assert.equal(requests.length,2);
  component.data.path='/'+packageName+'/run.png';component.load(component.data.path);
  requests[1].resolve({ready:true});await flush();
  assert.equal(component.data.resolved,'/'+packageName+'/run.png','stale idle callback must not replace a running action');
  component.loaded({detail:{path:component.data.path}});assert(!component.data.failed);
  component.data.path='/'+packageName+'/done.png';component.load(component.data.path);
  definition.lifetimes.detached.call(component);const before=JSON.stringify(component.data);await flush();
  assert.equal(JSON.stringify(component.data),before,'a completed package load must not update a detached view');
});
test('native image component loads without the unsupported game-only package API',()=>{
  const timer=clock();let definition;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../miniprogram/components/asset-image/index.js'),'utf8'),{
    wx:{},Component:c=>definition=c,...timer});
  const component={...definition.methods,data:{...definition.data,path:'/assets/a.jpg'},setData(p,done){Object.assign(this.data,p);done?.();}};
  definition.lifetimes.attached.call(component);
  assert.equal(component.data.resolved,'/assets/a.jpg');
  component.data.path='/assets/b.jpg';component.load(component.data.path);
  component.loaded({detail:{path:'/assets/a.jpg'}});assert(component.data.loading);
  timer.advance(30000);assert(component.data.failed);assert(!component.data.loading);
  assert.equal(component.data.resolved,'/assets/b.jpg','slow asynchronous component must remain mounted');
  component.loaded({detail:{path:'/assets/b.jpg'}});assert(!component.data.failed,'late native load recovers without user intervention');
  component.error();component.retry();assert(component.data.loading);
  component.loaded({detail:{path:'/assets/b.jpg'}});assert(!component.data.loading);
  definition.lifetimes.detached.call(component);const before=JSON.stringify(component.data);
  component.error();component.loaded();timer.advance(30000);assert.equal(JSON.stringify(component.data),before);
});
function pageHarness(initialSaved,existingApp){
  let saved=initialSaved;const store=existingApp?existingApp.getStore():createStore({getStorageSync:()=>saved,setStorageSync:(_,v)=>{saved=JSON.parse(JSON.stringify(v));}});
  let app=existingApp;
  if(!app){vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../miniprogram/app.js'),'utf8'),{require:()=>({createStore:()=>store}),App:value=>app=value,wx:{}});app.onLaunch();}
  const timer=clock(),calls=[];let page;
  const filename=path.join(__dirname,'../../miniprogram/pages/kitchen/index.js'),nativeRequire=createRequire(filename);
  const wx={setNavigationBarColor(){},setBackgroundColor(){},setNavigationBarTitle(o){calls.push(['title',o]);},pageScrollTo(o){o.complete?.();},
    navigateTo:o=>calls.push(['navigate',o]),reLaunch:o=>calls.push(['relaunch',o]),setClipboardData:o=>calls.push(['clipboard',o]),
    showModal:o=>o.success({confirm:true}),createSelectorQuery:()=>({in(){return this;},select(){return this;},fields(){return this;},boundingClientRect(){return this;},exec:f=>f([])})};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:p=>p==='../../utils/ui'?{...nativeRequire(p),applyNavigation(){}}:p==='../../utils/recipe-actions'?actions(wx,app):nativeRequire(p),Page:p=>page=p,getApp:()=>app,wx,...timer});
  page.setData=function(patch,done){for(const [key,value]of Object.entries(patch)){const parts=key.split('.');let target=this.data;for(const part of parts.slice(0,-1))target=target[part];target[parts.at(-1)]=value;}done?.();};
  page.onLoad({});return {page,store,app,timer,calls,saved:()=>saved};
}
function actions(wx,app){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../miniprogram/utils/recipe-actions.js'),'utf8'),{module,wx,getApp:()=>app});return module.exports;}
const event=dataset=>({currentTarget:{dataset}});

test('cold entry opens the wheel and background resume preserves the previous page and menu',()=>{
  const seed=pageHarness();seed.page.setServing(event({count:3}));seed.store.state.settings.reduceMotion=true;
  seed.page.spin();seed.timer.advance(0);seed.store.addShopping(['青菜']);seed.page.markSelectedCooked();
  seed.store.state.settings.reduceMotion=false;seed.store.save();const saved=JSON.parse(JSON.stringify(seed.saved()));seed.page.onUnload();
  const {page,app,store,timer}=pageHarness(saved);page.onShow();
  assert(page.data.wheelOpen);assert(page.data.wheelItems.length);assert.equal(page.data.tab,'home');
  assert.deepEqual(store.state,saved,'entry must preserve persisted user data');
  for(const tab of ['home','mine']){
    page.setData({wheelOpen:false,tab});page.onHide();page.onShow();timer.advance(1000);
    assert(!page.data.wheelOpen);assert.equal(page.data.tab,tab);assert(!page.data.spinning);
    assert.deepEqual(store.state,saved);
  }
  page.setData({wheelOpen:false});page.onHide();page.onShow();
  assert(!page.data.wheelOpen,'returning from an internal detail page preserves the result view');page.onUnload();
});

test('explicit dinner choice opens its result once and a new page instance opens the wheel',()=>{
  const first=pageHarness();first.page.setData({selected:first.store.engine.allRecipes()[0]});
  first.page.chooseForDinner();assert(first.calls.some(c=>c[0]==='relaunch'));first.page.onUnload();
  const next=pageHarness(undefined,first.app);next.page.onShow();assert(!next.page.data.wheelOpen);assert(next.page.data.selected);
  next.page.onHide();next.page.onShow();assert(!next.page.data.wheelOpen);next.page.onUnload();
  const reopened=pageHarness(undefined,next.app);reopened.page.onShow();assert(reopened.page.data.wheelOpen);reopened.page.onUnload();
});
test('all page flows preserve settings, menu selection, shopping, custom recipes and sharing',()=>{
  const {page,store,timer,calls,saved}=pageHarness();
  for(const count of [1,2,3,4,5,6]){
    page.setServing(event({count}));page.toggleTaste(event({value:'all'}));store.state.settings.reduceMotion=true;
    page.openWheel();page.spin();timer.advance(0);assert.equal(page.data.selectedMenu.length,count);
    const first=page.data.activeId;page.cyclePicked(event({direction:1}));if(count>1)assert.notEqual(page.data.activeId,first);
    assert.equal(page.data.selected.id,page.data.activeId);
  }
  page.toggleTaste(event({value:'川味'}));page.toggleTaste(event({value:'粤式'}));assert.equal(store.state.settings.tastes.length,2);
  page.setAvoidTerms({detail:{value:'花生'}});page.closeFilters();assert.equal(saved().settings.avoidTerms,'花生');
  page.resetFilters();assert(store.engine.filteredRecipes().length>700);
  page.searchInput({detail:{value:'韩式辣炒年糕'}});assert.equal(page.data.libraryTotal,1);assert.equal(page.data.library[0].id,'exp-290');assert.equal(page.data.library[0].flavorText,store.find('exp-290').flavor);
  page.openRecipe(event({id:'exp-290'}));assert(calls.some(c=>c[0]==='navigate'&&c[1].url.endsWith('exp-290')));
  page.fridgeInput({detail:{value:'西红柿 鸡蛋'}});page.findFridge();assert(page.data.fridgeMatches.length>0);
  page.addSelectedShopping();assert(store.state.shopping.length>0);
  page.shoppingInput({detail:{value:'测试青菜'}});page.addShopping();const item=store.state.shopping.find(x=>x.name==='测试青菜');
  page.toggleShopping(event({id:item.id}));assert(item.done);store.addShopping(['测试青菜']);assert(!item.done);
  page.copyShopping();assert(calls.some(c=>c[0]==='clipboard'&&c[1].data.includes('测试青菜')));
  page.toggleShopping(event({id:item.id}));page.clearDone();assert(!store.state.shopping.some(x=>x.id===item.id));
  page.markSelectedCooked();assert(store.state.history.length>0);
  page.saveCustom({detail:{value:{name:'测试香菇豆腐餐',ingredients:'豆腐、香菇',steps:'切块\n蒸熟',time:20,kcal:200,heat:0}}});
  const custom=store.state.customRecipes[0];assert(custom);store.state.selectedIds=[custom.id];page.refresh();
  assert.equal(page.onShareAppMessage().path,'/pages/kitchen/index');
  page.removeCustom(event({id:custom.id}));assert(!store.find(custom.id));assert(!store.state.selectedIds.includes(custom.id));
  page.restoreAppearance();assert.equal(store.state.mascotId,'lazy-yawn-cat');
  const reopened=createStore({getStorageSync:()=>saved(),setStorageSync(){}});assert.equal(reopened.state.settings.servingCount,6);assert(reopened.state.history.length);
  page.onShow();assert(calls.some(c=>c[0]==='title'&&c[1].title==='不牛马厨房'));page.onUnload();
});
test('rice-cake dishes use rice cakes and shrimp keeps the seafood exclusion',()=>{
  const {recipes}=require('../../miniprogram/data/recipes');
  for(const r of recipes.filter(r=>r.name.includes('年糕'))){assert(r.ingredients.some(i=>i.includes('年糕')),r.name);assert(!r.ingredients.includes('面条或米粉'));assert(r.method.steps.some(s=>s.includes('年糕')));}
  const store=createStore({getStorageSync:()=>null,setStorageSync(){}});store.state.settings.avoidFlags=['seafood'];assert(!store.engine.filteredRecipes().some(r=>r.id==='exp-447'));
});

test('incremental refresh preserves mutable settings and externally changed menu selection',()=>{
  const {page,store}=pageHarness();const list=store.engine.allRecipes();const [a,b]=list;
  store.state.selectedIds=[a.id,b.id];page.refresh();
  page.selectPicked(event({id:b.id}));assert.equal(page.data.selected.id,b.id);
  store.state.selectedIds=[a.id];page.refresh();assert.equal(page.data.selected.id,a.id);
  const patches=[];const set=page.setData;page.setData=function(p,d){patches.push(JSON.parse(JSON.stringify(p)));set.call(this,p,d);};
  page.setServing(event({count:4}));assert(patches.some(p=>p.settings&&p.settings.servingCount===4));
  patches.length=0;page.shoppingInput({detail:{value:'青菜'}});page.addShopping();
  assert(!patches.some(p=>'library' in p||'fridgeMatches' in p),'unchanged result lists should not cross the bridge');
  page.onUnload();
});
