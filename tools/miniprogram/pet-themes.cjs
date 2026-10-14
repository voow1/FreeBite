// 小程序独立主题源；不再继承网站自由配色。
const definitions = [
  {id:'strawberry',petId:'pink-pastry-girl',name:'莓好甜心',description:'莓粉奶油 · 轻柔甜点插画',motif:'草莓小锅 / 裱花袋 / 莓果盒',
    colors:['#fffcfd','#ffffff','#fcebf1','#f0e5ea','#ddb6c7','#994463','#3e3440','#77636e'],button:['#f7dce7','#813550'],wheel:['#f9e4ed','#fdf0e4','#edf3e7','#fbecee','#eeeafa','#f7e7ef'],radius:'16px'},
  {id:'milk-tea',petId:'milk-tea-puppy',name:'奶绿午后',description:'奶绿燕麦白 · 温柔蜡笔手绘',motif:'奶茶杯 / 吐司 / 牛奶瓶',
    colors:['#fbfdfb','#ffffff','#eaf5ef','#e0ece4','#a9cdb8','#3e6954','#34463e','#5c7266'],button:['#dcefe3','#315f48'],wheel:['#e0f1e6','#f4f5e5','#e9f5ee','#e7f0f4','#edf0e1','#f3eee5'],radius:'20px'},
  {id:'lazy-cat',petId:'lazy-yawn-cat',name:'云边小憩',description:'雾蓝奶白 · 极简猫咪线稿',motif:'猫窝餐盘 / 鱼形砧板 / 鱼罐头',
    colors:['#fbfcff','#ffffff','#eaf2fc','#e1e9f3','#b0c9e4','#466a92','#344359','#5c6d83'],button:['#deebfd','#375e8a'],wheel:['#e3eefc','#ecf4f8','#f2edfa','#e9f3f1','#f9edf1','#edf1fb'],radius:'12px'},
  {id:'baozi',petId:'baozi-sous-chef',name:'暖阳蒸笼',description:'奶黄珊瑚红 · 简洁平面剪纸',motif:'竹蒸笼 / 竹简菜谱 / 葱束',
    colors:['#fffdf8','#ffffff','#fff5d9','#f0e9d8','#e0c682','#945344','#494034','#786d58'],button:['#f9e7ad','#715528'],wheel:['#fff0bf','#fff6de','#fbe6dc','#f5efd7','#fff1d1','#faece5'],radius:'12px'}
];
const themes=definitions.map(d=>{
  const [bg,surface,soft,line,lineStrong,accent,ink,muted]=d.colors;
  const tokens={'--bg':bg,'--surface':surface,'--surface-2':soft,'--line':line,'--line-strong':lineStrong,
    '--accent':accent,'--accent-2':lineStrong,'--primary':accent,'--primary-strong':ink,'--ink':ink,'--muted-ink':muted,'--soft-ink':muted,
    '--button-bg':d.button[0],'--button-ink':d.button[1],'--warning':'#855b20','--danger':'#a23839',
    '--toast-bg':ink,'--toast-ink':surface,'--scrim':'rgba(33,30,28,.46)','--shadow':'0 4px 14px '+line,
    '--card-radius':d.radius,'--candy-peach':d.wheel[0],'--candy-mint':d.wheel[1],'--candy-yellow':d.wheel[2],
    '--candy-pink':d.wheel[3],'--candy-blue':d.wheel[4],'--candy-lilac':d.wheel[5]};
  const assets=Object.fromEntries(['home','library','ingredients','mine','spin'].map(k=>[k,`/assets/themes/${d.id}/${k}.png`]));
  return {id:d.id,petId:d.petId,name:d.name,description:d.description,motif:d.motif,swatches:[bg,soft,lineStrong,accent],tokens,assets};
});
module.exports={themes,petThemes:Object.fromEntries(themes.map(t=>[t.id,t.tokens]))};
