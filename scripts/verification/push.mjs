import {execFileSync} from 'node:child_process';
import {clearHookGitEnvironment} from '../workflow-supply/public/quality.mjs';
clearHookGitEnvironment();
if(process.argv.length!==2)throw Error('Push checks accept no verification flags; use quality:ci or verify:full for source checks');
// Ready PR CI owns source verification. A push retains fresh security and drift checks.
for(const script of ['secrets:check','workflow:check'])execFileSync('bun',['run',script],{stdio:'inherit'});
