---
title: "Review AI proposals in React"
description: "React proposal review and generative UI bindings"
sidebar:
  order: 2
archetype: how-to
project: appkit
tags: ["appkit", "ai"]
---

# Review AI proposals in React

## Prerequisites

Install the package; feature subpaths are import targets.

```bash
bun add @alneas/appkit-react
```

Use React and React DOM 19 matching the package peer ranges.

## Public import

`@alneas/appkit-react/ai`

## Step-by-Step Implementation

```tsx
import * as ai from '@alneas/appkit-react/ai';
console.log(Object.keys(ai).length > 0);
```

## Verification

Type-check this example in your application. See [the export reference](exports.md) for narrower entry points and exact optional peers. Package import/type checks do not certify hosted providers.

## Troubleshooting / Common Pitfalls

React proposal review and generative UI bindings. The optional chat transport requires the ai SDK peer. Proposals do not authorize execution or stored-record changes.

## Prompt injection and review permissions

Transport text, tool-call arguments, retrieved files and tool outputs are untrusted. The optional `ai` peer is needed only by the SDK chat binding; a chat transport never approves or executes a tool. Keep provider secrets in a server-owned endpoint.

Use the [Core validation and approval sequence](../../appkit-core/docs/ai.md) before presenting a proposal. Display the exact immutable target and arguments, require explicit approval for writes or sensitive disclosure, and invalidate approval when the call, session or registration changes. The server must independently enforce resource permissions, concurrency and durable idempotency at execution time. A React component, assistant message or SDK tool-output event is not authorization.

Render registered components only, keep React text rendering escaped, and project minimal validated outputs. Do not evaluate generated code or embed arbitrary model HTML. Cancellation cannot roll back completed writes; reconcile uncertain effects before retrying. See [Core error recovery](../../appkit-core/docs/ai-errors.md).

## Application review controls

These host-owned controls consume the application's pending snapshot. Supply the Core example's controller or equivalent server-backed application flow. `onSettled` refreshes application state. No provider, database or theme provider is required just to render these controls; the larger application retains its documented providers and explicit styles.

```tsx
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
```
