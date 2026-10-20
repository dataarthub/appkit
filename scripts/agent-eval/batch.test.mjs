import test from 'node:test';import assert from 'node:assert/strict';import {runBatch} from './batch.mjs';import {loadSuite} from './suite.mjs';
function good(task){return {apiConformant:true,typecheckPassed:true,behavior:{passed:true,assertions:task.assertionIds.map(id=>({id,passed:true,safety:task.safetyAssertionIds.includes(id)}))},safety:'pass',unsupportedApiCount:0,hallucinatedApiCount:0,unsupportedReferences:[],diagnosticCategories:[],needsReview:false,solutionDigest:'a'.repeat(64)};}
const config={expectedRunner:{name:'fake',version:'1'},expectedModel:{id:'fake',settings:{}},submissionTimeoutMs:600000,batchTimeoutMs:7200000};
test('schedules all eighteen runs and allows one repair without replacing first attempts',async()=>{
 let calls=0;const receipt=await runBatch({suite:loadSuite(),candidate:{archives:[],catalogDigests:{}},runnerConfig:config,driver:{kind:'test-driver',preflight(){}},executeAttempt:async({task,attempt})=>{calls++;return calls<4&&attempt===1?{...good(task),typecheckPassed:false}:good(task);}});
 assert.equal(receipt.runs.length,18);assert.equal(receipt.mode,'self-test');assert.equal(Math.max(...receipt.runs.map(r=>r.attempts.length)),2);assert.equal(receipt.finalSuccesses,18);assert(receipt.firstSuccesses<18);
});
test('timeouts are not automatically retried and preflight failures prevent qualification',async()=>{
 let calls=0;const r=await runBatch({suite:loadSuite(),candidate:{},runnerConfig:config,driver:{kind:'test-driver',preflight(){}},executeAttempt:async()=>{calls++;throw Error('Submission timeout');}});assert.equal(calls,18);assert.equal(r.runs[0].outcome,'failed');assert.equal(r.firstSuccesses,0);
 const pre=await runBatch({suite:loadSuite(),candidate:{},runnerConfig:config,driver:{kind:'test-driver',preflight(){throw Error('offline');}},executeAttempt:async()=>{throw Error('must not run');}});assert(!pre.completed);assert.equal(pre.runs.every(r=>r.attempts.length===0),true);
});
test('whole batch deadline preserves the complete scheduled denominator',async()=>{
 let time=0;const r=await runBatch({suite:loadSuite(),candidate:{},runnerConfig:{...config,batchTimeoutMs:1000},driver:{kind:'test-driver',preflight(){}},clock:()=>time,executeAttempt:async({task})=>{time+=1100;return good(task);}});assert.equal(r.runs.length,18);assert.equal(r.firstSuccesses,0);assert(!r.completed);assert(r.runs.some(r=>r.outcome==='not-started'));
});
