import test from 'node:test';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync,symlinkSync,linkSync,readFileSync} from 'node:fs';import path from 'node:path';import {temp} from '../agent/test-fixtures.mjs';import {collectSubmission} from './workspace.mjs';
test('only regular single-link allowlisted files are copied, with no path escape',()=>temp(root=>{
 const out=path.join(root,'out');mkdirSync(out);writeFileSync(path.join(out,'solution.ts'),'export const x=1;');const result=collectSubmission({outputDir:out,allowedPaths:['solution.ts'],destination:path.join(root,'copy')});assert(result.digest);assert.equal(readFileSync(path.join(root,'copy/solution.ts'),'utf8'),'export const x=1;');
 writeFileSync(path.join(out,'extra.ts'),'bad');assert.throws(()=>collectSubmission({outputDir:out,allowedPaths:['solution.ts'],destination:path.join(root,'rejected')}),/Unexpected/);
}));
test('symlinks, hardlinks, oversized files and escaping output paths are rejected',()=>temp(root=>{
 const out=path.join(root,'out');mkdirSync(out);writeFileSync(path.join(root,'private.ts'),'private');symlinkSync(path.join(root,'private.ts'),path.join(out,'solution.ts'));
 assert.throws(()=>collectSubmission({outputDir:out,allowedPaths:['solution.ts'],destination:path.join(root,'copy')}),/regular/);
 assert.throws(()=>collectSubmission({outputDir:out,allowedPaths:['../private.ts'],destination:path.join(root,'escape')}),/path/);
 const hard=path.join(root,'hard');mkdirSync(hard);linkSync(path.join(root,'private.ts'),path.join(hard,'solution.ts'));assert.throws(()=>collectSubmission({outputDir:hard,allowedPaths:['solution.ts'],destination:path.join(root,'hard-copy')}),/regular/);
}));
test('protected fixture digest detects dependency, metadata and link changes',()=>temp(root=>{
 const protectedDir=path.join(root,'fixture');mkdirSync(protectedDir);writeFileSync(path.join(protectedDir,'package.json'),'{}');const original=fixtureDigest(protectedDir);writeFileSync(path.join(protectedDir,'package.json'),'{"changed":true}');assert.notEqual(fixtureDigest(protectedDir),original);
 const output=path.join(root,'out');mkdirSync(output);writeFileSync(path.join(output,'solution.ts'),'export const x=1;');const result=collectSubmission({outputDir:output,allowedPaths:['solution.ts'],destination:path.join(root,'copy'),protectedDir});assert.equal(result.protectedInputsDigest,fixtureDigest(protectedDir));
}));
import {fixtureDigest} from './workspace.mjs';
