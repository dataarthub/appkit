import ts from 'typescript';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {validateCatalog,canonicalDigest,relativePath} from './catalog-contract.mjs';
const compare=(a,b)=>a<b?-1:a>b?1:0;
export function generateCatalog({packageDir,policy,readFile=file=>readFileSync(file),existsFile=existsSync}){
 const pkg=JSON.parse(readFile(path.join(packageDir,'package.json'))),own=policy?.packages?.[pkg.name];
 if(policy?.schemaVersion!==1||!own||!Array.isArray(own.rules))throw Error('Missing feature policy');
 const inputs=new Map(),entryData=[];
 const add=file=>{const relative=path.relative(packageDir,file).replaceAll('\\','/');if(!relativePath(relative))throw Error('Invalid declaration path');inputs.set(relative,readFile(file));};
 const contained=target=>{if(!relativePath(target))throw Error('Invalid declaration target');const file=path.resolve(packageDir,target);if(!file.startsWith(path.resolve(packageDir)+path.sep))throw Error('Invalid declaration target');return file;};
 for(const rule of own.rules){
  if(!Object.hasOwn(pkg.exports,rule.import))throw Error('Unknown policy import');
  if(!relativePath(rule.guide)||!existsFile(contained(rule.guide)))throw Error('Missing policy guide');
  for(const [peer,version]of Object.entries(rule.requiredPeers??{}))if(!pkg.peerDependencies?.[peer]||pkg.peerDependencies[peer]!==version)throw Error('Unknown policy peer');
 }
 for(const [key,value]of Object.entries(pkg.exports)){
  const importPath=key==='.'?pkg.name:pkg.name+'/'+key.slice(2);
  const rule=own.rules.filter(r=>r.import===key||(r.import!=='.'&&key.startsWith(r.import+'/'))).sort((a,b)=>b.import.length-a.import.length)[0];
  const guide=rule?.guide??'docs/exports.md';
  const requirements={requirementsStatus:rule?'documented':'consult-guide',guide,requiredPeers:rule?.requiredPeers??{},providers:rule?.providers??[],styles:rule?.styles??[]};
  const targets=typeof value==='string'?{esm:value}:{esm:value.import?.default,commonjs:value.require?.default,esmTypes:value.import?.types,commonjsTypes:value.require?.types};
  for(const k of Object.keys(targets))if(targets[k]===undefined)delete targets[k];
  const kind=typeof value==='string'?(value.endsWith('.css')?'stylesheet':'metadata'):'module';
  if(kind==='module')for(const target of Object.values(targets))if(!existsSync(contained(target)))throw Error('Missing build/declaration target: '+target);
  if(kind==='stylesheet'&&!existsSync(contained(targets.esm)))throw Error('Missing stylesheet');
  entryData.push({importPath,kind,targets,requirements});add(contained(guide));
 }
 const roots=[...new Set(entryData.filter(e=>e.kind==='module').flatMap(e=>[e.targets.esmTypes,e.targets.commonjsTypes]).filter(Boolean).map(contained))];
 const compilerOptions={module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,skipLibCheck:true,noLib:true,types:[],strict:true};
 const coreName='@alneas/appkit-core',requiredCore=pkg.dependencies?.[coreName],coreRoots=new Set();
 if(requiredCore){
  for(const file of roots){
   const mode=file.endsWith('.cts')?ts.ModuleKind.CommonJS:ts.ModuleKind.ESNext;
   const resolved=ts.resolveModuleName(coreName,file,compilerOptions,ts.sys,undefined,undefined,mode).resolvedModule;
   if(resolved?.packageId?.version!==requiredCore)throw Error(`Resolved Core ${resolved?.packageId?.version??'is missing'}; expected ${requiredCore}. Reinstall dependencies before generating documentation.`);
   let directory=path.dirname(resolved.resolvedFileName);
   while(!existsSync(path.join(directory,'package.json'))&&path.dirname(directory)!==directory)directory=path.dirname(directory);
   const manifest=JSON.parse(readFileSync(path.join(directory,'package.json'),'utf8'));
   if(manifest.name!==coreName||manifest.version!==requiredCore)throw Error(`Resolved Core manifest does not match expected ${requiredCore}. Reinstall dependencies before generating documentation.`);
   coreRoots.add(directory);
  }
  inputs.set('resolved-core.json',Buffer.from(JSON.stringify({name:coreName,version:requiredCore})));
 }
 const program=ts.createProgram(roots,compilerOptions),checker=program.getTypeChecker();
 const printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed});
 const normalize=x=>x.replaceAll(path.resolve(packageDir).replaceAll('\\','/'),'.').replace(/\.cjs(?=["'])/g,'.js').trim();
 function extract(file,entry){
  const source=program.getSourceFile(file),module=source&&checker.getSymbolAtLocation(source);if(!module)throw Error('Unresolvable public declaration');
  return checker.getExportsOfModule(module).map(exported=>{
   const symbol=exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported;
   if(!symbol.declarations?.length)throw Error('Unresolvable public declaration export: '+exported.name);
   const declarations=symbol.declarations;
   const type=checker.getTypeOfSymbolAtLocation(symbol,symbol.valueDeclaration??declarations[0]);
   let signatures=checker.getSignaturesOfType(type,ts.SignatureKind.Call).map(s=>normalize(checker.signatureToString(s,undefined,ts.TypeFormatFlags.NoTruncation|ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)));
   if(!signatures.length)signatures=declarations.map(d=>normalize(printer.printNode(ts.EmitHint.Unspecified,d,d.getSourceFile())));
   return {importPath:entry.importPath,name:exported.name,kind:symbol.flags&ts.SymbolFlags.Value?(symbol.flags&ts.SymbolFlags.Type?'both':'value'):'type',signatures,summary:ts.displayPartsToString(symbol.getDocumentationComment(checker)),tags:symbol.getJsDocTags(checker).map(t=>({name:t.name,text:ts.displayPartsToString(t.text??[])})),guide:entry.requirements.guide};
  }).sort((a,b)=>compare(a.name,b.name));
 }
 const symbols=[];
 for(const entry of entryData.filter(e=>e.kind==='module')){
  const es=extract(contained(entry.targets.esmTypes),entry),cjs=extract(contained(entry.targets.commonjsTypes),entry);
  if(JSON.stringify(es.map(s=>[s.name,s.kind,s.signatures]))!==JSON.stringify(cjs.map(s=>[s.name,s.kind,s.signatures])))throw Error('Incompatible export conditions: '+entry.importPath);
  symbols.push(...es);
 }
 for(const source of program.getSourceFiles())if(source.fileName.startsWith(path.resolve(packageDir)+path.sep)&&!source.fileName.includes(path.sep+'node_modules'+path.sep))add(source.fileName);
 for(const source of program.getSourceFiles())for(const directory of coreRoots){
  if(source.isDeclarationFile&&source.fileName.startsWith(directory+path.sep)&&!path.relative(directory,source.fileName).split(path.sep).includes('node_modules')){
   const relative=path.relative(directory,source.fileName).replaceAll('\\','/');
   inputs.set('dependencies/'+coreName+'/'+relative,readFile(source.fileName));
  }
 }
 for(const file of ['consumer-ai/SKILL.md','README.md'])if(existsSync(contained(file)))add(contained(file));
 inputs.set('package-inputs.json',Buffer.from(JSON.stringify({name:pkg.name,version:pkg.version,exports:pkg.exports,dependencies:pkg.dependencies,peers:pkg.peerDependencies,optionalPeers:pkg.peerDependenciesMeta})));
 inputs.set('feature-policy.json',Buffer.from(JSON.stringify(own)));
 return validateCatalog({schemaVersion:1,packageName:pkg.name,packageVersion:pkg.version,inputDigest:canonicalDigest([...inputs].map(([path,bytes])=>({path,bytes:Buffer.from(bytes)}))),entries:entryData.sort((a,b)=>compare(a.importPath,b.importPath)),symbols:symbols.sort((a,b)=>compare(a.importPath,b.importPath)||compare(a.name,b.name))});
}
