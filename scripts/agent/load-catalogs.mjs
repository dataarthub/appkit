import {readFileSync,existsSync,realpathSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {PACKAGE_NAMES,MAX_CATALOG_BYTES,relativePath,validateCatalog} from './catalog-contract.mjs';
function packageRoot(resolver,name){
 for(const specifier of [name+'/api-index.json',name+'/package-context.json',name]){
  try{let dir=path.dirname(resolver.resolve(specifier));while(true){const manifest=path.join(dir,'package.json');if(existsSync(manifest)&&JSON.parse(readFileSync(manifest,'utf8')).name===name)return dir;const parent=path.dirname(dir);if(parent===dir)break;dir=parent;}}catch{}
 }
 for(const base of resolver.resolve.paths(name)??[]){const dir=path.join(base,name);if(existsSync(path.join(dir,'package.json')))return realpathSync(dir);}
 return undefined;
}
function readCatalog(dir,name){
 const pkg=JSON.parse(readFileSync(path.join(dir,'package.json'),'utf8'));
 const target=pkg.appkit?.agent?.catalog;
 if(!target)return {unavailable:{packageName:name,code:'catalog-unavailable'}};
 if(!relativePath(target)||pkg.exports?.['./api-index.json']!==target)throw Error('Invalid catalog');
 const file=path.resolve(dir,target),real=realpathSync(file),base=realpathSync(dir);
 if(!real.startsWith(base+path.sep)||statSync(real).size>MAX_CATALOG_BYTES)throw Error('Invalid catalog');
 const c=validateCatalog(JSON.parse(readFileSync(real,'utf8')));
 if(c.packageName!==name||c.packageVersion!==pkg.version)throw Error('Invalid catalog');
 return {catalog:c};
}
export function loadCatalogs({root,scope='all',bundledCoreDir}){
 if(!['core','react','all'].includes(scope))throw Error('Invalid package scope');
 const resolver=createRequire(path.join(path.resolve(root),'__appkit_resolve__.cjs')),loaded=[],unavailable=[];
 for(const name of PACKAGE_NAMES.filter(n=>scope==='all'||n.endsWith('-'+scope))){
  let dir=packageRoot(resolver,name),source='installed';
  if(!dir&&name===PACKAGE_NAMES[0]&&bundledCoreDir){dir=bundledCoreDir;source='bundled';}
  if(!dir){unavailable.push({packageName:name,code:'not-installed'});continue;}
  try{const value=readCatalog(dir,name);if(value.unavailable)unavailable.push(value.unavailable);else loaded.push({catalog:value.catalog,source});}
  catch{unavailable.push({packageName:name,code:'invalid-catalog'});}
 }return {loaded,unavailable};
}
