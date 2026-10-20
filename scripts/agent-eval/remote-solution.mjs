// Trusted controller: submitted values are observations, never grades or assertion IDs.
import {spawn} from 'node:child_process';import {randomUUID} from 'node:crypto';import path from 'node:path';
export function createRemoteSolution({solutionDir,taskId,restricted=false,timeoutMs=15000,workerFile=path.join(import.meta.dirname,'solution-worker.mjs')}){
 if(restricted&&process.getuid?.()!==0)throw Error('Verifier must isolate the executor under a distinct UID');
 const child=spawn(process.execPath,[workerFile,path.join(solutionDir,'compiled/solution.js'),taskId],{cwd:solutionDir,env:{PATH:process.env.PATH,HOME:'/tmp',TMPDIR:'/tmp'},stdio:['pipe','pipe','pipe','pipe'],...(restricted?{uid:65534,gid:65534}:{})});
 const pending=new Map(),callbacks=new Map();let buffer='',dead=false,bytes=0,diagnostic='';
 const fail=()=>{if(dead)return;dead=true;child.kill('SIGKILL');child.stdin.end();child.stdout.destroy();child.stderr.destroy();child.stdio[3].destroy();child.unref();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Untrusted executor failed: '+diagnostic.slice(-700)));}pending.clear();};
 const send=value=>{if(dead)throw Error('Executor closed');child.stdin.write(JSON.stringify(value)+'\n');};
 child.on('error',fail);child.on('exit',fail);child.stdin.on('error',fail);child.stderr.on('data',chunk=>{diagnostic=(diagnostic+chunk).slice(-2000);});child.stdout.on('data',chunk=>{diagnostic=(diagnostic+chunk).slice(-2000);});
 child.stdio[3].on('data',chunk=>{bytes+=chunk.length;if(bytes>1024*1024)return fail();buffer+=chunk;if(Buffer.byteLength(buffer)>65536)return fail();let end;
  while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let message;try{message=JSON.parse(line);}catch{return fail();}
   if(message?.type==='callback'&&pending.size&&callbacks.has(message.callbackId)&&typeof message.callId==='string'&&Array.isArray(message.args)){
    Promise.resolve().then(()=>callbacks.get(message.callbackId)(...message.args)).then(value=>{if(!dead)send({type:'callback-result',callId:message.callId,value});},()=>{if(!dead)send({type:'callback-result',callId:message.callId,error:true});});
   }else if(message?.type==='result'&&pending.has(message.id)&&typeof message.ok==='boolean'){
    const p=pending.get(message.id);pending.delete(message.id);clearTimeout(p.timer);message.ok?p.resolve(message.value):p.reject(Error('Submitted operation failed: '+String(message.error??'').slice(0,1000)));
   }else return fail();
  }
 });
 function callback(fn){const id=randomUUID();callbacks.set(id,fn);return {__callback:id};}
 function request(op,details={}){if(dead)return Promise.reject(Error('Executor closed'));const id=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(fail,timeoutMs);pending.set(id,{resolve,reject,timer});send({id,op,...details});});}
 return {callback,resetCallbacks(){callbacks.clear();},load:()=>request('load'),call:(name,args=[],handle=false)=>request('call',{target:0,path:[name],args,handle}),invoke:(target,member,args=[])=>request('call',{target,path:member.split('.'),args}),form:(op,args={})=>request('form',{action:op,...args}),close(){fail();}};
}
