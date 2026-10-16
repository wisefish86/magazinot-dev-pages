import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd();
const dir=path.join(root,'pages');
const pages=fs.readdirSync(dir).filter(p=>p.endsWith('.html'));
const css=fs.readFileSync('magazinot_gen.css','utf8');
const js=fs.readFileSync('magazinot_gen.js','utf8');
const output=path.join(root,'visual-snapshots','review');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
const errors=[];
for(const name of pages){
  const html=fs.readFileSync(path.join(dir,name),'utf8');
  if(!html.includes('mk-ui'))continue;
  for(const size of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
    const page=await browser.newPage({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,reducedMotion:'reduce'});
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.route('https://visual-qa.local/**',route=>{
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+html+'</body></html>'});
      const mapped=pathname.startsWith('/assets/')?path.join(root,'site-assets',pathname.slice('/assets/'.length)):null;
      if(mapped&&mapped.startsWith(path.join(root,'site-assets')+path.sep)&&fs.existsSync(mapped)&&fs.statSync(mapped).isFile()){
        const ext=path.extname(mapped);
        const contentType=ext==='.json'?'application/json':ext==='.svg'?'image/svg+xml':ext==='.png'?'image/png':ext==='.jpg'?'image/jpeg':'application/octet-stream';
        return route.fulfill({status:200,contentType,body:fs.readFileSync(mapped)});
      }
      return route.fulfill({status:404,body:''});
    });
    await page.goto('https://visual-qa.local/',{waitUntil:'domcontentloaded'});
    await page.addScriptTag({content:js});
    await page.waitForTimeout(250);
    // Full-page screenshots bypass the viewport's normal lazy-loading trigger.
    // Force all images to decode so that invisible off-screen icons do not pass QA.
    await page.evaluate(async()=>{
      const images=[...document.querySelectorAll('img')];
      images.forEach(img=>{img.loading='eager';});
      await Promise.all(images.map(img=>img.decode().catch(()=>{})));
      if(document.fonts?.ready)await document.fonts.ready;
    });
    const faqGap=await page.evaluate(()=>{
      const header=[...document.querySelectorAll('.ui-section__title')].find(el=>el.textContent.trim()==='Частые вопросы');
      const question=header?.closest('.ui-section')?.querySelector('.ui-accordion details:first-child summary > span');
      return header&&question?Math.round(question.getBoundingClientRect().top-header.getBoundingClientRect().bottom):null;
    });
    if(faqGap!==null&&faqGap>28)errors.push(name+'/'+size.name+': FAQ heading-to-first-question gap '+faqGap+'px > 28px');
    const stats=await page.evaluate(()=>{
      const width=innerWidth;
      const overflowing=[...document.querySelectorAll('body *')].filter(el=>{
        const r=el.getBoundingClientRect();
        const style=getComputedStyle(el);
        return r.width>0&&r.right>width+5&&style.position!=='fixed'&&el.scrollWidth<=el.clientWidth+3;
      }).slice(0,8).map(el=>el.tagName.toLowerCase()+'.'+String(el.className).slice(0,70));
      return {documentWidth:document.documentElement.scrollWidth,viewportWidth:width,overflowing,
        markerTabs:document.querySelectorAll('[data-marker-tabs] [role="tab"]').length,
        missingImages:[...document.querySelectorAll('img')].filter(el=>!el.naturalWidth).length,
        missingImageUrls:[...document.querySelectorAll('img')].filter(el=>!el.naturalWidth).map(el=>({src:el.getAttribute('src'),visible:!!el.getClientRects().length})).slice(0,30),
        missingHazardSigns:[...document.querySelectorAll('.ui-marker-catalog__legend-item img')].filter(el=>!el.naturalWidth).map(el=>el.getAttribute('src'))};
    });
    const file=name.slice(0,-5)+'-'+size.name+'.png';
    await page.screenshot({path:path.join(output,file),fullPage:true,animations:'disabled'});
    results.push({page:name,viewport:size.name,screenshot:file,faqGap,...stats,pageErrors});
    if(stats.missingHazardSigns.length)
      errors.push(name+'/'+size.name+': hazard legend icons not loaded: '+stats.missingHazardSigns.join(', '));
    if(stats.documentWidth>size.width+4)errors.push(name+'/'+size.name+': horizontal overflow '+stats.documentWidth+' > '+size.width);
    if(pageErrors.length)errors.push(name+'/'+size.name+': '+pageErrors.join('; '));
    await page.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({generatedAt:new Date().toISOString(),results,errors},null,2));
console.log('Visual QA: '+results.length+' full-page screenshots; '+errors.length+' blocking errors');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
