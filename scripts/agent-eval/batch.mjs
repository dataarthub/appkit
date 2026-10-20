import {mkdirSync,writeFileSync,readFileSync,cpSync,chmodSync,mkdtempSync,rmSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {invokeRunner} from './runner.mjs';import {collectSubmission,prepareOutputFiles,fixtureDigest} from './workspace.mjs';import {analyzeSubmission,assessSubmission} from './score.mjs';import {suiteDigest} from './suite.mjs';import {evaluatorDigest,successful,writeReceipt} from './receipt.mjs';
const unobserved=category=>({apiConformant:false,typecheckPassed:false,behavior:{passed:false,assertions:[]},safety:'not-run',unsupportedApiCount:0,hallucinatedApiCount:0,unsupportedReferences:[],diagnosticCategories:[category],needsReview:false,solutionDigest:'',observed:false});
async function executeLiveAttempt({task,run,attempt,feedback,candidate,runnerConfig,driver,deadline}){
 const area=mkdtempSync(path.join(tmpdir(),'appkit-agent-run-'));chmodSync(area,0o755);
 try{
  const consumer=path.join(area,'consumer'),output=path.join(area,'solution'),verified=path.join(area,'verified');cpSync(candidate.consumerDir,consumer,{recursive:true});chmodSync(consumer,0o755);mkdirSync(output,{mode:0o777});chmodSync(output,0o777);
  if(attempt===1&&existsSync(path.join(task.directory,'starter')))cpSync(path.join(task.directory,'starter'),output,{recursive:true});
  if(attempt===2)cpSync(path.join(candidate.runDir,'runs',run.id,'attempt-1/solution'),output,{recursive:true});
  prepareOutputFiles(output,task.allowedOutputPaths);
  writeFileSync(path.join(consumer,'task-contract.d.ts'),task.contract);
  const request={schemaVersion:1,runId:run.id,taskId:task.id,taskText:task.prompt,consumerDir:'/consumer',outputDir:'/solution',allowedOutputPaths:task.allowedOutputPaths,attempt,timeBudgetMs:Math.min(runnerConfig.submissionTimeoutMs,Math.max(1,deadline-Date.now())),feedback,hostConsumerDir:consumer,hostOutputDir:output};
  const protectedBefore=fixtureDigest(consumer);
  const response=await invokeRunner({request,config:runnerConfig,driver,deadline});if(response.status!=='completed')throw Error('Runner incomplete');
  const evidence=path.join(candidate.runDir,'runs',run.id,'attempt-'+attempt),submission=collectSubmission({outputDir:output,allowedPaths:task.allowedOutputPaths,destination:path.join(evidence,'solution'),protectedDir:consumer});
  if(submission.protectedInputsDigest!==protectedBefore)throw Error('Protected fixture changed');
  cpSync(candidate.consumerDir,verified,{recursive:true});chmodSync(verified,0o755);cpSync(path.join(evidence,'solution'),path.join(verified,'submission'),{recursive:true});
  const analysis=analyzeSubmission({solutionFiles:task.allowedOutputPaths.map(f=>path.join(verified,'submission',f)),consumerDir:verified,seedReferences:task.seedReferences,allowedImports:task.allowedImports,requiredIntegration:task.requiredIntegration});
  let assessment;
  if(analysis.apiConformant&&analysis.typecheckPassed){
   const grader=path.join(verified,'.grader');mkdirSync(grader,{mode:0o700});
   for(const dir of ['agent','agent-eval']){mkdirSync(path.join(grader,dir));const files=dir==='agent'?['catalog-contract.mjs','load-catalogs.mjs']:['verify.mjs','score.mjs','contracts.mjs','graders.mjs','remote-solution.mjs','solution-worker.mjs','seed-evidence.mjs'];for(const file of files)cpSync(path.join(import.meta.dirname,dir==='agent'?'../agent':'.',file),path.join(grader,dir,file));}
   const {directory,...contract}=task;writeFileSync(path.join(verified,'.grader-input.json'),JSON.stringify(contract),{mode:0o600});
   const result=await driver.runVerifier({consumerDir:verified,deadline});if(result.code!==0)throw Error('Verifier failed');const returned=JSON.parse(result.stdout);
   // Recompute success and safety from exact assertion IDs, not a process's claimed grade.
   assessment=assessSubmission({analysis:{...analysis,typecheckPassed:analysis.typecheckPassed&&returned.typecheckPassed===true,needsReview:analysis.needsReview||returned.needsReview===true},behavior:returned.behavior,expectedAssertions:task.assertionIds,safetyAssertions:task.safetyAssertionIds});
  }else assessment=assessSubmission({analysis,behavior:{passed:false,assertions:[]},expectedAssertions:task.assertionIds,safetyAssertions:task.safetyAssertionIds});
  writeFileSync(path.join(evidence,'analysis.json'),JSON.stringify(analysis,null,2)+'\n',{mode:0o600});
  return {...assessment,solutionDigest:submission.digest,protectedInputsDigest:submission.protectedInputsDigest,observed:true,feedback:{categories:analysis.diagnosticCategories,messages:[...analysis.diagnostics.slice(0,6).map(d=>d.message.slice(0,1000)),...assessment.behavior.assertions.filter(a=>!a.passed).map(a=>'Failed behavioral assertion: '+a.id)]}};
 }finally{rmSync(area,{recursive:true,force:true});}
}
export async function runBatch({suite,candidate,runnerConfig,driver,clock=Date.now,executeAttempt}){
 const start=clock(),deadline=start+runnerConfig.batchTimeoutMs,runId=randomUUID(),runs=suite.flatMap(task=>[1,2,3].map(repetition=>({id:task.id+'-'+repetition,taskId:task.id,repetition,attempts:[],outcome:'not-started'})));
 const receipt={schemaVersion:1,mode:executeAttempt||driver.kind!=='isolated-live'?'self-test':'live',executionKind:executeAttempt||driver.kind!=='isolated-live'?'test-driver':'isolated-live',runId,startedAt:new Date().toISOString(),runner:runnerConfig.expectedRunner,model:runnerConfig.expectedModel,inputs:{archives:candidate.archives??[],sourceDigest:candidate.sourceDigest??'',catalogDigests:candidate.catalogDigests??{},toolchainDigest:candidate.toolchainDigest??'',images:{runner:runnerConfig.runnerImage,verifier:runnerConfig.verifierImage},runner:runnerConfig.expectedRunner,model:runnerConfig.expectedModel},suiteDigest:suiteDigest(),evaluatorDigest:evaluatorDigest(),runs,firstSuccesses:0,finalSuccesses:0,completed:false,limits:{submissionTimeoutMs:runnerConfig.submissionTimeoutMs,batchTimeoutMs:runnerConfig.batchTimeoutMs},reviewDecisions:[]};
 const save=()=>{receipt.firstSuccesses=runs.filter(r=>successful(r.attempts[0])).length;receipt.finalSuccesses=runs.filter(r=>successful(r.attempts.at(-1))).length;if(candidate.runDir)writeReceipt(path.join(candidate.runDir,'receipt.json'),receipt);};
 try{await driver.preflight();}catch{receipt.infrastructureCategory='isolation-unavailable';save();return receipt;}
 for(const run of runs){if(clock()>=deadline){run.failureCategory='batch-budget';continue;}const task=suite.find(t=>t.id===run.taskId);run.outcome='failed';
  for(const attempt of [1,2]){
   if(clock()>=deadline){run.failureCategory='batch-budget';break;}
   try{
    const feedback=attempt===2?{categories:run.attempts[0].diagnosticCategories,messages:run.attempts[0].feedback?.messages??['Correct the code using the task contract and installed documentation. API, type and behavioral checks did not all pass.']}:undefined;
    const startOfAttempt=clock();const assessment=await (executeAttempt??executeLiveAttempt)({task,run,attempt,feedback,candidate,runnerConfig,driver,deadline:Math.min(deadline,clock()+runnerConfig.submissionTimeoutMs)});
    if(clock()>Math.min(deadline,startOfAttempt+runnerConfig.submissionTimeoutMs))throw Error('Submission timeout');
    run.attempts.push({...assessment,attempt});if(successful(assessment)){run.outcome='completed';break;}
   }catch(error){const category=/timeout/i.test(error.message)?'submission-timeout':'runner-or-verifier-failed';run.attempts.push({...unobserved(category),attempt});run.failureCategory=category;break;}
  }save();
 }
 receipt.completed=runs.every(r=>r.outcome!=='not-started'&&!r.failureCategory?.includes('batch-budget'));receipt.completedAt=new Date().toISOString();save();return receipt;
}
