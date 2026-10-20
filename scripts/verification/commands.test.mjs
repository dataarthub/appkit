import test from 'node:test';
import assert from 'node:assert/strict';
import {commandsForPlan, executeCommands} from './commands.mjs';
const plan={packages:false,release:false,docs:false,agent:false,compatibility:false,tooling:[],stories:[]};
test('prose does not run browser, compatibility or unit tests; stories build before typechecking and use exact plan',()=>{
 const docs=commandsForPlan({...plan,docs:true},'/plan.json');
 assert.deepEqual(docs.map(x=>x.slice(2).join(' ')),['secrets:check','lint','build','check:docs']);
 const story=commandsForPlan({...plan,tooling:['storybook'],stories:['one.stories.tsx']},'/plan.json');
 assert.ok(story.findIndex(x=>x.includes('build')) < story.findIndex(x=>x.includes('check:storybook')));
 assert.deepEqual(story.at(-1),['node','scripts/test-storybook.mjs','--plan','/plan.json']);
 assert.deepEqual(commandsForPlan({...plan,docs:true},'/plan.json',true),[]);
});
test('a failing or signalled prerequisite stops all subsequent commands',()=>{
 const seen=[];
 assert.equal(executeCommands([['first'],['second'],['publish']],{run:command=>{seen.push(command);return {status:command==='second'?23:0};}}),23);
 assert.deepEqual(seen,['first','second']);
 assert.equal(executeCommands([['first'],['second']],{run:()=>({status:null,signal:'SIGTERM'})}),1);
 assert.throws(()=>executeCommands([['first']],{run:()=>({error:Error('spawn failed')})}),/spawn failed/);
});
