import test from 'node:test';import assert from 'node:assert/strict';import {validateRunnerRequest,validateRunnerResponse,validateTask} from './contracts.mjs';
test('runner identity and task output boundaries are strict data contracts',()=>{
 const task={id:'core-validation',allowedOutputPaths:['solution.ts'],allowedImports:['@alneas/appkit-core/*'],requiredPeers:{},safetyAssertionIds:[]};assert.equal(validateTask(task),task);
 for(const p of ['../escape','/absolute','a/../../escape'])assert.throws(()=>validateTask({...task,allowedOutputPaths:[p]}));
 const req={schemaVersion:1,runId:'r',taskId:task.id,taskText:'write code',consumerDir:'/consumer',outputDir:'/solution',allowedOutputPaths:['solution.ts'],attempt:1,timeBudgetMs:600000};validateRunnerRequest(req);
 assert.throws(()=>validateRunnerResponse({schemaVersion:1,status:'completed'},req));
 validateRunnerResponse({schemaVersion:1,runId:'r',taskId:task.id,status:'completed',runner:{name:'fake',version:'1'},model:{id:'test',settings:{}}},req);
});
