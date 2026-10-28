import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,realpathSync,openSync,closeSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runGuarded} from './lib/guarded-process.mjs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

// Exact public tool versions: TypeDoc 0.28.20 supports TypeScript 6.0.x.
export const documentationToolchain={typedoc:'0.28.20',typescript:'npm:@typescript/typescript6@6.0.2','@types/react':'19.2.14','@types/react-dom':'19.2.3','@types/node':'24.12.0'};
const packageNames=['@alneas/appkit-core','@alneas/appkit-react'];
const requiredSymbols=['createAjvValidator','AjvValidatorOptions','GenerativeUIRenderer','GenerativeUIRendererProps','createGenerativeUIRegistry','defineGenerativeUIComponent','KanbanColumnFrame','KanbanDragSurface','KanbanDraggableCard','KanbanTask','KanbanColumn','useKanbanDrag'];
const worker=fileURLToPath(new URL('./consumer-docs-worker.mjs',import.meta.url));
export function verifyCandidateResolution(fixture){
 const host=createRequire(path.join(fixture,'package.json'));
 const react=createRequire(host.resolve('@alneas/appkit-react'));
 const selected=realpathSync(host.resolve('@alneas/appkit-core'));
 assert(selected.startsWith(realpathSync(fixture)+path.sep),'Core resolves outside the isolated consumer');
 assert.equal(realpathSync(react.resolve('@alneas/appkit-core')),selected,'React must resolve the installed candidate Core');
 return {sharedCore:true};
}
async function guarded(args,{cwd,logDirectory,label,timeoutMs=180000}){
 mkdirSync(logDirectory,{recursive:true});
 const log=path.join(logDirectory,label+'.log'),fd=openSync(log,'w');
 let result;
 try{const env={...process.env};delete env.NODE_PATH;delete env.NODE_OPTIONS;result=await runGuarded(process.execPath,args,{cwd,env,stdio:['ignore',fd,fd],timeoutMs,memoryLimitMiB:3072});}finally{closeSync(fd);}
 if(!result.ok)throw new Error(`${label}: ${result.reason ?? 'subprocess failed'}; see ${log}\n${readFileSync(log,'utf8').slice(-10000)}`);
 return {log,peakMiB:result.peakMiB};
}

export function validateDocumentationToolchain(toolchain){
 for(const [name,spec] of Object.entries(documentationToolchain)){const expected=spec.split('@').at(-1);const actual=JSON.parse(readFileSync(path.join(toolchain,'node_modules',name,'package.json'),'utf8')).version;assert.equal(actual,expected,'Pinned documentation toolchain mismatch: '+name);}
}
export async function installDocumentationToolchain({fixture,logDirectory}){
 writeFileSync(path.join(fixture,'package.json'),JSON.stringify({private:true,type:'module',dependencies:documentationToolchain}));
 await install(fixture,logDirectory);validateDocumentationToolchain(fixture);
}
async function install(fixture,logDirectory){
 const npm=realpathSync(process.env.APPKIT_NPM_CLI ?? execFileSync('/usr/bin/which',['npm'],{encoding:'utf8'}).trim());
 return guarded([npm,'install','--ignore-scripts','--no-audit','--no-fund','--registry=https://registry.npmjs.org','--fetch-retries=0','--fetch-timeout=30000','--cache='+path.join(fixture,'.npm-cache')],{cwd:fixture,logDirectory,label:'consumer-docs-install',timeoutMs:240000});
}
export async function verifyInstalledDocumentation({fixture,toolchain=fixture,entryPoints,requiredSymbols:required=[],requiredDocumentation=[],logDirectory}){
 validateDocumentationToolchain(toolchain);
 const output=path.join(logDirectory,'consumer-docs-reflections.json'),config=path.join(fixture,'typedoc-consumer.json');
 writeFileSync(config,JSON.stringify({fixture,toolchain,entryPoints,requiredSymbols:required,requiredDocumentation,output}));
 const result=await guarded([worker,config],{cwd:fixture,logDirectory,label:'consumer-docs-typedoc'});
 return {...result,output,warningsAsErrors:true,validation:{notExported:true,invalidLink:true,notDocumented:false},skipLibCheck:false};
}

function typeTarget(value){if(typeof value==='string')return /\.d\.(?:ts|mts|cts)$/.test(value)?value:undefined;if(!value || typeof value!=='object')return;return typeTarget(value.types) ?? typeTarget(value.import) ?? Object.values(value).map(typeTarget).find(Boolean);}
export async function verifyDocumentationConsumer({archives,logDirectory=path.resolve('.verification/logs/consumer-docs')}){
 logDirectory=path.resolve(logDirectory);mkdirSync(logDirectory,{recursive:true});
 const receiptFile=path.join(logDirectory,'consumer-docs.json');
 // A failed preflight cannot leave a previous passing invocation behind.
 rmSync(receiptFile,{force:true});
 for(const name of packageNames){const record=archives?.[name];assert(record?.file && record.sha256 && record.integrity && record.version,'Missing candidate '+name);const bytes=readFileSync(record.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,'Candidate SHA256 mismatch: '+name);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),record.integrity,'Candidate integrity mismatch: '+name);}
 assert(['24','26'].includes(process.versions.node.split('.')[0]),'Documentation consumer requires supported Node 24 or 26');
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-consumer-docs-'));
 logDirectory=path.resolve(logDirectory);mkdirSync(logDirectory,{recursive:true});
 const receipt={verified:false,node:process.version,toolchain:documentationToolchain,archives,checks:{}};
 writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
 try{
  writeFileSync(path.join(fixture,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{...Object.fromEntries(packageNames.map(name=>[name,'file:'+path.resolve(archives[name].file)])),...documentationToolchain,react:'19.2.3','react-dom':'19.2.3'}}));
  // No aliases, production overrides or --legacy-peer-deps: the candidate's declared public closure must install.
  receipt.checks.install=await install(fixture,logDirectory);
  validateDocumentationToolchain(fixture);
  const lock=JSON.parse(readFileSync(path.join(fixture,'package-lock.json'),'utf8'));
  for(const name of packageNames)assert.equal(lock.packages['node_modules/'+name].integrity,archives[name].integrity,'Installed candidate integrity mismatch: '+name);
  receipt.checks.resolution=verifyCandidateResolution(fixture);
  const entryPoints=[];
  for(const name of packageNames){const dir=path.join(fixture,'node_modules',name);assert(!lstatSync(dir).isSymbolicLink(),'Candidate must be installed from archive');assert(realpathSync(dir).startsWith(realpathSync(fixture)+path.sep));const manifest=JSON.parse(readFileSync(path.join(dir,'package.json'),'utf8'));assert.equal(manifest.name,name);assert.equal(manifest.version,archives[name].version);for(const subpath of name.endsWith('core')?['./ai/validation']:['./ai/generative-ui','./tools/kanban']){const target=typeTarget(manifest.exports[subpath]);assert(target,`Missing public declaration export: ${name}${subpath.slice(1)}`);const declaration=realpathSync(path.join(dir,target));assert(declaration.startsWith(realpathSync(dir)+path.sep),'Declaration export escapes installed candidate');entryPoints.push(declaration);}}
  writeFileSync(path.join(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,skipLibCheck:false,module:'NodeNext',moduleResolution:'NodeNext',target:'ES2022',jsx:'react-jsx',types:['node','react','react-dom']},files:entryPoints}));
  receipt.checks.documentation=await verifyInstalledDocumentation({fixture,entryPoints,requiredSymbols,requiredDocumentation:['createAjvValidator','GenerativeUIRenderer','KanbanColumnFrame'],logDirectory});
  receipt.checks.documentation.scope={entryPoints:['@alneas/appkit-core/ai/validation','@alneas/appkit-react/ai/generative-ui','@alneas/appkit-react/tools/kanban'],requiredSymbols,requiredDocumentation:['createAjvValidator','GenerativeUIRenderer','KanbanColumnFrame'],externalSymbolLinks:'Five exact inherited @types/react symbols map to official react.dev Component anchors; no wildcard mappings'};
  receipt.verified=true;receipt.completedAt=new Date().toISOString();return receipt;
 }finally{writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');rmSync(fixture,{recursive:true,force:true});}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 // CLI argument/JSON failures must also invalidate the standalone invocation.
 rmSync(path.resolve('.verification/logs/consumer-docs/consumer-docs.json'),{force:true});
 const index=process.argv.indexOf('--archives');assert(index>=0 && process.argv[index+1],'Usage: node scripts/consumer-docs.mjs --archives <archives.json>');
 const manifest=JSON.parse(readFileSync(process.argv[index+1],'utf8'));
 await verifyDocumentationConsumer({archives:manifest.packages});console.log('PASS: strict external packed declaration documentation');
}
