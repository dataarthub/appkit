import {globSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {selectStoryFiles} from './story-selection.mjs';
const root = path.resolve(import.meta.dirname,'../..');
const all = globSync('packages/appkit-react/stories/**/*.stories.tsx',{cwd:root}).map(file=>path.resolve(root,file)).sort();
const selected = selectStoryFiles(root,all,process.argv.slice(2));
if(!selected.length) throw Error('Empty browser task is not a successful test');
// Canonical selection is part of the task hash; a partial pass cannot satisfy a
// different subset or the full suite. No SHA/path-dependent plan file is hashed.
const env = {...process.env,APPKIT_STORY_FILES:JSON.stringify(selected.map(file=>path.relative(root,file).split(path.sep).join('/')))};
const result=spawnSync(process.execPath,['scripts/turbo.mjs','run','test:browser','--filter=@alneas/appkit-react'],{cwd:root,env,stdio:'inherit'});
if(result.error) throw result.error;
process.exitCode=result.status??1;
