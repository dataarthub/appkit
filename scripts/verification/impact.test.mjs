import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {selectChecks} from './impact.mjs';
function fixture(fn) {
  const root = mkdtempSync(path.join(tmpdir(), 'appkit-impact-'));
  const put = (file, text) => {mkdirSync(path.dirname(path.join(root, file)), {recursive:true}); writeFileSync(path.join(root, file), text);};
  put('packages/appkit-react/src/ui/button.tsx', 'export const Button = 1;');
  put('packages/appkit-react/src/ui/dialog.tsx', 'export const Dialog = 1;');
  put('packages/appkit-react/stories/barrel.ts', "export {Button} from '../src/ui/button';");
  put('packages/appkit-react/stories/button.stories.tsx', "import {Button} from './barrel'; export const Basic = {};");
  put('packages/appkit-react/stories/dialog.stories.tsx', "import {Dialog} from '../src/ui/dialog'; export const Basic = {};");
  try {fn(root, put);} finally {rmSync(root, {recursive:true, force:true});}
}
const change = (file, extra = {}) => ({file, status: 'M', ...extra});
test('prose and JSDoc changes do not run package or browser tests', () => fixture(root => {
  const plan = selectChecks({root, changes:[change('README.md'), change('packages/appkit-react/src/ui/button.tsx', {before: 'export const Button = 1;', after:'/** Public button. */\nexport const Button = 1;'})]});
  assert.equal(plan.packages, false); assert.deepEqual(plan.stories, []); assert.equal(plan.docs, true);
}));
test('component changes select importing stories transitively through barrels', () => fixture(root => {
  const plan = selectChecks({root, changes:[change('packages/appkit-react/src/ui/button.tsx')]});
  assert.deepEqual(plan.stories, ['packages/appkit-react/stories/button.stories.tsx']);
  assert.equal(plan.packages, true); assert.equal(plan.compatibility, true);
}));
test('story-only change selects that story without package unit tests or Core matrix', () => fixture(root => {
  const plan = selectChecks({root, changes:[change('packages/appkit-react/stories/button.stories.tsx')]});
  assert.deepEqual(plan.stories, ['packages/appkit-react/stories/button.stories.tsx']);
  assert.equal(plan.packages, false); assert.equal(plan.compatibility, false);
}));
test('global boundaries, unknown files and deletions conservatively run all stories', () => fixture(root => {
  for (const file of ['bun.lock','packages/appkit-react/src/ui.css','packages/appkit-react/.storybook/preview.tsx','scripts/verification/impact.mjs','unexpected.config','packages/appkit-react/public/image.png','packages/appkit-react/public/example.txt']) {
    assert.equal(selectChecks({root, changes:[change(file)]}).stories.length, 2, file);
  }
  assert.equal(selectChecks({root, changes:[change('packages/appkit-react/src/ui/button.tsx', {status:'D'})]}).stories.length, 2);
}));
test('unresolved imports and nonliteral dynamic imports force full browser coverage', () => fixture((root, put) => {
  put('packages/appkit-react/stories/button.stories.tsx', "const x = import(something);");
  assert.equal(selectChecks({root, changes:[change('packages/appkit-react/src/ui/button.tsx')]}).stories.length, 2);
  put('packages/appkit-react/stories/button.stories.tsx', "import './missing';");
  assert.equal(selectChecks({root, changes:[change('packages/appkit-react/src/ui/button.tsx')]}).stories.length, 2);
}));
test('no baseline forces all checks; empty diff is cheap; TS directives are not prose', () => fixture(root => {
  assert.equal(selectChecks({root, changes:[], full:true}).stories.length, 2);
  assert.deepEqual(selectChecks({root, changes:[]}).stories, []);
  const plan = selectChecks({root, changes:[change('packages/appkit-react/src/ui/button.tsx', {before:'export const Button = 1;', after:'// @ts-ignore\nexport const Button = 1;'})]});
  assert.equal(plan.packages, true);
}));
test('JSX text, literal values and runtime comments are not exempted as JSDoc', () => fixture(root => {
  for (const [before,after] of [['const x = <div> a </div>;', 'const x = <div>a</div>;'], ['const x = "a";', 'const x = "b";'], ['const x = 1;', '/* @__PURE__ */ const x = 1;'], ['const x = <div/>;', '/** @jsxImportSource other-runtime */ const x = <div/>;'], ['const x = <div/>;', '/** @jsxRuntime classic */ const x = <div/>;']]) {
    assert.equal(selectChecks({root, changes:[change('packages/appkit-react/src/ui/button.tsx', {before,after})]}).packages, true);
  }
}));
test('missing generated locale modules do not turn unrelated story edits into full runs', () => fixture((root,put) => {
  put('packages/appkit-react/.storybook/preview.tsx', "import '../stories/providers';");
  put('packages/appkit-react/stories/providers.tsx', "import '../src/tools/paraglide/messages.js';");
  assert.deepEqual(selectChecks({root, changes:[change('packages/appkit-react/stories/button.stories.tsx')]}).stories, ['packages/appkit-react/stories/button.stories.tsx']);
  assert.equal(selectChecks({root,changes:[change('packages/appkit-react/src/tools/paraglide/messages.js')]}).stories.length, 2);
}));
test('preview provider changes affect all stories, including stories without explicit imports', () => fixture((root,put) => {
  put('packages/appkit-react/.storybook/preview.tsx', "import '../stories/providers';");
  put('packages/appkit-react/stories/providers.tsx', 'export const Provider = 1;');
  assert.equal(selectChecks({root, changes:[change('packages/appkit-react/stories/providers.tsx')]}).stories.length, 2);
}));
test('public self imports and cyclic barrels retain transitive dependencies', () => fixture((root,put) => {
  put('packages/appkit-react/package.json', JSON.stringify({exports:{'./ui':{import:{default:'./dist/ui/button.js'}}}}));
  put('packages/appkit-react/stories/button.stories.tsx', "import {Button} from '@alneas/appkit-react/ui';");
  assert.deepEqual(selectChecks({root,changes:[change('packages/appkit-react/src/ui/button.tsx')]}).stories, ['packages/appkit-react/stories/button.stories.tsx']);
  put('packages/appkit-react/stories/a.ts', "export * from './b'; export * from '../src/ui/button';");
  put('packages/appkit-react/stories/b.ts', "export * from './a';");
  put('packages/appkit-react/stories/button.stories.tsx', "import './a';");
  put('packages/appkit-react/stories/dialog.stories.tsx', "import './b';");
  assert.equal(selectChecks({root,changes:[change('packages/appkit-react/src/ui/button.tsx')]}).stories.length, 2);
}));
test('ES module helpers are followed and glob imports fall back to full coverage', () => fixture((root,put) => {
  put('packages/appkit-react/stories/helper.mjs', "export * from '../src/ui/button';");
  put('packages/appkit-react/stories/button.stories.tsx', "import './helper.mjs';");
  assert.deepEqual(selectChecks({root,changes:[change('packages/appkit-react/src/ui/button.tsx')]}).stories,['packages/appkit-react/stories/button.stories.tsx']);
  put('packages/appkit-react/stories/button.stories.tsx', "const modules = import.meta.glob('./*.ts');");
  assert.equal(selectChecks({root,changes:[change('packages/appkit-react/src/ui/button.tsx')]}).stories.length,2);
}));
test('release metadata changes skip browser work; dependencies do not get that exemption',()=>fixture(root=>{
 const before=JSON.stringify({name:'@alneas/appkit-core',version:'0.2.0',dependencies:{zod:'4.2.1'}});
 const after=JSON.stringify({name:'@alneas/appkit-core',version:'0.2.1',dependencies:{zod:'4.2.1'}});
 const plan=selectChecks({root,changes:[change('packages/appkit-core/package.json',{before,after})]});
 assert.deepEqual(plan.stories,[]); assert.equal(plan.release,true);assert.equal(plan.packages,false);
 assert.equal(selectChecks({root,changes:[change('packages/appkit-core/package.json',{before,after:after.replace('4.2.1','4.2.2')})]}).stories.length,2);
}));
test('lockfile version-only updates skip browsers, resolved dependency changes do not',()=>fixture(root=>{
 const before='{"workspaces":{"packages/appkit-core":{"version":"0.2.0",},},"packages":{"zod":["zod@4.2.1"]}}';
 const after=before.replace('0.2.0','0.2.1');
 assert.deepEqual(selectChecks({root,changes:[change('bun.lock',{before,after})]}).stories,[]);
 assert.equal(selectChecks({root,changes:[change('bun.lock',{before,after:after.replace('4.2.1','4.2.2')})]}).stories.length,2);
}));
test('known publication and CI tooling do not execute browser suites',()=>fixture(root=>{
 for(const file of ['.github/workflows/publish.yml','scripts/verification/commands.mjs','react-core-policy.json','scripts/check-release.mjs']) {
   assert.deepEqual(selectChecks({root,changes:[change(file)]}).stories,[],file);
 }
}));
test('Core changes follow public imports to only the affected stories',()=>fixture((root,put)=>{
 put('packages/appkit-core/package.json',JSON.stringify({exports:{'./data':{import:{default:'./dist/data/index.js'}}}}));
 put('packages/appkit-core/src/data/index.ts',"export {value} from './value.js';");
 put('packages/appkit-core/src/data/value.ts','export const value=1;');
 put('packages/appkit-react/src/ui/button.tsx',"import {value} from '@alneas/appkit-core/data'; export const Button=value;");
 assert.deepEqual(selectChecks({root,changes:[change('packages/appkit-core/src/data/value.ts')]}).stories,['packages/appkit-react/stories/button.stories.tsx']);
 assert.deepEqual(selectChecks({root,changes:[change('packages/appkit-core/src/storage/unrelated.ts')]}).stories,[]);
}));

test('quality execution-environment edits require runtime verification',()=>fixture(root=>{
 const plan=selectChecks({root,changes:[change('.github/workflows/quality.yml')]});
 assert.equal(plan.packages,true);assert.equal(plan.stories.length,2);
}));
test('erased import type in a shared preview does not make Core a runtime dependency of all stories',()=>fixture((root,put)=>{
 put('packages/appkit-core/package.json',JSON.stringify({exports:{'./data':{import:{default:'./dist/data/index.js'}}}}));
 put('packages/appkit-core/src/data/index.ts','export const value=1;');
 put('packages/appkit-react/.storybook/preview.tsx',"import type {Value} from '@alneas/appkit-core/data'; export default {};");
 const plan=selectChecks({root,changes:[change('packages/appkit-core/src/data/index.ts')]});
 assert.deepEqual(plan.stories,[]);assert.equal(plan.packages,true);assert.equal(plan.compatibility,true);
}));
