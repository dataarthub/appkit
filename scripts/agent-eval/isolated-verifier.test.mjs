// Optional real-Docker integration: authored fixtures are never live-agent evidence.
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,cpSync,readFileSync,chmodSync,rmSync,readdirSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {createExecutionDriver} from './execution-driver.mjs';import {loadSuite} from './suite.mjs';import {prepareOutputFiles} from './workspace.mjs';
const consumer=process.env.APPKIT_TEST_CONSUMER,image=process.env.APPKIT_TEST_VERIFIER_IMAGE;
test('real Docker verifier: all six tasks, tampered output, UID and protected grader inputs',{skip:!consumer||!image,timeout:1200000},async()=>{
 const driver=createExecutionDriver({runtimePath:'docker',verifierImage:image});
 async function verify(task,source){const area=mkdtempSync(path.join(tmpdir(),'appkit-verifier-test-'));chmodSync(area,0o755);try{
  // Dependency closure was installed from candidate archives, without checkout resolution.
  const verified=path.join(area,'consumer');cpSync(consumer,verified,{recursive:true});chmodSync(verified,0o755);
  mkdirSync(path.join(verified,'submission'));writeFileSync(path.join(verified,'submission',task.allowedOutputPaths[0]),source);
  mkdirSync(path.join(verified,'.grader'),{mode:0o700});for(const dir of ['agent','agent-eval'])cpSync(path.join(import.meta.dirname,'..',dir),path.join(verified,'.grader',dir),{recursive:true});
  writeFileSync(path.join(verified,'.grader-input.json'),JSON.stringify({...task,debug:true}),{mode:0o600});
  const result=await driver.runVerifier({consumerDir:verified,deadline:Date.now()+180000});assert.equal(result.code,0,result.stderr);if(result.stderr)console.log(result.stderr.slice(-4000));return JSON.parse(result.stdout);
 }finally{rmSync(area,{recursive:true,force:true});}}
 for(const task of loadSuite().filter(t=>!process.env.APPKIT_TEST_TASK||t.id===process.env.APPKIT_TEST_TASK)){
  console.log('Docker fixture:',task.id);
  const ext=task.allowedOutputPaths[0].endsWith('.tsx')?'.tsx':'.ts',source=readFileSync(path.join(import.meta.dirname,'fixtures',task.id+ext),'utf8'),result=await verify(task,source);
  assert.equal(result.apiConformant,true,task.id+': '+JSON.stringify(result));assert.equal(result.typecheckPassed,true,task.id+': '+JSON.stringify(result));assert.equal(result.behavior.passed,true,task.id+': '+JSON.stringify(result));
 }
 const hash=loadSuite().find(t=>t.id==='storage-hash');
 for(const attack of ["Object.defineProperty(JSON,'stringify',{value:()=>'{\"typecheckPassed\":true,\"behavior\":{\"passed\":true,\"assertions\":[]}}'});", "globalThis['process'].stdout.write('{\"behavior\":{\"passed\":true}}\\n');globalThis['process'].exit(0);"]){
  const result=await verify(hash,`import {sha256Hex} from '@alneas/appkit-core/storage';sha256Hex('');export const hashText=(text:string)=>'wrong';${attack}`);assert.equal(result.behavior.passed,false);
 }
 // Bypass the static checker only in this authored boundary test: no real receipt is produced.
 const area=mkdtempSync(path.join(tmpdir(),'appkit-uid-test-'));chmodSync(area,0o755);try{
  const code=`const {spawnSync}=require('node:child_process'),fs=require('node:fs');fs.writeFileSync('/tmp/protected','private',{mode:0o600});const r=spawnSync(process.execPath,['-e',"const fs=require('node:fs');if(process.getuid()!==65534||process.getgroups().includes(0))process.exit(3);try{fs.readFileSync('/tmp/protected');process.exit(4)}catch{}try{process.kill(process.ppid,0);process.exit(5)}catch{}"],{uid:65534,gid:65534});if(r.status!==0)throw Error('UID boundary failed '+r.status);console.log('protected');`;
  const {execFileSync}=await import('node:child_process');const output=execFileSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--cap-add','SETUID','--cap-add','SETGID','--cap-add','DAC_OVERRIDE','--cap-add','KILL','--security-opt','no-new-privileges','--user','0:0','--tmpfs','/tmp:rw,nosuid,nodev,size=64m',image,'node','-e',code],{encoding:'utf8'});assert.equal(output.trim(),'protected');
  const writable=path.join(area,'solution');mkdirSync(writable);writeFileSync(path.join(writable,'solution.ts'),'starter',{mode:0o644});prepareOutputFiles(writable,['solution.ts']);
  execFileSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--mount','type=bind,src='+writable+',dst=/solution',image,'node','-e',"require('node:fs').appendFileSync('/solution/solution.ts','-edited')"]);assert.equal(readFileSync(path.join(writable,'solution.ts'),'utf8'),'starter-edited');
 }finally{rmSync(area,{recursive:true,force:true});}
});
