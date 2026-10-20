import {createAjvValidator} from '@alneas/appkit-core/ai';
import {jsonSnapshot} from '@alneas/appkit-core/ai/validation';
import type {ActionRegistry,ActionToolBridge,ActionToolCall,ActionToolResult} from '@alneas/appkit-core/ai';

export interface PendingApproval {
 readonly approvalId:string;readonly callId:string;readonly recordId:string;
 readonly name:string;readonly sessionId:string;readonly effect:string;
}
/** Application example, not a server authorization service or library approval API. */
export function createRenameApprovalExample({registry,bridge,sessionId,authorizeServer}:{
 registry:ActionRegistry;bridge:ActionToolBridge;sessionId:string;
 authorizeServer:(snapshot:PendingApproval)=>Promise<boolean>;
}){
 const validate=createAjvValidator({ajvOptions:{coerceTypes:false,useDefaults:false,removeAdditional:false}});
 const schema={type:'object',properties:{recordId:{type:'string',minLength:1},name:{type:'string',minLength:1}},required:['recordId','name'],additionalProperties:false};
 let revision=0,sequence=0,closed=false,inFlight:string|null=null;
 let pending:{view:PendingApproval;call:ActionToolCall;registration:ReturnType<ActionRegistry['getAction']>;revision:number}|null=null;
 const clear=()=>{pending=null;revision++;};
 return {
  queue(input:unknown):PendingApproval|null {
   clear();if(closed)return null;
   try{
    const call=jsonSnapshot(input) as unknown as ActionToolCall;
    if(!call||typeof call.callId!=='string'||!call.callId.trim()||call.name!=='rename_record'||!bridge.listTools().some(t=>t.name===call.name)||!validate(schema,call.arguments).valid)return null;
    const registration=registry.getAction('record.rename');if(!registration)return null;
    const args=call.arguments as {recordId:string;name:string};
    const view=Object.freeze({approvalId:'approval-'+ ++sequence,callId:call.callId,recordId:args.recordId,name:args.name,sessionId,effect:'Rename this record'});
    pending={view,call,registration,revision};return view;
   }catch{return null;}
  },
  reject(approvalId:string){if(pending?.view.approvalId===approvalId||inFlight===approvalId)clear();},
  async approve(approvalId:string):Promise<ActionToolResult|null>{
   if(closed||inFlight||!pending||pending.view.approvalId!==approvalId)return null;
   const selected=pending;pending=null;inFlight=approvalId;
   try{
    if(registry.getAction('record.rename')!==selected.registration||selected.view.sessionId!==sessionId)return null;
    if(!await authorizeServer(selected.view))return null;
    if(closed||revision!==selected.revision||selected.view.sessionId!==sessionId||registry.getAction('record.rename')!==selected.registration)return null;
    // The registered handler must re-check server identity/permissions, concurrency
    // and durable idempotency. This browser approval is not an authorization token.
    return await bridge.execute(selected.call);
   }finally{inFlight=null;}
  },
  setSession(next:string){if(sessionId!==next){sessionId=next;clear();}},
  close(){closed=true;clear();},
 };
}
