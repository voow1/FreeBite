const options = require('../../data/options');
const {themes} = require('../../data/themes');
const ui = require('../../utils/ui');
const actions = require('../../utils/recipe-actions');
Page({
  data:{tab:'home',standalone:false,wheelOpen:false,filtersOpen:false,addOpen:false,spinning:false,angle:0,spinDuration:0,
    wheelItems:[],selected:null,selectedMenu:[],servings:[1,2,3,4],library:[],libraryTotal:0,libraryTag:'all',search:'',
    shoppingInput:'',fridgeMatches:[],toast:'',settings:{},pets:[],pet:{sources:{}},filterGroups:[],avoidOptions:[],
    tastes:[],history:[],shopping:[],customRecipes:[],heatOptions:[{value:'all',label:'不限'},{value:'0',label:'不辣'},{value:'1',label:'微辣'},{value:'2',label:'中辣'},{value:'3',label:'较辣'},{value:'4',label:'爆辣'}]},
  onLoad(query){
    this.store=getApp().getStore(); this.limit=24;
    if(query.id && this.store.find(query.id)) this.store.state.selectedIds=[query.id];
    this.setData({wheelOpen:!this.store.state.selectedIds.length,categories:options.menuCategoryOptions});
    this.refresh();
  },
  onReady(){this.drawWheel();},
  onShow(){if(this.store)this.refresh();},
  onHide(){this.cancelSpin();},
  onUnload(){this.cancelSpin();clearTimeout(this.toastTimer);},
  onReachBottom(){if(this.data.tab==='library'){this.limit+=24;this.refreshLibrary();}},
  refresh(){
    const {state,engine}=this.store;
    const look=ui.appearance(state); this.palette=look.tokens;
    const selectedMenu=state.selectedIds.map(id=>ui.recipeView(this.store.find(id))).filter(Boolean);
    const current=selectedMenu.find(r=>r.id===this.data.activeId)||selectedMenu[0]||null;
    const group=options.preferenceFilterGroups.map(g=>({label:g.label,tags:g.tags.map(name=>({name,active:state.settings.tags.includes(name)}))}));
    this.setData({themeStyle:look.themeStyle,themeId:look.theme.id,themeName:look.theme.name,themeDescription:look.theme.description,themeAssets:look.theme.assets,accent:look.tokens['--accent'],settings:state.settings,pet:look.pet,petImage:look.pet.sources[this.data.spinning?'runRight':'idle'],
      selectedMenu,selected:current,activeId:current?current.id:'',activeScrollId:current?'picked-'+current.id:'',
      shopping:state.shopping,shoppingRemaining:state.shopping.filter(i=>!i.done).length,history:state.history,customRecipes:state.customRecipes,
      total:engine.allRecipes().length,poolCount:engine.filteredRecipes().length,
      tastes:options.tastePreferenceOptions.map(name=>({name,active:state.settings.tastes.includes(name)})),filterGroups:group,
      avoidOptions:options.avoidFlagOptions.map(f=>({...f,active:state.settings.avoidFlags.includes(f.value)})),
      pets:options.mascotPresets.map(p=>{const t=themes.find(t=>t.petId===p.id);return {...p,active:p.id===state.mascotId,themeName:t.name,description:t.description,swatches:t.swatches,cardStyle:'--pet-bg:'+t.tokens['--bg']+';--pet-accent:'+t.tokens['--accent']+';--pet-line:'+t.tokens['--line'],icon:t.assets.home};})
    });
    ui.applyNavigation(look.tokens);
    this.refreshLibrary(); this.refreshFridge();
    if(!this.data.spinning)this.refreshWheel();
  },
  notify(text){clearTimeout(this.toastTimer);this.setData({toast:text});this.toastTimer=setTimeout(()=>this.setData({toast:''}),2400);},
  switchTab(e){this.setData({tab:e.currentTarget.dataset.tab});wx.pageScrollTo({scrollTop:0,duration:0});},
  setServing(e){if(this.data.spinning)return;this.store.state.settings.servingCount=Number(e.currentTarget.dataset.count);this.store.save();this.refresh();},
  toggleTaste(e){
    if(this.data.spinning)return;
    const value=e.currentTarget.dataset.value; const s=this.store.state.settings;
    if(value==='all')s.tastes=[];
    else s.tastes=s.tastes.includes(value)?s.tastes.filter(t=>t!==value):s.tastes.concat(value);
    s.heat='all';s.tags=[];this.store.save();this.refresh();
  },
  openFilters(){if(!this.data.spinning)this.setData({filtersOpen:true});},
  closeFilters(){this.setData({filtersOpen:false});this.store.save();this.refresh();},
  noop(){},
  setHeat(e){const s=this.store.state.settings;s.heat=e.currentTarget.dataset.value;s.tastes=[];this.store.save();this.refresh();},
  toggleFilter(e){
    const {field,value}=e.currentTarget.dataset; const s=this.store.state.settings;
    s[field]=s[field].includes(value)?s[field].filter(t=>t!==value):s[field].concat(value);
    if(field==='tags')s.tastes=[];
    this.store.save();this.refresh();
  },
  setSwitch(e){this.store.state.settings[e.currentTarget.dataset.field]=e.detail.value;this.store.save();this.refresh();},
  setAvoidTerms(e){this.store.state.settings.avoidTerms=e.detail.value;this.setData({'settings.avoidTerms':e.detail.value});},
  resetFilters(){
    Object.assign(this.store.state.settings,{heat:'all',tags:[],tastes:[],avoidFlags:[],avoidTerms:'',recoveryMode:false,lowIodinePlan:false});
    this.store.save();this.refresh();
  },
  openWheel(){this.setData({wheelOpen:true});this.refreshWheel();},
  closeWheel(){if(!this.data.spinning)this.setData({wheelOpen:false});},
  refreshWheel(){
    const engine=this.store.engine;
    this.pool=engine.filteredRecipes();
    const pool=engine.balancedWheelPool(this.pool,engine.targetMenuCount(this.pool));
    this.wheelRecipes=ui.sample(pool);
    this.setData({angle:0,spinDuration:0,wheelItems:this.wheelRecipes.map((r,i)=>{
      const a=(i+.5)*2*Math.PI/this.wheelRecipes.length-Math.PI/2;
      const short=r.name.length>8?r.name.slice(0,7)+'…':r.name;
      const middle=Math.ceil(short.length/2);
      const lines=short.length>4?[short.slice(0,middle),short.slice(middle)]:[short];
      return {id:r.id,name:r.name,lines,x:50+34*Math.cos(a),y:50+34*Math.sin(a)};
    }),poolCount:pool.length},()=>this.drawWheel());
  },
  drawWheel(){
    if(!this.data.wheelOpen)return;
    wx.createSelectorQuery().in(this).select('#dishWheel').fields({node:true,size:true}).exec(res=>{
      if(!res[0]||!res[0].node)return;
      const {node:canvas,width,height}=res[0];
      const device=wx.getWindowInfo ? wx.getWindowInfo():wx.getSystemInfoSync();
      const dpr=device.pixelRatio||1;
      canvas.width=width*dpr;canvas.height=height*dpr;
      const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
      const center=width/2,radius=width/2-6;
      const items=this.wheelRecipes||[];
      const palette=['--candy-peach','--candy-mint','--candy-yellow','--candy-pink','--candy-blue','--surface-2','--candy-lilac','--candy-yellow'];
      if(!items.length){ctx.fillStyle=this.palette['--surface-2'];ctx.beginPath();ctx.arc(center,center,radius,0,2*Math.PI);ctx.fill();return;}
      items.forEach((r,i)=>{
        const a=i*2*Math.PI/items.length-Math.PI/2,b=(i+1)*2*Math.PI/items.length-Math.PI/2;
        ctx.beginPath();ctx.moveTo(center,center);ctx.arc(center,center,radius,a,b);ctx.closePath();
        ctx.fillStyle=this.palette[palette[i%palette.length]];ctx.fill();ctx.strokeStyle=this.palette['--surface'];ctx.lineWidth=3;ctx.stroke();
      });
      ctx.beginPath();ctx.arc(center,center,radius,0,Math.PI*2);ctx.strokeStyle=this.palette['--surface'];ctx.lineWidth=7;ctx.stroke();
    });
  },
  spin(e){
    if(this.data.spinning || !this.wheelRecipes || !this.wheelRecipes.length)return;
    const direction=e&&e.direction===-1?-1:1;
    const index=Math.floor(Math.random()*this.wheelRecipes.length);
    const anchor=this.wheelRecipes[index];
    const menu=this.store.engine.buildPickedMenu(this.pool,anchor,this.store.engine.targetMenuCount(this.pool));
    const duration=this.store.state.settings.reduceMotion?0:4200;
    const angle=ui.spinTarget(this.data.angle,index,this.wheelRecipes.length,direction);
    this.setData({spinning:true,spinDuration:duration,angle,petImage:this.data.pet.sources[direction>0?'runRight':'runLeft']});
    if(!this.store.state.settings.reduceMotion&&wx.vibrateShort)wx.vibrateShort({type:'light',fail:()=>{}});
    this.spinTimer=setTimeout(()=>{
      this.store.state.selectedIds=menu.map(r=>r.id);this.store.save();
      this.setData({petImage:this.data.pet.sources.done});
      this.spinTimer=setTimeout(()=>{
        this.setData({spinning:false,wheelOpen:false,tab:'home',activeId:anchor.id});this.refresh();
        wx.pageScrollTo({scrollTop:0,duration:this.store.state.settings.reduceMotion?0:200});
        this.notify(`开饭啦！为你选了${menu.length}道菜`);
      },duration?650:0);
    },duration);
  },
  touchStart(e){this.touch=e.touches&&e.touches[0]?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},
  touchEnd(e){
    if(!this.touch||!e.changedTouches||!e.changedTouches[0])return;
    const dx=e.changedTouches[0].clientX-this.touch.x;this.touch=null;
    if(Math.abs(dx)>35)this.spin({direction:dx>0?1:-1});
  },
  cancelSpin(){
    clearTimeout(this.spinTimer);
    if(this.data.spinning){this.setData({spinning:false,spinDuration:0,petImage:this.data.pet.sources.idle});this.refreshWheel();}
  },
  selectPicked(e){const id=e.currentTarget.dataset.id;this.setData({activeId:id,activeScrollId:'picked-'+id,selected:ui.recipeView(this.store.find(id))});},
  cyclePicked(e){
    const list=this.data.selectedMenu;if(!list.length)return;
    const idx=list.findIndex(r=>r.id===this.data.activeId);
    const r=list[(idx+Number(e.currentTarget.dataset.direction)+list.length)%list.length];
    this.selectPicked({currentTarget:{dataset:{id:r.id}}});
  },
  searchInput(e){this.setData({search:e.detail.value});this.limit=24;this.refreshLibrary();},
  setCategory(e){this.setData({libraryTag:e.currentTarget.dataset.value});this.limit=24;this.refreshLibrary();},
  refreshLibrary(){
    if(!this.store)return;
    const query=(this.data.search||'').trim().toLowerCase();
    const all=this.store.engine.allRecipes().filter(r=>(this.data.libraryTag==='all'||r.tags.includes(this.data.libraryTag))&&
      (!query||this.store.engine.recipePreferenceText(r).toLowerCase().includes(query)));
    this.setData({libraryTotal:all.length,library:all.slice(0,this.limit).map(r=>({id:r.id,name:r.name,image:r.image,time:r.time,heatText:['不辣','微辣','中辣','较辣','爆辣'][r.heat]}))});
  },
  loadMore(){this.limit+=24;this.refreshLibrary();},
  openRecipe(e){wx.navigateTo({url:'/pages/recipe/index?id='+encodeURIComponent(e.currentTarget.dataset.id)});},
  fridgeInput(e){this.store.state.settings.fridgeItems=e.detail.value;this.setData({'settings.fridgeItems':e.detail.value});},
  findFridge(){this.store.save();this.refreshFridge();if(!this.data.fridgeMatches.length)this.notify('暂未找到匹配菜品，可调整食材或筛选条件');},
  refreshFridge(){
    const items=this.store.engine.splitIngredientInput(this.store.state.settings.fridgeItems);
    const matches=this.store.engine.filteredRecipes().map(r=>this.store.engine.matchFridgeRecipe(r,items))
      .filter(m=>m.matched.length).sort((a,b)=>b.score-a.score||a.missing.length-b.missing.length||a.recipe.time-b.recipe.time);
    this.setData({fridgeMatches:matches.slice(0,12).map(m=>({id:m.recipe.id,name:m.recipe.name,image:m.recipe.image,
      matched:m.matched.join('、'),missing:m.missing.join('、'),missingItems:m.missing,percent:Math.round(m.score*100)}))});
  },
  addMissing(e){const m=this.data.fridgeMatches.find(r=>r.id===e.currentTarget.dataset.id);if(m){this.store.addShopping(m.missingItems);this.refresh();this.notify('缺少的食材已加入清单');}},
  shoppingInput(e){this.setData({shoppingInput:e.detail.value});},
  addShopping(){const items=this.store.engine.splitIngredientInput(this.data.shoppingInput);if(!items.length)return;this.store.addShopping(items);this.setData({shoppingInput:''});this.refresh();},
  toggleShopping(e){const item=this.store.state.shopping.find(r=>r.id===e.currentTarget.dataset.id);if(item){item.done=!item.done;this.store.save();this.refresh();}},
  removeShopping(e){this.store.state.shopping=this.store.state.shopping.filter(r=>r.id!==e.currentTarget.dataset.id);this.store.save();this.refresh();},
  clearDone(){this.store.state.shopping=this.store.state.shopping.filter(r=>!r.done);this.store.save();this.refresh();},
  copyShopping(){const text=this.store.state.shopping.filter(r=>!r.done).map(r=>'□ '+r.name).join('\n');if(text)wx.setClipboardData({data:text});else this.notify('清单已经买齐啦');},
  restoreAppearance(){this.store.state.settings.theme=options.defaultSettings.theme;this.store.state.settings.followPetTheme=options.defaultSettings.followPetTheme;this.store.state.mascotId=options.defaultMascotId;this.store.save();this.refresh();const name=ui.appearance(this.store.state).theme.name;this.notify('已恢复'+name+'默认外观');},
  setPet(e){const id=e.currentTarget.dataset.id;if(!options.mascotPresets.some(p=>p.id===id))return;this.store.state.mascotId=id;this.store.state.settings.theme=ui.appearance(this.store.state).theme.id;this.store.state.settings.followPetTheme=true;this.store.save();this.refresh();},
  openAdd(){this.setData({addOpen:true});},
  closeAdd(){this.setData({addOpen:false});},
  saveCustom(e){try{const r=this.store.addCustom(e.detail.value);this.setData({addOpen:false});this.refresh();this.notify(`已加入「${r.name}」`);}catch(err){this.notify(err.message);}},
  removeCustom(e){
    const id=e.currentTarget.dataset.id;
    wx.showModal({title:'删除自定义菜谱',content:'这道菜将从你的本机菜库中移除。',success:res=>{
      if(!res.confirm)return;const s=this.store.state;s.customRecipes=s.customRecipes.filter(r=>r.id!==id);s.selectedIds=s.selectedIds.filter(i=>i!==id);s.history=s.history.filter(r=>r.id!==id);this.store.save();this.refresh();
    }});
  },
  openAbout(){wx.navigateTo({url:'/info/index'});},
  onShareAppMessage(){const r=this.data.selected;return {title:r?`今晚吃${r.name}，来不牛马厨房选菜`:'今晚吃什么？转一下就知道！',path:r&&!r.id.startsWith('custom-')?'/pages/recipe/index?id='+r.id:'/pages/kitchen/index'};},
  onShareTimeline(){return {title:'不牛马厨房 · 今晚吃什么？',query:''};},
  ...actions
});
