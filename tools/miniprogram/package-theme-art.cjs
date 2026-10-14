// Mechanical atlas slicing/resizing only; original artwork comes from imagegen.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..');
const {themes}=require('./pet-themes.cjs');
async function main(){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'上线资料/宠物主题/素材清单.json'),'utf8'));
  const report=[];
  for(const theme of themes){
    const source=path.join(root,manifest[theme.id].atlas);
    const meta=await sharp(source).metadata();
    if(!meta.hasAlpha)throw new Error(theme.id+' needs alpha transparency');
    const names=['home','library','ingredients','mine',null,'spin'];
    for(let i=0;i<6;i++){
      if(!names[i])continue;
      const left=Math.round((i%2)*meta.width/2),top=Math.round(Math.floor(i/2)*meta.height/3);
      const width=Math.round(((i%2)+1)*meta.width/2)-left,height=Math.round((Math.floor(i/2)+1)*meta.height/3)-top;
      const cell=await sharp(source).extract({left,top,width,height}).png().toBuffer();
      const {data,info}=await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let x0=width,y0=height,x1=0,y1=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
      if(x1<=x0||y1<=y0)throw new Error(theme.id+' empty '+names[i]);
      const padding=8;x0=Math.max(0,x0-padding);y0=Math.max(0,y0-padding);x1=Math.min(width-1,x1+padding);y1=Math.min(height-1,y1+padding);
      const size=i===4?200:96;
      const dest=path.join(root,'miniprogram',theme.assets[names[i]]);fs.mkdirSync(path.dirname(dest),{recursive:true});
      await sharp(cell).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(size,size,{fit:'contain',background:'#00000000'}).png({palette:true,colours:128,effort:10}).toFile(dest);
      report.push({theme:theme.id,asset:names[i],bytes:fs.statSync(dest).size,size});
    }
  }
  fs.writeFileSync(path.join(__dirname,'.generated/theme-art-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({assets:report.length,totalBytes:report.reduce((s,r)=>s+r.bytes,0)}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
