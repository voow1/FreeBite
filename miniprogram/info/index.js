const motion=require('../utils/motion');
const {appearance,applyNavigation}=require('../utils/ui');
const credits=require('./credits');
Page(motion.decorate({
  data:{credit:null},
  onLoad(query){
    const credit=query.credit?credits[query.credit]||null:null;
    if(credit){credit.sourceUrl=(credit.source.match(/\]\((https?:.*)\)$/)||[])[1]||'';credit.licenseUrl=(credit.license.match(/\]\((https?:.*)\)$/)||[])[1]||'';}
    this.store=getApp().getStore();const look=appearance(this.store.state);applyNavigation(look.tokens);this.setData({themeStyle:look.themeStyle,themeId:look.theme.id,themeAssets:look.theme.assets,settings:this.store.state.settings,credit});
  },
  copy(e){wx.setClipboardData({data:e.currentTarget.dataset.value});}
}));
