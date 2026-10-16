let petPackageReady;
let petMotionReady;
function ensurePetPackage(name){
  if(name==='petmotion'){
    if(!petMotionReady)petMotionReady=require.async('../../petmotion/ready.js').catch(error=>{petMotionReady=null;throw error;});
    return petMotionReady;
  }
  if(!petPackageReady)petPackageReady=require.async('../../media00/ready.js').catch(error=>{petPackageReady=null;throw error;});
  return petPackageReady;
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
      // The pet package must be injected before mounting its nested component.
      // Use native asynchronous module loading; a placeholder alone can stay empty.
      const petPackage=packageName==='media00'||packageName==='petmotion';
      this.setData({resolved:petPackage?'':path||'',loading:!!path,failed:false,packageName});
      if(!path)return;
      this._loadTimer=setTimeout(()=>{
        if(this._alive&&this._version===version)this.error();
      },30000);
      if(petPackage)ensurePetPackage(packageName).then(()=>{
        if(this._alive&&this._version===version)this.setData({resolved:path});
      }).catch(()=>{if(this._alive&&this._version===version)this.error();});
    },
    loaded(e){if(!this._alive||e&&e.detail&&e.detail.path&&e.detail.path!==this.data.path)return;clearTimeout(this._loadTimer);this.setData({loading:false,failed:false});},
    // Keep the asynchronous child mounted on timeout: a slow first download
    // can still finish and deliver its real image load event.
    error(e){if(!this._alive||e&&e.detail&&e.detail.path&&e.detail.path!==this.data.path)return;clearTimeout(this._loadTimer);this.setData({loading:false,failed:true});},
    retry(){if(this.data.failed)this.setData({resolved:''},()=>{if(this._alive)this.load(this.data.path);});}
  }
});
