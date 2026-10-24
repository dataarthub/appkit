import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {isBuiltin} from 'node:module';
import {release} from 'node:os';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import ts from 'typescript';
import {validateUnitReport} from '../unit-report.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const ownInputs=[new URL(import.meta.url),new URL('../unit-report.mjs',import.meta.url)];
const writtenHere=new Set();
const slash=name=>name.split(sep).join('/');
const secret=key=>/(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY|DATABASE_URL)/i.test(key);
const excluded=new Set(['node_modules','.git','.verification','.cache','.turbo','.astro','storybook-static']);
function walk(root){
 if(!existsSync(root))return [];
 return readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
  if(excluded.has(entry.name))return [];
  const name=join(root,entry.name);return entry.isDirectory()?walk(name):[name];
 });
}
function bytes(file){
 if(!existsSync(file))return null;
 const stat=lstatSync(file);
 // A symlink target's bytes and identity matter; never follow directory symlinks.
 if(stat.isSymbolicLink())return {target:realpathSync(file),bytes:lstatSync(realpathSync(file)).isFile()?hash(readFileSync(file)):null};
 assert(stat.isFile(),'Unit input must be a regular file: '+file);
 return {identity:realpathSync(file),executable:Boolean(stat.mode&0o111),bytes:hash(readFileSync(file))};
}
const envBase=['CI','NODE_OPTIONS','NODE_ENV','TZ','LANG','LC_ALL','BUN_OPTIONS','BUN_JSC_forceRAMSize','BUN_JSC_maxPerThreadStackUsage'];
export function unitExecutionIdentity(env=process.env){
 return {node:process.version,bun:execFileSync('bun',['--version'],{encoding:'utf8'}).trim(),platform:process.platform,arch:process.arch,image:env.GITHUB_ACTIONS==='true'?`${env.ImageOS??''}:${env.ImageVersion??''}`:release()};
}
function inputGraph(root,packageRoot,file){
 const files=new Set(),environment=new Set(envBase),visited=new Set();let fallback=false,opaqueEnvironment=false,unbounded=false;
 const packageConfig=join(packageRoot,'tsconfig.json');
 let options={moduleResolution:ts.ModuleResolutionKind.NodeNext,allowJs:true,resolveJsonModule:true};
 if(existsSync(packageConfig)){
  const parsed=ts.readConfigFile(packageConfig,ts.sys.readFile);
  const config=parsed.error?null:ts.parseJsonConfigFileContent(parsed.config,ts.sys,packageRoot);
  if(!config||config.errors.length)fallback=true;else options={...options,...config.options};
 }
 const configFiles=walk(join(root,'scripts'));
 if(configFiles.some(name=>/vitest.*config\.[cm]?[jt]s$/.test(name)&&/\b(?:setupFiles|globalSetup|provide|pool|isolate)\s*:/.test(readFileSync(name,'utf8'))))fallback=true;
 function visit(name){
  name=resolve(name);if(visited.has(name))return;visited.add(name);files.add(name);
  if(!existsSync(name)||!relative(root,name)||relative(root,name).startsWith('..')){fallback=true;unbounded=true;return;}
  if(!/\.[cm]?[jt]sx?$/.test(name)){fallback=true;return;}
  const source=ts.createSourceFile(name,readFileSync(name,'utf8'),ts.ScriptTarget.Latest,true);
  const edge=specifier=>{
   if(['fs','node:fs','fs/promises','node:fs/promises'].includes(specifier)){fallback=true;unbounded=true;return;}
   if(isBuiltin(specifier)||specifier==='bun:test'||specifier==='vitest')return;
   const result=ts.resolveModuleName(specifier,name,options,ts.sys).resolvedModule;
   if(!result){fallback=true;unbounded=true;return;}
   const dependency=resolve(result.resolvedFileName);
   // TypeScript may resolve a local package export to declarations while the runner
   // loads sibling JS. Bind the complete built tree rather than only its .d.ts.
   if(!relative(root,dependency).startsWith('..')&&dependency.split(sep).includes('dist'))fallback=true;
   if(dependency.split(sep).includes('node_modules')){
    // External implementation is pinned by lockfile; also bind actual resolver identity.
    files.add(dependency);let parent=dirname(dependency);
    while(parent!==dirname(parent)){const manifest=join(parent,'package.json');if(existsSync(manifest)){files.add(manifest);break;}parent=dirname(parent);}
   }else visit(dependency);
  };
  function node(n){
   if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier){
    if(ts.isStringLiteral(n.moduleSpecifier))edge(n.moduleSpecifier.text);else fallback=true;
   }
   if(ts.isCallExpression(n)){
    if(n.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(n.expression)&&n.expression.text==='require'){
     if(n.arguments.length===1&&ts.isStringLiteral(n.arguments[0]))edge(n.arguments[0].text);else {fallback=true;unbounded=true;}
    }
    // Filesystem, globs and reflective module resolution can read undeclared inputs.
    const expression=n.expression.getText(source);
    const method=ts.isPropertyAccessExpression(n.expression)?n.expression.name.text:ts.isElementAccessExpression(n.expression)&&n.expression.argumentExpression&&ts.isStringLiteral(n.expression.argumentExpression)?n.expression.argumentExpression.text:expression;
    if(/^(?:readFile(?:Sync)?|readdir(?:Sync)?|readlink(?:Sync)?|l?stat(?:Sync)?|existsSync|openSync|createReadStream|glob(?:Sync)?|loadModule|fetch|importScripts)$/.test(method)||/^(?:require|import\.meta)\.resolve$/.test(expression)||expression==='Bun.file'){fallback=true;unbounded=true;}
   }
   if(ts.isPropertyAccessExpression(n)&&['process','Bun'].includes(n.expression.getText(source))&&n.name.text==='argv'){fallback=true;unbounded=true;}
   if(ts.isNewExpression(n)&&n.expression.getText(source)==='URL'){fallback=true;unbounded=true;}
   if(ts.isPropertyAccessExpression(n)&&['process.env','Bun.env'].includes(n.expression.getText(source)))environment.add(n.name.text);
   if(ts.isElementAccessExpression(n)&&['process.env','Bun.env'].includes(n.expression.getText(source))){
    if(n.argumentExpression&&ts.isStringLiteral(n.argumentExpression))environment.add(n.argumentExpression.text);else {fallback=true;opaqueEnvironment=true;}
   }
   if(ts.isIdentifier(n)&&n.text==='env'&&ts.isPropertyAccessExpression(n.parent)&&['process','Bun'].includes(n.parent.expression.getText(source))&&!(ts.isPropertyAccessExpression(n.parent.parent)||ts.isElementAccessExpression(n.parent.parent))){fallback=true;opaqueEnvironment=true;}
   ts.forEachChild(n,node);
  }node(source);
 }
 visit(file);
 return {files,environment,fallback,opaqueEnvironment,unbounded,compilerOptions:options};
}

/** Exact deterministic unit inputs. Bun stays a joint group because its process is shared. */
export function createUnitCache({repositoryRoot,packageRoot,runner,files,identity,env=process.env}){
 repositoryRoot=resolve(repositoryRoot);packageRoot=resolve(packageRoot);
 assert(['bun','vitest'].includes(runner),'Unknown unit runner');
 assert(Array.isArray(files)&&files.length,'Empty unit selection cannot establish a pass');
 const selected=[...new Set(files.map(file=>{
  const absolute=resolve(packageRoot,file),name=relative(packageRoot,absolute);
  assert(name&&!name.startsWith('..')&&!isAbsolute(name),'Unit file must be inside its package');
  assert(existsSync(absolute),'Selected unit file missing');return slash(name);
 }))];
 const directory=join(repositoryRoot,'.verification/records/unit-checks');
 const runtime=identity??unitExecutionIdentity(env);
 let shared;
 const common=()=>{
  if(shared)return shared.common;
  const inventory=walk(repositoryRoot);
  const configs=inventory.filter(name=>{
   const rel=slash(relative(repositoryRoot,name));
   return /^(?:bun\.lockb?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|turbo\.json|biome\.jsonc?|\.nvmrc|\.node-version|\.npmrc(?:\.example)?)$/.test(rel)||rel.startsWith('scripts/')||/(?:^|\/)(?:package\.json|tsconfig[^/]*\.json|[^/]*\.config\.[^/]+|\.babelrc(?:\.[^/]+)?|\.swcrc|\.browserslistrc|\.env(?:\.[^/]+)?|bunfig\.toml)$/.test(rel);
  });
  shared={inventory,common:[...configs,...ownInputs].map(name=>[String(name),bytes(name)])};
  return shared.common;
 };
 const snapshot=names=>{
  const sharedCommon=common();
  const graphs=names.map(file=>inputGraph(repositoryRoot,packageRoot,join(packageRoot,file)));
  const implicitConfiguration=shared.inventory.some(name=>/(?:^|\/)(?:\.babelrc(?:\.[^/]+)?|babel\.config\.[^/]+|\.swcrc)$/.test(slash(name)));
  const fallback=implicitConfiguration||graphs.some(graph=>graph.fallback);
  const inputs=fallback?shared.inventory:[...new Set(graphs.flatMap(graph=>[...graph.files]))].sort();
  const environment=new Set(graphs.flatMap(graph=>[...graph.environment]));
  const opaque=graphs.some(graph=>graph.opaqueEnvironment);
  const sensitive=graphs.some(graph=>graph.unbounded)||[...environment].some(secret)||opaque&&Object.keys(env).some(secret);
  if(opaque)for(const key of Object.keys(env))environment.add(key);
  for(const key of Object.keys(env))if(!/^(?:GITHUB_|RUNNER_|ACTIONS_|CODEX_|npm_lifecycle_|VSCODE_|XPC_|SSH_)/.test(key)&&!['PWD','OLDPWD','SHLVL','PPID','_','TMPDIR','TMP','TEMP','TERM','COLORTERM','SOURCE_CHECKS_RESTORE_TRUSTED','BUN_INSTALL_CACHE_DIR','BUN_INSTALL_GLOBAL_STORE','TOOLS_VERIFICATION_TEMPORARY','TOOLS_CONSUMER_TEMP_ROOT','NODE_COMPILE_CACHE'].includes(key))environment.add(key);
  // Hash values only; never persist environment or credential plaintext.
  const values=[...environment].filter(key=>!secret(key)).sort().map(key=>[key,env[key]??null]);
  // Unknown inputs cannot establish a pass. Do not hash unrelated archive bytes
  // merely to produce a cache key that will never be accepted or persisted.
  if(sensitive)return {key:hash(JSON.stringify({version:1,runner,files:names,identity:runtime,uncacheable:true})),reason:'conservative: inputs cannot be fully bounded; fresh execution required',sensitive:true};
  // Tests that read a credential cannot yield a reusable deterministic pass.
  return {key:hash(JSON.stringify({version:1,runner,files:names,identity:runtime,compilerOptions:graphs.map(graph=>graph.compilerOptions),common:sharedCommon,inputs:fallback?(shared.broad??=inputs.map(name=>[slash(relative(repositoryRoot,name)),bytes(name)])):inputs.map(name=>[slash(relative(repositoryRoot,name)),bytes(name)]),environment:values})),reason:fallback?'conservative shared/package inputs':runner==='bun'?'static joint group dependency closure':'static isolated file dependency closure',sensitive};
 };
 const configuredGroup=walk(join(repositoryRoot,'scripts')).some(name=>/vitest.*config\.[cm]?[jt]s$/.test(name)&&/\b(?:setupFiles|globalSetup|provide|pool|isolate)\s*:/.test(readFileSync(name,'utf8')));
 const groups=runner==='bun'||configuredGroup?[selected]:selected.map(file=>[file]);
 const entries=groups.map(names=>{
  const before=snapshot(names),id=hash(JSON.stringify({package:slash(relative(repositoryRoot,packageRoot)),runner,files:names})),receipt=join(directory,`${runner}-${id}.json`);
  let reused=false;
  const trusted=env.GITHUB_ACTIONS!=='true'||env.SOURCE_CHECKS_RESTORE_TRUSTED==='1'||writtenHere.has(receipt+'|ci');
  if(trusted&&!before.sensitive&&existsSync(receipt))try{
   const value=JSON.parse(readFileSync(receipt,'utf8'));
   reused=value.schemaVersion===1&&value.status==='passed'&&value.key===before.key&&value.runner===runner&&JSON.stringify(value.files)===JSON.stringify(names)&&/^[a-f0-9]{64}$/.test(value.reportSha256)&&Number.isSafeInteger(value.cases)&&value.cases>=names.length;
  }catch{/* Missing/malformed evidence is a miss. */}
  return {names,receipt,before,reused};
 });
 const missing=entries.filter(entry=>!entry.reused),reused=entries.filter(entry=>entry.reused);
 const rows=entries=>entries.flatMap(entry=>entry.names.map(file=>({file,key:entry.before.key,reason:entry.before.sensitive?'conservative: inputs cannot be fully bounded; fresh execution required':entry.before.reason})));
 return {missing:rows(missing),reused:rows(reused),begin(){for(const entry of missing){rmSync(entry.receipt,{force:true});writtenHere.delete(entry.receipt+'|ci');}},record(report){
  if(!missing.length)return;
  const selectedMissing=missing.flatMap(entry=>entry.names);
  validateUnitReport(report,selectedMissing,packageRoot);
  shared=undefined;
  for(const entry of missing.filter(entry=>!entry.before.sensitive))assert.equal(snapshot(entry.names).key,entry.before.key,'Unit inputs changed while tests ran; no success recorded');
  mkdirSync(directory,{recursive:true});
  for(const entry of missing){
   if(entry.before.sensitive)continue;
   const value={schemaVersion:1,status:'passed',runner,files:entry.names,key:entry.before.key,reportSha256:hash(report),cases:[...report.matchAll(/<testcase\b/g)].length};
   const temporary=entry.receipt+'.'+process.pid+'.tmp';
   try{writeFileSync(temporary,JSON.stringify(value)+'\n',{flag:'wx'});renameSync(temporary,entry.receipt);if(env.GITHUB_ACTIONS==='true')writtenHere.add(entry.receipt+'|ci');}finally{rmSync(temporary,{force:true});}
  }
 }};
}
