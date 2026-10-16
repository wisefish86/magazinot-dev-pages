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
if(process.argv.includes('--check')){
  if(output!==css)throw Error('Marker colors are out of sync. Run node scripts/sync-medium-colors.mjs');
  console.log('Marking palette synchronized');
}else{
  if(css!==output)fs.writeFileSync(cssFile,output,'utf8');
  console.log('Marking palette generated from '+tokenFile);
}
