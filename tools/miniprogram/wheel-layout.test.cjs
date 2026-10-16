const test=require('node:test');
const assert=require('node:assert/strict');
const {placeWheel}=require('../../miniprogram/utils/wheel-layout');

test('a tall play area centers the disc, not the pet and disc group',()=>{
  const layout=placeWheel(600,300,100);
  assert.equal(layout.wheelTop+layout.wheelSize/2,298);
  assert.equal(layout.wheelSize,300);
});
test('a pet that would touch the heading shifts the disc only by the needed clearance',()=>{
  const layout=placeWheel(460,320,112);
  assert.equal(layout.wheelTop,113);
  assert.equal(layout.wheelTop-layout.petSize*150/160,8);
  assert(layout.wheelTop+layout.wheelSize<=456);
});
test('compact screens keep the whole pet and disc inside the play area',()=>{
  for(const height of [180,250,350]){
    const layout=placeWheel(height,320,112);
    assert(layout.wheelTop-layout.petSize*150/160>=8);
    assert(layout.wheelTop>=67,'the drag hint stays below the heading');
    assert(layout.wheelTop+layout.wheelSize<=height-4);
  }
});
test('transparent padding does not push a short cat away from the center',()=>{
  const cat=placeWheel(546,342,123.6,'lazy-yawn-cat');
  assert.equal(cat.wheelTop+cat.wheelSize/2,271);
  for(const pet of ['pink-pastry-girl','milk-tea-puppy','baozi-sous-chef']){
    const layout=placeWheel(546,342,123.6,pet);
    assert(layout.wheelTop>cat.wheelTop);
    assert.equal(layout.wheelSize,342);
  }
});
