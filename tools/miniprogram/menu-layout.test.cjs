const test=require('node:test');
const assert=require('node:assert/strict');
const {landingScroll,centeredScroll}=require('../../miniprogram/utils/menu-layout');

test('a photo entirely above the navbar keeps the page at its top',()=>{
  assert.equal(landingScroll({top:270,height:240},700),0);
  assert.equal(landingScroll({top:270,height:240},510),0);
});
test('only a clipped photo scrolls, just enough to clear the fixed navbar',()=>{
  assert.equal(landingScroll({top:270,height:240},450),72);
  assert.equal(landingScroll({top:270,height:500},450),270);
  assert.equal(landingScroll(null,450),0);
});
test('menu centering follows the middle card and clamps first/last cards to edges',()=>{
  const viewport={left:24,width:320},content={left:-126,width:720};
  assert.equal(centeredScroll(viewport,content,{left:-126,width:160}),0);
  assert.equal(centeredScroll(viewport,content,{left:54,width:160}),100);
  assert.equal(centeredScroll(viewport,content,{left:414,width:160}),400);
  // A manually shifted strip must calculate the same absolute target.
  assert.equal(centeredScroll(viewport,{left:24,width:720},{left:204,width:160}),100);
  assert.equal(centeredScroll(viewport,{left:24,width:160},{left:24,width:160}),0);
  assert.equal(centeredScroll(viewport,content,null),null);
});
