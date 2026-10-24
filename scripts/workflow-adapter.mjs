import {spawnSync} from 'node:child_process';
import {appendFileSync,rmSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {checkProject} from './workflow-supply/public/conformance.mjs';
import {select,recordLocal,inputHash,executionIdentity,clearHookGitEnvironment} from './workflow-supply/public/quality.mjs';
import {savePlan,root} from './verification/plan.mjs';
import {projectPlan,validateSavedPlan,recordUnchanged} from './verification/shared-plan.mjs';
import {execFileSync} from 'node:child_process';
clearHookGitEnvironment();
const phase=process.argv[2];if(!['plan','source'].includes(phase))throw Error('Use plan or source');
assert.equal(checkProject(root).failures.length,0,'Project workflow conformance failed');
const flags=process.argv.slice(3);assert(flags.every(f=>['--ci-plan','--full','--dry-run','--node-compat'].includes(f)),'Unknown verification option');
const ci=process.env.GITHUB_ACTIONS==='true',receipt=join(root,'.cache/public-quality/appkit-plan.json');
let common,plan;
if(phase==='source'&&ci&&flags.includes('--ci-plan')){
 const saved=validateSavedPlan(JSON.parse(readFileSync(receipt)),{input:inputHash(root),sha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),identity:executionIdentity(root)});({common,plan}=saved);
}else{
 common=await select(root);plan=await projectPlan({root,common,full:flags.includes('--full'),ci});
 mkdirSync(join(root,'.cache/public-quality'),{recursive:true});writeFileSync(receipt,JSON.stringify({input:inputHash(root),common,plan})+'\n');
}
if(ci&&process.env.SOURCE_COMPLETE_INHERITED==='true'){common.reason='Authenticated identical-tree source evidence inherited; mandatory fresh safety checks remain';plan={...plan,packages:false,docs:false,release:false,agent:false,compatibility:false,tooling:[],stories:[],inherited:true};}
mkdirSync(join(root,'.cache/public-quality'),{recursive:true});writeFileSync(join(root,'.cache/public-quality/plan.json'),JSON.stringify(common)+'\n');savePlan(plan);
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`browser=${plan.stories.length>0}\npackages=${plan.packages}\n`);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### Shared workflow contract\n\n${common.reason}. Baseline: ${common.baseline??'none'}; project selector preserved.\n\n### Project-specific verification\n\nPackage checks: ${plan.packages}; browser stories: ${plan.stories.length}. Existing Turbo reports executed tasks and actual cache hits. Unselected checks are omissions, not cache hits.\n`);
if(phase==='source'){const startingInput=inputHash(root);if(process.env.GITHUB_ACTIONS!=='true')rmSync(join(root,'.cache/public-quality/local.json'),{force:true});const r=spawnSync(process.execPath,['scripts/verification/run.mjs','--ci-plan',...(((process.env.GITHUB_ACTIONS==='true'&&Number(process.versions.node.split('.')[0])===26)||flags.includes('--node-compat'))?['--node-compat']:[]),...(flags.includes('--dry-run')?['--dry-run']:[])],{cwd:root,stdio:'inherit'});if(r.error)throw r.error;process.exitCode=r.status??1;if(r.status===0&&process.env.GITHUB_ACTIONS!=='true'&&!flags.includes('--dry-run')&&!flags.includes('--node-compat'))recordUnchanged({before:startingInput,after:inputHash(root),record:()=>recordLocal(root,{identity:common.identity,outputs:['packages/appkit-core/dist','packages/appkit-react/dist','packages/appkit-react/src/tools/paraglide']})});}
