const {themes} = require('../data/themes');
const {mascotPresets,defaultMascotId} = require('../data/options');
const {references} = require('../data/recipes');
const {flavorView,LEGACY_FLAVORS}=require('./recipe-flavor');
function appearance(state) {
  const pet = mascotPresets.find(p=>p.id===state.mascotId) || mascotPresets.find(p=>p.id===defaultMascotId);
  const theme = themes.find(t=>t.petId===pet.id) || themes[0];
  const tokens = theme.tokens;
  return {pet,theme,tokens,themeStyle:Object.entries(tokens).map(([k,v])=>`${k}:${v}`).join(';')};
}
function recipeView(r) {
  if (!r) return null;
  const method = r.method || {steps:[],tip:'',sources:[]};
  const taste=flavorView(r);
  return {...r,...taste,flavorText:taste.flavor,heatText:['不辣','微辣','中辣','较辣','爆辣'][r.heat] || '不辣',
    tags:[...new Set([...taste.flavorTags,...r.tags.filter(tag=>!LEGACY_FLAVORS.includes(tag))])].slice(0,8),method:{...method,sources:(method.sources||[]).map(i=>typeof i==='number'?references[i]:i).filter(Boolean)}};
}
function sample(pool, count=8, random=Math.random) {
  const copy = pool.slice();
  for (let i=copy.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy.slice(0,count);
}
function spinTarget(previous, index, count, direction=1) {
  // Canvas sector 0 starts at 12 o'clock; pointer stays at 12 o'clock.
  const target = ((360 - (index+0.5)*360/count)%360+360)%360;
  const current = ((previous%360)+360)%360;
  return direction > 0 ? previous + 360*5 + ((target-current+360)%360) : previous - 360*5 - ((current-target+360)%360);
}
function applyNavigation(tokens) {
  wx.setNavigationBarColor({frontColor:'#000000',backgroundColor:tokens['--bg']});
  if(wx.setBackgroundColor)wx.setBackgroundColor({backgroundColor:tokens['--bg']});
}
module.exports = {applyNavigation,appearance,recipeView,sample,spinTarget};
