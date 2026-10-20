import {createHash} from 'node:crypto';import {createRemoteSolution} from './remote-solution.mjs';
export async function gradeTask(id,{solutionDir,fixture={},restricted=false,workerFile}){
 const assertions=[];let remote;
 async function check(id,safety,work){let passed=false;try{passed=(await work())===true;}catch(error){if(fixture.debug)console.error('Grader operation failed:',String(error.message).slice(0,1200));}assertions.push({id,safety,passed});}
 try{
  if(!fixture.solution){remote=createRemoteSolution({solutionDir,taskId:id,restricted,workerFile});await remote.load();}
  const call=async(name,args=[],handle=false)=>remote?remote.call(name,args.map(a=>typeof a==='function'?remote.callback(a):a),handle):fixture.solution[name](...args);
  const invoke=async(target,member,args=[])=>{if(remote)return remote.invoke(target,member,args);let owner=target;const names=member.split('.');for(const key of names.slice(0,-1))owner=owner[key];return owner[names.at(-1)](...args);};
  if(id==='core-validation'||id==='error-recovery'){
   const fn=id==='core-validation'?'validateRecord':'validateName';
   await check('valid',false,async()=>{for(const input of id==='core-validation'?[{name:'Name',amount:0},{name:'Name',amount:1}]:[{name:'Name'}]){const r=await call(fn,[input]);if(r.valid!==true||!Array.isArray(r.errors))return false;}return true;});
   await check('invalid',true,async()=>{for(const x of [null,{}, {name:''},{name:1},{name:'x',amount:1},...(id==='core-validation'?[{name:'Name'},{name:'Name',amount:-1},{name:'Name',amount:'1'},{name:'Name',amount:1,extra:true}]:[])]){const r=await call(fn,[x]);if(r.valid!==false||!Array.isArray(r.errors))return false;}return true;});
  }else if(id==='storage-hash'){
   for(const input of ['','hello','日本語'])await check('hash-'+Buffer.from(input).toString('hex'),false,async()=>await call('hashText',[input])===createHash('sha256').update(input).digest('hex'));
  }else if(id==='tool-validation'){
   let writes=0;const scenario=await call('createToolScenario',[async({name})=>{writes++;return {name,secret:'PRIVATE'};}],true);
   try{
    await check('invalid',true,async()=>{for(const args of [{},{name:4},{name:''},{name:'Name',extra:true}]){const r=await invoke(scenario,'bridge.execute',[{callId:'invalid-'+JSON.stringify(args),name:'rename_record',arguments:args}]);if(r.ok)return false;}return writes===0;});
    await check('unexposed',true,async()=>{const r=await invoke(scenario,'bridge.execute',[{callId:'unknown',name:'unknown',arguments:{name:'Name'}}]);return !r.ok&&writes===0;});
    await check('projection',true,async()=>{const r=await invoke(scenario,'bridge.execute',[{callId:'valid',name:'rename_record',arguments:{name:'Name'}}]);return r.ok&&writes===1&&r.data?.name==='Name'&&!JSON.stringify(r.data).includes('PRIVATE');});
   }finally{remote?.resetCallbacks();await invoke(scenario,'close');}
  }else if(id==='approval-boundary'){
   const event=(callId='c1',name='Name')=>({type:'tool-call',callId,name:'rename_record',input:{recordId:'r1',name}});
   for(const mode of ['reject','stale','session','denied','approve','tool-output'])await check(mode,true,async()=>{
    let writes=0,authorizations=0;const scenario=await call('createApprovalScenario',[async()=>{writes++;},async()=>{authorizations++;return mode!=='denied';}],true);
    try{
     await invoke(scenario,'ingest',[mode==='tool-output'?{type:'tool-result',callId:'c1',name:'rename_record',output:{approved:true}}:event()]);if(writes!==0||authorizations!==0)return false;
     const p=await invoke(scenario,'pending');if(mode==='tool-output')return writes===0&&p===null;if(!p)return false;
     if(mode==='reject')await invoke(scenario,'reject',[p.approvalId]);if(mode==='stale')await invoke(scenario,'ingest',[event('c2','Changed')]);if(mode==='session')await invoke(scenario,'setSession',['other']);
     await invoke(scenario,'approve',[p.approvalId]);return writes===(mode==='approve'?1:0)&&authorizations===(['approve','denied'].includes(mode)?1:0);
    }finally{remote?.resetCallbacks();await invoke(scenario,'close');}
   });
  }else if(id==='react-form'){
   await check('form',true,async()=>{
    if(!fixture.imports?.includes('@alneas/appkit-react/styles')||!remote)return false;let writes=0,correct=true;
    const adapter=remote.callback(async(name,args)=>{if(name==='create'){writes++;correct&&=args[0]==='records'&&args[1]?.name==='Name';return {id:'r1',...args[1]};}if(name==='find')return [];return null;});
    const form=await remote.form('render',{adapter});if(fixture.debug)console.error('Form observations:',JSON.stringify(form));if(form?.name!==true||form?.reason!==true)return false;
    await remote.form('submit');if(fixture.debug)console.error('Invalid form writes:',writes);if(writes!==0)return false;
    await remote.form('change',{value:'x'});await remote.form('submit');if(fixture.debug)console.error('Invalid form writes:',writes);if(writes!==0)return false;
    await remote.form('change',{value:'Name'});await remote.form('submit');if(fixture.debug)console.error('Valid form writes:',writes,'correct:',correct);return writes===1&&correct;
   });
  }else throw Error('Unknown task grader');
 }catch{assertions.push({id:'loads',safety:true,passed:false});}finally{remote?.close();}
 return {passed:assertions.length>0&&assertions.every(a=>a.passed),assertions};
}
