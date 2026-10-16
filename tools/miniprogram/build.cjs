const fs = require('node:fs');
const path = require('node:path');
const {spawnSync}=require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'miniprogram');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '.generated/source.json'), 'utf8'));
const assets = JSON.parse(fs.readFileSync(path.join(__dirname, '.generated/assets.json'), 'utf8'));
const {themes,petThemes} = require('./pet-themes.cjs');
const {classifyRecipe}=require('../../miniprogram/utils/recipe-flavor');
const wheelArt=spawnSync(process.env.FREEBITE_PYTHON||'python',[path.join(__dirname,'wheel-art.py')],{input:JSON.stringify(themes),encoding:'utf8'});
if(wheelArt.status!==0)throw new Error('转盘素材生成失败：'+(wheelArt.stderr||wheelArt.error||''));
function write(file, text) {
  fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
  fs.writeFileSync(path.join(out, file), text, 'utf8');
}
const references = [];
function refId(ref) {
  let idx = references.findIndex(r => r.url === ref.url && r.label === ref.label);
  if (idx < 0) idx = references.push(ref) - 1;
  return idx;
}
const overrides=JSON.parse(fs.readFileSync(path.join(__dirname,'recipe-overrides.json'),'utf8'));
const recipes = source.recipes.map(original => {
  const override=overrides[original.id];
  const r=override?{...original,ingredients:override.ingredients,flags:override.flags,note:override.note,method:{...original.method,steps:override.steps,tip:override.tip}}:original;
  return ({ ...r, flavor:classifyRecipe(r), image: assets.files[r.image],
  creditId: path.basename(r.image), imageCredit: undefined,
  method: { steps:r.method.steps, tip:r.method.tip, sources:r.method.sources.map(refId) }
});});
write('data/recipes.js', '/* 从网页菜谱生成，请通过 tools/miniprogram 更新。 */\nmodule.exports = ' + JSON.stringify({recipes,references}) + ';\n');
const {funcs,regexes,recipes:ignored,...options} = source;
options.defaultSettings.theme='lazy-cat';
options.defaultSettings.followPetTheme=true;
options.defaultMascotId='lazy-yawn-cat';
options.mascotPresets = options.mascotPresets.map(({sources,...p})=>({...p,petTheme:themes.find(t=>t.petId===p.id).id,atlas:'/petmotion/assets/'+p.id+'.png',preview:'/petmotion/assets/'+p.id+'-preview.png'}));
write('data/options.js', 'module.exports = ' + JSON.stringify(options) + ';\n');
const constants = Object.entries(regexes).map(([name,pattern]) => `const ${name} = new RegExp(${JSON.stringify(pattern)});`).join('\n');
// Business rules remain identical to the website, with method text added to the exclusion check.
let logic = Object.values(funcs).join('\n\n');
logic = logic.replace('recipe.note || "",', 'recipe.note || "", ...((recipe.method && recipe.method.steps) || []),');
write('utils/engine.js', `/* 由网站已运行的纯规则生成。UI 与持久化由小程序实现。 */
const {recipes} = require('../data/recipes');
const options = require('../data/options');
const {flagLabels,avoidFlagLabels,ingredientAliasGroups,taxonomyTagGroups,tastePreferenceOptions} = options;
const lowIodineFlags = new Set(options.lowIodineFlags);
const pantryIngredientTerms = new Set(options.pantryIngredientTerms);
${constants}
module.exports = function createEngine(state) {
  function allRecipes() { return recipes.concat(state.customRecipes || []); }
${logic}
  return {allRecipes,${Object.keys(funcs).join(',')}};
};\n`);
write('data/themes.js', 'module.exports = '+JSON.stringify({themes,petThemes})+';\n');
const attribution = fs.readFileSync(path.join(root,'site/assets/dishes/ATTRIBUTION.md'),'utf8');
const credits = {};
for (const line of attribution.split('\n')) {
  const cells = line.split('|').map(v=>v.trim());
  const key = (cells[1] || '').match(/`([^`]+)`/);
  if (key && cells.length >= 7) credits[key[1]]={dish:cells[2],author:cells[3],source:cells[4],license:cells[5],note:cells.slice(6,-1).join(' | ')};
}
write('info/credits.js', 'module.exports = '+JSON.stringify(credits)+';\n');
write('info/图片授权说明.md', attribution);
write('字体授权说明.txt',fs.readFileSync(path.join(root,'site/assets/fonts/LEMI-LICENSE-NOTICE.txt'),'utf8'));
const font = fs.readFileSync(path.join(root,'site/assets/fonts/lemi-milk-bubble.woff2')).toString('base64');
write('font.wxss', `@font-face {font-family: 'Lemi';src: url('data:font/woff2;base64,${font}') format('woff2');font-weight:400;font-style:normal;}\n`);
// Images are rendered by components inside their own package. Cross-package
// component placeholders are the documented asynchronous dependency mechanism.
const usingComponents={}, componentPlaceholder={};
for(const pkg of assets.packages){
  const name=pkg.root;
  usingComponents[name]='/'+name+'/image';componentPlaceholder[name]='view';
  write(name+'/image.json',JSON.stringify({component:true}));
  write(name+'/image.js',"Component({properties:{path:String,mode:String,label:String},methods:{loaded(){this.triggerEvent('loaded',{path:this.data.path});},failed(){this.triggerEvent('failed',{path:this.data.path});}}});\n");
  write(name+'/image.wxml','<image class="photo" src="{{path}}" mode="{{mode}}" bindload="loaded" binderror="failed" aria-label="{{label}}" />');
  write(name+'/image.wxss',':host{display:block;width:100%;height:100%}.photo{display:block;width:100%;height:100%}');
}
write('components/asset-image/index.json',JSON.stringify({component:true,usingComponents,componentPlaceholder},null,2));
for(const pkg of assets.packages)write(pkg.root+'/ready.js','module.exports = {ready:true};\n');
write('components/asset-image/index.wxml','<view class="asset {{bare ? \'bare\' : \'\'}}" bindtap="retry" aria-label="{{label}}">\n'+assets.packages.map(p=>`  <${p.root} class="renderer" wx:if="{{resolved && packageName === '${p.root}'}}" path="{{resolved}}" mode="{{mode}}" label="{{label}}" bind:loaded="loaded" bind:failed="error" />`).join('\n')+'\n  <view wx:if="{{!bare && (loading || failed || !path)}}" class="placeholder">{{loading ? \'图片加载中\' : failed ? \'图片加载失败，点此重试\' : \'暂无可授权实拍图\'}}</view>\n</view>\n');
const defaultPet=options.mascotPresets.find(p=>p.id===options.defaultMascotId);
const defaultTokens=(options.defaultSettings.followPetTheme && petThemes[defaultPet.petTheme]) || themes.find(t=>t.id===options.defaultSettings.theme).tokens;
const app = {
  pages:['pages/kitchen/index','pages/recipe/index'],
  subPackages:[{root:'info',name:'info',pages:['index']},...assets.packages],
  window:{navigationBarTitleText:'不牛马厨房',navigationBarBackgroundColor:defaultTokens['--bg'],navigationBarTextStyle:'black',backgroundColor:defaultTokens['--bg']},
  style:'v2',lazyCodeLoading:'requiredComponents',sitemapLocation:'sitemap.json'
};
write('app.json',JSON.stringify(app,null,2)+'\n');
const fontResult=spawnSync(process.env.FREEBITE_PYTHON||'python',[path.join(__dirname,'font.py')],{encoding:'utf8'});
if(fontResult.status!==0)throw new Error('小程序字体生成失败，请安装 Python fonttools 与 brotli：'+(fontResult.stderr||fontResult.error||''));
process.stdout.write(fontResult.stdout);
console.log(JSON.stringify({recipes:recipes.length,referenceCount:references.length,credits:Object.keys(credits).length,
  themes:themes.length,subpackages:app.subPackages.length,recipeBytes:fs.statSync(path.join(out,'data/recipes.js')).size}));
