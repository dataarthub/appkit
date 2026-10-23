import test from 'node:test';
import assert from 'node:assert/strict';
import {github} from './github.mjs';
test('a successful workflow dispatch with HTTP 204 is not treated as a failed write',async()=>{
 const original=globalThis.fetch,token=process.env.GITHUB_TOKEN;
 process.env.GITHUB_TOKEN='test-token';
 try{
  let calls=0;
  globalThis.fetch=async(url,options)=>{
   calls++;assert.equal(options.method,'POST');
   assert.equal(url,'https://api.github.com/repos/dataarthub/appkit/actions/workflows/publish.yml/dispatches');
   assert.deepEqual(JSON.parse(options.body),{ref:'main',inputs:{staged_run:'123'}});
   return new Response(null,{status:204});
  };
  assert.equal(await github('POST','actions/workflows/publish.yml/dispatches',{ref:'main',inputs:{staged_run:'123'}}),null);
  assert.equal(calls,1);
 }finally{globalThis.fetch=original;if(token===undefined)delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=token;}
});
