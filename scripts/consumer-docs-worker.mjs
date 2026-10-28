// Executed under the same guarded Node runtime in a disposable external consumer.
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const {Application}=await import(pathToFileURL(path.join(config.toolchain,'node_modules/typedoc/dist/index.js')).href);
const app=await Application.bootstrap({
 name:'Appkit packed public declarations',
 entryPoints:config.entryPoints, entryPointStrategy:'resolve',
 tsconfig:path.join(config.fixture,'tsconfig.json'),
 compilerOptions:{strict:true,skipLibCheck:false},
 treatWarningsAsErrors:true, validation:{notExported:true,invalidLink:true,notDocumented:false},
 // Inherited React documentation links must point to the actual host API docs.
 // Keep this exact: unknown or misspelled symbols must still fail validation.
 externalSymbolLinkMappings:{'@types/react':{
  'React.Component.render':'https://react.dev/reference/react/Component#render',
  'React.Component.setState':'https://react.dev/reference/react/Component#setstate',
  'React.NewLifecycle.getSnapshotBeforeUpdate':'https://react.dev/reference/react/Component#getsnapshotbeforeupdate',
  'React.StaticLifecycle.getDerivedStateFromProps':'https://react.dev/reference/react/Component#static-getderivedstatefromprops',
  'React.ComponentLifecycle.componentDidMount':'https://react.dev/reference/react/Component#componentdidmount',
 }},
 disableSources:true, readme:'none',
});
const project=await app.convert();
if(!project) throw new Error('Documentation conversion failed');
app.validate(project);
if(app.logger.hasErrors() || app.logger.hasWarnings()) throw new Error('Documentation conversion failed: strict TypeDoc diagnostics');
const json=app.serializer.projectToObject(project,config.fixture);
const names=new Set(), documented=new Set();
function visit(value){if(!value || typeof value!=='object')return;if(typeof value.name==='string'){names.add(value.name);if(value.comment || value.signatures?.some(signature=>signature.comment))documented.add(value.name);}for(const item of Object.values(value))if(Array.isArray(item))item.forEach(visit);else if(typeof item==='object')visit(item);}
visit(json);
for(const name of config.requiredSymbols)if(!names.has(name))throw new Error('Missing documented public symbol: '+name);
for(const name of config.requiredDocumentation ?? [])if(!documented.has(name))throw new Error('Missing public symbol documentation: '+name);
writeFileSync(config.output,JSON.stringify(json,null,2)+'\n');
