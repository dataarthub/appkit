import test from 'node:test';import assert from 'node:assert/strict';import {createExecutionDriver,containerArguments} from './execution-driver.mjs';
test('missing isolation never falls back to running an agent on the host',()=>{
 const driver=createExecutionDriver({runtimePath:'/no/such/docker'});assert.throws(()=>driver.preflight(),/isolation|Docker/i);
});
test('container launch is restricted and verifier has no network or secrets',()=>{
 const args=containerArguments({role:'verifier',name:'run-1',image:'image@sha256:'+'a'.repeat(64),consumerDir:'/tmp/consumer',outputDir:'/tmp/output',envAllowlist:['MODEL_KEY']});
 assert(args.includes('--interactive'));assert(args.includes('--read-only'));assert(args.includes('ALL'));assert(args.includes('none'));assert(!args.includes('MODEL_KEY'));assert(!args.some(a=>a.includes('docker.sock')));assert(!args.includes('--privileged'));
});
test('only the trusted verifier can set executor UID and terminate a distinct user',()=>{
 const base={name:'r',image:'image',consumerDir:'/tmp/consumer',outputDir:'/tmp/output'};
 const verifier=containerArguments({...base,role:'verifier'}),agent=containerArguments({...base,role:'agent'});
 assert.equal(verifier[verifier.indexOf('--user')+1],'0:0');for(const cap of ['SETUID','SETGID','DAC_OVERRIDE','KILL'])assert(verifier.includes(cap));assert(!agent.includes('--cap-add'));assert.equal(agent[agent.indexOf('--user')+1],'1000:1000');
});
