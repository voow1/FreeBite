// One bounded feedback channel per page. No JS animation frames or polling.
const feedback = {
  switchTab:'nav', setServing:'serving', toggleTaste:'taste', setHeat:'filter',
  toggleFilter:'filter', resetFilters:'filter', setSwitch:'setting',
  selectPicked:'dish', setCategory:'category', loadMore:'library',
  findFridge:'match', addShopping:'shopping', toggleShopping:'check',
  removeShopping:'shopping', clearDone:'shopping', addMissing:'shopping',
  addSelectedShopping:'success', addMenuShopping:'success', markSelectedCooked:'success',
  setPet:'theme', restoreAppearance:'theme', openWheel:'wheel', spin:'spin',
  openFilters:'sheet', openAdd:'sheet', saveCustom:'success', copy:'copy', copyShopping:'copy'
};

function decorate(definition, clock) {
  const timer=clock||{setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id)};
  const result={...definition,data:{qNavTab:'',qNavBeat:0,qBeat:0,qAction:'',qKey:'',qTouch:null,qFocus:'',qClosing:'',qPaused:false,qReduced:false,...definition.data}};
  function clear(page,name){if(page._qTimers&&page._qTimers[name]){timer.clearTimeout(page._qTimers[name]);delete page._qTimers[name];}}
  function later(page,name,fn,ms){clear(page,name);page._qTimers=page._qTimers||{};page._qTimers[name]=timer.setTimeout(()=>{delete page._qTimers[name];if(!page._qDead)fn();},ms);}
  result.qSync=function(){
    const state=this.store&&this.store.state;
    const reduced=!!(state?state.settings.reduceMotion:this.data.settings&&this.data.settings.reduceMotion);
    if(this.data.qReduced!==reduced)this.setData({qReduced:reduced});
    if(reduced){clear(this,'pulse');clear(this,'touch');this.setData({qAction:'',qTouch:null});this.qFinishClose();}
    return reduced;
  };
  result.qPulse=function(action,key){
    if(this._qDead||this.data.qPaused||this.qSync())return;
    this.setData({qAction:action,qKey:String(key||''),qBeat:1-this.data.qBeat});
    later(this,'pulse',()=>this.setData({qAction:'',qKey:''}),560);
  };
  result.qTap=function(e){
    if(!e||this._qDead||this.data.qPaused||this.data.qReduced)return;
    const point=e.changedTouches&&e.changedTouches[0]||e.touches&&e.touches[0]||e.detail||{};
    const x=Number(point.clientX===undefined?point.x:point.clientX),y=Number(point.clientY===undefined?point.y:point.clientY);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(e.timeStamp&&this._qLastTap===e.timeStamp)return;
    this._qLastTap=e.timeStamp;
    this.setData({qTouch:{x,y,beat:this.data.qTouch?1-this.data.qTouch.beat:0}});
    later(this,'touch',()=>this.setData({qTouch:null}),280);
  };
  result.qFocusInput=function(e){this.setData({qFocus:e.currentTarget.dataset.focus});};
  result.qBlurInput=function(){this.setData({qFocus:''});};
  result.qRadioInput=function(e){this.setData({qRadio:e.detail.value});this.qPulse('radio',e.detail.value);};
  result.qClose=function(field,after){
    this.qFinishClose();
    const finish=()=>{this.setData({[field]:false,qClosing:'',qFocus:''});if(after)after.call(this);};
    if(this.data.qReduced||this.data.qPaused){finish();return;}
    this._qClose=finish;this.setData({qClosing:field});
    later(this,'close',()=>this.qFinishClose(),160);
  };
  result.qFinishClose=function(){clear(this,'close');const finish=this._qClose;this._qClose=null;if(finish)finish();};
  result.qStop=function(){
    this.qFinishClose();
    Object.keys(this._qTimers||{}).forEach(name=>clear(this,name));
    this.setData({qPaused:true,qAction:'',qTouch:null,qFocus:''});
  };
  for(const [name,action]of Object.entries(feedback))if(definition[name]){
    result[name]=function(...args){
      if(name.startsWith('open'))this.qFinishClose();
      const value=definition[name].apply(this,args);
      const e=args[0],d=e&&e.currentTarget&&e.currentTarget.dataset||{};
      this.qPulse(action,d.id||d.value||d.count||d.field||d.tab);if(action!=='nav')this.qTap(e);
      return value;
    };
  }
  for(const name of ['onLoad','onShow'])result[name]=function(...args){
    this._qDead=false;this.setData({qPaused:false});
    const value=definition[name]&&definition[name].apply(this,args);this.qSync();return value;
  };
  result.onHide=function(...args){this.qStop();if(definition.onHide)definition.onHide.apply(this,args);};
  result.onUnload=function(...args){this.qStop();this._qDead=true;if(definition.onUnload)definition.onUnload.apply(this,args);};
  return result;
}
module.exports={decorate};
