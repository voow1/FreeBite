/* Local verification adapter. Never included in the WeChat package. */
// Match a phone viewport: preserve scrolling without a desktop scrollbar gutter.
const viewportStyle=document.createElement('style');viewportStyle.textContent='html{scrollbar-width:none}html::-webkit-scrollbar{width:0;height:0}';document.head.append(viewportStyle);
document.getElementById('review').textContent='交互预览 v1.18.13 · 非微信真机';
window.addEventListener('error',e=>{const p=document.createElement('pre');p.textContent=e.message+'\n'+e.error?.stack;document.body.append(p);});
const cache={},templates={},root=document.getElementById('root');let page,pagePath='/pages/kitchen/index',rendering=false;
function normalize(p){const parts=[];p.split('/').forEach(s=>{if(s==='..')parts.pop();else if(s&&s!=='.')parts.push(s);});return '/'+parts.join('/');}
function requireModule(p){p=normalize(p.endsWith('.js')?p:p+'.js');if(cache[p])return cache[p].exports;const m={exports:{}};cache[p]=m;new Function('require','module','exports',SOURCES[p])(q=>requireModule(q.startsWith('/')?q:p.slice(0,p.lastIndexOf('/')+1)+q),m,m.exports);return m.exports;}
window.getApp=()=>({getStore:()=>store});window.Page=p=>{page=p;};
window.wx={getStorageSync:k=>JSON.parse(localStorage.getItem('design-1.13.1:'+k)||'null'),setStorageSync:(k,v)=>localStorage.setItem('design-1.13.1:'+k,JSON.stringify(v)),setNavigationBarColor(){},setBackgroundColor(){},setNavigationBarTitle(){},pageScrollTo:o=>{const target=o.selector?document.querySelector(o.selector):null;scrollTo(0,target?target.getBoundingClientRect().top+scrollY-(o.offsetTop||0):o.scrollTop||0);requestAnimationFrame(()=>o.complete?.());},getWindowInfo:()=>({pixelRatio:devicePixelRatio,windowWidth:innerWidth,windowHeight:innerHeight}),vibrateShort(){},showToast:o=>alert(o.title),showModal:o=>o.success({confirm:confirm(o.content)}),setClipboardData:o=>navigator.clipboard.writeText(o.data),navigateTo:o=>openPage(o.url),reLaunch:o=>openPage(o.url),createSelectorQuery(){let selector;const selections=[];return{in(){return this;},select(s){selector=s;return this;},fields(){selections.push({selector,node:true});return this;},boundingClientRect(){selections.push({selector});return this;},exec(fn){fn(selections.map(item=>{const node=document.querySelector(item.selector);if(!node)return null;const r=node.getBoundingClientRect();return item.node?{node,width:r.width,height:r.height}:{left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}));}};}};
const store=requireModule('/utils/store').createStore(wx);
function evaluate(expression,scope){try{return new Function('scope','with(scope){return ('+expression+')}')(scope);}catch(e){window.__previewErrors.push(expression+': '+e.message);return undefined;}}
function value(s,scope){const match=s.match(/^{{([^{}]*)}}$/);if(match)return evaluate(match[1],scope);return s.replace(/{{([\s\S]*?)}}/g,(_,e)=>evaluate(e,scope)??'');}
function parse(source){const holder=document.createElement('template');holder.innerHTML=source.replace(/<import[^>]*\/>/g,'').replace(/<([\w-]+)([^<>]*?)\s*\/>/g,(all,tag,attrs)=>['input','import'].includes(tag)?all:'<'+tag+attrs+'></'+tag+'>');return holder.content;}
for(const name of ['recipe','motion'])templates[name]=parse(SOURCES['/templates/'+name+'.wxml']).querySelector('template').content;
function renderNodes(nodes,scope,parent){let prior=false,chain=false;for(const node of nodes){if(node.nodeType===3){const text=String(value(node.textContent,scope)??'');if(text.trim())parent.append(document.createTextNode(text));continue;}if(node.nodeType!==1)continue;
  if(node.hasAttribute('wx:for')){const items=value(node.getAttribute('wx:for'),scope)||[];items.forEach((item,index)=>{const copy=node.cloneNode(true);copy.removeAttribute('wx:for');renderNodes([copy],{...scope,[node.getAttribute('wx:for-item')||'item']:item,[node.getAttribute('wx:for-index')||'index']:index},parent);});continue;}
  if(node.hasAttribute('wx:if')){chain=true;prior=!!value(node.getAttribute('wx:if'),scope);if(!prior)continue;}
  else if(node.hasAttribute('wx:elif')){if(prior)continue;prior=!!value(node.getAttribute('wx:elif'),scope);if(!prior)continue;}
  else if(node.hasAttribute('wx:else')){if(chain&&prior)continue;prior=true;}else{chain=false;prior=false;}
  const tag=node.tagName.toLowerCase();if(tag==='import')continue;if(tag==='template'){if(node.hasAttribute('is'))renderNodes(templates[node.getAttribute('is')].childNodes,scope,parent);continue;}if(tag==='block'){renderNodes(node.childNodes,scope,parent);continue;}
  const mapped={'view':'div','text':'span','scroll-view':'div','asset-image':'img','image':'img','switch':'input','radio':'input','radio-group':'div'}[tag]||tag;
  const el=document.createElement(mapped);
  for(const attr of node.attributes){const k=attr.name;if(k.startsWith('wx:')||k.startsWith('bind')||k.startsWith('catch'))continue;let v=value(attr.value,scope);if(v===undefined||v===null)continue;
    if(k==='class')el.className=v;else if(k==='style')el.style.cssText=String(v);else if(k==='checked'||k==='disabled'||k==='hidden')el[k]=!!v;else if(k==='value')el.value=v;else el.setAttribute(k,v);
  }
  if(tag==='switch'){el.type='checkbox';el.style.cssText='width:44px;height:28px;accent-color:var(--accent)';el.checked=!!value(node.getAttribute('checked')||'',scope);}
  if(tag==='radio'){el.type='radio';el.name=node.closest('radio-group')?.getAttribute('name')||'heat';}
  if(tag==='button')el.type=node.getAttribute('form-type')==='submit'?'submit':'button';
  if(tag==='asset-image'){el.setAttribute('data-asset-image','');el.src=value(node.getAttribute('path')||'',scope);el.style.cssText='display:block;width:100%;height:100%;object-fit:'+(node.getAttribute('mode')==='aspectFit'?'contain':node.getAttribute('mode')==='scaleToFill'?'fill':'cover')+';'+el.style.cssText;el.alt='';}
  if(tag==='scroll-view'){if(node.hasAttribute('scroll-x'))el.style.overflowX='auto';if(node.hasAttribute('scroll-y')){el.style.overflowY='auto';el.style.overflowX='hidden';}}
  el.__previewEvents=[];
  for(const attr of node.attributes){if(!/^(bind|catch)/.test(attr.name))continue;const original=attr.name.replace(/^(bind|catch):?/,'');const event={tap:'click',focus:'focus',blur:'blur',input:'input',change:'change',submit:'submit',scroll:'scroll',touchstart:'pointerdown',touchend:'pointerup',touchmove:'pointermove',touchcancel:'pointercancel',ready:'load'}[original];if(!event)continue;
    if(original==='touchstart'){el.style.touchAction=node.hasAttribute('catchtouchmove')?'none':'pan-y';el.style.userSelect='none';}
    const handler=e=>{
      const target=e.currentTarget;
      if(attr.name.startsWith('catch'))e.stopPropagation();
      if(event==='submit')e.preventDefault();
      if(event==='pointerdown'){
        if(e.button!==0||!e.isPrimary)return;
        target.__previewPointerId=e.pointerId;
        // Capturing a center-button tap on its parent would retarget the click
        // away from that button. Capture only direct wheel drags.
        if(!e.target.closest('button'))target.setPointerCapture(e.pointerId);
      }else if(event.startsWith('pointer')){
        if(target.__previewPointerId!==e.pointerId)return;
        if(event==='pointerup'||event==='pointercancel')target.__previewPointerId=null;
      }
      let v=tag==='switch'?target.checked:target.value;
      if(event==='submit')v=Object.fromEntries(new FormData(target));
      const point={clientX:e.clientX,clientY:e.clientY};
      const payload={currentTarget:{dataset:{...target.dataset}},detail:{value:v,path:target.getAttribute('path'),scrollLeft:target.scrollLeft,scrollTop:target.scrollTop},touches:event==='pointerup'||event==='pointercancel'?[]:[point],changedTouches:[point]};
      if(page[attr.value])page[attr.value](payload);
    };
    el.addEventListener(event,handler);el.__previewEvents.push([event,handler]);
  }
  parent.append(el);renderNodes(node.childNodes,scope,el);
}}
// Keep mounted nodes: replacing the wheel disc skips its CSS transition, and
// replacing an unchanged GIF restarts playback on unrelated state updates.
function patchChildren(current,next){
  const oldNodes=[...current.childNodes],newNodes=[...next.childNodes];
  for(let i=0;i<Math.max(oldNodes.length,newNodes.length);i++){
    const old=oldNodes[i],fresh=newNodes[i];
    if(!old){current.append(fresh);continue;}
    if(!fresh){old.remove();continue;}
    if(old.nodeType!==fresh.nodeType||old.nodeName!==fresh.nodeName){old.replaceWith(fresh);continue;}
    if(old.nodeType===3){if(old.nodeValue!==fresh.nodeValue)old.nodeValue=fresh.nodeValue;continue;}
    for(const attr of [...old.attributes])if(!fresh.hasAttribute(attr.name))old.removeAttribute(attr.name);
    for(const attr of fresh.attributes)if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
    for(const prop of ['value','checked','disabled'])if(prop in fresh&&old[prop]!==fresh[prop])old[prop]=fresh[prop];
    for(const [event,handler]of old.__previewEvents||[])old.removeEventListener(event,handler);
    old.__previewEvents=fresh.__previewEvents||[];
    for(const [event,handler]of old.__previewEvents)old.addEventListener(event,handler);
    patchChildren(old,fresh);
  }
}
function render(){
  if(rendering)return;rendering=true;window.__previewErrors=[];
  try{
    document.body.style.overflow=(page.data.wheelOpen||page.data.filtersOpen||page.data.addOpen)?'hidden':'';
    const next=document.createDocumentFragment();
    renderNodes(parse(SOURCES[pagePath+'.wxml']).childNodes,page.data,next);
    patchChildren(root,next);
    // Native scroll-view bindings need an explicit DOM scroll in this preview.
    root.querySelectorAll('[scroll-left]').forEach(el=>{
      const left=Number(el.getAttribute('scroll-left'))||0;
      if(el.__previewScrollTarget!==left){
        el.__previewScrollTarget=left;
        el.scrollTo({left,behavior:el.getAttribute('scroll-with-animation')==='true'?'smooth':'instant'});
      }
    });
  }finally{rendering=false;}
  if(page?.palette&&page?.data.wheelOpen)page.drawWheel?.();
}
function openPage(url){page?.onUnload?.();const [p,q]=url.split('?');pagePath=p;delete cache[p+'.js'];requireModule(p);page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(patch,done){for(const[k,v]of Object.entries(patch)){if(k.includes('.')){const [a,b]=k.split('.');this.data[a][b]=v;}else this.data[k]=v;}render();done?.();};
  let css=SOURCES['/app.wxss'].replace(/@import[^;]+;/g,'')+(SOURCES[p+'.wxss']||'').replace(/@import \"([^\"]+)\";/g,(_,file)=>SOURCES[normalize(p.slice(0,p.lastIndexOf('/')+1)+file)]||'');css=css.replace(/([^{}]+)\{/g,(_,selector)=>selector.replace(/(?<![\w.-])text(?![\w-])/g,'span').replace(/(?<![\w.-])view(?![\w-])/g,'div').replace(/(?<![\w.-])asset-image(?![\w-])/g,'img[data-asset-image]')+'{').replace(/\bpage\b/g,'body').replace(/(-?[\d.]+)rpx/g,(_,n)=>`calc(${n} * min(100vw, 620px) / 750)`);document.getElementById('page-style')?.remove();const style=document.createElement('style');style.id='page-style';style.textContent=SOURCES['/font.wxss']+css;document.head.append(style);page.onLoad?.(Object.fromEntries(new URLSearchParams(q)));page.onShow?.();page.onReady?.();render();page.drawWheel?.();window.__miniPage=page;scrollTo(0,0);
}
window.addEventListener('resize',()=>page?.onResize?.());
openPage('/pages/kitchen/index');
