const test=require('node:test');
const assert=require('node:assert/strict');
const {recipes}=require('../../miniprogram/data/recipes');
const {FLAVORS,classifyRecipe,flavorView}=require('../../miniprogram/utils/recipe-flavor');
const {recipeView}=require('../../miniprogram/utils/ui');
const {createStore}=require('../../miniprogram/utils/store');
const byName=name=>{const recipe=recipes.find(r=>r.name===name);assert(recipe,name);return recipe;};

test('all 800 delivered recipes have a current flavor and retain their heat value',()=>{
  assert.equal(recipes.length,800);
  for(const recipe of recipes){
    assert(FLAVORS.includes(recipe.flavor),recipe.name);
    assert.equal(recipe.flavor,classifyRecipe(recipe),recipe.name);
    const view=recipeView(recipe);
    assert.equal(view.heat,recipe.heat);
    assert.equal(view.flavorText,recipe.flavor);
    assert(view.tags.includes(recipe.flavor));
    assert.equal(new Set(view.tags).size,view.tags.length);
  }
});
test('savory, sour, pepper, sweet and drink families get specific flavors',()=>{
  const cases={豆角肉末饭:'咸香',麻婆豆腐:'麻辣',泡椒牛肉:'酸辣',藤椒鸡:'椒麻',蒜蓉粉丝虾:'蒜香',蜜汁叉烧:'咸甜',锅包肉少糖版:'酸甜',清蒸鲈鱼:'清鲜',双皮奶:'奶香',红豆沙小丸子:'甜香',桂花酒酿小圆子:'甜香',柠檬薄荷气泡水:'酸甜',无糖豆浆:'豆香',菌汤火锅:'鲜香',干锅茶树菇:'香辣',苹果肉桂司康:'果香',咸香洋葱面包:'咸香',山楂洛神花茶:'酸甜',蜜桃乌龙无糖版:'果香',蒜香法棍:'蒜香',特辣麻辣香锅:'爆辣'};
  for(const [name,flavor]of Object.entries(cases))assert.equal(byName(name).flavor,flavor,name);
});
test('flavor and heat are independent, and high heat does not imply numbing pepper',()=>{
  assert.deepEqual(flavorView(byName('蒜蓉粉丝虾')).flavorTags,['蒜香','微辣']);
  assert.deepEqual(flavorView(byName('豆角肉末饭')).flavorTags,['咸香','微辣']);
  assert(!recipeView(byName('香辣牛肉末豆角')).tags.includes('麻辣'));
  assert.equal(classifyRecipe({name:'辣炒青菜',heat:3,ingredients:['干辣椒']}),'香辣');
});
test('optional seasoning in a generic method does not change a nonspicy dish',()=>{
  assert.equal(classifyRecipe({name:'黄瓜鸡丝拌菜',heat:0,ingredients:['黄瓜','鸡胸肉'],method:{steps:['辣椒油、花椒油按辣度逐步加入。']}}),'清鲜');
  assert.equal(classifyRecipe({name:'自家小炒',heat:0,ingredients:[],method:{steps:['调成酸甜味。']}}),'酸甜');
});
test('new custom dishes save a flavor and old custom dishes get a display fallback',()=>{
  const store=createStore({getStorageSync:()=>null,setStorageSync(){}});
  const recipe=store.addCustom({name:'测试蒜香鸡丁',ingredients:'鸡肉,蒜蓉',steps:'炒熟鸡丁，加入蒜蓉炒香。',time:20,kcal:300,heat:1});
  assert.equal(recipe.flavor,'蒜香');assert.equal(recipeView(recipe).flavorText,'蒜香');
  delete recipe.flavor;assert.equal(recipeView(recipe).flavorText,'蒜香');
});
