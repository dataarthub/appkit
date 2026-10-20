import {spawn,spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
function mountPath(p){if(typeof p!=='string'||!p.startsWith('/')||/[\r\n,]/.test(p))throw Error('Invalid isolated mount path');return p;}
export function containerArguments({role,name,image,consumerDir,outputDir,envAllowlist=[]}){
 const args=['run','--interactive','--rm','--init','--name',name,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user',role==='verifier'?'0:0':'1000:1000','--pids-limit','256','--memory','2g','--cpus','2','--tmpfs','/tmp:rw,nosuid,nodev,size=256m','--network',role==='verifier'?'none':'bridge','--mount','type=bind,src='+mountPath(consumerDir)+',dst=/consumer,readonly','--workdir','/consumer'];
 if(role==='verifier')args.push('--cap-add','SETUID','--cap-add','SETGID','--cap-add','DAC_OVERRIDE','--cap-add','KILL');
 if(role==='agent'){args.push('--mount','type=bind,src='+mountPath(outputDir)+',dst=/solution');for(const env of envAllowlist)args.push('--env',env);}
 args.push(image);return args;
}
function launch(runtime,args,input,deadline,name,env){
 return new Promise((resolve,reject)=>{
  let stdout='',stderr='',settled=false;const child=spawn(runtime,args,{env,stdio:['pipe','pipe','pipe']});
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(result);};
  const stop=reason=>{child.kill('SIGKILL');spawnSync(runtime,['rm','--force',name],{env,stdio:'ignore',timeout:10000});finish(Error(reason));};
  const timer=setTimeout(()=>stop('Submission timeout'),Math.max(1,deadline-Date.now()));
  child.stdout.on('data',data=>{stdout+=data;if(Buffer.byteLength(stdout)>65536)stop('Output limit');});child.stderr.on('data',data=>{if(Buffer.byteLength(stderr)<131072)stderr+=data;});
  child.once('error',e=>finish(e));child.once('close',code=>finish(null,{code,stdout,stderr:stderr.slice(0,131072)}));child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}
export function createExecutionDriver(config){
 const runtime=config.runtimePath,baseEnv={PATH:process.env.PATH,HOME:process.env.HOME};
 return {kind:'isolated-live',
  preflight(){const version=spawnSync(runtime,['version','--format','{{.Server.Version}}'],{env:baseEnv,encoding:'utf8',timeout:10000});if(version.status!==0)throw Error('Docker isolation unavailable');for(const image of [config.runnerImage,config.verifierImage]){const r=spawnSync(runtime,['image','inspect',image],{env:baseEnv,stdio:'ignore',timeout:10000});if(r.status!==0)throw Error('Docker isolation images must be provisioned locally');}},
  runAgent({request,config:current,deadline,consumerDir=request.hostConsumerDir,outputDir=request.hostOutputDir}){
   const name='appkit-agent-'+randomUUID(),args=containerArguments({role:'agent',name,image:current.runnerImage,consumerDir,outputDir,envAllowlist:current.envAllowlist});args.push(current.executable,...current.args);
   const env={...baseEnv};for(const key of current.envAllowlist)if(process.env[key])env[key]=process.env[key];
   const {hostConsumerDir,hostOutputDir,...publicRequest}=request;return launch(runtime,args,JSON.stringify({...publicRequest,consumerDir:'/consumer',outputDir:'/solution'}),deadline,name,env);
  },
  runVerifier({consumerDir,deadline}){const name='appkit-verifier-'+randomUUID(),args=containerArguments({role:'verifier',name,image:config.verifierImage,consumerDir});args.push('node','/consumer/.grader/agent-eval/verify.mjs');return launch(runtime,args,'',deadline,name,baseEnv);},
 };
}
