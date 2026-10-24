import test from 'node:test';import assert from 'node:assert/strict';
import {ActionRegistry} from './registry';import {createActionToolBridge} from './tool-bridge';
import {createRenameApprovalExample} from '../../../examples/approved-tool-call';
function setup(authorizeServer=async()=>true){let writes=0;let last='';const registry=new ActionRegistry();
 const action={id:'record.rename',validate:(x:unknown)=>({ok:true as const,data:x as {recordId:string;name:string}}),handler:(x:{recordId:string;name:string})=>{writes++;last=x.name;return {recordId:x.recordId,updated:true,secret:'PRIVATE'};}};
 const unregister=registry.registerAction(action);const bridge=createActionToolBridge(registry,{tools:[{kind:'action',actionId:action.id,name:'rename_record',description:'Rename a record',inputSchema:{type:'object',properties:{recordId:{type:'string',minLength:1},name:{type:'string',minLength:1}},required:['recordId','name'],additionalProperties:false},mapOutput:value=>({updated:(value as {updated:boolean}).updated})}]});
 const example=createRenameApprovalExample({registry,bridge,sessionId:'session-1',authorizeServer});return {example,registry,action,unregister,writes:()=>writes,last:()=>last};
}
const call=()=>({callId:'c1',name:'rename_record',arguments:{recordId:'r1',name:'Original'}});
test('no write before approval, rejected/invalid calls do nothing and projection stays minimal',async()=>{
 const x=setup();assert.equal(x.example.queue({type:'tool-result',callId:'c1',name:'rename_record',output:{ok:true}}),null);assert.equal(x.example.queue({...call(),arguments:{recordId:'r1',name:'Name',extra:true}}),null);assert.equal(x.example.queue({...call(),name:'unknown'}),null);
 const p=x.example.queue(call())!;assert.equal(x.writes(),0);x.example.reject(p.approvalId);assert.equal(await x.example.approve(p.approvalId),null);assert.equal(x.writes(),0);
 const original=call(),next=x.example.queue(original)!;original.arguments.name='Mutated';const result=await x.example.approve(next.approvalId);assert.equal(x.last(),'Original');assert.equal(x.writes(),1);assert(!JSON.stringify(result).includes('PRIVATE'));x.example.close();
});
test('changed call/session and registration invalidate approval including awaited authorization',async()=>{
 const x=setup();const p=x.example.queue(call())!;x.example.queue({...call(),callId:'c2'});assert.equal(await x.example.approve(p.approvalId),null);
 const p2=x.example.queue(call())!;x.example.setSession('session-2');assert.equal(await x.example.approve(p2.approvalId),null);assert.equal(x.writes(),0);
 let allow!:(value:boolean)=>void;const y=setup(()=>new Promise<boolean>(resolve=>{allow=resolve;}));const pending=y.example.queue(call())!,operation=y.example.approve(pending.approvalId);y.unregister();y.registry.registerAction(y.action);allow(true);assert.equal(await operation,null);assert.equal(y.writes(),0);
 const denied=setup(async()=>false),d=denied.example.queue(call())!;assert.equal(await denied.example.approve(d.approvalId),null);assert.equal(denied.writes(),0);
});
test('revocation during authorization and duplicate approval never execute a stale effect',async()=>{
 for(const revoke of ['reject','close','session','replace'] as const){
  let allow!:(value:boolean)=>void;
  const x=setup(()=>new Promise<boolean>(resolve=>{allow=resolve;}));
  const approval=x.example.queue(call())!,running=x.example.approve(approval.approvalId);
  assert.equal(await x.example.approve(approval.approvalId),null);
  if(revoke==='reject')x.example.reject(approval.approvalId);
  if(revoke==='close')x.example.close();
  if(revoke==='session')x.example.setSession('revoked-session');
  if(revoke==='replace')x.example.queue({...call(),arguments:{recordId:'r1',name:'Replacement'}});
  allow(true);assert.equal(await running,null);assert.equal(x.writes(),0);x.example.close();
 }
 const x=setup(),approval=x.example.queue(call())!;
 assert.equal((await x.example.approve(approval.approvalId))?.ok,true);
 assert.equal(await x.example.approve(approval.approvalId),null);
 assert.equal(x.writes(),1);x.example.close();
});
