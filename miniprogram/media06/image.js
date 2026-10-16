Component({properties:{path:String,mode:String,label:String},methods:{loaded(){this.triggerEvent('loaded',{path:this.data.path});},failed(){this.triggerEvent('failed',{path:this.data.path});}}});
