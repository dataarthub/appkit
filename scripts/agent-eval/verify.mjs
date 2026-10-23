// Runs only inside the credential-free verifier container, never on submitted host code.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,mkdtempSync,symlinkSync,readdirSync,chmodSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import ts from 'typescript';
import {analyzeSubmission,assessSubmission} from './score.mjs';import {gradeTask} from './graders.mjs';
const base='/consumer',task=JSON.parse(readFileSync(path.join(base,'.grader-input.json'),'utf8')),scratch=mkdtempSync(path.join(tmpdir(),'appkit-verifier-'));
if(process.getuid?.()!==0)throw Error('Trusted verifier requires a distinct executor UID');
chmodSync(scratch,0o755);const workerFile=path.join(scratch,'executor.mjs');copyFileSync(path.join(import.meta.dirname,'solution-worker.mjs'),workerFile);
const [nodeMajor,nodeMinor]=process.versions.node.split('.').map(Number);
if(!(nodeMajor===24&&nodeMinor>=15||nodeMajor>=26))throw Error('Development requires Node ^24.15.0 || >=26.0.0');
writeFileSync(path.join(scratch,'package.json'),'{"private":true,"type":"module"}');symlinkSync(path.join(base,'node_modules'),path.join(scratch,'node_modules'),'dir');
for(const file of task.allowedOutputPaths){const dest=path.join(scratch,file);mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.join(base,'submission',file),dest);}
const styles=path.join(scratch,'appkit-styles.d.ts');writeFileSync(styles,"declare module '@alneas/appkit-react/styles';\n");
writeFileSync(path.join(scratch,'task-contract.d.ts'),task.contract);
writeFileSync(path.join(scratch,'contract-check.ts'),"import * as actual from './solution.js'; import type * as expected from './task-contract.js'; const check: typeof expected = actual; void check;\n");
const files=task.allowedOutputPaths.map(p=>path.join(scratch,p));
const analysis=analyzeSubmission({solutionFiles:files,consumerDir:scratch,seedReferences:task.seedReferences,allowedImports:task.allowedImports,requiredIntegration:task.requiredIntegration});
const program=ts.createProgram([...files,styles,path.join(scratch,'contract-check.ts')],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext,jsx:ts.JsxEmit.ReactJSX,strict:true,skipLibCheck:false,outDir:path.join(scratch,'compiled'),types:['node','react','react-dom']});
const diagnostics=ts.getPreEmitDiagnostics(program);if(diagnostics.length){analysis.typecheckPassed=false;analysis.diagnosticCategories.push(...diagnostics.map(d=>'TS_'+d.code));}
let behavior={passed:false,assertions:[]};
if(analysis.apiConformant&&analysis.typecheckPassed){
 program.emit();for(const file of readdirSync(path.join(scratch,'compiled')).filter(f=>f.endsWith('.js'))){const f=path.join(scratch,'compiled',file);writeFileSync(f,readFileSync(f,'utf8').replace(/^import\s*['"]@alneas\/appkit-react\/styles['"];?\s*$/gm,''));}
 behavior=await gradeTask(task.id,{solutionDir:scratch,fixture:{imports:analysis.imports,debug:task.debug===true},restricted:true,workerFile});
}
process.stdout.write(JSON.stringify(assessSubmission({analysis,behavior,expectedAssertions:task.assertionIds,safetyAssertions:task.safetyAssertionIds}))+'\n');
