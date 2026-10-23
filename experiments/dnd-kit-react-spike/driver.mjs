import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5198','--strictPort'],{stdio:'inherit'});
let serverError;server.on('error',error=>serverError=error);
try{
 let ready=false;
 for(let count=0;count<100;count++){
  if(serverError)throw serverError;
  if(server.exitCode!==null)throw Error('Spike server exited: '+server.exitCode);
  try{const response=await fetch('http://127.0.0.1:5198/',{signal:AbortSignal.timeout(500)});if(response.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw Error('Spike server did not become ready');
 const tests=spawn(process.execPath,['browser.mjs'],{stdio:'inherit'});
 const result=await new Promise((resolve,reject)=>{tests.on('error',reject);tests.on('close',code=>resolve(code));});
 process.exitCode=result??1;
}finally{server.kill('SIGTERM');}
