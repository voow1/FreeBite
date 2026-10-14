/* 由网站已运行的纯规则生成。UI 与持久化由小程序实现。 */
const {recipes} = require('../data/recipes');
const options = require('../data/options');
const {flagLabels,avoidFlagLabels,ingredientAliasGroups,taxonomyTagGroups,tastePreferenceOptions} = options;
const lowIodineFlags = new Set(options.lowIodineFlags);
const pantryIngredientTerms = new Set(options.pantryIngredientTerms);
const preservedOrProcessedPattern = new RegExp("泡菜|泡椒|泡姜|酸菜|榨菜|雪菜|酸豆角|咸菜|腌|腊肉|香肠|午餐肉|火腿|培根|牛肉丸|鱼丸|火锅底料|香锅料|酸汤酱|剁椒|豆瓣酱|豆豉|酱油|生抽|老抽|蚝油|椒盐|蒸肉米粉");
const lowIodineTextPattern = new RegExp("海带|紫菜|海藻|海鲜|虾|花甲|鱿鱼|小龙虾|鱼片|鱼头|鲫鱼|鲜鱼|鱼类|贝类|奶|牛奶|奶油|黄油|芝士|奶酪|酸奶|豆腐|豆皮|豆制品|豆腐丝|千页豆腐|豆干|豆浆|鸡蛋|蛋黄|全蛋|滑蛋|炒蛋|蛋花|碘盐|加碘盐|海盐");
const recoveryAvoidPattern = new RegExp("泡菜|泡椒|酸菜|榨菜|雪菜|酸豆角|腊肉|午餐肉|火锅底料|香锅料|剁椒|豆瓣酱|豆豉|红油|辣椒油|干辣椒|小米辣|花椒|麻辣|香辣|火爆|干锅|毛血旺|肥肠");
const pantryIngredientPattern = new RegExp("生抽|老抽|酱油|香醋|白醋|料酒|淀粉|姜片|姜丝|姜末|姜蒜|泡姜|葱花|葱段|香葱|葱姜|蒜片|蒜末|蒜蓉|蒜泥|蒜水|胡椒|花椒|八角|孜然|干辣椒|小米辣|泡椒|剁椒|辣椒油|花椒油|红油|油$|少量油|食用油|芝麻|豆瓣|火锅底料|香锅料|酸汤酱|椒盐|酵母|泡打粉|水或茶底|基础调味|白芝麻");
module.exports = function createEngine(state) {
  function allRecipes() { return recipes.concat(state.customRecipes || []); }
function recipeSearchText(recipe) {
      return `${recipe.name} ${recipe.tags.join(" ")} ${recipe.ingredients.join(" ")} ${(recipe.flags || []).join(" ")}`;
    }

function recipePreferenceText(recipe) {
      return [
        recipe.name,
        recipe.note || "", ...((recipe.method && recipe.method.steps) || []),
        ...(recipe.tags || []),
        ...(recipe.ingredients || []),
        ...(recipe.flags || []).map((flag) => flagLabels[flag] || flag)
      ].join(" ").toLowerCase();
    }

function avoidTerms() {
      return String(state.settings.avoidTerms || "")
        .split(/[\n,，、;；]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 24);
    }

function hasAvoidSettings() {
      return Boolean((state.settings.avoidFlags || []).length || avoidTerms().length);
    }

function avoidReasons(recipe) {
      if (!hasAvoidSettings()) return [];
      const reasons = [];
      const recipeFlags = new Set(recipe.flags || []);
      (state.settings.avoidFlags || []).forEach((flag) => {
        if (recipeFlags.has(flag)) reasons.push(avoidFlagLabels[flag] || flagLabels[flag] || flag);
      });
      const text = recipePreferenceText(recipe);
      avoidTerms().forEach((term) => {
        if (text.includes(term.toLowerCase())) reasons.push(term);
      });
      return [...new Set(reasons)];
    }

function splitIngredientInput(value) {
      return String(value || "")
        .split(/[\n,，、;；]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 60);
    }

function normalizeIngredientText(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[()\[\]（）【】《》\s·・,，、;；/\\-]/g, "");
    }

function sameIngredientFamily(first, second) {
      const a = normalizeIngredientText(first);
      const b = normalizeIngredientText(second);
      if (!a || !b) return false;
      return ingredientAliasGroups.some((group) => {
        const aliases = group.map(normalizeIngredientText);
        const aHit = aliases.some((alias) => alias && (a.includes(alias) || (a.length >= 2 && alias.includes(a))));
        const bHit = aliases.some((alias) => alias && (b.includes(alias) || (b.length >= 2 && alias.includes(b))));
        return aHit && bHit;
      });
    }

function ingredientsMatch(fridgeItem, recipeIngredient) {
      const a = normalizeIngredientText(fridgeItem);
      const b = normalizeIngredientText(recipeIngredient);
      if (!a || !b) return false;
      if ((a.length >= 2 && b.includes(a)) || (b.length >= 2 && a.includes(b))) return true;
      return sameIngredientFamily(a, b);
    }

function isPantryIngredient(ingredient) {
      const text = normalizeIngredientText(ingredient);
      return pantryIngredientTerms.has(text) || pantryIngredientPattern.test(ingredient);
    }

function recipeCoreIngredients(recipe) {
      const ingredients = recipe.ingredients || [];
      const core = ingredients.filter((ingredient) => !isPantryIngredient(ingredient));
      return core.length ? core : ingredients;
    }

function uniqueIngredientNames(items) {
      const seen = new Set();
      return items.filter((item) => {
        const key = normalizeIngredientText(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

function matchFridgeRecipe(recipe, fridgeItems) {
      const coreIngredients = uniqueIngredientNames(recipeCoreIngredients(recipe));
      const matched = [];
      const missing = [];
      coreIngredients.forEach((ingredient) => {
        const hit = fridgeItems.some((item) => ingredientsMatch(item, ingredient));
        if (hit) matched.push(ingredient);
        else missing.push(ingredient);
      });
      const score = matched.length / Math.max(coreIngredients.length, 1);
      return { recipe, matched, missing, score };
    }

function recipePoolResult() {
      const recentIds = new Set(state.history.slice(0, 3).map((item) => item.id));
      const safeRecipes = allRecipes().filter((recipe) => {
        if (state.settings.recoveryMode) {
          const recoveryFriendly = recipe.heat <= 1
            && !recipe.flags.includes("spicy")
            && !recoveryAvoidPattern.test(recipeSearchText(recipe))
            && (recipe.tags.includes("少油可做") || recipe.tags.includes("汤菜") || recipe.tags.includes("清淡"));
          if (!recoveryFriendly) return false;
        }
        if (state.settings.lowIodinePlan && lowIodineRiskReasons(recipe).length) return false;
        if (avoidReasons(recipe).length) return false;
        return true;
      });
      const tasteMatched = state.settings.tastes.length
        ? safeRecipes.filter((recipe) => state.settings.tastes.some((taste) => recipe.tags.includes(taste)))
        : safeRecipes;
      const secondaryMatched = tasteMatched.filter((recipe) => {
        if (state.settings.heat !== "all" && Number(recipe.heat) !== Number(state.settings.heat)) return false;
        if (state.settings.tags.length && !state.settings.tags.every((tag) => recipe.tags.includes(tag))) return false;
        return true;
      });
      const relaxedSecondary = state.settings.tastes.length > 0
        && (state.settings.heat !== "all" || state.settings.tags.length > 0);
      const candidates = state.settings.tastes.length ? tasteMatched : secondaryMatched;
      const notRecent = candidates.filter((recipe) => !recentIds.has(recipe.id));
      return {
        recipes: notRecent.length ? notRecent : candidates,
        relaxedSecondary
      };
    }

function filteredRecipes() {
      return recipePoolResult().recipes;
    }

function lowIodineRiskReasons(recipe) {
      const reasons = [];
      const text = recipeSearchText(recipe);
      if (recipe.flags.some((flag) => lowIodineFlags.has(flag))) reasons.push("提醒标签");
      if (lowIodineTextPattern.test(text)) reasons.push("高碘食材");
      if (preservedOrProcessedPattern.test(text)) reasons.push("盐源不明");
      return reasons;
    }

function targetMenuCount(pool) {
      const count = Number(state.settings.servingCount || 1);
      return Math.min(Math.max(1, count), pool.length || 1);
    }

function recipeMenuProfile(recipe) {
      const tags = new Set(recipe.tags || []);
      const text = `${recipe.name} ${(recipe.ingredients || []).join(" ")}`;
      const animalProtein = ["鸡肉", "猪肉", "牛肉", "羊肉", "鸭鹅", "鱼类", "海鲜"].some((tag) => tags.has(tag));
      const plantOrEggProtein = /蛋|豆腐|豆干|豆皮|腐竹/.test(text);
      const drink = tags.has("饮品");
      const soup = tags.has("汤菜") || /汤|羹/.test(recipe.name);
      const staple = tags.has("主食") || tags.has("面食") || tags.has("饭类") || /饭|面|粉|粥|饺|包|馒头|饼$/.test(recipe.name);
      const richTechnique = tags.has("火锅干锅") || tags.has("烧烤") || /干锅|火锅|香锅|油炸|炸|红烧|扣肉|烤全|烤羊排|猪蹄|肥肠|毛血旺|水煮/.test(recipe.name);
      const vegetable = !drink && !soup && !staple && !animalProtein && !richTechnique
        && (tags.has("素菜") || tags.has("凉菜") || tags.has("清淡") || tags.has("少油可做"));
      const main = !drink && !soup && !staple && !vegetable
        && (animalProtein || tags.has("高蛋白") || richTechnique);
      const light = !drink && !main && (vegetable || soup || staple || plantOrEggProtein || tags.has("清淡") || tags.has("减肥") || tags.has("少油可做"));
      const protein = tags.has("牛肉") ? "牛" : tags.has("羊肉") ? "羊" : tags.has("猪肉") ? "猪" : tags.has("鸡肉") ? "鸡" : tags.has("鸭鹅") ? "禽" : tags.has("鱼类") ? "鱼" : tags.has("海鲜") ? "海鲜" : plantOrEggProtein ? "蛋豆" : "";
      const richness = (richTechnique ? 2 : 0) + (Number(recipe.kcal || 0) >= 480 ? 1 : 0) + (Number(recipe.heat || 0) >= 4 ? 1 : 0);
      const method = ["汤炖", "蒸煮", "凉拌", "煎制", "炸制", "烤制", "炒制", "火锅干锅", "烘焙"].find((tag) => tags.has(tag)) || "其他";
      const flavorTags = [...tags].filter((tag) => ["川味", "湘味", "粤式", "江浙", "东北", "西北", "云南贵州", "日韩", "东南亚", "西式"].includes(tag));
      const tasteTags = [...tags].filter((tag) => tastePreferenceOptions.includes(tag));
      return { drink, soup, staple, vegetable, main, light, protein, richness, method, flavorTags, tasteTags };
    }

function balancedWheelPool(pool, count = targetMenuCount(pool)) {
      if (count <= 1) return pool;
      const mealRecipes = pool.filter((recipe) => !recipeMenuProfile(recipe).drink);
      return mealRecipes.length ? mealRecipes : pool;
    }

function menuRoleMatches(recipe, role) {
      const profile = recipeMenuProfile(recipe);
      if (role === "main") return profile.main;
      if (role === "vegetable") return profile.vegetable;
      if (role === "soup") return profile.soup;
      if (role === "staple") return profile.staple;
      if (role === "soupOrStaple") return profile.soup || profile.staple;
      if (role === "light") return profile.light && !profile.main;
      return profile.light;
    }

function buildPickedMenu(pool, anchor, count) {
      if (count <= 1) return [anchor];
      const candidates = balancedWheelPool(pool, count).filter((recipe) => recipe.id !== anchor.id);
      const menu = [anchor];
      const mainLimit = count >= 4 ? 2 : 1;
      const rolePlans = {
        2: ["main", "vegetable", "soupOrStaple"],
        3: ["main", "vegetable", "soup", "light"],
        4: ["main", "vegetable", "soup", "staple", "light"]
      };
      const plan = rolePlans[Math.min(count, 4)] || rolePlans[4];
      const selectedIds = new Set(menu.map((recipe) => recipe.id));
      const roleAlreadyFilled = (role) => menu.some((recipe) => menuRoleMatches(recipe, role));
      const canAdd = (recipe) => {
        if (selectedIds.has(recipe.id)) return false;
        const profile = recipeMenuProfile(recipe);
        if (profile.drink) return false;
        if (profile.main && menu.filter((item) => recipeMenuProfile(item).main).length >= mainLimit) return false;
        return true;
      };
      const candidateScore = (recipe, role) => {
        const profile = recipeMenuProfile(recipe);
        const profiles = menu.map(recipeMenuProfile);
        let score = menuRoleMatches(recipe, role) ? 40 : 0;
        if (role === "vegetable" && profile.vegetable) score += 25;
        if (role === "soup" && profile.soup) score += 22;
        if (profile.light) score += 8;
        const nextAverageRichness = (profiles.reduce((sum, item) => sum + item.richness, 0) + profile.richness) / (profiles.length + 1);
        score -= Math.max(0, nextAverageRichness - 1.25) * 12;
        if (profile.protein && profiles.some((item) => item.protein === profile.protein)) score -= 18;
        if (profile.method !== "其他" && profiles.some((item) => item.method === profile.method)) score -= 9;
        if (profile.flavorTags.some((tag) => profiles.some((item) => item.flavorTags.includes(tag)))) score -= 5;
        if (state.settings.tastes.length > 1) {
          const representedTastes = new Set(profiles.flatMap((item) => item.tasteTags));
          if (profile.tasteTags.some((tag) => state.settings.tastes.includes(tag) && !representedTastes.has(tag))) score += 7;
        }
        const averageHeat = menu.reduce((sum, item) => sum + Number(item.heat || 0), 0) / Math.max(1, menu.length);
        score -= Math.max(0, (averageHeat + Number(recipe.heat || 0)) / 2 - 2) * 4;
        score -= Math.max(0, Number(recipe.kcal || 0) - 450) / 25;
        return score + Math.random() * 6;
      };
      const takeBest = (matches, role = "light") => {
        if (!matches.length) return false;
        const recipe = [...matches].sort((a, b) => candidateScore(b, role) - candidateScore(a, role))[0];
        menu.push(recipe);
        selectedIds.add(recipe.id);
        return true;
      };

      plan.forEach((role) => {
        if (menu.length >= count || roleAlreadyFilled(role)) return;
        takeBest(candidates.filter((recipe) => canAdd(recipe) && menuRoleMatches(recipe, role)), role);
      });
      while (menu.length < count) {
        const balancedFallback = candidates.filter((recipe) => canAdd(recipe));
        if (takeBest(balancedFallback, "light")) continue;
        // 筛选过窄时保持组合质量，不用明显同质的菜强行凑数。
        break;
      }
      return menu.slice(0, count);
    }

function inferRecipeTaxonomy({ name = "", kcal = 0, time = 0, heat = 0, tags = [], ingredients = [] }) {
      const nextTags = new Set(tags || []);
      const text = `${name} ${(ingredients || []).join(" ")}`;
      const staple = nextTags.has("主食") || nextTags.has("面食") || nextTags.has("饭类") || /饭|面|粉|米线|河粉|粥|饺|包|馒头|饼$|泡馍/.test(name);
      const soup = nextTags.has("汤菜") || /汤|羹|煲|炖|粥/.test(name);
      const drink = nextTags.has("饮品") || /茶|气泡水|苏打水|果汁|奶昔|咖啡|拿铁|豆浆|饮$/.test(name);
      const dessert = nextTags.has("甜品") || /蛋糕|布丁|奶冻|西米露|烧仙草|芋圆|慕斯|提拉米苏|甜品/.test(name);
      const cold = nextTags.has("凉菜") || /凉拌|凉面|沙拉|冷盘|口水鸡|红油耳片/.test(name);
      const animalProtein = /鸡(?!蛋)|鸭|鹅|猪|牛(?!奶)|羊|兔|肉丝|肉末|肉片|肉丸|排骨|肥肠|腰花|猪肝|鱼|虾|蟹|花甲|鱿鱼|生蚝|扇贝|田螺/.test(text);

      if (drink) nextTags.add("饮品");
      else if (dessert) nextTags.add("甜品");
      else if (staple) nextTags.add("主食");
      else if (soup) nextTags.add("汤菜");
      else if (cold) nextTags.add("凉菜");
      else if (animalProtein || nextTags.has("高蛋白")) nextTags.add("主菜");
      else nextTags.add("蔬菜");

      if (/鸡胸|鸡腿|鸡翅|鸡肉|鸡丁|鸡丝|鸡片|鸡块|土鸡|仔鸡|凤爪|鸡爪|鸡胗|鸡杂|鸡架|鸡皮|鸡汤/.test(text)) nextTags.add("鸡肉");
      if (/猪|五花肉|里脊|排骨|肉丝|肉末|肉片|肉丸|肥肠|腰花|猪肝|猪耳|火腿|培根/.test(text)) nextTags.add("猪肉");
      if (/牛肉|牛腩|肥牛|牛柳|黄牛/.test(text)) nextTags.add("牛肉");
      if (/羊|羊排|羊蝎子/.test(text)) nextTags.add("羊肉");
      if (/鸭|鹅/.test(text)) nextTags.add("鸭鹅");
      if (/鱼|鲈鱼|鲫鱼|鳕鱼|龙利鱼/.test(text)) nextTags.add("鱼类");
      if (/虾|蟹|花甲|鱿鱼|生蚝|扇贝|田螺|海鲜/.test(text)) nextTags.add("海鲜");
      if (/鸡蛋|蛋液|蒸蛋|滑蛋|炒蛋|蛋花/.test(text)) nextTags.add("蛋类");
      if (/豆腐|豆皮|豆干|香干|腐竹|豆浆|豆制品/.test(text)) nextTags.add("豆制品");

      if (nextTags.has("火锅干锅") || /火锅|干锅|香锅|麻辣烫|冒菜|串串/.test(name)) nextTags.add("火锅干锅");
      else if (nextTags.has("烘焙") || /蛋糕|马芬|司康|吐司|欧包|贝果|面包|曲奇|饼干/.test(name)) nextTags.add("烘焙");
      else if (/蒸|白灼|水煮/.test(name)) nextTags.add("蒸煮");
      else if (soup) nextTags.add("汤炖");
      else if (cold || /拌/.test(name)) nextTags.add("凉拌");
      else if (/炸|酥肉/.test(name)) nextTags.add("炸制");
      else if (/烤|串|焗/.test(name)) nextTags.add("烤制");
      else if (/煎|锅贴/.test(name)) nextTags.add("煎制");
      else if (/炒|爆|熘|滑|烧|焖/.test(name)) nextTags.add("炒制");

      if (Number(time) <= 15) nextTags.add("15分钟内");
      if (Number(time) <= 30) nextTags.add("30分钟内");
      if (Number(time) >= 50) nextTags.add("慢炖");
      if (Number(kcal) < 300) nextTags.add("低卡");
      else if (Number(kcal) < 500) nextTags.add("适中热量");
      else nextTags.add("高热量");

      if (/酸辣|泡椒|酸汤/.test(name)) nextTags.add("酸辣");
      if (Number(heat) >= 3 || /麻辣|香辣|爆辣|辣子鸡|毛血旺/.test(name)) nextTags.add("麻辣");
      if (/咖喱/.test(name)) nextTags.add("咖喱");
      if (/番茄|茄汁|罗宋/.test(name)) nextTags.add("番茄味");
      if (!nextTags.has("酸辣") && !nextTags.has("麻辣") && !nextTags.has("咖喱") && !nextTags.has("番茄味")) nextTags.add(Number(heat) === 0 ? "清淡" : "咸鲜");
      return [...nextTags];
    }

function withAutoHealthFlags(recipe) {
      const flags = new Set(recipe.flags || []);
      const text = recipeSearchText(recipe);
      if (preservedOrProcessedPattern.test(text)) flags.add("preserved");
      if (/豆腐|豆皮|豆制品|豆腐丝|千页豆腐|豆干|豆浆/.test(text)) flags.add("soy");
      if (/虾|花甲|鱿鱼|小龙虾|海鲜|贝类/.test(text)) flags.add("seafood");
      if (/海带|紫菜|海藻/.test(text)) flags.add("seaweed");
      if (/鱼片|鱼头|鲫鱼|鲜鱼/.test(text)) flags.add("fish");
      if (/鸡蛋|蛋黄|全蛋|滑蛋|炒蛋|蛋花/.test(text)) flags.add("egg");
      if (Number(recipe.heat) >= 2 || /辣椒|小米辣|红油|辣椒油|花椒|麻辣|香辣|泡椒/.test(text)) flags.add("spicy");
      return { ...recipe, flags: [...flags] };
    }

function canonicalRecipeName(name) {
      return String(name || "")
        .trim()
        .replace(/(?:家常版|家庭版|轻量版|少甜版|少糖版|低糖版|无糖版|简版|早餐版|夜宵版|升级版|湘味版|特辣版|素菜版)$/g, "")
        .replace(/[·\s_-]+/g, "")
        .toLowerCase();
    }
  return {allRecipes,recipeSearchText,recipePreferenceText,avoidTerms,hasAvoidSettings,avoidReasons,splitIngredientInput,normalizeIngredientText,sameIngredientFamily,ingredientsMatch,isPantryIngredient,recipeCoreIngredients,uniqueIngredientNames,matchFridgeRecipe,recipePoolResult,filteredRecipes,lowIodineRiskReasons,targetMenuCount,recipeMenuProfile,balancedWheelPool,menuRoleMatches,buildPickedMenu,inferRecipeTaxonomy,withAutoHealthFlags,canonicalRecipeName};
};
