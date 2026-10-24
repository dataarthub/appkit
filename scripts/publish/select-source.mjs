import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {candidates,publicationPhase,authenticateRecovery,authenticateRecoveryProducer} from './recovery.mjs';
import {outputs,controlRoot} from './context.mjs';
import {releaseTarget} from './contract.mjs';
const env=process.env,event=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
const phase=publicationPhase(env,event);
if(phase!=='stage')throw Error('Only initial staging selects package source');
const control=execFileSync('git',['rev-parse','HEAD'],{cwd:controlRoot,encoding:'utf8'}).trim();
if(control!==env.GITHUB_SHA)throw Error('Control checkout differs from workflow source');
let sha=env.GITHUB_SHA,tag=event.release?.tag_name;
if(env.GITHUB_EVENT_NAME==='workflow_dispatch'){
 const c=candidates[event.inputs.recover_release];await authenticateRecovery(c);await authenticateRecoveryProducer(c);sha=c.sha;tag=c.tag;
 if(spawnSync('git',['merge-base','--is-ancestor',control,'refs/remotes/origin/main'],{cwd:controlRoot}).status!==0)throw Error('Control code is not on main');
}
releaseTarget(tag);
outputs({sha,tag});
for(const [key,value] of Object.entries({PUBLISH_SOURCE_SHA:sha,PUBLISH_RELEASE_TAG:tag,PUBLISH_CONTROL_SHA:control}))appendFileSync(env.GITHUB_ENV,`${key}=${value}\n`);
