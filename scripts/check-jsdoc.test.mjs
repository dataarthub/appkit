import test from 'node:test';
import assert from 'node:assert/strict';
import * as checker from './check-jsdoc.mjs';
test('duplicate singleton block tags fail with source locations',()=>{
 assert.equal(typeof checker.duplicateJSDocTags,'function');
 const issues=checker.duplicateJSDocTags('/**\n * Summary.\n * @remarks First.\n * @param value Input.\n * @remarks Second.\n * @returns Output.\n * @return Another output.\n */\nexport function example(value: string) {return value;}','example.ts');
 assert.deepEqual(issues.map(issue=>[issue.tag,issue.count]),[['@remarks',2],['@returns',2]]);
 assert.ok(issues.every(issue=>issue.file==='example.ts'&&issue.line===1));
});
test('independent blocks, repeated param/example tags and inline mentions remain valid',()=>{
 assert.equal(typeof checker.duplicateJSDocTags,'function');
 const source='/**\n * Mentions @remarks in prose.\n * @remarks One coherent block.\n * @param first Input.\n * @param second Input.\n * @returns Output.\n * @example First.\n * @example Second.\n */\nexport function first(first: string, second: string) {return first+second;}\n/** @remarks Independent block. */\nexport function second() {}';
 assert.deepEqual(checker.duplicateJSDocTags(source,'example.ts'),[]);
});
test('fenced code examples do not become live documentation tags',()=>{
 assert.equal(typeof checker.duplicateJSDocTags,'function');
 const source='/**\n * @remarks Actual notes.\n * @example\n * ```text\n * @remarks Literal syntax in an example.\n * @returns Literal syntax in an example.\n * ```\n * @returns Actual result.\n */\nexport function sample() {}';
 assert.deepEqual(checker.duplicateJSDocTags(source,'example.ts'),[]);
});

test('JSDoc-looking strings are not source documentation',()=>{
 const source='export const example = `/**\n * @remarks Literal one.\n * @remarks Literal two.\n */`;';
 assert.deepEqual(checker.duplicateJSDocTags(source,'example.ts'),[]);
});
