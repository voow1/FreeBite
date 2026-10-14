module.exports={
  addSelectedShopping(){
    const r=this.store.find(this.data.selected&&this.data.selected.id);
    if(r){this.store.addShopping(r.ingredients);this.refresh();this.notify('食材已加入购物清单');}
  },
  addMenuShopping(){
    const recipes=this.store.state.selectedIds.map(id=>this.store.find(id)).filter(Boolean);
    this.store.addShopping(recipes.reduce((all,r)=>all.concat(r.ingredients),[]));this.refresh();this.notify('整桌食材已加入清单');
  },
  markSelectedCooked(){
    const r=this.store.find(this.data.selected&&this.data.selected.id);
    if(r){this.store.cooked([r]);this.refresh();this.notify('已记下今天做的菜，下次优先换一道');}
  },
  chooseForDinner(){
    const r=this.data.selected;if(!r)return;
    this.store.state.selectedIds=[r.id];this.store.save();
    wx.reLaunch({url:'/pages/kitchen/index'});
  },
  openCredit(){const r=this.data.selected;if(r&&r.creditId)wx.navigateTo({url:'/info/index?credit='+encodeURIComponent(r.creditId)});},
  copySource(e){const url=e.currentTarget.dataset.url;if(url)wx.setClipboardData({data:url});}
};
