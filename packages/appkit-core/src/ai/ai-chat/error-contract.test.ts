import test from 'node:test';import assert from 'node:assert/strict';
import {AIChatError} from '../errors/index';import {createOpenAICompatibleChatAdapter} from './openai-compatible';import {normalizeAIChatEvent} from './conversation';
import {ActionRegistry} from '../action/registry';import {createActionToolBridge} from '../action/tool-bridge';
import type {ActionToolResult} from '../action/tool-types';
test('failure metadata stays safe, success shape and legacy construction remain valid',async()=>{
 const legacy:ActionToolResult={callId:'c',name:'x',ok:false,code:'INVALID_INPUT',error:'Invalid'};assert.equal(legacy.ok,false);
 const registry=new ActionRegistry();registry.registerAction({id:'x',validate:()=>({ok:true,data:{}}),handler:()=>{throw Error('SECRET');}});
 const bridge=createActionToolBridge(registry,{tools:[{kind:'action',actionId:'x',name:'x',description:'x',inputSchema:{type:'object'},mapOutput:()=>({})}]});
 const result=await bridge.execute({callId:'c',name:'x',arguments:{}});assert(!result.ok);assert(result.docsUrl);assert(result.recovery);assert(!JSON.stringify(result).includes('SECRET'));
 const local=await registry.executeAction('missing',{});assert(!local.ok);assert(local.docsUrl);
});
test('chat classifications preserve messages, caller exceptions and abort identities',async()=>{
 assert.throws(()=>createOpenAICompatibleChatAdapter({api:'/chat',model:''}),e=>e instanceof AIChatError&&e.code==='AI_INVALID_CONFIGURATION'&&e.message==='An AI model is required');
 assert.throws(()=>normalizeAIChatEvent({type:'bad'} as never),e=>e instanceof AIChatError&&e.code==='AI_INVALID_STREAM');
 const original=Error('caller');const adapter=createOpenAICompatibleChatAdapter({api:'/chat',model:'test',fetch:async()=>{throw original;}});
 await assert.rejects(async()=>{for await(const _ of adapter.stream({messages:[]})){}},e=>e===original);
 const http=createOpenAICompatibleChatAdapter({api:'/chat',model:'test',fetch:async()=>new Response('private',{status:403})});
 await assert.rejects(async()=>{for await(const _ of http.stream({messages:[]})){}},e=>e instanceof AIChatError&&e.code==='AI_HTTP_FAILURE'&&!e.message.includes('private'));
 const controller=new AbortController();controller.abort();
 await assert.rejects(async()=>{for await(const _ of adapter.stream({messages:[],signal:controller.signal})){}},e=>e instanceof Error&&e.name==='AbortError');
});
