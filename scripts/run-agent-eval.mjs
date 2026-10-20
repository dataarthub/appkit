import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {loadSuite} from './agent-eval/suite.mjs';import {validateRunnerConfig} from './agent-eval/runner.mjs';import {createExecutionDriver} from './agent-eval/execution-driver.mjs';import {prepareCandidate} from './agent-eval/workspace.mjs';import {runBatch} from './agent-eval/batch.mjs';import {writeReceipt} from './agent-eval/receipt.mjs';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(process.argv[2]==='--'?3:2),configIndex=args.indexOf('--runner-config');
const runDir=path.join(root,'.verification/agent-eval',Date.now()+'-'+randomUUID());mkdirSync(runDir,{recursive:true,mode:0o700});
let candidate;
try{
 if(configIndex!==0||args.length!==2)throw Error('Provide --runner-config with an ignored configuration path.');
 const file=realpathSync(path.resolve(root,args[1])),ignored=realpathSync(path.join(root,'.verification'));
 if(!file.startsWith(ignored+path.sep))throw Error('Runner configuration must stay under ignored .verification.');
 const config=validateRunnerConfig(JSON.parse(readFileSync(file,'utf8'))),driver=createExecutionDriver(config);driver.preflight();
 const archives=[];for(const name of ['appkit-core','appkit-react']){
  const dir=path.join(root,'packages',name),pkg=JSON.parse(readFileSync(path.join(dir,'package.json'))),info=JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts','--workspaces=false','--pack-destination',runDir],{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}))[0];archives.push({packageName:pkg.name,version:pkg.version,file:path.join(runDir,info.filename),integrity:info.integrity});
 }
 candidate=prepareCandidate({runDir,archives});candidate.runDir=runDir;
 const inputs={archives:candidate.archives,sourceDigest:candidate.sourceDigest,catalogDigests:candidate.catalogDigests,toolchainDigest:candidate.toolchainDigest,images:{runner:config.runnerImage,verifier:config.verifierImage},runner:config.expectedRunner,model:config.expectedModel};
 writeFileSync(path.join(runDir,'archives.json'),JSON.stringify(inputs,null,2)+'\n',{mode:0o600});
 const receipt=await runBatch({suite:loadSuite(),candidate,runnerConfig:config,driver});console.log(JSON.stringify({status:receipt.completed?'completed':'incomplete',receipt:path.relative(root,path.join(runDir,'receipt.json')),firstSuccesses:receipt.firstSuccesses,finalSuccesses:receipt.finalSuccesses}));process.exitCode=receipt.completed?0:1;
}catch{
 if(!existsSync(path.join(runDir,'receipt.json')))writeReceipt(path.join(runDir,'receipt.json'),{schemaVersion:1,mode:'not-run',completed:false,reason:'Configure the reviewed runner and provision isolated runner/verifier images before live evaluation.'});
 console.log(JSON.stringify({status:'not-run',receipt:path.relative(root,path.join(runDir,'receipt.json')),reason:'Runner configuration, isolation or candidate preparation is unavailable.'}));process.exitCode=1;
}finally{candidate?.cleanup();}
