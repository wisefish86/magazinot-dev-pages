import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagesDir = path.join(root, 'pages');
const sharedJs = fs.readFileSync(path.join(root, 'magazinot_gen.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const markerRe = /<!-- AUTO:MAGAZINOT_UI_JS -->[\s\S]*?<!-- \/AUTO:MAGAZINOT_UI_JS -->/g;

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
    const full = path.join(dir,entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}
function escAttr(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
function devTitle(html){
  const match = html.match(/<!--\s*dev-title\s*:\s*([^]*?)-->/i);
  return match ? match[1].trim() : '';
}

let count=0;
for(const file of walk(pagesDir)){
  let html = fs.readFileSync(file,'utf8');
  if (!/class="[^"]*\bmk-ui\b/.test(html)) continue;
  html = html.replace(markerRe,'').trimEnd();
  const title = devTitle(html);
  if (title && !/data-ui-page-title=/.test(html)) {
    html = html.replace(/<div class="([^"]*\bmk-ui\b[^"]*)"/, match => match + ' data-ui-page-title="' + escAttr(title) + '"');
  }
  html += '\n\n<!-- AUTO:MAGAZINOT_UI_JS -->\n<script>\n' + sharedJs + '\n</script>\n<!-- /AUTO:MAGAZINOT_UI_JS -->\n';
  fs.writeFileSync(file,html,'utf8');
  count++;
}
console.log('Injected shared UI into ' + count + ' pages');
