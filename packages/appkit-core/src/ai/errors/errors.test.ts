import test from 'node:test';import assert from 'node:assert/strict';
import {AIChatError,getAIErrorInfo} from './index';
test('chat errors preserve Error/message behavior and every code has safe domain-specific recovery',()=>{
 const error=new AIChatError('AI_INCOMPLETE_STREAM','AI stream ended before finish');assert(error instanceof Error);assert.equal(error.message,'AI stream ended before finish');assert.equal(error.code,'AI_INCOMPLETE_STREAM');
 for(const domain of ['action','tool','chat'] as const)for(const code of domain==='chat'?['AI_INVALID_CONFIGURATION','AI_HTTP_FAILURE','AI_INVALID_STREAM','AI_INCOMPLETE_STREAM','AI_INVALID_TOOL_CALL','AI_RESPONSE_LIMIT','AI_FILE_UPLOAD_FAILURE']:domain==='action'?['NOT_FOUND','INVALID_INPUT','EXECUTION_FAILED','CANCELLED']:['INVALID_CALL','NOT_EXPOSED','NOT_AVAILABLE','INVALID_INPUT','CANCELLED','EXECUTION_FAILED','INVALID_OUTPUT','DUPLICATE_CALL','CALL_LIMIT','CLOSED']){
  const info=getAIErrorInfo(domain,code)!;assert.match(info.docsUrl,/github.com\/dataarthub\/appkit/);assert(info.guide.includes('#'+domain+'-'));assert(info.recovery);
 }
 assert.equal(getAIErrorInfo('tool','UNKNOWN'),undefined);assert.notEqual(getAIErrorInfo('tool','INVALID_INPUT')!.guide,getAIErrorInfo('action','INVALID_INPUT')!.guide);
 assert.match(getAIErrorInfo('tool','DUPLICATE_CALL')!.recovery,/reconcile/i);
});
