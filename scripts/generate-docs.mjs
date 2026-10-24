import {readFileSync as readActual,writeFileSync as writeActual,readdirSync as readdirActual,mkdirSync as mkdirActual,cpSync as copyActual,existsSync} from 'node:fs';
import path from 'node:path';
import {generateCatalog} from './agent/generate-catalog.mjs';
import {readErrorCatalog,renderErrorGuide} from './agent/generate-error-guide.mjs';
const root=path.resolve(import.meta.dirname,'..'),packages=['appkit-core','appkit-react'];
const selected=process.argv[2]==='--package'?[process.argv[3]]:packages;
const outputIndex=process.argv.indexOf('--output-dir');
if(outputIndex>=0&&!process.argv[outputIndex+1])throw Error('Missing --output-dir destination');
const outputRoot=outputIndex>=0?path.resolve(process.argv[outputIndex+1]):root;
const agentPolicy=JSON.parse(readActual(path.join(root,'agent-policy.json'),'utf8'));
function outputPath(file){const relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Output escaped project');return path.join(outputRoot,relative);}
function readFileSync(file,...args){const fresh=outputPath(file);return readActual(outputRoot!==root&&existsSync(fresh)?fresh:file,...args);}
function mkdirSync(file,options){return mkdirActual(outputPath(file),options);}
function writeFileSync(file,data,...args){const output=outputPath(file);mkdirActual(path.dirname(output),{recursive:true});return writeActual(output,data,...args);}
function cpSync(source,destination,options){const output=outputPath(destination);mkdirActual(path.dirname(output),{recursive:true});return copyActual(source,output,options);}

function readdirSync(directory){
 const names=existsSync(directory)?readdirActual(directory):[];
 const fresh=outputPath(directory);
 return [...new Set([...names,...(outputRoot!==root&&existsSync(fresh)?readdirActual(fresh):[])])].sort();
}

function landing(file,title,description,transform){
 // The portal owns locale navigation; GitHub README language links are not portal pages.
 const content=readFileSync(path.join(root,file),'utf8').replace(/^\[English\]\(README\.md\) \| \[日本語\]\(README\.ja\.md\)\s*\n/m,'');
 return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\nsidebar:\n  order: 1\narchetype: explanation\nproject: appkit\ntags: ["appkit", "overview"]\n---\n\n`+transform(content);
}

for(const name of selected){
 if(!packages.includes(name))throw Error('Unknown package');
 const dir=path.join(root,'packages',name),pkg=JSON.parse(readFileSync(path.join(dir,'package.json')));
 if(name==='appkit-core')writeFileSync(path.join(dir,'docs/ai-errors.md'),renderErrorGuide(readErrorCatalog(readActual(path.join(dir,'src/ai/errors/catalog.ts'),'utf8'))));
 writeFileSync(path.join(dir,'docs/index.md'),landing('packages/'+name+'/README.md',name==='appkit-core'?'Appkit Core':'Appkit React',pkg.description,text=>text.replaceAll('](consumer-ai/','](../consumer-ai/').replaceAll('](llms-full.txt)','](../llms-full.txt)').replaceAll('](docs/','](').replaceAll('](../../CONTRIBUTING.md)','](../../../docs/contributing.md)').replaceAll('](../../RELEASING.md)','](../../../docs/releasing.md)')));
 const exports=Object.keys(pkg.exports).map(key=>key==='.'?pkg.name:pkg.name+'/'+key.slice(2));
 let reference=`---\ntitle: "Public exports and optional peers"\ndescription: "Exact install package, public import subpaths and optional peer requirements."\nsidebar:\n  order: 10\narchetype: reference\nproject: appkit\ntags: ["appkit", "exports"]\n---\n\n# Public exports and optional peers\n\nGenerated from package.json; edit the manifest and regenerate.\n\n## Installation\n\n\`\`\`bash\nbun add ${pkg.name}\n\`\`\`\n\n## Public import\n\n| Import target | Kind |\n| --- | --- |\n`;
 for(const [key,value] of Object.entries(pkg.exports))reference+=`| \`${key==='.'?pkg.name:pkg.name+'/'+key.slice(2)}\` | ${typeof value==='object'?'ESM, CommonJS and NodeNext declarations':String(value).endsWith('.css')?'CSS':'Metadata'} |\n`;
 reference+='\n## Optional peers\n\nInstall an optional peer only when using its feature. Core entry loading does not certify a hosted backend.\n\n| Peer | Version | Required |\n| --- | --- | --- |\n';
 for(const [peer,version] of Object.entries(pkg.peerDependencies??{}))reference+=`| \`${peer}\` | \`${version}\` | ${pkg.peerDependenciesMeta?.[peer]?.optional?'No; feature-specific':'Yes'} |\n`;
 writeFileSync(path.join(dir,'docs/exports.md'),reference);
 const context=JSON.stringify({schemaVersion:1,name:pkg.name,version:pkg.version,exports:pkg.exports,dependencies:pkg.dependencies,peers:pkg.peerDependencies,optionalPeers:pkg.peerDependenciesMeta??{}},null,2)+'\n';
 const catalog=JSON.stringify(generateCatalog({packageDir:dir,policy:agentPolicy,readFile:readFileSync,existsFile:file=>existsSync(outputPath(file))||existsSync(file)}),null,2)+'\n';
 for(const folder of ['consumer-ai','dist/consumer-ai']){
  const out=path.join(dir,folder);mkdirSync(out,{recursive:true});if(folder!=='consumer-ai')cpSync(path.join(dir,'consumer-ai/SKILL.md'),path.join(out,'SKILL.md'));
  writeFileSync(path.join(out,'package-context.json'),context);writeFileSync(path.join(out,'api-index.json'),catalog);
 }
 const pages=['README.md',...readdirSync(path.join(dir,'docs')).filter(f=>f.endsWith('.md')).sort().map(f=>'docs/'+f)];
 writeFileSync(path.join(dir,'llms.txt'),`# ${pkg.name}\n\nInstall ${pkg.name}; import its explicit feature subpaths.\n\n- [Agent instructions](consumer-ai/SKILL.md)\n- [API catalog](consumer-ai/api-index.json)\n\n`+pages.map(file=>`- [${file}](${file})`).join('\n')+'\n');
 writeFileSync(path.join(dir,'llms-full.txt'),pages.map(file=>`<!-- ${file} -->\n\n${readFileSync(path.join(dir,file),'utf8')}`).join('\n\n---\n\n').trimEnd()+'\n');
 console.log('Generated documentation and AI metadata:',pkg.name);
}
if(selected.length===packages.length){
 writeFileSync(path.join(root,'llms.txt'),'# Appkit\n\nChoose Core for framework-independent schemas, storage, data, graphs, regional contracts and AI validation. Choose React for UI, forms, tables, host providers and React AI bindings; React depends on Core and host React peers.\n\n'+packages.map(name=>`## ${name==='appkit-core'?'Core':'React'}\n\n- [Package guide](packages/${name}/README.md)\n- [Discovery index](packages/${name}/llms.txt)\n- [Full documentation](packages/${name}/llms-full.txt)\n- [Agent instructions](packages/${name}/consumer-ai/SKILL.md)\n- [AI security](packages/${name}/docs/ai.md)\n`).join('\n')+'\n[Release requirements](RELEASING.md)\n'+(existsSync(path.join(root,'docs/agent-evaluation.md'))?'[Agent evaluation procedure](docs/agent-evaluation.md)\n':'' ));
 writeFileSync(path.join(root,'docs/index.md'),landing('README.md','Appkit','Schema-driven TypeScript and React forms, validation and record operations.',text=>text.replaceAll('](docs/','](').replaceAll('](llms.txt)','](../llms.txt)').replaceAll('](packages/','](../packages/').replace(/\/README\.md(?=[#)])/g, '/docs/index.md').replaceAll('](CONTRIBUTING.md)','](contributing.md)').replaceAll('](RELEASING.md)','](releasing.md)')));
 for(const [name,title] of [['CONTRIBUTING','Contributing'],['RELEASING','Releasing']]){
  const metadata=`---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify('Appkit '+title.toLowerCase()+' requirements and verification commands.')}\nsidebar:\n  order: 20\narchetype: reference\nproject: appkit\ntags: ["appkit", "maintenance"]\n---\n\n`;
  writeFileSync(path.join(root,'docs',name.toLowerCase()+'.md'),metadata+readFileSync(path.join(root,name+'.md'),'utf8').replaceAll('](docs/','](').replaceAll('](RELEASING.md','](releasing.md').replaceAll('](CONTRIBUTING.md','](contributing.md'));
 }
 const sources=['docs/index.md','docs/contributing.md','docs/releasing.md',...(existsSync(path.join(root,'docs/workflow-supply.md'))?['docs/workflow-supply.md']:[]),...(existsSync(path.join(root,'docs/agent-evaluation.md'))?['docs/agent-evaluation.md']:[]),...packages.flatMap(name=>readdirSync(path.join(root,'packages',name,'docs')).filter(file=>file.endsWith('.md')).sort().map(file=>'packages/'+name+'/docs/'+file))];
 const documents=sources.map(source=>{const text=readFileSync(path.join(root,source),'utf8'),name=source.split('/')[1],filename=path.basename(source,'.md');return {title:JSON.parse(text.match(/^title: (.+)$/m)[1]),slug:source.startsWith('docs/')?filename:name+'/'+(filename==='index'?'index':filename),source,archetype:text.match(/^archetype: (.+)$/m)[1],visibility:'public',...(source.startsWith('packages/')?{package:'@alneas/'+name}:{})};});
 writeFileSync(path.join(root,'docs.manifest.json'),JSON.stringify({$schema:'https://tech-docs.alneas.com/schemas/docs-manifest.v1.json',projectId:'appkit',displayName:'Appkit',category:'developer-tools',documents},null,2)+'\n');
}
