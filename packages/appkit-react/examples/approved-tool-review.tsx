import {useState} from 'react';
/** Host-owned review controls; rendering or receiving a tool event never grants permission. */
export function RenameToolReview({example,pending,onSettled}:{
 example:{approve:(id:string)=>Promise<unknown>;reject:(id:string)=>void};
 pending:{approvalId:string;recordId:string;name:string}|null;onSettled:()=>void;
}){
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(false);
 if(!pending)return null;
 return <section aria-label="Review proposed rename">
  <p>Rename record {pending.recordId} to {pending.name}</p>
  <button disabled={busy} onClick={async()=>{setBusy(true);setFailure(false);try{await example.approve(pending.approvalId);}catch{setFailure(true);}finally{setBusy(false);onSettled();}}}>Approve</button>
  <button disabled={busy} onClick={()=>{example.reject(pending.approvalId);onSettled();}}>Reject</button>
  {failure&&<p role="alert">Execution could not complete. Check the application outcome before retrying.</p>}
 </section>;
}
