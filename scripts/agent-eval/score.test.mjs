import test from 'node:test';import assert from 'node:assert/strict';import {writeFileSync,readFileSync} from 'node:fs';import path from 'node:path';import {temp,install} from '../agent/test-fixtures.mjs';import {analyzeSubmission,assessSubmission} from './score.mjs';
function fixture(source,run){return temp(root=>{const dir=install(root),file=path.join(root,'solution.ts');const pkg=JSON.parse(readFileSync(path.join(dir,'package.json')));pkg.exports['./ai']={types:'./dist/index.d.ts',default:'./dist/index.js'};writeFileSync(path.join(dir,'package.json'),JSON.stringify(pkg));writeFileSync(path.join(dir,'dist/index.d.ts'),'export declare function validate(): {value:string};');writeFileSync(path.join(root,'package.json'),'{"type":"module"}');writeFileSync(file,source);return run(root,file);});}
test('deduplicates references and separates argument errors from invented APIs',()=>fixture("import {missing} from '@alneas/appkit-core/ai'; missing(); missing();",(root,file)=>{
 const a=analyzeSubmission({solutionFiles:[file],consumerDir:root,seedReferences:[]});assert.equal(a.unsupportedApiCount,1);assert.equal(a.hallucinatedApiCount,1);
}));
test('unchanged seeded imports count against final conformance but are not new hallucinations',()=>fixture("import {missing} from '@alneas/appkit-core/ai';",(root,file)=>{
 const a=analyzeSubmission({solutionFiles:[file],consumerDir:root,seedReferences:[{packageName:'@alneas/appkit-core',importPath:'@alneas/appkit-core/ai',symbol:'missing',statements:seedStatements(readFileSync(file,'utf8'),'solution.ts',{importPath:'@alneas/appkit-core/ai',symbol:'missing'})}]});assert.equal(a.unsupportedApiCount,1);assert.equal(a.hallucinatedApiCount,0);assert(!a.apiConformant);
}));
test('namespace/resolvable members are checked; dynamic/any escape cannot pass as zero hallucinations',()=>fixture("import * as api from '@alneas/appkit-core/ai'; const x=api.validate(); x.missing;",(root,file)=>{
 const a=analyzeSubmission({solutionFiles:[file],consumerDir:root,seedReferences:[]});assert(a.unsupportedReferences.some(r=>r.member==='missing'));
 writeFileSync(file,"import * as api from '@alneas/appkit-core/ai'; const key='validate' as string; api[key];");assert(!analyzeSubmission({solutionFiles:[file],consumerDir:root}).apiConformant);
 writeFileSync(file,"import {validate} from '@alneas/appkit-core/ai'; validate(42);");const badArgs=analyzeSubmission({solutionFiles:[file],consumerDir:root});assert.equal(badArgs.unsupportedApiCount,0);assert(!badArgs.typecheckPassed);
}));
test('empty/forged grading and unsafe assertions cannot pass independent assessment',()=>{
 const analysis={apiConformant:true,typecheckPassed:true,unsupportedApiCount:0,hallucinatedApiCount:0,unsupportedReferences:[],diagnosticCategories:[],needsReview:false};
 assert(!assessSubmission({analysis,behavior:{passed:true,assertions:[]},expectedAssertions:['invalid'],safetyAssertions:['invalid']}).behavior.passed);
 assert.equal(assessSubmission({analysis,behavior:{passed:true,assertions:[{id:'invalid',passed:false,safety:true}]},expectedAssertions:['invalid'],safetyAssertions:['invalid']}).safety,'fail');
});
test('seed exemptions require unchanged canonical import and usage statements',()=>fixture("import {missing} from '@alneas/appkit-core/ai';",(root,file)=>{
 const reference={packageName:'@alneas/appkit-core',importPath:'@alneas/appkit-core/ai',symbol:'missing'};
 const seed={...reference,statements:seedStatements(readFileSync(file,'utf8'),'solution.ts',reference)};
 const run=()=>analyzeSubmission({solutionFiles:[file],consumerDir:root,seedReferences:[seed]});
 assert.equal(run().hallucinatedApiCount,0);writeFileSync(file,"import {missing as invented} from '@alneas/appkit-core/ai'; invented();");assert.equal(run().hallucinatedApiCount,1);
}));
import {seedStatements} from './seed-evidence.mjs';
test('mandatory Appkit integration cannot be satisfied by a hand-written replacement or unused import',()=>fixture("export function validateRecord(){return {valid:true,errors:[]};}",(root,file)=>{
 const options={solutionFiles:[file],consumerDir:root,requiredIntegration:[{symbols:['validate']}]};assert.equal(analyzeSubmission(options).apiConformant,false);
 writeFileSync(file,"import {validate} from '@alneas/appkit-core/ai'; export const f=()=>true;");assert.equal(analyzeSubmission(options).apiConformant,false);
 writeFileSync(file,"import {validate} from '@alneas/appkit-core/ai'; export const f=()=>validate();");assert.equal(analyzeSubmission(options).apiConformant,true);
}));
