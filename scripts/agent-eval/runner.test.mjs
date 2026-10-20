import test from 'node:test';import assert from 'node:assert/strict';import {invokeRunner,validateRunnerConfig} from './runner.mjs';
const request={schemaVersion:1,runId:'r',taskId:'core-validation',taskText:'work',consumerDir:'/consumer',outputDir:'/solution',allowedOutputPaths:['solution.ts'],attempt:1,timeBudgetMs:1000};
const config={executable:'agent',args:[],envAllowlist:[],expectedRunner:{name:'fake',version:'1'},expectedModel:{id:'model',settings:{}},submissionTimeoutMs:1000,batchTimeoutMs:2000,runtimePath:'docker',runnerImage:'example/agent@sha256:'+'a'.repeat(64),verifierImage:'example/verifier@sha256:'+'b'.repeat(64)};
test('runner completion is identity checked and cannot substitute its own grades',async()=>{
 validateRunnerConfig(config);let called=false;const response={schemaVersion:1,runId:'r',taskId:'core-validation',status:'completed',runner:config.expectedRunner,model:config.expectedModel,score:100};
 const driver={runAgent:async()=>{called=true;return {code:0,stdout:JSON.stringify(response),stderr:''};}};const result=await invokeRunner({request,config,driver,deadline:Date.now()+1000});assert(called);assert.equal(result.status,'completed');assert(!Object.hasOwn(result,'score'));
 await assert.rejects(invokeRunner({request,config,driver:{runAgent:async()=>({code:0,stdout:'{}',stderr:''})},deadline:Date.now()+1000}),/runner/i);
 assert.throws(()=>validateRunnerConfig({...config,submissionTimeoutMs:600001}));
 assert.throws(()=>validateRunnerConfig({...config,envAllowlist:['NODE_AUTH_TOKEN']}),/credential|environment/i);
});
