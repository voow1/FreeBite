// Literal module paths let WeChat discover each asynchronous package dependency.
const packageLoaders={
  media00:()=>require.async('../../media00/ready.js'),
  media01:()=>require.async('../../media01/ready.js'),
  media02:()=>require.async('../../media02/ready.js'),
  media03:()=>require.async('../../media03/ready.js'),
  media04:()=>require.async('../../media04/ready.js'),
  media05:()=>require.async('../../media05/ready.js'),
  media06:()=>require.async('../../media06/ready.js'),
  media07:()=>require.async('../../media07/ready.js'),
  media08:()=>require.async('../../media08/ready.js'),
  media09:()=>require.async('../../media09/ready.js'),
  media10:()=>require.async('../../media10/ready.js'),
  media11:()=>require.async('../../media11/ready.js'),
  media12:()=>require.async('../../media12/ready.js'),
  media13:()=>require.async('../../media13/ready.js'),
  petmotion:()=>require.async('../../petmotion/ready.js')
};
const packageReady={};
function ensureAssetPackage(name){
  if(!packageReady[name])packageReady[name]=packageLoaders[name]().catch(error=>{delete packageReady[name];throw error;});
  return packageReady[name];
}
Component({
  properties:{path:{type:String,value:'',observer:'load'},mode:{type:String,value:'aspectFill'},label:{type:String,value:'菜品图片'},bare:{type:Boolean,value:false}},
  data:{resolved:'',loading:false,failed:false,packageName:''},
  lifetimes:{attached(){this._alive=true;this.load(this.data.path);},detached(){this._alive=false;this._version++;clearTimeout(this._loadTimer);}},
  methods:{
    load(path){
      if(!this._alive)return;
      clearTimeout(this._loadTimer);
      const version=this._version=(this._version||0)+1;
      const packageName=String(path||'').split('/')[1]||'';
      // Every package must be injected before mounting its nested component.
      // Use native asynchronous module loading; a placeholder alone can stay empty.
      const asyncPackage=!!packageLoaders[packageName];
      this.setData({resolved:asyncPackage?'':path||'',loading:!!path,failed:false,packageName});
      if(!path)return;
      this._loadTimer=setTimeout(()=>{
        if(this._alive&&this._version===version)this.error();
      },30000);
      if(asyncPackage)ensureAssetPackage(packageName).then(()=>{
        if(this._alive&&this._version===version)this.setData({resolved:path});
      }).catch(()=>{if(this._alive&&this._version===version)this.error();});
    },
    loaded(e){if(!this._alive||e&&e.detail&&e.detail.path&&e.detail.path!==this.data.path)return;clearTimeout(this._loadTimer);this.setData({loading:false,failed:false});if(this.triggerEvent)this.triggerEvent('ready',{path:this.data.path});},
    // Keep the asynchronous child mounted on timeout: a slow first download
    // can still finish and deliver its real image load event.
    error(e){if(!this._alive||e&&e.detail&&e.detail.path&&e.detail.path!==this.data.path)return;clearTimeout(this._loadTimer);this.setData({loading:false,failed:true});},
    retry(){if(this.data.failed)this.setData({resolved:''},()=>{if(this._alive)this.load(this.data.path);});}
  }
});
