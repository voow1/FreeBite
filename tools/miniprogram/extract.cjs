/* 将现有网页中的菜谱和纯业务规则导出，避免两套菜谱人工维护。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'site/bu-niu-ma-kitchen.html'), 'utf8');
const script = html.slice(html.indexOf('    const storageKeys ='), html.indexOf('    let wheelSequenceTimers'));
const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'site/assets/recipe-methods.js'), 'utf8'), sandbox);
const names = ['recipeSearchText', 'recipePreferenceText', 'avoidTerms', 'hasAvoidSettings', 'avoidReasons',
  'splitIngredientInput', 'normalizeIngredientText', 'sameIngredientFamily', 'ingredientsMatch',
  'isPantryIngredient', 'recipeCoreIngredients', 'uniqueIngredientNames', 'matchFridgeRecipe',
  'recipePoolResult', 'filteredRecipes', 'lowIodineRiskReasons', 'targetMenuCount',
  'recipeMenuProfile', 'balancedWheelPool', 'menuRoleMatches', 'buildPickedMenu', 'inferRecipeTaxonomy',
  'withAutoHealthFlags', 'canonicalRecipeName'];
vm.runInContext(script + `\nthis.exported = {recipes: allRecipes(), defaultSettings, mascotPresets, tastePreferenceOptions,
  menuCategoryOptions, menuCategoryGroups, preferenceFilterGroups, avoidFlagOptions, flagOptions,
  ingredientAliasGroups, taxonomyTagGroups, flagLabels, avoidFlagLabels,
  funcs: {${names.map(n => `${n}: ${n}.toString()`).join(',')}},
  regexes: {preservedOrProcessedPattern:preservedOrProcessedPattern.source,lowIodineTextPattern:lowIodineTextPattern.source,
  recoveryAvoidPattern:recoveryAvoidPattern.source,pantryIngredientPattern:pantryIngredientPattern.source},
  lowIodineFlags:[...lowIodineFlags],pantryIngredientTerms:[...pantryIngredientTerms]};`, sandbox);
const data = JSON.parse(JSON.stringify(sandbox.exported));
const work = path.join(root, 'tools/miniprogram/.generated');
fs.mkdirSync(work, { recursive: true });
fs.writeFileSync(path.join(work, 'source.json'), JSON.stringify(data), 'utf8');
console.log(JSON.stringify({recipes:data.recipes.length,fullBytes:Buffer.byteLength(JSON.stringify(data.recipes)),
  catalogBytes:Buffer.byteLength(JSON.stringify(data.recipes.map(({method,...r})=>r))),
  methodsBytes:Buffer.byteLength(JSON.stringify(Object.fromEntries(data.recipes.map(r=>[r.id,r.method])))),
  uniqueImages:new Set(data.recipes.map(r=>r.image)).size}));
