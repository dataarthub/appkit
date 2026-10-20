import {readFileSync,writeFileSync,readdirSync,mkdirSync,cpSync} from 'node:fs';
import path from 'node:path';
import {readErrorCatalog,renderErrorGuide} from './agent/generate-error-guide.mjs';
const root=path.resolve(import.meta.dirname,'..'),packages=['appkit-core','appkit-react'];
const selected=process.argv[2]==='--package'?[process.argv[3]]:packages;
function landing(file,title,description,transform){
 const content=readFileSync(path.join(root,file),'utf8');
 return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\narchetype: explanation\nproject: tools\n---\n\n`+transform(content);
}

for(const name of selected){
 if(!packages.includes(name))throw Error('Unknown package');
 const dir=path.join(root,'packages',name),pkg=JSON.parse(readFileSync(path.join(dir,'package.json')));
 writeFileSync(path.join(dir,'docs/index.md'),landing('packages/'+name+'/README.md',name==='appkit-core'?'Appkit Core':'Appkit React',pkg.description,text=>text.replaceAll('](docs/','](').replaceAll('](../../CONTRIBUTING.md)','](../../../CONTRIBUTING.md)').replaceAll('](../../RELEASING.md)','](../../../RELEASING.md)')));
 if(name==='appkit-core')writeFileSync(path.join(dir,'docs/ai-errors.md'),renderErrorGuide(readErrorCatalog(readFileSync(path.join(dir,'src/ai/errors/catalog.ts'),'utf8'))));
 const exports=Object.keys(pkg.exports).map(key=>key==='.'?pkg.name:pkg.name+'/'+key.slice(2));
 let reference=`---\ntitle: "Public exports and optional peers"\ndescription: "Exact install package, public import subpaths and optional peer requirements."\narchetype: reference\nproject: tools\n---\n\n# Public exports and optional peers\n\nGenerated from package.json; edit the manifest and regenerate.\n\n## Installation\n\n\`\`\`bash\nbun add ${pkg.name}\n\`\`\`\n\n## Public import\n\n| Import target | Kind |\n| --- | --- |\n`;
 for(const [key,value] of Object.entries(pkg.exports))reference+=`| \`${key==='.'?pkg.name:pkg.name+'/'+key.slice(2)}\` | ${typeof value==='object'?'ESM, CommonJS and NodeNext declarations':String(value).endsWith('.css')?'CSS':'Metadata'} |\n`;
 reference+='\n## Optional peers\n\nInstall an optional peer only when using its feature. Core entry loading does not certify a hosted backend.\n\n| Peer | Version | Required |\n| --- | --- | --- |\n';
 for(const [peer,version] of Object.entries(pkg.peerDependencies??{}))reference+=`| \`${peer}\` | \`${version}\` | ${pkg.peerDependenciesMeta?.[peer]?.optional?'No; feature-specific':'Yes'} |\n`;
 writeFileSync(path.join(dir,'docs/exports.md'),reference);
 const pages=['README.md',...readdirSync(path.join(dir,'docs')).filter(f=>f.endsWith('.md')).sort().map(f=>'docs/'+f)];
 writeFileSync(path.join(dir,'llms.txt'),`# ${pkg.name}\n\nInstall ${pkg.name}; import its explicit feature subpaths.\n\n`+pages.map(file=>`- [${file}](${file})`).join('\n')+'\n');
 writeFileSync(path.join(dir,'llms-full.txt'),pages.map(file=>`<!-- ${file} -->\n\n${readFileSync(path.join(dir,file),'utf8')}`).join('\n\n---\n\n').trimEnd()+'\n');
 const out=path.join(dir,'dist/consumer-ai');mkdirSync(out,{recursive:true});cpSync(path.join(dir,'consumer-ai/SKILL.md'),path.join(out,'SKILL.md'));
 writeFileSync(path.join(out,'package-context.json'),JSON.stringify({name:pkg.name,version:pkg.version,exports:pkg.exports,dependencies:pkg.dependencies,peers:pkg.peerDependencies,optionalPeers:pkg.peerDependenciesMeta??{}},null,2)+'\n');
 console.log('Generated documentation and AI metadata:',pkg.name);
}
if(selected.length===packages.length){
 writeFileSync(path.join(root,'docs/index.md'),landing('README.md','Appkit','Schema-driven TypeScript and React forms, validation and record operations.',text=>text.replaceAll('](packages/','](../packages/').replaceAll('](CONTRIBUTING.md)','](../CONTRIBUTING.md)').replaceAll('](RELEASING.md)','](../RELEASING.md)')));
 const sources=['docs/index.md',...packages.flatMap(name=>readdirSync(path.join(root,'packages',name,'docs')).filter(file=>file.endsWith('.md')).sort().map(file=>'packages/'+name+'/docs/'+file))];
 const documents=sources.map(source=>{const text=readFileSync(path.join(root,source),'utf8'),name=source.split('/')[1],filename=path.basename(source,'.md');return {title:JSON.parse(text.match(/^title: (.+)$/m)[1]),slug:source==='docs/index.md'?'index':name+'/'+(filename==='index'?'index':filename),source,archetype:text.match(/^archetype: (.+)$/m)[1],visibility:'public',...(source.startsWith('packages/')?{package:'@alneas/'+name}:{})};});
 writeFileSync(path.join(root,'docs.manifest.json'),JSON.stringify({$schema:'https://docs-d1x.pages.dev/schemas/docs-manifest.v1.json',projectId:'tools',displayName:'Appkit',category:'developer-tools',documents},null,2)+'\n');
}
