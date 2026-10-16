// Flavor is separate from heat: a high heat score alone does not mean Sichuan pepper.
const FLAVORS=['咸香','鲜香','清鲜','酸鲜','酸甜','酸辣','麻辣','香辣','微辣','爆辣','椒麻','椒香','蒜香','葱香','酱香','咸甜','孜然','咖喱','甜香','清甜','奶香','椰香','果香','清香','豆香','麦香','醇香'];
const HEAT=['不辣','微辣','中辣','较辣','爆辣'];
const LEGACY_FLAVORS=['清淡','咸鲜','酸辣','麻辣','咖喱','番茄味'];
function classifyRecipe(recipe){
  const name=recipe.name||'',heat=Number(recipe.heat)||0;
  const ingredients=(recipe.ingredients||[]).join('、');
  // Recipe names specify the intended style more reliably than generated tags
  // or optional seasoning suggestions in generic method templates.
  if(heat>=4)return '爆辣';
  if(/糖醋|锅包肉|鱼香|宫保/.test(name))return '酸甜';
  if(/藤椒|青花椒|椒麻/.test(name))return '椒麻';
  if(/酸辣|酸汤|泡椒|泡姜|泡菜|辣白菜|酸菜|酸豆角|酸笋|糟辣|冬阴功|浆水|臊子面/.test(name))return heat>0?'酸辣':'酸鲜';
  if(/麻辣|麻婆|毛血旺|水煮(?:肉|牛肉|鱼)|口水鸡|辣子鸡|冒菜|串串|钵钵鸡|冷吃兔|担担面|重庆小面/.test(name)&&heat>0)return '麻辣';
  if(/咖喱|叻沙/.test(name))return '咖喱';
  if(/孜然/.test(name))return '孜然';
  if(/蒜香|蒜蓉|蒜泥/.test(name))return '蒜香';
  if(/黑椒|黑胡椒|椒盐|胡辣汤/.test(name))return '椒香';
  if(/葱香|香葱|葱油|葱爆|葱烧|姜葱/.test(name))return '葱香';
  if(/照烧|寿喜烧|鳗鱼饭|蜜汁|叉烧/.test(name))return '咸甜';
  if(/豆豉|豉汁|豉油|豆瓣|酱香|杂酱|炸酱|鸡蛋酱|酱骨|卤肉|卤牛肉|红烧|梅干菜|干菜焖肉/.test(name))return '酱香';
  if(/柠檬虾|柠檬鸡|柠檬.*牛肉|青木瓜沙拉|舂鸡脚|韩式冷面|荞麦冷面|泰式炒河粉/.test(name))return heat>0?'酸辣':'酸甜';
  if(/香辣|辣炒|辣拌|辣椒|剁椒|干锅|干煸|红油|烧椒|双椒|湘味|火爆|燃面|肠旺面|口味虾/.test(name)&&heat>0)return '香辣';

  // Check actual dish names, not the old 饮品/烘焙 tags (e.g. 茶树菇 is a mushroom).
  const sweet=/蛋糕|戚风|巴斯克|玛芬|马芬|司康|曲奇|布朗尼|能量棒|燕麦饼|布丁|奶冻|酸奶冻|慕斯|提拉米苏|冰盒|豆乳盒子|双皮奶|姜撞奶|西米露|烧仙草|芋圆|红豆沙|绿豆沙|银耳|酒酿|糯米藕|芋泥杯|可可杯|水果杯|坚果碗|燕麦香蕉杯|苹果肉桂烤燕麦|黑芝麻糊|花生汤|南瓜露/.test(name);
  const drink=/气泡水|苏打水|奶昔|拿铁|豆浆|燕麦奶|茶|乌龙|普洱|冷泡|(?:芹菜|胡萝卜|苹果)汁|青柠水|薄荷水|薏米水|梨水|陈皮水|绿豆水|绿豆汤|酸梅汤|热饮|紫薯牛奶|抹茶牛奶/.test(name)&&!/豆浆油条|茶树菇|贝果|蛋糕|面包/.test(name);
  const savoryBake=/咸|奶盐|葱|蒜|肉|鸡|蘑菇|菠菜|番茄|迷迭香|橄榄油|黑胡椒/.test(name.replace(/肉桂/g,''));
  if(sweet&&!savoryBake||drink){
    if(/椰/.test(name))return '椰香';
    if(/可可|咖啡|拿铁|黑芝麻/.test(name))return '醇香';
    if(/豆乳|豆浆|绿豆水|薏米水/.test(name))return '豆香';
    if(/奶|芝士|提拉米苏|巴斯克/.test(name))return '奶香';
    if(/柠檬|青柠|西柚|百香果|猕猴桃|酸梅|山楂|洛神/.test(name))return '酸甜';
    if(/苹果|草莓|蓝莓|芒果|蜜桃|橙子|火龙果|柚子/.test(name))return '果香';
    if(/茶|冷泡|薄荷|芹菜|胡萝卜汁/.test(name))return '清香';
    if(/无糖|雪梨|梨水|陈皮水|南瓜|银耳|绿豆汤/.test(name))return '清甜';
    return '甜香';
  }
  if(/椰香|椰浆/.test(name))return '椰香';
  if(/奶油|白酱|芝士/.test(name)&&heat===0)return '奶香';
  if(/番茄|罗宋汤/.test(name))return '酸鲜';
  if(/清蒸|广式蒸鱼|白灼|白切|清炒|清炖|清汤|清爽|清煎|盐水鸭/.test(name))return '清鲜';
  if(/菌汤|味噌汤|豚汁|羊肉萝卜汤|牛肉汤面|越南牛肉粉/.test(name))return '鲜香';
  if(heat>0){
    if(/花椒|麻椒|藤椒/.test(ingredients))return '麻辣';
    return heat===1?(/青椒|尖椒|手撕|凉拌|辣/.test(name)?'微辣':'咸香'):'香辣';
  }
  if(/汤|粥|羹|滑蛋|蒸蛋|水蛋|肠粉|虾仁|海鲜|瑶柱|蟹粉|鱼丸|云吞|馄饨/.test(name))return '鲜香';
  if(/凉拌|沙拉|拌菜|生菜卷|黄瓜卷|藜麦碗|蛋白碗/.test(name))return '清鲜';
  if(/芝麻/.test(name))return '醇香';
  if(/贝果|吐司|欧包|软欧|餐包|馒头|白吉馍|苏打饼/.test(name)&&!savoryBake)return /南瓜|玉米|紫薯/.test(name)?'清甜':'麦香';
  if(/蒜蓉|蒜泥/.test(ingredients))return '蒜香';
  if(/孜然/.test(ingredients))return '孜然';
  if(/咖喱/.test(ingredients))return '咖喱';
  const method=[...((recipe.method&&recipe.method.steps)||[]),recipe.method&&recipe.method.tip||''].join('；');
  const explicit=method.match(/(?:口味偏|调成|突出|以)(酸甜|蒜香|酱香|咸香|鲜香|奶香|甜香)(?:味|口味|为主)/);
  if(explicit)return explicit[1];
  return '咸香';
}
function flavorView(recipe){
  const flavor=FLAVORS.includes(recipe.flavor)?recipe.flavor:classifyRecipe(recipe);
  const heat=HEAT[Number(recipe.heat)]||HEAT[0];
  return {flavor,flavorTags:[...new Set([flavor,...(Number(recipe.heat)>0?[heat]:[])])]};
}
module.exports={FLAVORS,LEGACY_FLAVORS,classifyRecipe,flavorView};
