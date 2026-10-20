import test from 'node:test';
import assert from 'node:assert/strict';
import {recordPublication} from './deployment.mjs';
const target={sha:'a'.repeat(40),name:'@alneas/appkit-core',version:'0.2.1',environment:'npm-core',url:'https://www.npmjs.com/package/@alneas/appkit-core',integrity:'sha512-reviewed'};
test('Deployment records the verified original commit, and retry resumes matching records',async()=>{
 let stored;const calls=[];
 const api=async(method,endpoint,body)=>{
  calls.push({method,endpoint,body});
  if(method==='GET')return stored?[stored]:[];
  if(endpoint==='deployments')return stored={id:12,sha:body.ref,payload:body.payload};
  return {};
 };
 await recordPublication({target,api});await recordPublication({target,api});
 assert.equal(calls.filter(c=>c.method==='POST'&&c.endpoint==='deployments').length,1);
 const create=calls.find(c=>c.endpoint==='deployments').body;
 assert.equal(create.ref,target.sha);assert.equal(create.environment,'npm-core');assert.equal(create.auto_merge,false);
 assert.equal(calls.at(-1).body.environment_url,target.url);
 await assert.rejects(recordPublication({target,api:async()=>[{id:12,sha:target.sha,payload:{integrity:'different'}}]}),/Conflicting/);
});
