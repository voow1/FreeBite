const media = require('../../utils/media');
Component({
  properties:{path:{type:String,value:'',observer:'load'},mode:{type:String,value:'aspectFill'},label:{type:String,value:'菜品图片'},bare:{type:Boolean,value:false}},
  data:{resolved:'',loading:false,failed:false},
  lifetimes:{attached(){this._alive=true;this.load(this.data.path);},detached(){this._alive=false;this._version++;}},
  methods:{
    load(path){
      if(!this._alive)return;
      const version=this._version=(this._version||0)+1;
      this.setData({resolved:'',loading:!!path,failed:false,packageName:String(path||'').split('/')[1]||''});
      if(!path)return;
      media.ensure(path).then(()=>{if(this._alive&&this._version===version)this.setData({resolved:path});})
        .catch(()=>{if(this._alive&&this._version===version)this.setData({loading:false,failed:true});});
    },
    loaded(){this.setData({loading:false,failed:false});},
    error(){this.setData({resolved:'',loading:false,failed:true});},
    retry(){if(this.data.failed)this.load(this.data.path);}
  }
});
