import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const pagesDir=path.join(root,'pages');
const css=fs.readFileSync(path.join(root,'magazinot_gen.css'),'utf8');
const js=fs.readFileSync(path.join(root,'magazinot_gen.js'),'utf8');

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

if(errors.length){
  console.error('UI validation failed:\n- '+errors.join('\n- '));
  process.exit(1);
}
console.log('UI validation passed for all mk-ui pages');
