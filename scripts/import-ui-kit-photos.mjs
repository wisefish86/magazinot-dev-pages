/**
 * One-time DEV media import. The user-facing UI never hotlinks third-party images.
 * Run in GitHub Actions with repository write access; commit downloaded JPEGs.
 * Source URLs and attribution are documented in site-assets/img/ui-kit-demo/SOURCES.md.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const root='site-assets/img/ui-kit-demo';
const photos=[
  ['factory.jpg', '33813584', 'photo-1581094794329-c8112a89af12'],
  ['pipes.jpg', '12380628', 'photo-1565514020179-026b92b84bb6'],
  ['equipment.jpg', '10119310', 'photo-1581092580497-e0d23cbdf1dc'],
  ['workshop.jpg', '18569751', 'photo-1581094794329-c8112a89af12'],
  ['product.jpg', '16630111', 'photo-1581092580497-e0d23cbdf1dc'],
  ['materials.jpg', '12826695', 'photo-1565514020179-026b92b84bb6'],
  ['exit-sign.jpg', '29398063', 'photo-1581092580497-e0d23cbdf1dc'],
  ['glow-sign.jpg', '3861798', 'photo-1581094794329-c8112a89af12']
];

async function download(filename, urls){
  const target=path.join(root,filename);
  let last='';
  for(const source of urls){
    try{
      const response=await fetch(source, {
        signal:AbortSignal.timeout(22000),
        headers:{'Accept':'image/jpeg','User-Agent':'MagazinOT-Dev-Media-Importer/1.0'}
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const body=Buffer.from(await response.arrayBuffer());
      if(body.length<10000||body.length>5500000||body[0]!==0xff||body[1]!==0xd8)throw Error('not a valid bounded JPEG: '+body.length);
      await fs.writeFile(target,body);
      console.log(filename+': '+body.length+' JPEG bytes from '+new URL(source).hostname);
      return source;
    }catch(error){
      last=error.message;
      console.warn(filename+': '+new URL(source).hostname+' failed: '+last);
    }
  }
  throw Error('Cannot import '+filename+': '+last);
}
await fs.mkdir(root,{recursive:true});
const logs=[];
for(const [file,pexelsId,unsplashId] of photos){
  const sources=[
    'https://images.pexels.com/photos/'+pexelsId+'/pexels-photo-'+pexelsId+'.jpeg?w=1400',
    'https://images.unsplash.com/'+unsplashId+'?w=1400&q=80&fm=jpg'
  ];
  const source=await download(file,sources);
  logs.push(file+' | '+source);
}
await fs.writeFile(path.join(root,'PHOTO-SOURCES.md'),
  '# DEV photo originals\n\nDownloaded and committed to the MagazinOT GitHub repository. These photos are demo-only, **not actual products or normative diagrams**. Never serve them via remote hotlinks.\n\n'+
  logs.map(s=>'- '+s).join('\n')+'\n\nPexels: https://www.pexels.com/license/ ; Unsplash: https://unsplash.com/license . Verify the precise photo/license before production use.\n');
