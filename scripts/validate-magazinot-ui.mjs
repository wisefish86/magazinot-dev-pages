import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const pagesDir=path.join(root,'pages');
const css=fs.readFileSync(path.join(root,'magazinot_gen.css'),'utf8');
const js=fs.readFileSync(path.join(root,'magazinot_gen.js'),'utf8');

// Syntax must be checked before any FTP publish; basic string-presence tests cannot detect a broken bundle.
try{
  execFileSync(process.execPath,['--check',path.join(root,'magazinot_gen.js')],{stdio:'pipe'});
}catch(error){
  console.error('Shared JavaScript syntax error:\\n'+String(error.stderr || error.message));
  process.exit(1);
}


function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

const deprecated=[
  'pipehub__docs-main',
  'pipehub__docs-main-chevron',
  'pipehub__doc-icon',
  'pipehub__docs-list',
  'pipehub__docrow',
  'pipehub__docrow-icon',
  'pipehub__doc-count',
  'pipehub__doc-chevron',
  'pipehub__faq',
  'pipehub__faq-chevron',
  'pipehub__faq-panel',
  'pipehub__faq-panel-inner'
];

// Shared SVG symbols are canonical: page references must resolve to an existing ID.
const iconSource=fs.readFileSync(path.join(root,'site-assets/icons/ui-icons.svg'),'utf8');
const iconIds=new Set([...iconSource.matchAll(/<symbol\s+id="([^"]+)"/g)].map(m=>m[1]));
const errors=[];
for(const file of walk(pagesDir)){
  const html=fs.readFileSync(file,'utf8');
  if(!/class="[^"]*\bmk-ui\b/.test(html)) continue;
  const rel=path.relative(root,file);

  if(!/data-ui-page-title=/.test(html)) errors.push(rel+': missing data-ui-page-title after UI injection');
  if(!html.includes('<!-- AUTO:MAGAZINOT_UI_JS -->')) errors.push(rel+': missing shared UI injection');

  const withoutInjected=html.replace(/<!-- AUTO:MAGAZINOT_UI_JS -->[\s\S]*?<!-- \/AUTO:MAGAZINOT_UI_JS -->/g,'');
  if(/<script\b/i.test(withoutInjected)) errors.push(rel+': contains page-local <script>');
  if(/<style\b/i.test(html)) errors.push(rel+': contains page-local <style>');

  for(const m of html.matchAll(/ui-icons\.svg#([a-z0-9-]+)/gi)){
    if(!iconIds.has(m[1])) errors.push(rel+': missing shared icon '+m[1]);
  }

  for(const cls of deprecated){
    if(html.includes(cls)) errors.push(rel+': deprecated reusable class '+cls);
  }
}

const defs=new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m=>m[1]));
const uses=[...css.matchAll(/var\((--[a-z0-9-]+)/gi)].map(m=>m[1]);
for(const name of new Set(uses.filter(name=>!defs.has(name)))){
  errors.push('magazinot_gen.css: undefined custom property '+name);
}

for(const required of ['function initPageTitle','function initAccordion','initPageTitle();','initAccordion();']){
  if(!js.includes(required)) errors.push('magazinot_gen.js: missing '+required);
}

// Every reusable class found on a page must also be demonstrated in the living UI Kit.
// Inspect source HTML only, not the auto-injected shared JS bundle.
const uiKit=fs.readFileSync(path.join(pagesDir,'ui-kit.html'),'utf8');
const kitClasses=new Set([...uiKit.matchAll(/class="([^"]+)"/g)].flatMap(match=>match[1].split(/\s+/)));
for(const file of walk(pagesDir)){
  if(path.basename(file)==='ui-kit.html') continue;
  const html=fs.readFileSync(file,'utf8').replace(/<!-- AUTO:MAGAZINOT_UI_JS -->[\s\S]*?<!-- \/AUTO:MAGAZINOT_UI_JS -->/g,'');
  if(!/class="[^"]*\bmk-ui\b/.test(html)) continue;
  const found=new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(match=>match[1].split(/\s+/)));
  for(const className of found){
    if(/^(?:ui-|docpage|normpage)/.test(className) && !kitClasses.has(className)){
      errors.push(path.relative(root,file)+': component class missing from UI Kit: '+className);
    }
  }
}
if(/\.docpage__toc(?:\b|[-_])/.test(css)){
  errors.push('magazinot_gen.css: legacy docpage__toc selector must not return');
}

for(const token of ['neutral-0','neutral-50','neutral-100','neutral-200','neutral-300','neutral-600','neutral-900']){
  if(!css.includes('--'+token+':')) errors.push('magazinot_gen.css: missing canonical neutral token --'+token);
}
for(const alias of ['--table-head:var(--neutral-100)','--table-grid:var(--neutral-200)','--table-row-alt:var(--neutral-50)','--table-row-hover:var(--neutral-100)']){
  if(!css.includes(alias)) errors.push('magazinot_gen.css: table style must use canonical neutral alias '+alias);
}
for(const legacy of ['#eaf2f5','#e3eaed','#eaf3f5','#dcebed']){
  if(css.toLowerCase().includes(legacy)) errors.push('magazinot_gen.css: legacy table gray must use a canonical token: '+legacy);
}
if(!/26&#215;74 мм/.test(uiKit) || /\d+\?\d+ мм/.test(uiKit)){
  errors.push('UI Kit: dimensions must use the transport-safe &#215; multiplication sign');
}

// The UI Kit is the human-facing icon registry: every SVG symbol must appear there.
const spriteIds=[...iconSource.matchAll(/<symbol\s+id="([^"]+)"/g)].map(m=>m[1]);
if(spriteIds.length!==iconIds.size) errors.push('site-assets/icons/ui-icons.svg: duplicated symbol ID');
for(const id of spriteIds) {
  if(!uiKit.includes('ui-icons.svg#'+id)) errors.push('UI Kit: icon missing from gallery: '+id);
}

// No repeated inline icon paths in pages or reusable JS: use the central sprite.
for(const file of walk(pagesDir)){
  if(path.basename(file)==='markirovka-strelki-calculator-original.html') continue;
  const html=fs.readFileSync(file,'utf8').replace(/<!-- AUTO:MAGAZINOT_UI_JS -->[\s\S]*?<!-- \/AUTO:MAGAZINOT_UI_JS -->/g,'');
  for(const found of html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)){
    if(!found[0].includes('<use')) errors.push(path.relative(root,file)+': inline SVG without a sprite reference');
  }
}
for(const found of js.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)){
  if(!found[0].includes('<use'))errors.push('magazinot_gen.js: inline SVG must use a sprite symbol');
}
const normDocs=JSON.parse(fs.readFileSync(path.join(root,'site-assets/data/markirovka/markirovka-normdocs.json'),'utf8'));
for(const item of [normDocs.primary,...normDocs.sectors]){
  if(!iconIds.has(item.iconId))errors.push('Normative registry references missing icon: '+item.iconId);
}
if(errors.length){
  console.error('UI validation failed:\n- '+errors.join('\n- '));
  process.exit(1);
}
console.log('UI validation passed for all mk-ui pages');
