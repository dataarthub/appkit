import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {loadCatalogs} from './load-catalogs.mjs';
import {searchCatalogs,showCatalogEntry} from './search.mjs';
const usage='appkit-api search <query> [--package core|react|all] [--root <directory>] [--limit 1..100] [--json]\nappkit-api show <public-import> [--symbol <name>] [--root <directory>] [--json]\n';
export function runCli(argv,{stdout,stderr,cwd,bundledCoreDir}){
 let json=argv.includes('--json');
 const emit=(value,code)=>{if(json)stdout.write(JSON.stringify(value)+'\n');else if(!value.ok)stderr.write(value.message+'\n');else for(const r of value.results)stdout.write(`${r.importPath}${r.symbol?' :: '+r.symbol:''} (${r.packageVersion})\n${r.signatures.join('\n')}\n${r.summary}\n${r.requirements.guide}\n`.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g,''));return code;};
 const fail=(code,message,exit=2,unavailablePackages=[])=>emit({schemaVersion:1,ok:false,searchedPackages:[],unavailablePackages,results:[],code,message},exit);
 if(argv.length===1&&argv[0]==='--help'){stdout.write(usage);return 0;}
 if(argv.length===1&&argv[0]==='--version'){let version='unknown';try{version=JSON.parse(readFileSync(path.join(bundledCoreDir,'package.json'),'utf8')).version;}catch{}stdout.write('appkit-api '+version+'\n');return 0;}
 const [command,...rest]=argv,options={root:cwd,package:'all',limit:'20'},positionals=[];
 if(!['search','show'].includes(command))return fail('INVALID_USAGE',usage);
 for(let i=0;i<rest.length;i++){
  const arg=rest[i];if(arg==='--json')continue;
  if(arg.startsWith('--')){const key=arg.slice(2);if(!['root','package','limit','symbol'].includes(key)||!rest[i+1]||rest[i+1].startsWith('--'))return fail('INVALID_USAGE','Invalid option; use --help.');options[key]=rest[++i];}
  else positionals.push(arg);
 }
 if(positionals.length!==1||!['core','react','all'].includes(options.package)||!/^\d+$/.test(options.limit)||Number(options.limit)<1||Number(options.limit)>100||command==='search'&&options.symbol||command==='show'&&(options.package!=='all'||options.limit!=='20'))return fail('INVALID_USAGE','Invalid arguments; use --help.');
 if(command==='show'){const name=positionals[0];if(name==='@alneas/appkit-react'||name.startsWith('@alneas/appkit-react/'))options.package='react';else if(name==='@alneas/appkit-core'||name.startsWith('@alneas/appkit-core/'))options.package='core';}
 let state;
 try{if(!statSync(options.root).isDirectory())throw Error();state=loadCatalogs({root:options.root,scope:options.package,bundledCoreDir});}catch{return fail('INVALID_ROOT','Select an existing consumer directory.');}
 if(!state.loaded.length||options.package!=='all'&&state.unavailable.length)return fail('CATALOG_UNAVAILABLE','Requested catalog is unavailable. Install a compatible package; legacy 0.1.0 has no catalog.',3,state.unavailable);
 try{
  const results=command==='search'?searchCatalogs(state.loaded,positionals[0],Number(options.limit)):showCatalogEntry(state.loaded,positionals[0],options.symbol);
  return emit({schemaVersion:1,ok:true,searchedPackages:state.loaded.map(({catalog:c,source})=>({packageName:c.packageName,packageVersion:c.packageVersion,inputDigest:c.inputDigest,source})),unavailablePackages:state.unavailable,results},0);
 }catch{return fail('INVALID_USAGE','Invalid query or limit; use --help.');}
}
