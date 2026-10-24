import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import path from 'node:path';
import {requireSource,executionIdentity,inputHash} from '../workflow-supply/public/quality.mjs';
import {releaseContext,root,controlRoot} from './context.mjs';
import {candidates,publicationPhase,authenticateRecovery,authenticateRecoveryProducer,validateFresh} from './recovery.mjs';
const env=process.env,event=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
const phase=publicationPhase(env,event),target=releaseContext();
if(event.inputs?.recover_release){const c=candidates[event.inputs.recover_release];await authenticateRecovery(c);await authenticateRecoveryProducer(c);}
const hasSourceContract=existsSync(path.join(root,'.github/workflow-adapter.json'));
if(!hasSourceContract&&phase!=='complete')throw Error('Authoritative source contract required before staging');
const formal=hasSourceContract?await requireSource(root,{imagePolicy:'authenticate'}):null;
const command=process.argv[2];
const directory=path.join(root,'.verification/publish');mkdirSync(directory,{recursive:true});
const control=execFileSync('git',['rev-parse','HEAD'],{cwd:controlRoot,encoding:'utf8'}).trim();
const ctx={source:target.sha,control,run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT)};
if(command==='fresh'){
 if(phase!=='stage'||control!==env.GITHUB_SHA)throw Error('Fresh verification requires the staging control source');
 const before=inputHash(root),major=Number(process.versions.node.split('.')[0]);
 const freshEnv={...Object.fromEntries(Object.entries(env).filter(([key])=>!key.startsWith('PUBLISH_'))),TURBO_FORCE:'true'};
 const result=spawnSync(process.execPath,['scripts/verification/run.mjs','--full',...(major===26?['--node-compat']:[])],{cwd:root,stdio:'inherit',env:freshEnv});
 if(result.status!==0)throw Error('Full fresh source verification failed');
 if(inputHash(root)!==before)throw Error('Source changed during fresh verification');
 execFileSync('git',['diff','--exit-code','HEAD','--'],{cwd:root,stdio:'inherit'});
 writeFileSync(path.join(directory,`fresh-node${major}.json`),JSON.stringify({major,status:'passed',identity:executionIdentity(root,freshEnv),formal:{run:formal.run.id,attempt:formal.run.run_attempt},...ctx}));
}else if(command==='writer'){
 const manifest=JSON.parse(readFileSync(path.join(directory,'release.json')));
 if(manifest.recovery){const c=candidates[manifest.recovery.id];assert.deepEqual(manifest.recovery,c,'Unknown recovery archive');await authenticateRecovery(c);}
 const expected=phase==='stage'?ctx:{source:target.sha,control:env.PUBLISH_PRODUCER_CONTROL,run:Number(env.PUBLISH_PRODUCER_RUN),attempt:Number(env.PUBLISH_PRODUCER_ATTEMPT)};
 // Historical successful release archives retain their original completion contract.
 if(manifest.freshVerification)validateFresh(manifest.freshVerification,expected);
 else if(phase==='stage'||event.inputs?.recover_release)throw Error('Fresh verification archive required');
}else throw Error('Use fresh or writer');
