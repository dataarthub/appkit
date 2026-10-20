import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import path from 'node:path';import ts from 'typescript';
test('selected Appkit-owned chat throw sites use classified errors or cancellation',()=>{
 const raw=[];for(const file of ['stream.ts','conversation.ts','session.ts','ai-sdk.ts','openai-compatible.ts']){
  const ast=ts.createSourceFile(file,readFileSync(path.resolve(import.meta.dirname,'../../packages/appkit-core/src/ai/ai-chat',file),'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node){if(ts.isThrowStatement(node)&&node.expression&&ts.isNewExpression(node.expression)&&node.expression.expression.getText(ast)==='Error')raw.push(file+': '+node.expression.arguments?.[0]?.getText(ast));ts.forEachChild(node,visit);}visit(ast);
 }assert.deepEqual(raw,[]);
});
