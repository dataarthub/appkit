import {readFileSync,realpathSync} from 'node:fs';import {createHash} from 'node:crypto';import path from 'node:path';
import {loadSuite,suiteDigest} from './agent-eval/suite.mjs';import {evaluatorDigest} from './agent-eval/receipt.mjs';import {sourceDigest,sha256,toolchainDigest} from './agent-eval/workspace.mjs';import {qualifyReceipt} from './agent-eval/qualification.mjs';import {canonicalDigest,relativePath} from './agent/catalog-contract.mjs';
try{
 const args=process.argv.slice(process.argv[2]==='--'?3:2);if(args.length!==4||args[0]!=='--receipt'||args[2]!=='--archives')throw Error('Provide --receipt and --archives.');
 const receiptFile=path.resolve(args[1]),manifestFile=path.resolve(args[3]),receipt=JSON.parse(readFileSync(receiptFile)),manifest=JSON.parse(readFileSync(manifestFile));
 const base=realpathSync(path.dirname(manifestFile));for(const a of manifest.archives){if(!relativePath(a.file))throw Error('Invalid archive path');const file=realpathSync(path.join(base,a.file));if(!file.startsWith(base+path.sep))throw Error('Archive path escaped run');const bytes=readFileSync(file);if(sha256(bytes)!==a.sha256||'sha512-'+createHash('sha512').update(bytes).digest('base64')!==a.integrity)throw Error('Archive digest mismatch');}
 const currentInputs={...manifest,toolchainDigest:toolchainDigest(readFileSync(path.join(base,'consumer-lock.json'))),sourceDigest:sourceDigest(),suiteDigest:suiteDigest(),evaluatorDigest:evaluatorDigest(),suite:loadSuite(),submissionDigests:{}};
 for(const run of receipt.runs??[])for(const attempt of run.attempts??[]){
  if(!/^[a-z0-9-]+$/.test(run.id)||![1,2].includes(attempt.attempt))throw Error('Invalid submission evidence path');const task=currentInputs.suite.find(t=>t.id===run.taskId);if(!task)throw Error('Invalid task');
  const folder=path.join(path.dirname(receiptFile),'runs',run.id,'attempt-'+attempt.attempt,'solution');currentInputs.submissionDigests[run.id+'/'+attempt.attempt]=canonicalDigest(task.allowedOutputPaths.map(file=>({path:file,bytes:readFileSync(path.join(folder,file))})));
 }
 const result=qualifyReceipt({receipt,currentInputs});console.log(JSON.stringify(result));process.exitCode=result.qualified?0:1;
}catch{console.log(JSON.stringify({qualified:false,reasons:['Missing, malformed, stale or changed release evidence.']}));process.exitCode=1;}
