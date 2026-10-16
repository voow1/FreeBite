const motion=require('../../utils/motion');
const ui=require('../../utils/ui');
const actions=require('../../utils/recipe-actions');
Page(motion.decorate({
  data:{selected:null,selectedMenu:[],toast:'',themeStyle:'',standalone:true},
  onLoad(query){this.store=getApp().getStore();this.recipeId=query.id;this.refresh();},
  onShow(){if(this.store)this.refresh();},
  onUnload(){clearTimeout(this.toastTimer);},
  refresh(){const look=ui.appearance(this.store.state);ui.applyNavigation(look.tokens);const r=this.store.find(this.recipeId);this.setData({selected:ui.recipeView(r),themeStyle:look.themeStyle,themeId:look.theme.id,themeAssets:look.theme.assets,settings:this.store.state.settings});if(r)wx.setNavigationBarTitle({title:r.name});},
  notify(text){clearTimeout(this.toastTimer);this.setData({toast:text});this.toastTimer=setTimeout(()=>this.setData({toast:''}),2400);},
  backHome(){wx.reLaunch({url:'/pages/kitchen/index'});},
  onShareAppMessage(){const r=this.data.selected;return {title:r?`${r.name} · 不牛马厨房`:'不牛马厨房',path:r&&!r.id.startsWith('custom-')?'/pages/recipe/index?id='+r.id:'/pages/kitchen/index'};},
  onShareTimeline(){const r=this.data.selected;return {title:r?r.name+' · 不牛马厨房':'不牛马厨房',query:r&&!r.id.startsWith('custom-')?'id='+r.id:''};},
  ...actions
}));
