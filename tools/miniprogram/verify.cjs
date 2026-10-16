const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const dir=path.join(root,'miniprogram');
const app=JSON.parse(fs.readFileSync(path.join(dir,'app.json'),'utf8'));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(dir), packages={main:0};
for(const p of app.subPackages)packages[p.root]=0;
for(const file of files){
  const rel=path.relative(dir,file).replace(/\\/g,'/');
  if(/\.(md|txt)$/.test(file))continue;
  const pkg=app.subPackages.find(p=>rel.startsWith(p.root+'/'));
  packages[pkg?pkg.root:'main']+=fs.statSync(file).size;
  if(file.endsWith('.json'))JSON.parse(fs.readFileSync(file,'utf8'));
  if(file.endsWith('.js'))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
  if(file.endsWith('.js'))assert(!fs.readFileSync(file,'utf8').includes('wx.loadSubpackage'),rel+' must not use the game-only loading API');
}
for(const [name,size]of Object.entries(packages))assert(size<2*1024*1024,`${name} exceeds 2 MiB: ${size}`);
const total=Object.values(packages).reduce((a,b)=>a+b,0);assert(total<30*1024*1024);
const {recipes,references}=require('../../miniprogram/data/recipes');
const options=require('../../miniprogram/data/options');
const {themes}=require('../../miniprogram/data/themes');
const credits=require('../../miniprogram/info/credits');
assert.equal(recipes.length,800);assert.equal(new Set(recipes.map(r=>r.id)).size,800);
assert.equal(new Set(recipes.map(r=>r.name)).size,800);
for(const pkg of app.subPackages.filter(p=>p.root.startsWith('media')||p.root==='petmotion').map(p=>p.root))assert(fs.existsSync(path.join(dir,pkg,'ready.js')),'asset package readiness module missing: '+pkg);
assert.equal(options.mascotPresets.length,4);assert.equal(themes.length,4);
for(const theme of themes){assert(options.mascotPresets.some(p=>p.id===theme.petId));for(const asset of Object.values(theme.assets))assert(fs.existsSync(path.join(dir,asset)),asset+' missing theme asset');}
for(const r of recipes){
  assert(r.method.steps.length>=4,r.name+' steps');assert(r.method.tip,r.name+' tip');
  assert(r.method.sources.length,r.name+' references');
  for(const i of r.method.sources)assert(references[i]?.url,r.name+' missing reference');
  assert(fs.existsSync(path.join(dir,r.image)),r.name+' missing image');
  assert(credits[r.creditId]?.author,r.name+' missing image credit');
}
for(const p of options.mascotPresets)for(const key of ['atlas','preview'])assert(p[key]&&fs.existsSync(path.join(dir,p[key])),p.id+' missing '+key);
for(const theme of themes)assert(fs.existsSync(path.join(dir,'assets/themes',theme.id,'tap-hand.png')),theme.id+' missing tap hint');
for(const theme of themes)for(let count=1;count<=8;count++)assert(fs.existsSync(path.join(dir,'assets/wheels',theme.id,count+'.png')));
for(const p of [...app.pages,...app.subPackages.flatMap(p=>p.pages.map(page=>p.root+'/'+page))])for(const ext of ['js','json','wxml'])assert(fs.existsSync(path.join(dir,p+'.'+ext)),p+'.'+ext);
const component=JSON.parse(fs.readFileSync(path.join(dir,'components/asset-image/index.json'),'utf8'));
assert(!app.usingComponents?.['asset-image'],'The async image dispatcher must not be inherited by its own subpackage components');
for(const page of app.pages){const config=JSON.parse(fs.readFileSync(path.join(dir,page+'.json'),'utf8'));assert.equal(config.usingComponents?.['asset-image'],'/components/asset-image/index');}
for(const pkg of app.subPackages.filter(p=>p.root.startsWith('media')||p.root==='petmotion')){assert.equal(component.componentPlaceholder[pkg.root],'view');assert.equal(component.usingComponents[pkg.root],'/'+pkg.root+'/image');}
const report={recipes:800,uniqueImages:new Set(recipes.map(r=>r.image)).size,mascots:4,themes:themes.length,packages,totalBytes:total};
fs.mkdirSync(path.join(__dirname,'.generated'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'.generated/package-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
// Optional native compilers shipped in Tencent miniprogram-ci; never uploads.
if(process.env.MINIPROGRAM_CI_DIR){
  (async()=>{
    const base=path.join(process.env.MINIPROGRAM_CI_DIR,'dist/modules/fullcompiler/trans/wcc/lib');
    for(const [name,extension] of [['wcc','.wxml'],['wcsc','.wxss']]){
      const compile=require(path.join(base,name));
      const names=files.filter(f=>f.endsWith(extension)).map(f=>'./'+path.relative(dir,f).replace(/\\/g,'/'));
      const result=await compile({cwd:dir,files:names,pageCount:names.length,lazyload:false});
      assert(result,`${name} empty result`);console.log(`${name}: ${names.length} files compiled`);
    }
  })().catch(err=>{console.error(err);process.exitCode=1;});
}
