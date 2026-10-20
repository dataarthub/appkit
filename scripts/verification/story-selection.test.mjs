import test from 'node:test';
import assert from 'node:assert/strict';
import {selectStoryFiles} from './story-selection.mjs';
const root='/fixture';
const files=['/fixture/one.stories.tsx','/fixture/two.stories.tsx'];
test('default keeps the full suite; selection keeps only known stories and rejects empty or invalid plans',()=>{
 assert.deepEqual(selectStoryFiles(root,files,[]),files);
 const select=stories=>selectStoryFiles(root,files,['--plan','plan.json'],()=>({version:1,stories}));
 assert.deepEqual(select(['two.stories.tsx']),[files[1]]);
 for(const stories of [[],['missing.stories.tsx'],['../outside.stories.tsx'],['one.stories.tsx','one.stories.tsx']]) assert.throws(()=>select(stories));
 assert.throws(()=>selectStoryFiles(root,files,['--unknown']));
});
