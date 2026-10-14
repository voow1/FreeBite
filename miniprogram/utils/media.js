const pending = {};
const ready = new Set();
const queue = [];
let active = 0;
function pump() {
  while (active < 2 && queue.length) {
    const {name,resolve,reject} = queue.shift(); active++;
    const done = () => {active--;pump();};
    wx.loadSubpackage({name,success:()=>{ready.add(name);resolve();done();},fail:err=>{delete pending[name];reject(err);done();}});
  }
}
function ensure(source) {
  const name = String(source || '').split('/')[1];
  if (!/^media\d+$/.test(name)) return Promise.resolve();
  if (ready.has(name)) return Promise.resolve();
  if (!pending[name]) pending[name] = new Promise((resolve,reject)=>queue.push({name,resolve,reject}));
  const task=pending[name];pump();return task;
}
module.exports = {ensure};
