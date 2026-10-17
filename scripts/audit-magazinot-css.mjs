import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// Use the browser's CSS parser, rather than treating declaration bodies as selectors.
// This is a conservative inventory check: source references include runtime templates
// and tests, while the historical class map must never count as live usage.
const root=process.cwd();
const css=fs.readFileSync(path.join(root,'magazinot_gen.css'),'utf8');
const sources=[];
function collect(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())collect(full);
    else if(/\.(?:html|js|mjs|json|svg)$/.test(entry.name)&&entry.name!=='ui-class-map.json'){
      sources.push(fs.readFileSync(full,'utf8')
        .replace(/<!-- AUTO:MAGAZINOT_UI_JS -->[\s\S]*?<!-- \/AUTO:MAGAZINOT_UI_JS -->/g,''));
    }
  }
}
for(const dir of ['pages','scripts','site-assets'])collect(path.join(root,dir));
sources.push(fs.readFileSync(path.join(root,'magazinot_gen.js'),'utf8'));
const referenced=new Set(sources.join('\n').match(/(?<![\w-])mot-[a-zA-Z0-9_-]+/g)||[]);
const browser=await chromium.launch({headless:true});
let inventory;
try{
  const page=await browser.newPage();
  // Inventory never fetches fonts, imports or remote resources.
  await page.route('**/*',route=>route.abort());
  await page.setContent('<!doctype html><html><head></head><body></body></html>');
  inventory=await page.evaluate(css=>{
    const sheet=new CSSStyleSheet();
    sheet.replaceSync(css.replace(/@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/g,''));
    const rules=[];
    function walk(items,context=[]){
      for(const rule of items){
        if(rule.type===CSSRule.STYLE_RULE){
          rules.push({selector:rule.selectorText,body:rule.style.cssText,context});
        }else if(rule.cssRules&&rule.type!==CSSRule.KEYFRAMES_RULE){
          const header=rule.cssText.slice(0,rule.cssText.indexOf('{')).trim();
          walk(rule.cssRules,[...context,header]);
        }
      }
    }
    walk(sheet.cssRules);
    return rules;
  },css);
}finally{await browser.close();}

const components=new Set(inventory.flatMap(rule=>
  [...rule.selector.matchAll(/\.(mot-[a-zA-Z0-9_-]+)/g)].map(match=>match[1])));
const unused=[...components].filter(name=>!referenced.has(name)).sort();
const seen=new Set();
const duplicateRules=[];
for(const rule of inventory){
  const key=JSON.stringify([rule.context,rule.selector,rule.body]);
  if(seen.has(key))duplicateRules.push(rule);
  seen.add(key);
}
console.log(`CSS inventory: ${inventory.length} rules; ${components.size} component classes; ${unused.length} unreferenced classes; ${duplicateRules.length} exact duplicate rules.`);
for(const name of unused)console.error('Unreferenced component class: '+name);
for(const rule of duplicateRules)console.error('Duplicate CSS rule: '+[...rule.context,rule.selector].join(' / '));
if(process.argv.includes('--check')&&(unused.length||duplicateRules.length))process.exitCode=1;
