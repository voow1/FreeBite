// Highest nontransparent pixel across the shipped 256px atlas frames.
// All poses share the 240px foot baseline; transparent padding is not a head.
const petTops={'pink-pastry-girl':16,'milk-tea-puppy':16,'lazy-yawn-cat':131,'baozi-sous-chef':24};
function placeWheel(height, size, petSize, petId){
  const above=(240-(petTops[petId]||0))/256;
  const available=Math.max(0,height-4);
  const headroom=Math.max(petSize*above,71)+8;
  const scale=Math.min(1,available/(size+headroom));
  const wheelSize=Math.floor(size*scale);
  const fittedPet=petSize*scale;
  const clearance=Math.ceil(Math.max(fittedPet*above,71)+8);
  // Very short windows also need to fit the fixed-size drag hint.
  const fittedSize=Math.max(0,Math.min(wheelSize,available-clearance));
  const wheelTop=Math.max((available-fittedSize)/2,clearance);
  return {wheelSize:fittedSize,petSize:fittedPet,wheelTop};
}
module.exports={placeWheel};
