import assert from 'node:assert/strict';
import {selectChecks} from './impact.mjs';
import {createPlan} from './plan.mjs';
export async function projectPlan({root,common,full=false,ci=false}){
 if(common.provenance==='local'&&!full){assert(Array.isArray(common.changes));return {...selectChecks({root,changes:common.changes}),sha:common.sha,base:common.baseline,changedFiles:common.changes.map(c=>c.file)};}
 return createPlan({directory:root,ci,full:full||!common.baseline,trustedBase:common.baseline});
}
export function validateSavedPlan(saved,{input,sha,identity}){
 assert.equal(saved.input,input,'Source changed after check selection');assert.equal(saved.common.sha,sha,'Commit changed after check selection');assert.deepEqual(saved.common.identity,identity,'Environment changed after check selection');assert(saved.plan&&Array.isArray(saved.plan.stories),'Missing project selection');return saved;
}

export function recordUnchanged({before,after,record}){assert.equal(after,before,'Source changed while verification ran; no success recorded');return record();}
