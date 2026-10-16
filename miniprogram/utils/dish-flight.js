const DURATION=680;
function valid(rect){return rect&&['left','top','width','height'].every(k=>Number.isFinite(rect[k]))&&rect.width>0&&rect.height>0;}
function style(r){return `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;}
function plan(source,target){
  if(!valid(source)||!valid(target))return null;
  const width=Math.max(68,source.width+20),height=Math.max(46,source.height+18);
  return {start:style({left:source.left+(source.width-width)/2,top:source.top+(source.height-height)/2,width,height}),end:style(target)};
}
module.exports={DURATION,plan};
