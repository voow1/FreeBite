const {appearance,applyNavigation}=require('../utils/ui');
const credits=require('./credits');
Page({
  data:{credit:null},
  onLoad(query){
    const credit=query.credit?credits[query.credit]||null:null;
    if(credit){credit.sourceUrl=(credit.source.match(/\]\((https?:.*)\)$/)||[])[1]||'';credit.licenseUrl=(credit.license.match(/\]\((https?:.*)\)$/)||[])[1]||'';}
    const look=appearance(getApp().getStore().state);applyNavigation(look.tokens);this.setData({themeStyle:look.themeStyle,credit});
  },
  copy(e){wx.setClipboardData({data:e.currentTarget.dataset.value});}
});
