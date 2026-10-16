import fs from 'node:fs';
const tokenFile='site-assets/data/markirovka/medium-colors.json';
const cssFile='magazinot_gen.css';
const categories=JSON.parse(fs.readFileSync(tokenFile,'utf8')).categories;
const expected=['water','steam','air','gas','acid','alkali','liquid','other'];
const color=/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;
if(JSON.stringify(Object.keys(categories))!==JSON.stringify(expected)) throw Error('Unexpected medium palette keys/order');
const tokens=expected.map(id=>{
  const item=categories[id];
  if(!color.test(item.background)||!color.test(item.text)) throw Error('Invalid color for '+id);
  return '  --medium-'+id+':'+item.background+';\n  --medium-'+id+'-text:'+item.text+';';
}).join('\n');
const begin='  /* BEGIN GENERATED MARKER PALETTE — edit site-assets/data/markirovka/medium-colors.json */';
const end='  /* END GENERATED MARKER PALETTE */';
const css=fs.readFileSync(cssFile,'utf8');
const start=css.indexOf(begin);
const finish=css.indexOf(end,start);
if(start<0||finish<0) throw Error('CSS token markers missing');
const output=css.slice(0,start)+begin+'\n'+tokens+'\n'+end+css.slice(finish+end.length);
const targets=[
  'site-assets/data/pipemarkers-demo.json',
  'site-assets/data/ui-kit-marker-demo.json',
  ...['water','steam','air','gas'].map(x=>'site-assets/data/pipemarkers/'+x+'.json')
];
let mismatch=[];
for(const filename of targets){
  const current=fs.readFileSync(filename,'utf8');
  let result=current;
  for(const id of expected){
    const pattern=new RegExp('("id"\\\\s*:\\\\s*"'+id+'"[\\\\s\\\\S]*?"color"\\\\s*:\\\\s*")[^"]+("[\\\\s\\\\S]*?"textColor"\\\\s*:\\\\s*")[^"]+(")');
    result=result.replace(pattern,(match,prefix,middle,suffix)=>prefix+categories[id].background+middle+categories[id].text+suffix);
  }
  JSON.parse(result);
  if(result!==current){
    mismatch.push(filename);
    if(!process.argv.includes('--check'))fs.writeFileSync(filename,result,'utf8');
  }
}
if(process.argv.includes('--check') && mismatch.length)throw Error('Catalog colors out of sync: '+mismatch.join(', '));
if(process.argv.includes('--check')){
  if(output!==css)throw Error('Marker colors are out of sync. Run node scripts/sync-medium-colors.mjs');
  console.log('Marking palette synchronized');
}else{
  if(css!==output)fs.writeFileSync(cssFile,output,'utf8');
  console.log('Marking palette generated from '+tokenFile);
}
