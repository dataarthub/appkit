import {relativePath} from '../agent/catalog-contract.mjs';
export const TASK_IDS=['core-validation','storage-hash','react-form','tool-validation','approval-boundary','error-recovery'];
export const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const string=x=>typeof x==='string'&&x.length>0&&x.length<=65536;
export function validateTask(t){
 if(!object(t)||!TASK_IDS.includes(t.id)||!Array.isArray(t.allowedOutputPaths)||!t.allowedOutputPaths.length||t.allowedOutputPaths.length>16||new Set(t.allowedOutputPaths).size!==t.allowedOutputPaths.length||!t.allowedOutputPaths.every(p=>relativePath(p)&&/\.tsx?$/.test(p)&&!p.split('/').includes('node_modules'))||!Array.isArray(t.allowedImports)||!t.allowedImports.every(string)||!object(t.requiredPeers)||!Array.isArray(t.safetyAssertionIds))throw Error('Invalid task contract');return t;
}
export function validateRunnerRequest(r){if(!object(r)||r.schemaVersion!==1||![r.runId,r.taskId,r.taskText,r.consumerDir,r.outputDir].every(string)||!TASK_IDS.includes(r.taskId)||!Array.isArray(r.allowedOutputPaths)||!r.allowedOutputPaths.every(relativePath)||![1,2].includes(r.attempt)||!Number.isInteger(r.timeBudgetMs)||r.timeBudgetMs<1||r.timeBudgetMs>600000)throw Error('Invalid runner request');return r;}
export function validateRunnerResponse(r,request){if(!object(r)||r.schemaVersion!==1||r.runId!==request.runId||r.taskId!==request.taskId||!['completed','failed'].includes(r.status)||!object(r.runner)||![r.runner.name,r.runner.version].every(string)||!object(r.model)||!string(r.model.id)||!object(r.model.settings))throw Error('Invalid runner response');return r;}
