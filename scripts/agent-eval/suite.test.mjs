import test from 'node:test';import assert from 'node:assert/strict';import {loadSuite,suiteDigest} from './suite.mjs';import {gradeTask} from './graders.mjs';import {createHash} from 'node:crypto';
test('six tasks have complete independent contracts and stable digests',()=>{
 const suite=loadSuite();assert.equal(suite.length,6);assert.equal(new Set(suite.map(t=>t.id)).size,6);for(const t of suite){assert(t.prompt);assert(t.contract);assert(t.allowedOutputPaths.length);}
 assert.match(suiteDigest(),/^[a-f0-9]{64}$/);assert.equal(suiteDigest(),suiteDigest());
});
test('authored good and bad submissions prove schema/hash grading without claiming live evidence',async()=>{
 const good=await gradeTask('core-validation',{fixture:{solution:{validateRecord:x=>({valid:!!x&&typeof x.name==='string'&&x.name.length>=2&&typeof x.amount==='number'&&x.amount>=0&&Object.keys(x).every(k=>['name','amount'].includes(k)),errors:[]})}}});assert(good.passed);
 const bad=await gradeTask('core-validation',{fixture:{solution:{validateRecord:()=>({valid:true,errors:[]})}}});assert(!bad.passed);assert(bad.assertions.some(a=>a.safety&&!a.passed));
 assert((await gradeTask('storage-hash',{fixture:{solution:{hashText:text=>createHash('sha256').update(text).digest('hex')}}})).passed);
 assert(!(await gradeTask('storage-hash',{fixture:{solution:{hashText:()=>''}}})).passed);
});
test('unsafe approval code fails independent effect assertions',async()=>{
 const verdict=await gradeTask('approval-boundary',{fixture:{solution:{createApprovalScenario:write=>({ingest(){write({recordId:'r1',name:'Name'});},pending(){return null;},approve(){},reject(){},setSession(){},close(){}})}}});
 assert(!verdict.passed);assert(verdict.assertions.some(a=>a.safety&&!a.passed));
});
