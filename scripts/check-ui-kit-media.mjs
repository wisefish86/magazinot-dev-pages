import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const html=fs.readFileSync('pages/ui-kit.html','utf8');
const base='site-assets';
const urls=[...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]);
if(urls.length<30)throw Error('UI Kit should contain at least 30 demonstration/source images; got '+urls.length);
const remote=urls.filter(url=>/^https?:\/\//i.test(url));
if(remote.length)throw Error('Remote image hotlinks not allowed in UI Kit: '+remote.join(', '));
const unique=[...new Set(urls)];
for(const url of unique){
  if(!url.startsWith('/assets/')||url.includes('..')||url.includes('?'))throw Error('Invalid image path: '+url);
  const filename=path.resolve(base,url.slice('/assets/'.length));
  if(!filename.startsWith(path.resolve(base)+path.sep))throw Error('Image path escapes assets root: '+url);
  if(!fs.existsSync(filename))throw Error('Image file absent: '+filename);
  const bytes=fs.readFileSync(filename);
  if(bytes.length<500)throw Error('Unexpectedly small image: '+url);
  if(filename.endsWith('.jpg')||filename.endsWith('.jpeg')){
    if(bytes[0]!==0xff||bytes[1]!==0xd8)throw Error('Invalid JPEG: '+url);
  }else if(filename.endsWith('.svg')){
    if(!bytes.subarray(0,300).toString('utf8').includes('<svg'))throw Error('Invalid SVG: '+url);
  }else if(filename.endsWith('.png')){
    if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG: '+url);
  }else throw Error('Unrecognized image extension: '+url);
}
console.log('UI Kit local media: '+urls.length+' usages, '+unique.length+' unique images, verified locally.');

if(process.argv.includes('--http')){
  const origin='https://magazinot.ru';
  let failures=[];
  for(const url of unique){
    const expected=fs.readFileSync(path.join(base,url.slice('/assets/'.length)));
    try{
      const result=await fetch(origin+url,{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
      if(!result.ok)throw Error('HTTP '+result.status);
      const data=Buffer.from(await result.arrayBuffer());
      if(data.length!==expected.length||crypto.createHash('sha256').update(data).digest('hex')!==crypto.createHash('sha256').update(expected).digest('hex'))throw Error('body differs from GitHub source ('+data.length+' vs '+expected.length+' bytes)');
      console.log('OK '+url+' '+data.length+' bytes');
    }catch(error){failures.push(url+': '+error.message)}
  }
  if(failures.length)throw Error('Public FTP assets verification failed:\n'+failures.join('\n'));
  console.log('All '+unique.length+' local media files accessible at '+origin+'/assets/');
}
