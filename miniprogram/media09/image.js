Component({properties:{path:String,mode:String,label:String},methods:{loaded(){this.triggerEvent('loaded');},failed(){this.triggerEvent('failed');}}});
