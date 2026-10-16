// Browser-only layout/interaction review of the actual WXML and page controllers.
// This is not a replacement for WeChat DevTools or phone preview.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../miniprogram');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/'){
    const files=walk(root).filter(f=>/\.(js|wxss|wxml)$/.test(f)&&!path.relative(root,f).startsWith('media'));
    const sources=Object.fromEntries(files.map(f=>['/'+path.relative(root,f).replace(/\\/g,'/'),fs.readFileSync(f,'utf8')]));
    const runtime=fs.readFileSync(path.join(__dirname,'preview-runtime.js'),'utf8');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>不牛马厨房 · 小程序布局预览</title><style>html,body{margin:0}*{box-sizing:border-box}input,textarea,button{font:inherit}button{cursor:pointer}img{object-fit:cover}#review{position:fixed;right:4px;top:2px;font:9px sans-serif;color:#64736a;z-index:999;pointer-events:none}</style><div id="review">布局预览 · 非微信真机</div><main id="root"></main><script>window.SOURCES='+JSON.stringify(sources).replace(/</g,'\\u003c')+';</script><script>'+runtime+'</script>');
  }
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type',file.endsWith('.gif')?'image/gif':file.endsWith('.jpg')?'image/jpeg':'application/octet-stream');fs.createReadStream(file).pipe(res);
}).listen(8793,'127.0.0.1',()=>console.log('Mini-program layout preview: http://127.0.0.1:8793'));
