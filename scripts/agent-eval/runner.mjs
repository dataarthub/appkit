import {isDeepStrictEqual} from 'node:util';
import {object,validateRunnerRequest,validateRunnerResponse} from './contracts.mjs';
const forbidden=/^(?:NODE_AUTH_TOKEN|NPM_TOKEN|GH_TOKEN|GITHUB_TOKEN|AWS_.*|GOOGLE_.*|DATABASE_URL)$/;
export function validateRunnerConfig(c){
 if(!object(c)||typeof c.executable!=='string'||!c.executable||!Array.isArray(c.args)||!c.args.every(x=>typeof x==='string')||!Array.isArray(c.envAllowlist)||!c.envAllowlist.every(x=>/^[A-Z_][A-Z0-9_]*$/.test(x)&&!forbidden.test(x)))throw Error('Invalid runner environment or credentials');
 if(!object(c.expectedRunner)||!c.expectedRunner.name||!c.expectedRunner.version||!object(c.expectedModel)||!c.expectedModel.id||!object(c.expectedModel.settings)||!Number.isInteger(c.submissionTimeoutMs)||c.submissionTimeoutMs<1||c.submissionTimeoutMs>600000||!Number.isInteger(c.batchTimeoutMs)||c.batchTimeoutMs<1||c.batchTimeoutMs>7200000||typeof c.runtimePath!=='string'||![c.runnerImage,c.verifierImage].every(x=>typeof x==='string'&&/^[\w./:-]+@sha256:[a-f0-9]{64}$/.test(x)))throw Error('Invalid runner identity, limits or isolation');
 return c;
}
export async function invokeRunner({request,config,driver,deadline}){
 validateRunnerRequest(request);validateRunnerConfig(config);
 const result=await driver.runAgent({request,config,deadline});
 if(result.code!==0||Buffer.byteLength(result.stdout)>65536)throw Error('Runner failed or exceeded output limit');
 let response;try{response=validateRunnerResponse(JSON.parse(result.stdout),request);}catch{throw Error('Invalid runner response');}
 if(!isDeepStrictEqual(response.runner,config.expectedRunner)||!isDeepStrictEqual(response.model,config.expectedModel))throw Error('Runner identity changed');
 return {schemaVersion:1,runId:response.runId,taskId:response.taskId,status:response.status,runner:response.runner,model:response.model};
}
