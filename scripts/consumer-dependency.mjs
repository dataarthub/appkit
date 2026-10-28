/** Installed packed-consumer lanes. No production manifest or registry writes. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,lstatSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {dependencyMinimum,dependencyAccepts} from './dependency-constraints.mjs';
import {runGuarded} from './lib/guarded-process.mjs';
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(new URL('../packages/appkit-core/package.json',import.meta.url));
const semver=require('semver');
export function constraintsFromManifests(manifests){
 const result={};const candidates=new Set(manifests.map(m=>m.name));
 for(const manifest of manifests)for(const field of ['dependencies','peerDependencies','optionalDependencies'])for(const [name,range] of Object.entries(manifest[field]??{})){
  dependencyMinimum(range);const optional=field==='optionalDependencies'||(field==='peerDependencies'&&manifest.peerDependenciesMeta?.[name]?.optional===true);
  const entry=result[name]??={ranges:[],owners:[],optional:true,candidate:candidates.has(name)};
  if(!entry.ranges.includes(range))entry.ranges.push(range);entry.owners.push({name:manifest.name,field,range});entry.optional&&=optional;
 }
 return result;
}
export function selectVersions(name,constraint,versions,locked){
 const ranges=constraint.ranges;
 for(const range of ranges)if(!versions[dependencyMinimum(range)])throw Error(`${name}: unpublished floor ${dependencyMinimum(range)}`);
 const matches=Object.keys(versions).filter(v=>semver.valid(v)&&ranges.every(r=>dependencyAccepts(r,v))).sort(semver.compare);
 if(!matches.length)throw Error(`${name}: no common compatible published version`);
 function identity(version){const info=versions[version];if(!info?.dist?.integrity?.startsWith('sha512-')||!info.dist.tarball?.startsWith('https://registry.npmjs.org/'))throw Error(`${name}@${version}: missing registry integrity or trusted tarball`);return {version,integrity:info.dist.integrity,tarball:info.dist.tarball};}
 if(!locked||!matches.includes(locked.version))throw Error(`${name}: missing or incompatible exact lock version`);
 const selected={minimum:identity(matches[0]),locked:identity(locked.version),updated:identity(matches.at(-1))};
 if(selected.locked.integrity!==locked.integrity)throw Error(`${name}: lock integrity differs from registry`);
 return selected;
}
const singletonPackages=new Set(['@alneas/appkit-core','@alneas/appkit-react','react','react-dom','zod','@tanstack/react-query','@tanstack/query-core','@tanstack/react-table','@tanstack/table-core','@dnd-kit/react','@dnd-kit/dom','@dnd-kit/collision']);
export function verifyInstallation(lock,expected){
 for(const [name,identity] of Object.entries(expected)){
  const entry=lock.packages?.['node_modules/'+name];
  if(entry?.version!==identity.version||entry.integrity!==identity.integrity)throw Error(`${name}: installed identity differs from selected registry/archive identity`);
  if(identity.tarball&&entry.resolved!==identity.tarball)throw Error(`${name}: installed tarball URL differs from registry`);
  for(const [key,value] of Object.entries(lock.packages))if(singletonPackages.has(name)&&key.endsWith('/node_modules/'+name)&&key!=='node_modules/'+name)throw Error(`${name}: nested installation differs from selected identity at ${key}`);
 }
}
export function fixtureManifest({selections,archives,candidateCore=false}){
 if(!archives['@alneas/appkit-react']?.file||(candidateCore&&!archives['@alneas/appkit-core']?.file))throw Error('Missing candidate archives');
 const dependencies=Object.fromEntries(Object.entries(selections).map(([name,value])=>[name,value.version]));
 dependencies['@alneas/appkit-react']='file:'+archives['@alneas/appkit-react'].file;
 if(candidateCore)dependencies['@alneas/appkit-core']='file:'+archives['@alneas/appkit-core'].file;
 return {name:'appkit-isolated-dependency-consumer',private:true,type:'module',dependencies,...(candidateCore?{overrides:{'@alneas/appkit-core':'$@alneas/appkit-core'}}:{})};
}
async function registry(name){
 const response=await fetch('https://registry.npmjs.org/'+encodeURIComponent(name),{headers:{accept:'application/vnd.npm.install-v1+json'},signal:AbortSignal.timeout(20_000)});
 if(!response.ok)throw Error(`${name}: registry HTTP ${response.status}`);
 const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>24*1024*1024){await response.body.cancel().catch(()=>{});throw Error(`${name}: registry metadata exceeds 24 MiB`);}chunks.push(chunk);}
 return JSON.parse(Buffer.concat(chunks).toString()).versions;
}
const baseEntries=['@alneas/appkit-core','@alneas/appkit-core/storage','@alneas/appkit-core/storage/crypto','@alneas/appkit-core/storage/zip','@alneas/appkit-core/data','@alneas/appkit-core/data/schema','@alneas/appkit-core/data/schema/jsonpath','@alneas/appkit-core/data/csv/parser','@alneas/appkit-core/graph','@alneas/appkit-core/japan','@alneas/appkit-core/us','@alneas/appkit-core/ai','@alneas/appkit-react','@alneas/appkit-react/ui','@alneas/appkit-react/tools','@alneas/appkit-react/tools/core','@alneas/appkit-react/tools/ui','@alneas/appkit-react/tools/data-access/react','@alneas/appkit-react/tools/data-table','@alneas/appkit-react/tools/kanban','@alneas/appkit-react/tools/file-browser'];
export const testedScope={entries:baseEntries,selectedConstraints:['@alneas/appkit-core','react','react-dom'],operations:['strict NodeNext declarations: TypeScript 6 and 7, .mts and .cts','Node native ESM/CommonJS loading','Appkit Query host/provider singleton SSR and cached adapter reads','Core/React/Zod/DnD/TanStack package identity','Kanban/DataTable SSR'],unsupported:['Unchanged runtime dependencies resolve naturally; their installed closure is recorded, not forced to joint minimum versions','Optional feature peers and live database/browser/WASM operations are outside this changed-Core gate','Arbitrary mixed dependency endpoints and versions between tested endpoints are not certified']};
export function lanePlan(){return [{name:'minimum-registry-core',selection:'minimum',candidateCore:false},{name:'locked-candidate-core',selection:'locked',candidateCore:true},{name:'updated-registry-core',selection:'updated',candidateCore:false}];}
async function guarded(args,cwd,label,timeoutMs=120_000){const result=await runGuarded(process.execPath,args,{cwd,env:{...process.env,NODE_PATH:'',npm_config_fetch_retries:'0',npm_config_fetch_timeout:'30000',npm_config_cache:process.env.npm_config_cache??path.join(cwd,'.npm-cache')},timeoutMs,memoryLimitMiB:3072,intervalMs:500});if(!result.ok)throw Error(`${label}: ${result.reason??`exit ${result.code}`}`);}
const npmCli=()=>realpathSync(execFileSync('which',['npm'],{encoding:'utf8',timeout:5000}).trim());
function lockIdentities(){
 // Bun's JSONC lock uses trailing commas; the installed TS6 parser reads it without evaluating code.
 const ts=require('typescript');const parsed=ts.parseConfigFileTextToJson('bun.lock',readFileSync(path.join(root,'bun.lock'),'utf8'));if(parsed.error)throw Error('Cannot parse exact Bun lock');
 return Object.fromEntries(Object.entries(parsed.config.packages).filter(([,v])=>Array.isArray(v)&&v[0]&&!v[0].includes('workspace:')).map(([key,v])=>[key,{version:v[0].slice(v[0].lastIndexOf('@')+1),integrity:v.at(-1)}]));
}
async function runLane(name,selections,archives,candidateCore=true){
 console.log('DEPENDENCY LANE '+name);
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-dependencies-'));
 try{
  // These overrides apply only to this explicitly isolated development candidate fixture.
  const manifest=fixtureManifest({selections,archives,candidateCore});
  const toolingLock=lockIdentities();
  Object.assign(manifest.dependencies,{typescript:'npm:@typescript/typescript6@6.0.2','@typescript/native':'npm:typescript@7.0.2',...Object.fromEntries(['@types/node','@types/react','@types/react-dom','@types/json-schema'].map(pkg=>[pkg,toolingLock[pkg].version]))});
  writeFileSync(path.join(fixture,'package.json'),JSON.stringify(manifest,null,2));
  await guarded([npmCli(),'install','--ignore-scripts','--no-audit','--no-fund'],fixture,name+' install',240_000);
  // Validate the installed dependency/peer closure; conflicts never become passing lanes.
  writeFileSync(path.join(fixture,'validate-peers.mjs'),`import {execFileSync} from 'node:child_process';try{execFileSync(process.execPath,[${JSON.stringify(npmCli())},'ls','--all','--json'],{encoding:'utf8',timeout:30000,maxBuffer:10*1024*1024,stdio:['ignore','pipe','pipe']});}catch(error){let problems;try{const tree=JSON.parse(error.stdout);problems=tree.problems;function walk(node,trail){if(node.invalid)console.error(JSON.stringify({dependency:trail,invalid:node.invalid,version:node.version}));for(const [key,value] of Object.entries(node.dependencies??{}))walk(value,trail+'/'+key);}walk(tree,'fixture');}catch{}throw Error('Installed peer/dependency closure is invalid: '+JSON.stringify(problems??error.message));}`);
  await guarded(['validate-peers.mjs'],fixture,name+' peer closure',40_000);
  const lock=JSON.parse(readFileSync(path.join(fixture,'package-lock.json')));
  const installedArchives=candidateCore?archives:{'@alneas/appkit-react':archives['@alneas/appkit-react']};
  const singletonIdentities=Object.fromEntries([...singletonPackages].filter(pkg=>lock.packages['node_modules/'+pkg]).map(pkg=>[pkg,lock.packages['node_modules/'+pkg]]));
  verifyInstallation(lock,{...singletonIdentities,...selections,...installedArchives});
  for(const pkg of Object.keys(selections).concat(Object.keys(installedArchives))){const installed=path.join(fixture,'node_modules',pkg);assert(!lstatSync(installed).isSymbolicLink());assert(realpathSync(installed).startsWith(realpathSync(fixture)+path.sep));assert.equal(JSON.parse(readFileSync(path.join(installed,'package.json'))).version,({...selections,...installedArchives})[pkg].version,pkg+' actual installed version');}
  const entries=baseEntries;
  const types=entries.map((e,i)=>`import * as m${i} from ${JSON.stringify(e)};void m${i};`).join('\n');
  writeFileSync(path.join(fixture,'probe.mts'),types);writeFileSync(path.join(fixture,'probe.cts'),types);
  writeFileSync(path.join(fixture,'contracts.tsx'),`import {createElement} from 'react';import {z} from 'zod';import {DataTable} from '@alneas/appkit-react/tools/data-table';import {KanbanBoard,type KanbanTask} from '@alneas/appkit-react/tools/kanban';import {DnDProvider,type DnDProviderProps} from '@alneas/appkit-react/tools/ui';const schema=z.object({title:z.string()});const task:KanbanTask={id:'one',title:schema.parse({title:'One'}).title,status:'todo'};const onDragEnd:NonNullable<DnDProviderProps['onDragEnd']>=e=>{void e.operation.source;void e.canceled;};const ui=<DnDProvider onDragEnd={onDragEnd}><DataTable data={[task]} columns={[{accessorKey:'title'}]}/><KanbanBoard tasks={[task]} columns={[{id:'todo',title:'Todo'}]}/></DnDProvider>;void ui;`);
  writeFileSync(path.join(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',jsx:'react-jsx',strict:true,skipLibCheck:false,noEmit:true,types:['node','react','react-dom']},include:['*.mts','*.cts','*.tsx']}));
  for(const bin of ['tsc6','tsc'])await guarded([path.join(fixture,'node_modules/.bin',bin),'--project','tsconfig.json'],fixture,name+' '+bin,60_000);
  const singleton=`const host=createRequire(import.meta.url);const app=createRequire(host.resolve('@alneas/appkit-react'));for(const pkg of ['@alneas/appkit-core','react','react-dom','zod','@tanstack/react-query','@tanstack/query-core','@tanstack/react-table','@tanstack/table-core','@dnd-kit/react','@dnd-kit/dom','@dnd-kit/collision'])assert.equal(realpathSync(app.resolve(pkg)),realpathSync(host.resolve(pkg)),pkg+' singleton');`;
  const imports=entries.map((e,i)=>`import * as m${i} from ${JSON.stringify(e)};assert(Object.keys(m${i}).length,${JSON.stringify(e)});`).join('\n');
  const ssr=`import {createElement as h} from 'react';import {renderToString} from 'react-dom/server';import {QueryClient,QueryClientProvider,useQueryClient} from '@tanstack/react-query';import {DataTable} from '@alneas/appkit-react/tools/data-table';import {KanbanBoard} from '@alneas/appkit-react/tools/kanban';import {createQueryClient,useInvalidate,findQueryOptions} from '@alneas/appkit-react/tools/data-access/react';const client=createQueryClient();assert(client instanceof QueryClient);let invalidate;function Context(){assert.equal(useQueryClient(),client);invalidate=useInvalidate();return h('span',null,'shared-query');}assert(renderToString(h(QueryClientProvider,{client},h(Context))).includes('shared-query'));client.setQueryData(['tasks'],['old']);await invalidate(['tasks']);assert.equal(client.getQueryState(['tasks']).isInvalidated,true);let reads=0;const adapter={find:async()=>{reads++;return [{id:'one'}];}};const options=findQueryOptions(adapter,'tasks',{});assert.deepEqual(await client.fetchQuery(options),[{id:'one'}]);await client.fetchQuery(options);assert.equal(reads,1);client.clear();assert(renderToString(h(DataTable,{data:[{title:'One'}],columns:[{accessorKey:'title'}]})).includes('table'));assert(renderToString(h(KanbanBoard,{tasks:[{id:'one',title:'One',status:'todo'}],columns:[{id:'todo',title:'Todo'}],showSort:false})).includes('One'));`;
  writeFileSync(path.join(fixture,'probe.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {realpathSync} from 'node:fs';\n${imports}\n${singleton}\n${ssr}\nconsole.log('PASS ${name} ESM/SSR/singletons');`);
  writeFileSync(path.join(fixture,'probe.cjs'),`const assert=require('node:assert/strict');\n`+entries.map(e=>`assert(Object.keys(require(${JSON.stringify(e)})).length);`).join('\n'));
  for(const file of ['probe.mjs','probe.cjs'])await guarded([file],fixture,name+' '+file,60_000);
  const tooling=Object.fromEntries(Object.entries(lock.packages).filter(([key])=>/^node_modules\/(?:typescript|@typescript\/native|@types\/(?:node|react|react-dom|json-schema))$/.test(key)));
  return {passed:true,selections,entries,installedClosure:lock.packages,tooling,typeScript6:true,typeScript7:true,skipLibCheck:false,nativeEsm:true,commonJs:true,ssr:true,singletons:true};
 }finally{rmSync(fixture,{recursive:true,force:true});}
}
export async function main(archiveFile){
 if(!archiveFile)throw Error('Usage: node scripts/consumer-dependency.mjs --archives /absolute/candidate/archives.json');
 const output=path.join(path.dirname(archiveFile),'dependency-matrix.json');
 // Invalidate prior success before reading or validating any caller-provided input.
 writeFileSync(output,JSON.stringify({mode:'packed-core-dependency-matrix',verified:false,startedAt:new Date().toISOString(),status:'archive-validation-pending'},null,2)+'\n');
 const records=JSON.parse(readFileSync(archiveFile));const archives=records.packages;const manifests=[];
 for(const name of ['@alneas/appkit-core','@alneas/appkit-react']){const a=archives?.[name];if(!a?.file||!a.sha256||!a.integrity)throw Error('Missing candidate archive identity');assert(path.isAbsolute(a.file),'Archive path must be absolute');assert.equal(createHash('sha256').update(readFileSync(a.file)).digest('hex'),a.sha256);assert.equal('sha512-'+createHash('sha512').update(readFileSync(a.file)).digest('base64'),a.integrity,'Candidate archive integrity mismatch');const m=JSON.parse(execFileSync('tar',['-xOf',a.file,'package/package.json'],{encoding:'utf8',timeout:10_000}));assert.equal(m.name,name);assert.equal(m.version,a.version);manifests.push(m);}
 const constraints=constraintsFromManifests(manifests),locked=lockIdentities(),selected={};
 const selectedConstraints=Object.fromEntries(Object.entries(constraints).filter(([name,c])=>name==='@alneas/appkit-core'||c.owners.some(owner=>owner.field==='peerDependencies'&&!c.optional)));
 const receipt={mode:'packed-core-dependency-matrix',optionalDiagnosticExcluded:{reason:'Optional peers and unchanged runtime ranges are outside this Core range change. Live optional-feature compatibility requires its own selected feature consumer.',packages:Object.keys(constraints).filter(name=>constraints[name].optional)},verified:false,startedAt:new Date().toISOString(),node:process.version,archives,constraints,selectedConstraints,scope:testedScope,lanes:{}};
 const save=()=>writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');save();
 try{
  // Requests are sequential, capped at 20 seconds and 24 MiB each.
  for(const [name,c] of Object.entries(selectedConstraints)){const versions=await registry(name);selected[name]=selectVersions(name,c,versions,locked[name]??(c.candidate?{version:dependencyMinimum(c.ranges[0]),integrity:versions[dependencyMinimum(c.ranges[0])]?.dist?.integrity}:null));}
 }catch(error){receipt.preflightError=error.message;save();throw error;}
 receipt.registrySelections=selected;save();
 for(const lane of lanePlan()){
  const selections=Object.fromEntries(Object.entries(selected).filter(([pkg])=>(!constraints[pkg].candidate||!lane.candidateCore)).map(([pkg,s])=>[pkg,s[lane.selection]]));
  try{receipt.lanes[lane.name]=await runLane(lane.name,selections,archives,lane.candidateCore);}catch(error){receipt.lanes[lane.name]={passed:false,error:error.message};}save();
 }
 if(Object.values(receipt.lanes).some(lane=>!lane.passed))throw Error('Packed dependency matrix failed; see '+output);
 receipt.verified=true;receipt.completedAt=new Date().toISOString();save();console.log('PASS packed dependency matrix: '+output);return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);main(args[0]==='--archives'?args[1]:undefined).catch(error=>{console.error(error.stack);process.exitCode=1;});}
