import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {verifyDocumentationConsumer, verifyInstalledDocumentation, installDocumentationToolchain, verifyCandidateResolution} from './consumer-docs.mjs';

test('rejects an unbound or modified candidate before installing tools', async () => {
 await assert.rejects(verifyDocumentationConsumer({archives:{}}), /candidate.*appkit-core/i);
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-docs-invalid-'));
 try {
  const file=path.join(fixture,'candidate.tgz');writeFileSync(file,'modified candidate');
  await assert.rejects(verifyDocumentationConsumer({archives:{'@alneas/appkit-core':{file,version:'0.2.2',sha256:'wrong',integrity:'wrong'}}}), /candidate SHA256 mismatch/i);
 } finally {rmSync(fixture,{recursive:true,force:true});}
});

test('failed archive preflight invalidates an earlier standalone documentation pass', async () => {
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-docs-stale-'));
 try {
  const receipt=path.join(fixture,'consumer-docs.json');
  writeFileSync(receipt,JSON.stringify({verified:true}));
  await assert.rejects(verifyDocumentationConsumer({archives:{},logDirectory:fixture}));
  assert.equal(existsSync(receipt),false,'Previous successful receipt must not survive failed preflight');
 } finally {rmSync(fixture,{recursive:true,force:true});}
});

test('CLI malformed or missing manifest invalidates an earlier standalone pass', () => {
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-docs-cli-stale-'));
 try {
  const logDirectory=path.join(fixture,'.verification/logs/consumer-docs');mkdirSync(logDirectory,{recursive:true});
  const receipt=path.join(logDirectory,'consumer-docs.json');
  const malformed=path.join(fixture,'bad.json');writeFileSync(malformed,'{bad');
  const cli=fileURLToPath(new URL('./consumer-docs.mjs',import.meta.url));
  for(const args of [[],['--archives',malformed],['--archives',path.join(fixture,'missing.json')]]) {
   writeFileSync(receipt,JSON.stringify({verified:true}));
   const result=spawnSync(process.execPath,[cli,...args],{cwd:fixture,encoding:'utf8',timeout:10000});
   assert.notEqual(result.status,0);assert.equal(existsSync(receipt),false);
  }
 } finally {rmSync(fixture,{recursive:true,force:true});}
});

test('rejects React resolving a different nested Core installation', () => {
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-docs-resolution-'));
 const packageAt=dir=>{mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,'package.json'),'{"main":"index.cjs"}');writeFileSync(path.join(dir,'index.cjs'),'');};
 try {
  packageAt(path.join(fixture,'node_modules/@alneas/appkit-core'));
  packageAt(path.join(fixture,'node_modules/@alneas/appkit-react'));
  packageAt(path.join(fixture,'node_modules/@alneas/appkit-react/node_modules/@alneas/appkit-core'));
  assert.throws(()=>verifyCandidateResolution(fixture),/React must resolve the installed candidate Core/);
 } finally {rmSync(fixture,{recursive:true,force:true});}
});

const toolchain=process.env.APPKIT_DOCS_TEST_TOOLCHAIN;
test('strict TypeDoc rejects malformed declaration documentation and unresolved public links', async () => {
 const fixture=mkdtempSync(path.join(tmpdir(),'appkit-docs-regression-'));
 try {
  if(!toolchain)await installDocumentationToolchain({fixture,logDirectory:fixture});
  const selectedToolchain=toolchain ?? fixture;
  writeFileSync(path.join(fixture,'package.json'),'{"private":true,"type":"module"}');
  writeFileSync(path.join(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,skipLibCheck:false,module:'NodeNext',moduleResolution:'NodeNext',target:'ES2022',types:[]},include:['*.d.ts']}));
  const entry=path.join(fixture,'entry.d.ts');
  writeFileSync(entry,'/** A public helper.\n * @remarks First.\n * @remarks Second.\n */\nexport declare function helper(): void;\n');
  await assert.rejects(verifyInstalledDocumentation({fixture,toolchain:selectedToolchain,entryPoints:[entry],requiredSymbols:['helper'],logDirectory:fixture}), /documentation conversion failed/i);
  writeFileSync(entry,'/** A public helper. See {@link MissingPublicSymbol}. */\nexport declare function helper(): void;\n');
  await assert.rejects(verifyInstalledDocumentation({fixture,toolchain:selectedToolchain,entryPoints:[entry],requiredSymbols:['helper'],logDirectory:fixture}), /documentation conversion failed/i);
  writeFileSync(entry,'/** A public helper.\n * @returns No result.\n */\nexport declare function helper(): void;\n');
  const result=await verifyInstalledDocumentation({fixture,toolchain:selectedToolchain,entryPoints:[entry],requiredSymbols:['helper'],logDirectory:fixture});
  assert.equal(result.warningsAsErrors,true);
  await assert.rejects(verifyInstalledDocumentation({fixture,toolchain:selectedToolchain,entryPoints:[entry],requiredSymbols:['absent'],logDirectory:fixture}), /missing documented public symbol/i);
  writeFileSync(entry,'export declare function helper(): void;\n');
  await assert.rejects(verifyInstalledDocumentation({fixture,toolchain:selectedToolchain,entryPoints:[entry],requiredDocumentation:['helper'],logDirectory:fixture}), /missing public symbol documentation/i);
  writeFileSync(entry,'/** Public helper. */\nexport declare function helper(): MissingType;\n');
  await assert.rejects(verifyInstalledDocumentation({fixture,toolchain:selectedToolchain,entryPoints:[entry],requiredSymbols:['helper'],logDirectory:fixture}), /cannot find name.*MissingType/is);
 } finally {rmSync(fixture,{recursive:true,force:true});}
});
