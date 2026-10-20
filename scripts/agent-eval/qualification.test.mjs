import test from 'node:test';import assert from 'node:assert/strict';import {qualifyReceipt} from './qualification.mjs';import {loadSuite} from './suite.mjs';
const digest='a'.repeat(64);
function sample(){const suite=loadSuite(),inputs={archives:['core','react'].map(n=>({packageName:'@alneas/appkit-'+n,version:'0.1.0',file:'archives/'+n+'.tgz',sha256:digest,integrity:'sha512-test'})),sourceDigest:digest,catalogDigests:{'@alneas/appkit-core':digest,'@alneas/appkit-react':digest},toolchainDigest:digest,images:{runner:'image',verifier:'image'},runner:{name:'agent',version:'1'},model:{id:'model',settings:{}}};
 const receipt={schemaVersion:1,mode:'live',executionKind:'isolated-live',runId:'sample',runner:{name:'agent',version:'1'},model:{id:'model',settings:{}},inputs,suiteDigest:digest,evaluatorDigest:digest,completed:true,startedAt:'2026-10-20T00:00:00Z',completedAt:'2026-10-20T00:01:00Z',limits:{submissionTimeoutMs:600000,batchTimeoutMs:7200000},reviewDecisions:[],runs:suite.flatMap(task=>[1,2,3].map(repetition=>({id:task.id+'-'+repetition,taskId:task.id,repetition,outcome:'completed',attempts:[{attempt:1,apiConformant:true,typecheckPassed:true,behavior:{passed:true,assertions:task.assertionIds.map(id=>({id,passed:true,safety:task.safetyAssertionIds.includes(id)}))},safety:'pass',unsupportedApiCount:0,hallucinatedApiCount:0,unsupportedReferences:[],diagnosticCategories:[],needsReview:false,solutionDigest:digest,protectedInputsDigest:digest,observed:true}]})))};return {receipt,currentInputs:{...inputs,suiteDigest:digest,evaluatorDigest:digest,suite}};}
test('requires fifteen first and eighteen final successes, recomputing claims',()=>{
 const {receipt,currentInputs}=sample();assert(qualifyReceipt({receipt,currentInputs}).qualified);
 for(const r of receipt.runs.slice(3,7)){const good=structuredClone(r.attempts[0]);r.attempts[0].typecheckPassed=false;r.attempts.push({...good,attempt:2});}
 receipt.firstSuccesses=18;assert(!qualifyReceipt({receipt,currentInputs}).qualified);
});
test('unsafe first submissions, unresolved seeds, duplicate or missing runs and fake mode fail',()=>{
 for(const mutate of [r=>r.runs[0].attempts[0].safety='fail',r=>r.runs[0].attempts[0].unsupportedApiCount=1,r=>r.runs.pop(),r=>r.runs[1]=r.runs[0],r=>r.mode='self-test',r=>r.inputs.sourceDigest='b'.repeat(64),r=>r.completed=false,r=>delete r.limits,r=>r.limits.submissionTimeoutMs=600001,r=>r.runs[0].attempts[0].behavior.assertions=[]]){
  const s=sample();mutate(s.receipt);assert(!qualifyReceipt(s).qualified);
 }
});
test('review does not override safety; stale source/catalog/scorer digests are refused',()=>{
 const s=sample();s.receipt.runs[0].attempts[0].needsReview=true;assert(!qualifyReceipt(s).qualified);
 s.receipt.reviewDecisions=[{solutionDigest:digest,decision:'accept',reviewer:'operator'}];assert(qualifyReceipt(s).qualified);
 s.receipt.runs[0].attempts[0].safety='fail';assert(!qualifyReceipt(s).qualified);
 const other=sample();other.currentInputs.evaluatorDigest='b'.repeat(64);assert(!qualifyReceipt(other).qualified);
});

test('reviewed model and runner identity cannot be changed in receipt',()=>{for(const field of ['runner','model']){const s=sample();s.receipt[field]={name:'different',version:'2',id:'different',settings:{}};assert(!qualifyReceipt(s).qualified);}});

test('missing protected fixture evidence fails qualification',()=>{const s=sample();delete s.receipt.runs[0].attempts[0].protectedInputsDigest;assert(!qualifyReceipt(s).qualified);});
