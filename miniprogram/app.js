const store = require('./utils/store');
App({
  onLaunch() { this.store = store.createStore(wx); },
  getStore() { if (!this.store) this.store = store.createStore(wx); return this.store; }
});
