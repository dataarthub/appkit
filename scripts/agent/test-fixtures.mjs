import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
export function catalog(name='@alneas/appkit-core',version='0.1.0'){
 const requirements={requirementsStatus:'documented',guide:'docs/ai.md',requiredPeers:{},providers:[],styles:[]};
 return {schemaVersion:1,packageName:name,packageVersion:version,inputDigest:'a'.repeat(64),entries:[{importPath:name+'/ai',kind:'module',targets:{esm:'./dist/index.js'},requirements}],symbols:[{importPath:name+'/ai',name:'validate',kind:'value',signatures:['(): boolean'],summary:'Validate input',tags:[],guide:'docs/ai.md'}]};
}
export function temp(run){const root=mkdtempSync(path.join(tmpdir(),'appkit-agent-'));try{return run(root);}finally{rmSync(root,{recursive:true,force:true});}}
export function install(root,name='@alneas/appkit-core',{legacy=false,value=catalog(name),catalogPath='./consumer-ai/api-index.json'}={}){
 const dir=path.join(root,'node_modules',name);mkdirSync(path.join(dir,'dist'),{recursive:true});mkdirSync(path.join(dir,'consumer-ai'),{recursive:true});
 const pkg={name,version:'0.1.0',type:'module',exports:{'.':'./dist/index.js','./package-context.json':'./consumer-ai/package-context.json'}};
 if(!legacy){pkg.exports['./api-index.json']=catalogPath;pkg.appkit={agent:{catalog:catalogPath}};}
 writeFileSync(path.join(dir,'package.json'),JSON.stringify(pkg));writeFileSync(path.join(dir,'dist/index.js'),'throw Error("Package runtime must never load");');
 writeFileSync(path.join(dir,'consumer-ai/package-context.json'),'{}');if(!legacy)writeFileSync(path.join(dir,'consumer-ai/api-index.json'),JSON.stringify(value));return dir;
}
