const test=require('node:test');
const assert=require('node:assert/strict');
const {createStore}=require('../../miniprogram/utils/store');
const ui=require('../../miniprogram/utils/ui');
const {recipes}=require('../../miniprogram/data/recipes');
function make(saved){let value=saved;return createStore({getStorageSync:()=>value,setStorageSync:(k,v)=>{value=JSON.parse(JSON.stringify(v));}});}
test('retired animation preference is cleared and persisted even with the current theme',()=>{
  let saved={mascotId:'lazy-yawn-cat',settings:{theme:'lazy-cat',followPetTheme:true,reduceMotion:true,avoidTerms:'花生'}};
  const store=createStore({getStorageSync:()=>saved,setStorageSync:(_,value)=>{saved=JSON.parse(JSON.stringify(value));}});
  assert.equal(store.state.settings.reduceMotion,false);
  assert.equal(saved.settings.reduceMotion,false);
  assert.equal(saved.settings.avoidTerms,'花生');
});
test('retired colors migrate to the saved pet without losing user data',()=>{
  const fresh=make();assert.equal(fresh.state.mascotId,'lazy-yawn-cat');assert.equal(ui.appearance(fresh.state).theme.id,'lazy-cat');
  for(const pet of require('../../miniprogram/data/options').mascotPresets){
    const saved={mascotId:pet.id,settings:{theme:'clear-sky-lime',followPetTheme:false,servingCount:3,avoidTerms:'花生',reduceMotion:true},shopping:[{id:'s1',name:'鸡蛋',done:true}],history:[{id:recipes[0].id,name:recipes[0].name}],selectedIds:[recipes[0].id]};
    const returning=make(saved);assert.equal(ui.appearance(returning.state).theme.petId,pet.id);assert.equal(returning.state.settings.theme,ui.appearance(returning.state).theme.id);assert.equal(returning.state.settings.followPetTheme,true);
    assert.equal(returning.state.settings.servingCount,3);assert.equal(returning.state.settings.avoidTerms,'花生');assert.equal(returning.state.settings.reduceMotion,false);assert.deepEqual(returning.state.shopping,saved.shopping);assert.deepEqual(returning.state.history,saved.history);assert.deepEqual(returning.state.selectedIds,saved.selectedIds);
    const reopened=make(JSON.parse(JSON.stringify(returning.state)));assert.deepEqual(reopened.state,returning.state);
  }
});
test('every pet theme has readable text and complete independent tokens',()=>{
  const luminance=hex=>{const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const contrast=(a,b)=>{a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
  const themes=require('../../miniprogram/data/themes').themes;assert.equal(themes.length,4);
  for(const t of themes){const v=t.tokens;
    for(const bg of ['--bg','--surface','--surface-2'])for(const fg of ['--ink','--muted-ink','--accent'])assert(contrast(v[fg],v[bg])>=4.5,t.id+' '+fg+' on '+bg);
    assert(contrast(v['--button-ink'],v['--button-bg'])>=4.5,t.id+' button');
    for(const key of Object.keys(v).filter(k=>k.startsWith('--candy')))assert(contrast(v['--ink'],v[key])>=4.5,t.id+' wheel');
  }
});
test('800 dishes preserve complete methods and unique canonical names',()=>{const s=make();assert.equal(new Set(recipes.map(r=>s.engine.canonicalRecipeName(r.name))).size,800);for(const r of recipes)assert(r.method.steps.length>=4);});
test('taste selection is union and does not weaken avoid exclusions',()=>{
  const s=make();s.state.settings.tastes=['川味','粤式'];s.state.settings.tags=['饮品'];s.state.settings.heat='4';s.state.settings.avoidTerms='鸡';
  const got=s.engine.filteredRecipes();const expected=recipes.filter(r=>(r.tags.includes('川味')||r.tags.includes('粤式'))&&!s.engine.recipePreferenceText(r).includes('鸡'));
  assert.deepEqual(got.map(r=>r.id),expected.map(r=>r.id));assert(got.length>10);
});
test('avoid terms include cooking steps and empty pool remains empty',()=>{
  const s=make();s.state.settings.avoidTerms='盐';for(const r of s.engine.filteredRecipes())assert(!s.engine.recipePreferenceText(r).includes('盐'));
  s.state.settings.tags=['饮品','牛肉','主食'];assert.equal(s.engine.filteredRecipes().length,0);
});
test('recent dishes are excluded and fall back when all eligible dishes are recent',()=>{
  const s=make();s.cooked(recipes.slice(0,3));assert(s.engine.filteredRecipes().every(r=>!recipes.slice(0,3).some(c=>c.id===r.id)));
  const only={...recipes[0],id:'custom-test',tags:['仅此测试菜']};s.state.customRecipes=[only];s.state.settings.tags=['仅此测试菜'];s.cooked([only]);assert.deepEqual(s.engine.filteredRecipes().map(r=>r.id),['custom-test']);
});
test('fridge aliases recognize tomato and potato without counting pantry items',()=>{
  const s=make();assert(s.engine.ingredientsMatch('西红柿','番茄'));assert(s.engine.ingredientsMatch('洋芋','土豆'));assert(!s.engine.ingredientsMatch('土豆','牛肉'));
  const m=s.engine.matchFridgeRecipe({ingredients:['番茄','鸡蛋','生抽']},['西红柿']);assert.deepEqual(m.matched,['番茄']);assert.deepEqual(m.missing,['鸡蛋']);assert.equal(m.score,.5);
});
test('menus contain distinct eligible dishes and exclude drinks from normal meals',()=>{
  const s=make();s.state.settings.servingCount=4;const pool=s.engine.filteredRecipes();
  for(const anchor of s.engine.balancedWheelPool(pool,4).slice(0,80)){
    const menu=s.engine.buildPickedMenu(pool,anchor,4);assert(menu.length>=1&&menu.length<=4);assert.equal(new Set(menu.map(r=>r.id)).size,menu.length);assert(menu.some(r=>r.id===anchor.id));assert(menu.every(r=>pool.includes(r)));assert(menu.every(r=>!s.engine.recipeMenuProfile(r).drink));
  }
});
test('both wheel directions finish with the chosen sector under the pointer',()=>{
  for(const n of [1,2,3,7,8])for(let i=0;i<n;i++)for(const previous of [0,1953,-4812])for(const direction of [-1,1]){
    const angle=ui.spinTarget(previous,i,n,direction);assert((angle-previous)*direction>=1800);const target=((angle+(i+.5)*360/n)%360+360)%360;assert(target<1e-8||Math.abs(target-360)<1e-8);
  }
});
test('malformed saved preferences recover to usable defaults',()=>{
  const s=make({settings:{tastes:42,tags:null,avoidFlags:'bad',heat:99,servingCount:12,theme:'missing'},selectedIds:['missing'],customRecipes:[null],shopping:[null]});assert.equal(s.engine.filteredRecipes().length,800);assert.equal(s.state.selectedIds.length,0);assert.equal(s.state.settings.servingCount,1);
});
test('custom recipe validation, inference, persistence and deduplicated shopping',()=>{
  const s=make();assert.throws(()=>s.addCustom({name:'a'}));assert.throws(()=>s.addCustom({name:'a',ingredients:'蛋',steps:'蒸熟',time:20,kcal:100,heat:9}));
  const r=s.addCustom({name:'我家香菇蒸豆腐',ingredients:'香菇、豆腐',steps:'切块\n蒸熟',time:20,kcal:180,heat:0});assert(r.flags.includes('soy'));assert(r.tags.includes('蒸煮'));assert(s.find(r.id));assert.throws(()=>s.addCustom({...r,ingredients:'豆腐',steps:'蒸熟'}));
  s.addShopping(['鸡蛋','鸡蛋','番茄']);assert.equal(s.state.shopping.length,2);s.state.shopping[0].done=true;s.addShopping(['鸡蛋']);assert.equal(s.state.shopping.length,2);
});
test('corrected source recipes include their named vegetables in fridge matching',()=>{
  const s=make();for(const [name,vegetable]of [['蒜苗炒鸡蛋','蒜苗'],['丝瓜鸡蛋汤','丝瓜']]){const r=recipes.find(r=>r.name===name);assert(r.ingredients.includes(vegetable));assert(s.engine.matchFridgeRecipe(r,['鸡蛋']).missing.includes(vegetable));assert(!r.method.steps.join('').includes('焯去血沫'));}
});
test('page handlers complete spin, grocery, search and sharing flow',async()=>{
  const s=make();let page;global.Page=p=>{page=p;};global.getApp=()=>({getStore:()=>s});global.wx={setNavigationBarColor(){},setBackgroundColor(){},pageScrollTo(o){o.complete?.();},createSelectorQuery:()=>({in(){return this;},select(){return this;},fields(){return this;},boundingClientRect(){return this;},exec(fn){fn([]);}})};
  require('../../miniprogram/pages/kitchen/index');page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(patch,cb){for(const [k,v]of Object.entries(patch)){if(k.includes('.')){const [a,b]=k.split('.');this.data[a][b]=v;}else this.data[k]=v;}if(cb)cb();};
  page.onLoad({});assert.equal(page.wheelRecipes.length,8);s.state.settings.reduceMotion=true;page.spin();await new Promise(r=>setTimeout(r,30));assert(s.state.selectedIds.length);assert.equal(page.data.spinning,false);assert.equal(page.data.wheelOpen,false);page.addSelectedShopping();assert(s.state.shopping.length);page.markSelectedCooked();assert.equal(s.state.history.length,1);page.searchInput({detail:{value:'番茄'}});assert(page.data.library.length);assert(page.onShareAppMessage().path.includes('recipe'));page.onUnload();
});

test('five and six person menus survive reopening without truncation',()=>{
  for(const count of [5,6]){
    const s=make({settings:{servingCount:count}}),pool=s.engine.filteredRecipes();
    assert.equal(s.engine.targetMenuCount(pool),count);
    const menu=s.engine.buildPickedMenu(pool,s.engine.balancedWheelPool(pool)[0],count);
    assert.equal(menu.length,count);assert.equal(new Set(menu.map(r=>r.id)).size,count);
    const reopened=make({settings:{servingCount:count},selectedIds:menu.map(r=>r.id)});
    assert.equal(reopened.state.settings.servingCount,count);
    assert.deepEqual(reopened.state.selectedIds,menu.map(r=>r.id));
  }
});
