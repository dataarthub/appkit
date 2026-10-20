import {mkdirSync,readdirSync,readFileSync,writeFileSync,lstatSync,readlinkSync,copyFileSync,chmodSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {tmpdir} from 'node:os';import path from 'node:path';
import {canonicalDigest,relativePath,PACKAGE_NAMES} from '../agent/catalog-contract.mjs';
export function toolchainDigest(lock){return canonicalDigest([{path:'runtime',bytes:Buffer.from(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,bun:execFileSync('bun',['--version'],{encoding:'utf8'}).trim()}))},{path:'consumer-lock.json',bytes:lock}]);}
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sourceDigest(root=path.resolve(import.meta.dirname,'../..')){
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(f=>f&&!/(?:^|\/)(?:llms(?:-full)?\.txt|api-index\.json|package-context\.json)$/.test(f));
 return canonicalDigest([...new Set(files)].sort().filter(f=>existsSync(path.join(root,f))&&lstatSync(path.join(root,f)).isFile()).map(f=>({path:f,bytes:readFileSync(path.join(root,f))})));
}
export function fixtureDigest(root){
 const files=[];function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),relative=path.relative(root,file).replaceAll('\\','/');if(entry.isDirectory())walk(file);else if(entry.isSymbolicLink())files.push({path:relative,bytes:Buffer.from('symlink:'+readlinkSync(file))});else if(entry.isFile())files.push({path:relative,bytes:Buffer.from(sha256(readFileSync(file)))});else throw Error('Unsupported protected fixture entry');}}walk(root);return canonicalDigest(files);
}
export function collectSubmission({outputDir,allowedPaths,destination,protectedDir}){
 if(!Array.isArray(allowedPaths)||!allowedPaths.length||!allowedPaths.every(relativePath))throw Error('Invalid output path');
 const found=[];let bytes=0;
 function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),relative=path.relative(outputDir,file).replaceAll('\\','/'),stat=lstatSync(file);
  if(stat.isDirectory()){if(!allowedPaths.some(p=>p.startsWith(relative+'/')))throw Error('Unexpected output directory');walk(file);}
  else{if(!stat.isFile()||stat.nlink!==1)throw Error('Expected regular single-link output');if(!allowedPaths.includes(relative))throw Error('Unexpected output file');if(stat.size>1024*1024||(bytes+=stat.size)>8*1024*1024)throw Error('Output size limit');found.push({path:relative,bytes:readFileSync(file)});}
 }}walk(outputDir);
 if(found.length!==allowedPaths.length)throw Error('Missing solution file');
 mkdirSync(destination,{recursive:true});for(const file of found){const target=path.join(destination,file.path);if(existsSync(target))throw Error('Submission destination already exists');mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,file.bytes,{flag:'wx'});}
 return {files:found.map(f=>({path:f.path,sha256:sha256(f.bytes),size:f.bytes.length})),digest:canonicalDigest(found),protectedInputsDigest:protectedDir?fixtureDigest(protectedDir):null};
}
export const evaluationDependencies=['react@19.2.3','react-dom@19.2.3','typescript@6.0.3','@types/node@24','@types/react@19','@types/react-dom@19','jsdom@26.1.0','@testing-library/react@16.3.0','@testing-library/dom@10.4.1'];
export function prepareOutputFiles(output,allowedPaths){
 chmodSync(output,0o777);
 for(const file of allowedPaths){if(!relativePath(file))throw Error('Invalid output path');const target=path.join(output,file);mkdirSync(path.dirname(target),{recursive:true});let dir=path.dirname(target);while(dir!==output){chmodSync(dir,0o777);dir=path.dirname(dir);}if(existsSync(target)){const stat=lstatSync(target);if(!stat.isFile()||stat.nlink!==1)throw Error('Unsafe starter output');chmodSync(target,0o666);}}
}
export function prepareCandidate({runDir,archives,install=true}){
 if(archives.length!==2||new Set(archives.map(a=>a.packageName)).size!==2||archives.some(a=>!PACKAGE_NAMES.includes(a.packageName)))throw Error('Expected the two reviewed packages');
 if(path.resolve(runDir).split(path.sep).includes('two-package-0.1.0'))throw Error('Cannot overwrite publication evidence');
 const archiveDir=path.join(runDir,'archives');mkdirSync(archiveDir,{recursive:true});const records=[];
 for(const a of archives){const bytes=readFileSync(a.file),digest=sha256(bytes),integrity='sha512-'+createHash('sha512').update(bytes).digest('base64');if(a.sha256&&a.sha256!==digest||a.integrity&&a.integrity!==integrity)throw Error('Archive integrity mismatch');const file='archives/'+a.packageName.split('/')[1]+'.tgz',target=path.join(runDir,file);if(existsSync(target)){if(sha256(readFileSync(target))!==digest)throw Error('Refusing archive overwrite');}else writeFileSync(target,bytes,{flag:'wx'});records.push({packageName:a.packageName,version:a.version,file,sha256:digest,integrity});}
 const consumerDir=mkdtempSync(path.join(tmpdir(),'appkit-agent-consumer-'));chmodSync(consumerDir,0o755);
 const cleanup=()=>rmSync(consumerDir,{recursive:true,force:true});
 try{
  writeFileSync(path.join(consumerDir,'package.json'),JSON.stringify({private:true,type:'module'}));
  if(install){const env={...process.env};delete env.NODE_PATH;delete env.NODE_AUTH_TOKEN;delete env.NPM_TOKEN;
   execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund','--legacy-peer-deps',...records.map(r=>path.resolve(runDir,r.file)),...evaluationDependencies],{cwd:consumerDir,env,timeout:300000,stdio:'pipe',maxBuffer:2*1024*1024});
  }
  writeFileSync(path.join(consumerDir,'appkit-styles.d.ts'),"declare module '@alneas/appkit-react/styles';\n");
  const catalogDigests={};if(install)for(const a of records){const installed=JSON.parse(readFileSync(path.join(consumerDir,'node_modules',a.packageName,'package.json')));if(installed.version!==a.version)throw Error('Installed candidate mismatch');const catalog=JSON.parse(readFileSync(path.join(consumerDir,'node_modules',a.packageName,'consumer-ai/api-index.json')));catalogDigests[a.packageName]=catalog.inputDigest;}
  const lock=existsSync(path.join(consumerDir,'package-lock.json'))?readFileSync(path.join(consumerDir,'package-lock.json')):Buffer.alloc(0);
  writeFileSync(path.join(runDir,'consumer-lock.json'),lock,{mode:0o600});
  return {archives:records,sourceDigest:sourceDigest(),catalogDigests,toolchainDigest:toolchainDigest(lock),consumerDir,cleanup};
 }catch(e){cleanup();throw e;}
}
