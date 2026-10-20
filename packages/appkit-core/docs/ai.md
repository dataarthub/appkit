---
title: "Validate AI proposals before applying changes"
description: "Structured-output validation and proposal review contracts"
sidebar:
  order: 2
archetype: how-to
project: appkit
tags: ["appkit", "ai"]
---

# Validate AI proposals before applying changes

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-core
```

## Public import

`@alneas/appkit-core/ai`

## Step-by-Step Implementation

```typescript
import {createAjvValidator} from '@alneas/appkit-core/ai';
const validator = createAjvValidator({locale:'en'});
console.log(typeof validator);
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

Structured-output validation and proposal review contracts. Metadata checks do not prove that an AI coding agent can choose correct APIs from arbitrary requests. End-to-end coding-agent task evaluation remains unverified. Applications authorize and execute final writes.

## Prompt injection and execution boundaries

`createAISDKChatAdapter` normalizes the AI SDK UI Message Stream protocol; it is not an SDK model instance wrapper. `createOpenAICompatibleChatAdapter` assembles Chat Completions tool arguments. Both transports return data. Neither executes tools, approves actions, nor grants server permissions.

1. Treat retrieved text, uploads, assistant messages and tool outputs as untrusted data. Do not promote their instructions into trusted messages, provider parameters or endpoint configuration.
2. Accept only complete call envelopes from an explicitly exposed session tool. Validate the JSON schema and typed input parser before presenting a proposal. Use strict object schemas when extra properties are not intended.
3. Preview an immutable snapshot of the tool, arguments, target resources and effects. Bind approval to the exact call, authenticated session and current action registration. Changed calls or registrations require new approval.
4. Require explicit application approval for writes, sends, deletion or sensitive disclosure. An assistant message, SDK tool-output event or review UI does not prove approval. Read-only work may use a narrow preauthorized application policy.
5. At execution, the server rechecks identity, tenant/resource permissions, business rules, concurrency and durable idempotency. Browser approval, a schema and in-memory duplicate-call rejection are not server authorization.
6. Execute only a fixed registered handler. Validate and project its output with `mapOutput` before disclosure; never expose raw causes or use raw output when projection fails.
7. Propagate cancellation and reconcile ambiguous results. Cancellation does not roll back effects; do not retry a write without checking its outcome.

The bridge enforces explicit tool exposure, synchronous schema checks, bounded JSON snapshots, call limits and safe output projection. It does not detect all prompt injection or implement server authorization, durable idempotency or application approval. Keep provider credentials and upload endpoints server-owned; file upload is an explicit data disclosure decision. Never evaluate model-generated code or choose arbitrary UI components from model text.

See [error codes and recovery](ai-errors.md). Fixed recovery hints describe inspection and correction; they do not authorize execution or automatic retries.

## Application approval example

This example is application code using published APIs. Configure the `record.rename` handler and `rename_record` bridge binding with the same strict schema and a minimal output projection. `authorizeServer` calls your server; the final server-side handler still rechecks permissions and idempotency. Reject SDK `tool-result` events as requests for execution; only a validated tool-call can be queued.

```typescript
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
```
