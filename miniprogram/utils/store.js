const { recipes } = require('../data/recipes');
const options = require('../data/options');
const { themes } = require('../data/themes');
const createEngine = require('./engine');
const KEY = 'freebite.miniprogram.v1';
const clone = value => JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : [];
function createStore(platform) {
  let saved;
  try { saved = platform.getStorageSync(KEY); } catch (_) { saved = null; }
  saved = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  const settings = Object.assign(clone(options.defaultSettings), saved.settings || {});
  settings.tastes = list(settings.tastes).filter(t => options.tastePreferenceOptions.includes(t));
  settings.tags = list(settings.tags).filter(t => options.preferenceFilterGroups.some(g=>g.tags.includes(t)));
  settings.avoidFlags = list(settings.avoidFlags).filter(t=>options.avoidFlagOptions.some(f=>f.value===t));
  settings.avoidTerms = String(settings.avoidTerms || '').slice(0,300);
  settings.fridgeItems = String(settings.fridgeItems || '').slice(0,600);
  settings.servingCount = [1,2,3,4].includes(Number(settings.servingCount)) ? Number(settings.servingCount) : 1;
  settings.heat = ['all','0','1','2','3','4'].includes(String(settings.heat)) ? String(settings.heat) : 'all';
  settings.theme = themes.some(t=>t.id===settings.theme) ? settings.theme : options.defaultSettings.theme;
  settings.recoveryMode = settings.recoveryMode === true;
  settings.lowIodinePlan = settings.lowIodinePlan === true;
  settings.followPetTheme = settings.followPetTheme === true;
  settings.reduceMotion = settings.reduceMotion === true;
  const state = {
    settings,
    mascotId: options.mascotPresets.some(p=>p.id===saved.mascotId) ? saved.mascotId : options.defaultMascotId,
    customRecipes: list(saved.customRecipes).filter(r=>r && typeof r.id==='string' && r.id.startsWith('custom-') &&
      typeof r.name==='string' && Array.isArray(r.ingredients) && Array.isArray(r.tags) && Array.isArray(r.flags) &&
      r.method && Array.isArray(r.method.steps)).slice(0,100),
    shopping: list(saved.shopping).filter(r=>r && typeof r.id==='string' && typeof r.name==='string').slice(0,300),
    history: list(saved.history).filter(r=>r && typeof r.id==='string').slice(0,24),
    selectedIds: list(saved.selectedIds).filter(id=>typeof id==='string').slice(0,4)
  };
  // Retired free palettes migrate to the chosen pet; all non-appearance data stays intact.
  const petTheme = themes.find(t=>t.petId===state.mascotId);
  state.settings.theme = petTheme.id;
  state.settings.followPetTheme = true;
  const engine = createEngine(state);
  const find = id => engine.allRecipes().find(r=>r.id===id);
  state.selectedIds = state.selectedIds.filter(find);
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  function save() {
    try { platform.setStorageSync(KEY,state); return true; }
    catch (_) { platform.showToast && platform.showToast({title:'保存失败，请检查设备存储空间',icon:'none'}); return false; }
  }
  function addShopping(names) {
    let added = 0;
    names.forEach(name=>{
      name = String(name).trim().slice(0,60);
      if (name && state.shopping.length < 300 && !state.shopping.some(i=>i.name===name)) {
        state.shopping.push({id:uid('shop'),name,done:false}); added++;
      }
    });
    save(); return added;
  }
  function cooked(items) {
    const date = new Date();
    const cookedAt = `${date.getMonth()+1}月${date.getDate()}日`;
    const ids = new Set(items.map(r=>r.id));
    state.history = items.map(r=>({id:r.id,name:r.name,cookedAt})).concat(state.history.filter(r=>!ids.has(r.id))).slice(0,24);
    save();
  }
  function addCustom(input) {
    const name = String(input.name || '').trim();
    const ingredients = engine.splitIngredientInput(input.ingredients);
    const steps = String(input.steps || '').split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if (!name || !ingredients.length || !steps.length) throw new Error('请填写菜名、食材和做法');
    if (engine.allRecipes().some(r=>engine.canonicalRecipeName(r.name)===engine.canonicalRecipeName(name))) throw new Error('这道菜已在菜库中');
    if (state.customRecipes.length >= 100) throw new Error('自定义菜谱已达100道');
    const time = Number(input.time), kcal = Number(input.kcal);
    if (!Number.isFinite(time) || time<1 || time>600 || !Number.isFinite(kcal) || kcal<0 || kcal>5000) throw new Error('请填写合理的时间与热量');
    const heat=Number(input.heat || 0);
    if(![0,1,2,3,4].includes(heat))throw new Error('请选择有效辣度');
    let recipe = {id:uid('custom'),name:name.slice(0,30),ingredients,heat,time,kcal,
      flags:[],tags:['家常'],note:'自定义家常菜',image:'',method:{steps,tip:'请确认食材新鲜，并充分煮熟。',sources:[]}};
    recipe.tags = engine.inferRecipeTaxonomy(recipe);
    recipe = engine.withAutoHealthFlags(recipe);
    state.customRecipes.unshift(recipe); save(); return recipe;
  }
  if(saved.settings && (saved.settings.theme!==settings.theme || saved.settings.followPetTheme!==true))save();
  return {state,engine,find,save,addShopping,cooked,addCustom,uid};
}
module.exports = {createStore,KEY};
