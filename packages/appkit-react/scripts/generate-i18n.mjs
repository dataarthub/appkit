/** Resolve the installed plugin in both a workspace and a standalone browser fixture. */
import { compile } from '@inlang/paraglide-js';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'.verification/tmp');
mkdirSync(base,{recursive:true});const session=mkdtempSync(path.join(base,'i18n-'));
try {
 const settings=JSON.parse(readFileSync(path.join(root,'project.inlang/settings.json'),'utf8'));
 const plugin=createRequire(import.meta.url).resolve('@inlang/plugin-message-format');
 settings.modules=[path.relative(session,plugin).replaceAll('\\','/')];
 settings['plugin.inlang.messageFormat'].pathPattern=path.join(root,'messages/{locale}.json').replaceAll('\\','/');
 const project=path.join(session,'project.inlang');mkdirSync(project);writeFileSync(path.join(project,'settings.json'),JSON.stringify(settings));
 await compile({project,outdir:path.join(root,'src/tools/paraglide'),emitTsDeclarations:true});
 const declaration=readFileSync(path.join(root,'src/tools/paraglide/messages/_index.d.ts'),'utf8');
 if(!declaration.toLowerCase().includes('auth_validation_invalidemail'))throw Error('Translation compilation produced no expected messages');
} finally {rmSync(session,{recursive:true,force:true});}
