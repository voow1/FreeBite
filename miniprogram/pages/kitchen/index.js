const motion=require('../../utils/motion');
const pointer=require('../../utils/wheel-pointer');
const petMotion=require('../../utils/pet-player');
const dishFlight=require('../../utils/dish-flight');
const options = require('../../data/options');
const {themes} = require('../../data/themes');
const ui = require('../../utils/ui');
const actions = require('../../utils/recipe-actions');
Page(motion.decorate({
  data:{tab:'home',visited:{home:true},standalone:false,wheelOpen:false,wheelHintDismissed:false,filtersOpen:false,addOpen:false,spinning:false,petState:'idle',angle:0,spinDuration:0,pointerMotion:null,pointerBeat:0,
    dishFlight:null,flightRecipe:null,flightPhase:'',flightStyle:'',flightIndex:-1,wheelItems:[],selected:null,selectedMenu:[],servings:[1,2,3,4],library:[],libraryTotal:0,libraryTag:'all',search:'',
    shoppingInput:'',fridgeMatches:[],toast:'',settings:{},pets:[],pet:{},filterGroups:[],avoidOptions:[],
    tastes:[],history:[],shopping:[],customRecipes:[],heatOptions:[{value:'all',label:'不限'},{value:'0',label:'不辣'},{value:'1',label:'微辣'},{value:'2',label:'中辣'},{value:'3',label:'较辣'},{value:'4',label:'爆辣'}]},
  onLoad(query){
    this.store=getApp().getStore(); this.limit=24;
    this.petPlayer=petMotion.createPlayer(patch=>this.setData(patch),{now:()=>Date.now(),set:(f,t)=>setTimeout(f,t),clear:t=>clearTimeout(t)});
    this.setData({petFrame:0,petColumn:0,petRow:0});
    this._releaseHidden=()=>this.setData({visited:{[this.data.tab]:true}});
    if(wx.onMemoryWarning)wx.onMemoryWarning(this._releaseHidden);
    this.fitWheel();
    if(query.id && this.store.find(query.id)) this.store.state.selectedIds=[query.id];
    this.setData({wheelOpen:!this.store.state.selectedIds.length,categories:options.menuCategoryOptions});
    this.refresh();
  },
  onReady(){this.drawWheel();},
  onResize(){if(this.data.dishFlight)this.cancelSpin();this.fitWheel();this.drawWheel();},
  fitWheel(){
    const screen=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync?wx.getSystemInfoSync():{};
    const width=screen.windowWidth||375,height=screen.windowHeight||667;
    const safeBottom=screen.safeArea?Math.max(0,screen.screenHeight-screen.safeArea.bottom):0;
    const previousSize=Math.floor(Math.min(width-48,Math.max(128,(height-safeBottom-320)/1.30)));
    const petSize=Math.round(previousSize*.30)*1.2;
    // Reserve room for the enlarged pet above the disc, inside the gesture area.
    const size=Math.floor(Math.min(width-48,Math.max(100,height-safeBottom-302-petSize*150/160)));
    this.setData({wheelSize:size,petSize,safeBottom});
  },
  onShow(){this._petHidden=false;if(wx.setNavigationBarTitle)wx.setNavigationBarTitle({title:'不牛马厨房'});if(this.store)this.refresh();},
  onHide(){this._petHidden=true;this.cancelSpin();this.petPlayer.stop();},
  onUnload(){this._petHidden=true;this.cancelSpin();this.petPlayer.stop();clearTimeout(this.toastTimer);if(wx.offMemoryWarning)wx.offMemoryWarning(this._releaseHidden);},
  onReachBottom(){if(this.data.tab==='library'){this.limit+=24;this.refreshLibrary();}},
  setViewData(patch){
    const changed={};this._viewSnapshots=this._viewSnapshots||{};
    for(const key of Object.keys(patch)){
      const serialized=JSON.stringify(patch[key]);
      // Compare the last sent value as well: settings share mutable store data.
      if(this._viewSnapshots[key]!==serialized||JSON.stringify(this.data[key])!==serialized)changed[key]=patch[key];
      this._viewSnapshots[key]=serialized;
    }
    if(Object.keys(changed).length)this.setData(changed);
  },
  refresh(){
    const {state,engine}=this.store;
    const look=ui.appearance(state); this.palette=look.tokens;
    const selectedMenu=state.selectedIds.map(id=>ui.recipeView(this.store.find(id))).filter(Boolean);
    const current=selectedMenu.find(r=>r.id===this.data.activeId)||selectedMenu[0]||null;
    const group=options.preferenceFilterGroups.map(g=>({label:g.label,tags:g.tags.map(name=>({name,active:state.settings.tags.includes(name)}))}));
    this.setViewData({themeStyle:look.themeStyle,themeId:look.theme.id,themeName:look.theme.name,themeDescription:look.theme.description,themeAssets:look.theme.assets,accent:look.tokens['--accent'],settings:state.settings,pet:look.pet,
      selectedMenu,selected:current,activeId:current?current.id:'',activeScrollId:current?'picked-'+current.id:'',
      shopping:state.shopping,shoppingRemaining:state.shopping.filter(i=>!i.done).length,history:state.history,customRecipes:state.customRecipes,
      total:engine.allRecipes().length,poolCount:engine.filteredRecipes().length,
      tastes:options.tastePreferenceOptions.map(name=>({name,active:state.settings.tastes.includes(name)})),filterGroups:group,
      avoidOptions:options.avoidFlagOptions.map(f=>({...f,active:state.settings.avoidFlags.includes(f.value)})),
      pets:options.mascotPresets.map(p=>{const t=themes.find(t=>t.petId===p.id);return {...p,active:p.id===state.mascotId,themeName:t.name,description:t.description,swatches:t.swatches,cardStyle:'--pet-bg:'+t.tokens['--bg']+';--pet-accent:'+t.tokens['--accent']+';--pet-line:'+t.tokens['--line'],icon:t.assets.home};})
    });
    if(this._navigationTheme!==look.theme.id){ui.applyNavigation(look.tokens);this._navigationTheme=look.theme.id;}
    this.refreshLibrary(); this.refreshFridge();
    if(!this.data.spinning&&this.data.wheelOpen)this.refreshWheel();
    this.syncPetIdle();
  },
  syncPetIdle(){
    if(!this.petPlayer)return;
    if(this.store.state.settings.reduceMotion){this.petPlayer.reset();return;}
    if(this._petHidden||!this.data.wheelOpen||this.data.tab!=='home'){this.petPlayer.stop();return;}
    if(!this.data.spinning&&this.data.petState==='idle')this.petPlayer.idle();
  },
  notify(text){clearTimeout(this.toastTimer);this.setData({toast:text});this.toastTimer=setTimeout(()=>this.setData({toast:''}),2400);},
  switchTab(e){const tab=e.currentTarget.dataset.tab;this.setData({tab,qNavTab:tab,qNavBeat:1-(this.data.qNavBeat||0),['visited.'+tab]:true});this.syncPetIdle();wx.pageScrollTo({scrollTop:0,duration:0});},
  setServing(e){if(this.data.spinning)return;this.store.state.settings.servingCount=Number(e.currentTarget.dataset.count);this.store.save();this.refresh();},
  toggleTaste(e){
    if(this.data.spinning)return;
    const value=e.currentTarget.dataset.value; const s=this.store.state.settings;
    if(value==='all')s.tastes=[];
    else s.tastes=s.tastes.includes(value)?s.tastes.filter(t=>t!==value):s.tastes.concat(value);
    s.heat='all';s.tags=[];this.store.save();this.refresh();
  },
  openFilters(){if(!this.data.spinning)this.setData({filtersOpen:true});},
  closeFilters(){this.store.save();this.qClose('filtersOpen',function(){this.refresh();});},
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
  openWheel(){if(this.data.spinning)return;this.setData({wheelOpen:true,wheelHintDismissed:false});this.refreshWheel();this.syncPetIdle();},
  closeWheel(){if(!this.data.spinning)this.qClose('wheelOpen',function(){this.petPlayer.stop();});},
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
    const count=Math.min(8,(this.wheelRecipes||[]).length);
    const wheelImage=count?'/assets/wheels/'+this.data.themeId+'/'+count+'.png':'';
    if(this.data.wheelImage!==wheelImage)this.setData({wheelImage});
  },
  spin(e){
    if(this.data.spinning || !this.wheelRecipes || !this.wheelRecipes.length)return;
    const direction=e&&e.direction===-1?-1:1;
    const index=Math.floor(Math.random()*this.wheelRecipes.length);
    const anchor=this.wheelRecipes[index];
    const menu=this.store.engine.buildPickedMenu(this.pool,anchor,this.store.engine.targetMenuCount(this.pool));
    const duration=this.store.state.settings.reduceMotion?0:4200;
    const angle=ui.spinTarget(this.data.angle,index,this.wheelRecipes.length,direction);
    const previousAngle=this.data.angle;
    this._flightEpoch=(this._flightEpoch||0)+1;this._flightReadyPath=null;this._resultPending=false;
    this.setData({flightRecipe:duration?ui.recipeView(anchor):null,flightIndex:index,spinning:true,wheelHintDismissed:true,spinDuration:duration,angle,petState:duration?(direction>0?'runRight':'runLeft'):'idle'});
    this.startPointerSpin(previousAngle,angle,duration);
    if(duration)this.petPlayer.spin(previousAngle,angle,duration);
    if(!this.store.state.settings.reduceMotion&&wx.vibrateShort)wx.vibrateShort({type:'light',fail:()=>{}});
    this.spinTimer=setTimeout(()=>{
      this.stopPointer();
      this.store.state.selectedIds=menu.map(r=>r.id);this.store.save();
      this._resultPending=true;
      // Render the destination underneath the wheel while the pet finishes.
      this.setData({petState:duration?'done':'idle',tab:'home','visited.home':true,activeId:anchor.id});
      this.refresh();
      if(duration)this.petPlayer.done();
      this.spinTimer=setTimeout(()=>this.startDishFlight(anchor,menu.length),duration?petMotion.DONE_MS:0);
    },duration);
  },
  flightImageReady(e){if(e&&e.detail)this._flightReadyPath=e.detail.path;},
  finishDishFlight(count){
    clearTimeout(this.flightTimer);this._resultPending=false;
    this.petPlayer.stop();
    this.setData({dishFlight:null,flightRecipe:null,flightPhase:'landed',flightIndex:-1,spinning:false,petState:'idle',wheelOpen:false,tab:'home'});
    this.refresh();
    this.notify(`开饭啦！为你选了${count}道菜`);
  },
  startDishFlight(anchor,count){
    const epoch=this._flightEpoch;
    const current=()=>epoch===this._flightEpoch&&!this._petHidden;
    // Align the destination behind the opaque wheel before measuring its photo.
    let aligned=false;
    const afterScroll=()=>{
      if(aligned||!current())return;
      aligned=true;clearTimeout(this.flightTimer);
      if(this.store.state.settings.reduceMotion||this._flightReadyPath!==anchor.image){this.finishDishFlight(count);return;}
      this.flightTimer=setTimeout(()=>{if(current())this.animateDishFlight(anchor,count,epoch);},40);
    };
    this.flightTimer=setTimeout(afterScroll,350);
    try{wx.pageScrollTo({selector:count>1?'.home-scene .menu-strip':'.home-scene .hero-photo',offsetTop:0,duration:0,complete:afterScroll});}
    catch(error){afterScroll();}
  },
  animateDishFlight(anchor,count,epoch){
    const current=()=>epoch===this._flightEpoch&&!this._petHidden;
    const finish=()=>{if(current())this.finishDishFlight(count);};
    if(this.store.state.settings.reduceMotion||this._flightReadyPath!==anchor.image){finish();return;}
    let queried=false;
    // Failed/missing geometry must never trap the user behind the wheel.
    this.flightTimer=setTimeout(()=>{queried=true;finish();},260);
    try{
      const query=wx.createSelectorQuery().in(this);
      const sourceNode=query.select('#wheel-choice-'+this.data.flightIndex);
      if(typeof sourceNode.boundingClientRect!=='function'){
        clearTimeout(this.flightTimer);finish();return;
      }
      sourceNode.boundingClientRect();
      query.select('.home-scene .hero-photo').boundingClientRect();
      query.exec(rects=>{
        if(queried||!current())return;queried=true;clearTimeout(this.flightTimer);
        const geometry=dishFlight.plan(rects[0],rects[1]);
        if(!geometry){finish();return;}
        this.setData({dishFlight:ui.recipeView(anchor),flightPhase:'seed',flightStyle:geometry.start},()=>{
          if(!current())return;
          this.flightTimer=setTimeout(()=>{
            if(!current())return;
            this.setData({flightPhase:'flying',flightStyle:geometry.end});
            this.flightTimer=setTimeout(finish,dishFlight.DURATION);
          },40);
        });
      });
    }catch(error){clearTimeout(this.flightTimer);finish();}
  },
  touchStart(e){
    if(this.data.spinning)return;
    const point=this.touchPoint(e.touches);
    this.stopPointer();
    this.touch=point?{...point,startAngle:this.data.angle,lastX:point.x,lastTime:e.timeStamp||Date.now(),lastTick:0,delta:0,moved:false}:null;
    this.setData({spinDuration:0});
  },
  touchPoint(touches){
    const p=touches&&touches[0];if(!p)return null;
    // Canvas-originated WeChat touches may expose x/y instead of clientX/Y.
    const x=Number(p.clientX!==undefined?p.clientX:p.pageX!==undefined?p.pageX:p.x);
    const y=Number(p.clientY!==undefined?p.clientY:p.pageY!==undefined?p.pageY:p.y);
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  },
  touchMove(e){
    const point=this.touchPoint(e.touches),drag=this.touch;
    if(this.data.spinning||!drag||!point||!this.wheelRecipes.length)return;
    const dx=point.x-drag.x,dy=point.y-drag.y;
    if(!drag.moved&&(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy)))return;
    drag.moved=true;drag.delta=dx;
    if(point.x!==drag.lastX)drag.direction=point.x>drag.lastX?-1:1;
    drag.lastX=point.x;
    const angle=drag.startAngle-dx*180/this.data.wheelSize;
    const now=e.timeStamp||Date.now(),elapsed=Math.max(16,now-drag.lastTime);
    const petSpeed=(angle-this.data.angle)/elapsed;
    const sector=360/this.wheelRecipes.length;
    if(Math.floor(angle/sector)!==Math.floor(this.data.angle/sector)&&now-drag.lastTick>=150){
      this.nudgePointer(pointer.pulse((angle-this.data.angle)/elapsed,drag.direction));drag.lastTick=now;
    }
    drag.lastTime=now;
    const petState=this.store.state.settings.reduceMotion?'idle':drag.direction>0?'runRight':'runLeft';
    this.setData({angle,spinDuration:0,wheelHintDismissed:true,petState});
    if(!this.store.state.settings.reduceMotion)this.petPlayer.drag(petSpeed,drag.direction);
  },
  touchEnd(e){
    if(this.data.spinning){this.touch=null;return;}
    const point=this.touchPoint(e.changedTouches),drag=this.touch;
    if(!drag||!point){this.touchCancel();return;}
    const dx=point.x-drag.x,dy=point.y-drag.y;
    const direction=drag.direction||(dx>0?-1:1);
    if(Math.abs(dx)>35&&(drag.moved||Math.abs(dx)>Math.abs(dy))){this.touch=null;this.stopPointer();this.spin({direction});}
    else this.touchCancel();
  },
  touchCancel(){
    this.touch=null;
    if(!this.data.spinning)this.stopPointer();
    if(!this.data.spinning)this.setData({petState:'idle'});
    this.syncPetIdle();
  },
  cancelSpin(){
    clearTimeout(this.spinTimer);clearTimeout(this.flightTimer);this._flightEpoch=(this._flightEpoch||0)+1;this.touch=null;
    this.stopPointer();
    this.petPlayer.stop();
    const wasSpinning=this.data.spinning;
    const resultPending=this._resultPending;this._resultPending=false;
    this.setData({dishFlight:null,flightRecipe:null,flightPhase:'',flightIndex:-1,spinning:false,spinDuration:0,petState:'idle',...(resultPending?{wheelOpen:false}:{})});
    if(wasSpinning&&!resultPending)this.refreshWheel();
  },
  nudgePointer(effect){
    if(this.store.state.settings.reduceMotion||this.data.qPaused)return;
    this.setData({pointerMotion:effect,pointerBeat:1-this.data.pointerBeat});
  },
  startPointerSpin(from,to,duration){
    this.stopPointer();
    const ticks=pointer.plan(from,to,this.wheelRecipes.length,duration);
    const started=Date.now();
    const next=index=>{
      if(index>=ticks.length)return;
      this.pointerTimer=setTimeout(()=>{
        this.pointerTimer=null;
        // Do not accumulate callback delay or replay stale ticks after a stall.
        if(Date.now()-started-ticks[index].at<120)this.nudgePointer(ticks[index]);
        next(index+1);
      },Math.max(0,ticks[index].at-(Date.now()-started)));
    };
    next(0);
  },
  stopPointer(){
    clearTimeout(this.pointerTimer);this.pointerTimer=null;
    if(this.data.pointerMotion)this.setData({pointerMotion:null});
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
    const cacheKey=JSON.stringify([query,this.data.libraryTag,this.limit,this.store.state.customRecipes]);
    if(cacheKey===this._libraryKey)return;this._libraryKey=cacheKey;
    const all=this.store.engine.allRecipes().filter(r=>(this.data.libraryTag==='all'||r.tags.includes(this.data.libraryTag))&&
      (!query||this.store.engine.recipePreferenceText(r).toLowerCase().includes(query)));
    this.setData({libraryTotal:all.length,library:all.slice(0,this.limit).map(r=>({id:r.id,name:r.name,image:r.image,time:r.time,heatText:['不辣','微辣','中辣','较辣','爆辣'][r.heat]}))});
  },
  loadMore(){this.limit+=24;this.refreshLibrary();},
  openRecipe(e){wx.navigateTo({url:'/pages/recipe/index?id='+encodeURIComponent(e.currentTarget.dataset.id)});},
  fridgeInput(e){this.store.state.settings.fridgeItems=e.detail.value;this.setData({'settings.fridgeItems':e.detail.value});},
  findFridge(){this.store.save();this.refreshFridge();if(!this.data.fridgeMatches.length)this.notify('暂未找到匹配菜品，可调整食材或筛选条件');},
  refreshFridge(){
    const s=this.store.state.settings;
    const cacheKey=JSON.stringify([s.fridgeItems,s.heat,s.tastes,s.tags,s.avoidFlags,s.avoidTerms,s.recoveryMode,s.lowIodinePlan,this.store.state.customRecipes,this.store.state.history]);
    if(cacheKey===this._fridgeKey)return;this._fridgeKey=cacheKey;
    const items=this.store.engine.splitIngredientInput(s.fridgeItems);
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
  openAdd(){this.setData({addOpen:true,qRadio:'0',qFocus:''});},
  closeAdd(){this.qClose('addOpen');},
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
}));
