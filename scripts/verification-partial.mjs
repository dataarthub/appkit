/** Reuse independent completed checks without turning a failed source workflow into a pass. */
import assert from 'node:assert/strict';
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sealName='Project: Seal source verification receipt';
const uploadName='Shared: Preserve immutable source verification';
export function validatePartialReceipt(receipt,run,options,validateCommon){
 assert(typeof validateCommon==='function','Common provenance validator required');
 assert(run.status==='completed'&&run.conclusion==='failure','Only completed failed workflows can transfer partial evidence');
 assert(['checks-only','passed'].includes(receipt.status),'Invalid partial checkpoint');
 const {producerNode,checks,sealStep=sealName,uploadStep=uploadName,...common}=options;
 assert(Number.isSafeInteger(producerNode)&&common.nodes.includes(producerNode),'Unsupported producer runtime');
 assert.equal(Number(/^v(\d+)\./.exec(receipt.identity?.node??'')?.[1]),producerNode,'Checkpoint runtime differs from producer node');
 const suffix=`Verify packages (Node ${producerNode})`,jobs=common.jobs.filter(job=>job.name===suffix||job.name.endsWith(' / '+suffix));
 assert.equal(jobs.length,1,'Missing unique producer job');const job=jobs[0];
 assert(job.status==='completed'&&['success','failure'].includes(job.conclusion),'Producer job did not complete');
 if(receipt.status==='passed')assert.equal(job.conclusion,'success','Passed checkpoint requires successful producer job');
 const requireStep=name=>{const steps=(job.steps??[]).filter(step=>step.name===name);assert.equal(steps.length,1,'Missing unique checkpoint step: '+name);const step=steps[0];assert(step.status==='completed'&&step.conclusion==='success'&&Number.isSafeInteger(step.number),'Checkpoint step did not succeed: '+name);return step;};
 const sealed=requireStep(sealStep),uploaded=requireStep(uploadStep);assert(sealed.number<uploaded.number,'Checkpoint must be sealed before upload');
 assert(checks&&typeof checks==='object'&&!Array.isArray(checks),'Missing individual check receipts');const passed={};
 for(const [name,value]of Object.entries(checks)){
  // This is a progress report, never a reusable test result.
  if(name==='source-checks/summary.json')continue;
  assert(/^(?:source-checks|unit-checks)\/[\w.-]+\.json$/.test(name),'Unsafe check receipt path');
  assert(value&&typeof value==='object'&&!Array.isArray(value)&&value.status==='passed'&&digest(value.key),'Invalid independent check receipt');
  if(name.startsWith('unit-checks/'))assert.equal(value.schemaVersion,1,'Unsupported unit receipt version');
  else assert.equal(value.version,1,'Unsupported source receipt version');
  passed[name]=value;
 }
 assert(Object.keys(passed).length,'No independently completed checks to transfer');
 // Apply the exact same event/repository/run-attempt/candidate-tree/ancestry,
 // trusted-control and environment guards as complete evidence. Only the global
 // conclusion and this explicitly verified producer job are normalized; this
 // result can authorize keyed check lookup, never whole-gate inheritance.
 validateCommon({...receipt,status:'passed'},{...run,conclusion:'success'},{...common,nodes:[producerNode],jobs:[{...job,conclusion:'success'}]});
 return {status:'checks-only',inherited:false,checks:passed};
}
