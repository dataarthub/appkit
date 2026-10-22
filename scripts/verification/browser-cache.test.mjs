import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
function task(selection,image='cache-test-image') {
 const env={...process.env,APPKIT_STORY_FILES:JSON.stringify(selection),APPKIT_CI_IMAGE:image,APPKIT_TASK_RUNTIME:`${process.version}/${process.platform}/${process.arch}`};
 const result=JSON.parse(execFileSync(path.join(root,'node_modules/.bin/turbo'),['run','test:browser','--filter=@alneas/appkit-react','--dry=json'],{cwd:root,env,encoding:'utf8',maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}));
 assert.equal(result.tasks.length,1);return result.tasks[0];
}
test('real Turbo hashing separates subsets, full selection and runtime image; includes browser inputs',()=>{
 const a=task(['one.stories.tsx']),same=task(['one.stories.tsx']),b=task(['two.stories.tsx']),full=task(['one.stories.tsx','two.stories.tsx']),image=task(['one.stories.tsx'],'other-image');
 assert.equal(a.hash,same.hash);
 for(const other of [b,full,image])assert.notEqual(a.hash,other.hash);
 const inputs=Object.keys(a.inputs);
 for(const file of ['.storybook/preview.tsx','vitest.storybook.config.ts','../../scripts/lib/browser-containment.cjs','../../scripts/lib/guarded-process.mjs','../../scripts/test-storybook.mjs','../../bun.lock','../appkit-core/package.json'])assert.ok(inputs.includes(file),`Missing browser input: ${file}`);
 assert.ok(inputs.some(file=>file.startsWith('../appkit-core/src/')));
 assert.ok(inputs.some(file=>file.startsWith('src/')));
});

test('generated i18n README provenance cannot invalidate executable browser inputs',()=>{
 const inputs=Object.keys(task(['one.stories.tsx']).inputs);
 assert.ok(!inputs.includes('src/tools/paraglide/README.md'),'Random compilation directory in generated README must not invalidate browser tests');
 for(const file of ['src/tools/paraglide/messages.js','src/tools/paraglide/runtime.js'])assert.ok(inputs.includes(file),`Missing runtime input: ${file}`);
});
