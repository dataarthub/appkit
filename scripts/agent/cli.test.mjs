import test from 'node:test';import assert from 'node:assert/strict';import {runCli} from './cli.mjs';import {temp,install} from './test-fixtures.mjs';
function run(root,args){let out='',err='';const code=runCli(args,{stdout:{write:s=>out+=s},stderr:{write:s=>err+=s},cwd:root,bundledCoreDir:root+'/missing'});return {code,out,err};}
test('JSON is one envelope and usage, missing catalog and empty query results have stable codes',()=>temp(root=>{
 install(root);let r=run(root,['search','validate','--json']);assert.equal(r.code,0);const json=JSON.parse(r.out);assert.equal(json.schemaVersion,1);assert.equal(json.results[0].symbol,'validate');assert.equal(r.err,'');
 assert.equal(run(root,['search','none','--json']).code,0);
 for(const args of [['search','x','--bad'],['search','x','--limit','0'],['search'],['search','x','--limit','1.1']])assert.equal(run(root,args).code,2);
 assert.equal(run(root,['search','x','--package','react','--json']).code,3);
 assert.equal(run(root,['--help']).code,0);assert.match(run(root,['--version']).out,/appkit-api/);
}));
test('show infers the requested React package and refuses a missing or legacy catalog',()=>temp(root=>{
 install(root);for(const legacy of [false,true]){if(legacy)install(root,'@alneas/appkit-react',{legacy:true});const result=run(root,['show','@alneas/appkit-react/ui','--json']);assert.equal(result.code,3);assert.equal(JSON.parse(result.out).ok,false);}
}));
