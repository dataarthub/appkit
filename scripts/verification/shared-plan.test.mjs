import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {projectPlan,validateSavedPlan,recordUnchanged} from './shared-plan.mjs';
test('snapshot changes select packages and related stories even when HEAD equals baseline',async()=>{
 const root=mkdtempSync(join(tmpdir(),'appkit-snapshot-'));
 try{for(const [file,text] of Object.entries({'packages/appkit-react/src/ui/button.tsx':'export const Button=1;','packages/appkit-react/stories/button.stories.tsx':"import {Button} from '../src/ui/button'; export const Basic={};"})){mkdirSync(join(root,file,'..'),{recursive:true});writeFileSync(join(root,file),text);}
 const plan=await projectPlan({root,common:{provenance:'local',sha:'a'.repeat(40),baseline:'a'.repeat(40),changes:[{file:'packages/appkit-react/src/ui/button.tsx',status:'M'}]}});
 assert.equal(plan.packages,true);assert.deepEqual(plan.stories,['packages/appkit-react/stories/button.stories.tsx']);
 const docs=await projectPlan({root,common:{provenance:'local',sha:'a'.repeat(40),baseline:'a'.repeat(40),changes:[{file:'docs/guide.md',status:'A'}]}});assert.equal(docs.packages,false);assert.deepEqual(docs.stories,[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('saved CI selection requires identical source, SHA and execution identity',()=>{
 const saved={input:'one',common:{sha:'a',identity:{node:24}},plan:{packages:false,stories:[]}};
 assert.equal(validateSavedPlan(saved,{input:'one',sha:'a',identity:{node:24}}),saved);
 for(const state of [{input:'two',sha:'a',identity:{node:24}},{input:'one',sha:'b',identity:{node:24}},{input:'one',sha:'a',identity:{node:26}}])assert.throws(()=>validateSavedPlan(saved,state));
});

test('an edit during verification cannot become a successful local snapshot',()=>{let recorded=0;assert.throws(()=>recordUnchanged({before:'old',after:'new',record:()=>recorded++}),/Source changed/);assert.equal(recorded,0);recordUnchanged({before:'same',after:'same',record:()=>recorded++});assert.equal(recorded,1);});
