import {mkdirSync,copyFileSync,writeFileSync,chmodSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'packages/appkit-core/dist');
mkdirSync(path.join(out,'agent-cli'),{recursive:true});
for(const file of ['catalog-contract.mjs','load-catalogs.mjs','search.mjs','cli.mjs'])copyFileSync(path.join(root,'scripts/agent',file),path.join(out,'agent-cli',file));
const entry=path.join(out,'agent-cli.mjs');
writeFileSync(entry,"#!/usr/bin/env node\nimport path from 'node:path';\nimport {runCli} from './agent-cli/cli.mjs';\nprocess.exitCode=runCli(process.argv.slice(2),{stdout:process.stdout,stderr:process.stderr,cwd:process.cwd(),bundledCoreDir:path.resolve(import.meta.dirname,'..')});\n");
chmodSync(entry,0o755);
