import assert from 'node:assert/strict';
import {candidateArtifactDirectory} from './consumer-artifacts.mjs';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync,existsSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),names=['appkit-core','appkit-react'];
const artifacts=candidateArtifactDirectory(root),logs=path.join(root,'.verification/logs');mkdirSync(artifacts,{recursive:true});mkdirSync(logs,{recursive:true});
const env={...process.env};delete env.NODE_PATH;
function run(command,args,cwd=root){const out=execFileSync(command,args,{cwd,env,encoding:'utf8',maxBuffer:20*1024*1024,stdio:['ignore','pipe','pipe']});console.log('PASS:',command,...args);return out;}
function sourceSelection(){return execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(file=>file&&existsSync(path.join(root,file))&&lstatSync(path.join(root,file)).isFile()).sort().map(file=>({file,sha256:createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex')}));}
const records={mode:'two-package-packed-consumer',verified:false,sources:sourceSelection(),baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),packages:{}};
writeFileSync(path.join(artifacts,'archives.json'),JSON.stringify(records,null,2)+'\n');
for(const name of names){
 const dir=path.join(root,'packages',name),info=JSON.parse(run('npm',['pack','--json','--ignore-scripts','--workspaces=false','--pack-destination',artifacts],dir))[0],file=path.join(artifacts,info.filename);
 const pkg=JSON.parse(run('tar',['-xOf',file,'package/package.json']));
 if(name==='appkit-react'){for(const dep of ['@dnd-kit/core','@dnd-kit/sortable','@dnd-kit/utilities'])assert(!pkg.dependencies?.[dep]&&!pkg.peerDependencies?.[dep],'Legacy dnd-kit declaration: '+dep);}
 assert.equal(pkg.name,'@alneas/'+name);assert.equal(pkg.version,JSON.parse(readFileSync(path.join(dir,'package.json'))).version);assert.equal(pkg.publishConfig.access,'public');
 for(const spec of Object.values({...pkg.dependencies,...pkg.optionalDependencies,...pkg.peerDependencies}))assert(!/^(workspace:|file:|link:)/.test(spec),'Local production dependency');
 const entries=new Set(run('tar',['-tzf',file]).trim().split('\n'));
 for(const entry of entries)assert(!/\.env|node_modules|\.verification|\.(test|spec)\./.test(entry)&&/^package\/(dist\/|docs\/|consumer-ai\/(?:SKILL\.md|package-context\.json|api-index\.json)$|README.md$|CHANGELOG.md$|LICENSE$|THIRD_PARTY_NOTICES.md$|package.json$|llms(?:-full)?\.txt$)/.test(entry),'Unexpected archive member '+entry);
 function target(value){if(typeof value==='string')assert(entries.has('package/'+value.replace(/^\.\//,'')),'Missing packed export '+value);else Object.values(value).forEach(target);}
 Object.values(pkg.exports).forEach(target);
 for(const name of ['README.md','LICENSE',...(pkg.files?.includes('CHANGELOG.md')?['CHANGELOG.md']:[]),'llms.txt','llms-full.txt','consumer-ai/SKILL.md','consumer-ai/package-context.json','consumer-ai/api-index.json',...(pkg.name==='@alneas/appkit-react'?['THIRD_PARTY_NOTICES.md']:[])])assert(entries.has('package/'+name),'Missing packed '+name);
 for(const metadata of ['SKILL.md','package-context.json','api-index.json'])assert.equal(run('tar',['-xOf',file,'package/consumer-ai/'+metadata]),run('tar',['-xOf',file,'package/dist/consumer-ai/'+metadata]),'Metadata copy mismatch');
 records.packages[pkg.name]={version:pkg.version,file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),integrity:info.integrity};
}
// System temp prevents an undeclared import from falling back to checkout node_modules.
const fixture=mkdtempSync(path.join(tmpdir(),'appkit-packed-')),coreOnly=mkdtempSync(path.join(tmpdir(),'appkit-core-cli-'));
try {
 writeFileSync(path.join(coreOnly,'package.json'),JSON.stringify({private:true,type:'module'}));
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund','--omit=optional','--legacy-peer-deps',records.packages['@alneas/appkit-core'].file],coreOnly);
 const coreBin=path.join(coreOnly,'node_modules/@alneas/appkit-core/dist/agent-cli.mjs');assert(!existsSync(path.join(coreOnly,'node_modules/react')));assert(!existsSync(path.join(coreOnly,'node_modules/typescript')));assert(lstatSync(coreBin).mode&0o111);
 run(process.execPath,[coreBin,'search','ActionRegistry','--json'],coreOnly);run('npm',['exec','--yes','--package=node@24.0.0','--','node',coreBin,'search','ActionRegistry','--json'],coreOnly);
 writeFileSync(path.join(fixture,'package.json'),JSON.stringify({private:true,type:'module'}));
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund','--omit=optional','--legacy-peer-deps',...Object.values(records.packages).map(r=>r.file),'react@19.2.3','react-dom@19.2.3','typescript@6.0.3','@types/react@19','@types/react-dom@19','@types/node@24'],fixture);
 for(const legacy of ['core','sortable','utilities'])assert(!existsSync(path.join(fixture,'node_modules/@dnd-kit',legacy)),'Legacy dnd-kit installed: '+legacy);
 const bin=path.join(fixture,'node_modules/@alneas/appkit-core/dist/agent-cli.mjs');run(process.execPath,[bin,'search','ActionRegistry','--json'],fixture);run('npm',['exec','--yes','--package=node@24.0.0','--','node',bin,'search','ActionRegistry','--json'],fixture);
 const input=readFileSync(path.join(root,'packages/appkit-react/examples/request-form.tsx'),'utf8');writeFileSync(path.join(fixture,'RequestForm.tsx'),input);
 writeFileSync(path.join(fixture,'ai-errors.tsx'),"import {AIChatError,getAIErrorInfo,type ActionToolResult} from '@alneas/appkit-core/ai'; const legacy:ActionToolResult={callId:'x',name:'x',ok:false,code:'INVALID_INPUT',error:'original'}; const e:Error=new AIChatError('AI_INVALID_STREAM','original'); console.log(legacy,e,getAIErrorInfo('tool','INVALID_INPUT'));\n");
 const dndTypes = `import type {ComponentProps} from 'react';
import {DnDProvider as RootDnD, type DnDProviderProps as RootDnDProps} from '@alneas/appkit-react';
import {DnDProvider as ToolsDnD} from '@alneas/appkit-react/tools';
import {DnDProvider as CoreDnD} from '@alneas/appkit-react/tools/core';
import {DnDProvider as UiDnD, type DraggableProps, type DroppableProps} from '@alneas/appkit-react/tools/ui';
import {KanbanBoard, Kanban, KanbanDragSurface, useKanbanDrag, useKanbanSensors, resolveKanbanMove, type KanbanTask, type KanbanDragController} from '@alneas/appkit-react/tools/kanban';
import {DataTable, DataTableView, type DataTableProps} from '@alneas/appkit-react/tools/data-table';
import {FileBrowser} from '@alneas/appkit-react/tools/file-browser';
import type {DragDropProvider} from '@dnd-kit/react';
const nativeEnd: NonNullable<RootDnDProps['onDragEnd']> = event => {void event.canceled;void event.operation.source?.data;void event.operation.target?.data;};
const unchanged: typeof RootDnD[] = [ToolsDnD, CoreDnD, UiDnD];
const nativeRender: DraggableProps['children'] = ({ref,handleRef,isDragging,style}) => <div ref={ref} style={style}><button ref={handleRef}>Move</button></div>;
const nativeDrop: DroppableProps['children'] = ({ref,isDropTarget}) => <div ref={ref} data-over={isDropTarget}/>;
// @ts-expect-error Legacy cancellation prop is deliberately removed.
const oldCancel: RootDnDProps = {children:null,onDragCancel:()=>{}};
declare const drag:Parameters<DraggableProps['children']>[0];
// @ts-expect-error Native registration uses refs rather than legacy listeners.
void drag.listeners;
// @ts-expect-error Native registration uses ref rather than setNodeRef.
void drag.setNodeRef;
// @ts-expect-error No legacy dnd-kit global JSX augmentation may leak.
export type OldGlobalJsx = JSX.Element;
const tasks:KanbanTask[]=[{id:'one',title:'One',status:'todo'}];
const moved=resolveKanbanMove({active:{id:'one'},over:{id:'done',data:{current:{type:'Column'}}}},tasks,'status');
function NativeController(){const controller:KanbanDragController=useKanbanDrag({tasks});const props:Omit<ComponentProps<typeof DragDropProvider>,'children'>=controller.contextProps;const sensors=useKanbanSensors('status');return <KanbanDragSurface controller={controller}><div/></KanbanDragSurface>;}
const highLevel = <><KanbanBoard tasks={tasks} columns={[{id:'todo',title:'Todo'}]} onStatusChange={(id,status)=>{}}/><Kanban.Root tasks={tasks}><div/></Kanban.Root><DataTable data={tasks} columns={[{accessorKey:'title'}]}/></>;
void [nativeEnd,unchanged,nativeRender,nativeDrop,moved,NativeController,highLevel,DataTableView,FileBrowser,oldCancel];
`;
 for (const extension of ['tsx','mts','cts']) {
  // JSX variants validate business props; declaration-only mts/cts probes exercise both NodeNext branches.
  const text = extension === 'tsx' ? dndTypes : "import type {KanbanDragController,KanbanBoardProps} from '@alneas/appkit-react/tools/kanban';import type {DataTableProps} from '@alneas/appkit-react/tools/data-table';import type {DnDProviderProps} from '@alneas/appkit-react/tools/ui';export type Contract=[KanbanDragController,KanbanBoardProps,DataTableProps<object,unknown>,DnDProviderProps];";
  writeFileSync(path.join(fixture,'dnd-contract.'+extension),text);
 }
 writeFileSync(path.join(fixture,'styles.d.ts'),"declare module '@alneas/appkit-react/styles';\n");
 let index=0;
 for(const pkg of names){const dir=path.join(root,'packages',pkg);for(const file of ['README.md',...readdirSync(path.join(dir,'docs')).map(f=>'docs/'+f)]){
  const text=readFileSync(path.join(dir,file),'utf8');for(const block of text.matchAll(/```(?:typescript|tsx|ts)\n([\s\S]*?)```/g))writeFileSync(path.join(fixture,'example-'+index+++'.tsx'),block[1]);
 }}
 for(const block of readFileSync(path.join(root,'docs/development/dnd-kit-migration.md'),'utf8').matchAll(/```(?:typescript|tsx|ts)\n([\s\S]*?)```/g))writeFileSync(path.join(fixture,'example-'+index+++'.tsx'),block[1]);
 for(const file of ['ui/dnd/DnDProvider.tsx','ui/dnd/Draggable.tsx','ui/dnd/Droppable.tsx','kanban/use-kanban-drag.ts','kanban/use-kanban-sensors.ts','kanban/kanban-drag.ts','kanban/kanban-primitives.tsx','kanban/KanbanColumn.tsx','file-browser/FileBrowser.tsx','file-browser/FileListView.tsx','file-browser/FileGridView.tsx','data-table/data-table.tsx']) {
  const source=readFileSync(path.join(root,'packages/appkit-react/src/tools/components',file),'utf8');
  for(const block of source.matchAll(/\* ```(?:typescript|tsx|ts)\n([\s\S]*?)\* ```/g))writeFileSync(path.join(fixture,'example-'+index+++'.tsx'),block[1].replace(/^ *\* ?/gm,''));
 }
 writeFileSync(path.join(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',jsx:'react-jsx',strict:true,skipLibCheck:false,outDir:'compiled',types:['node','react','react-dom']},include:['*.tsx','*.mts','*.cts','*.d.ts']}));
 run(path.join(fixture,'node_modules/.bin/tsc'),['--project','tsconfig.json'],fixture);
 const entries=['@alneas/appkit-core',...['storage','data','japan','graph','ai','us'].map(x=>'@alneas/appkit-core/'+x),'@alneas/appkit-react',...['ui','tools','ai','tools/kanban','tools/data-table','tools/file-browser'].map(x=>'@alneas/appkit-react/'+x)];
 const probe="import assert from 'node:assert/strict';\n"+entries.map((e,i)=>`import * as m${i} from ${JSON.stringify(e)};assert(Object.keys(m${i}).length);`).join('\n')+"\nimport {createElement} from 'react';import {renderToString} from 'react-dom/server';import {RequestForm} from './compiled/RequestForm.js';const adapter=new Proxy({}, {get(){return ()=>{throw Error('SSR must not write records');};}});const html=renderToString(createElement(RequestForm,{adapter}));assert(html.includes('name=\"name\"'));console.log('PASS native ESM, minimum peer closure, documented request-form SSR');\n";
 // CSS is verified as a packed asset; Node SSR cannot execute a stylesheet import.
 const compiled=path.join(fixture,'compiled/RequestForm.js');writeFileSync(compiled,readFileSync(compiled,'utf8').replace(/^import ['"]@alneas\/appkit-react\/styles['"];?\n/m,''));
 writeFileSync(path.join(fixture,'probe.mjs'),probe);writeFileSync(path.join(fixture,'probe.cjs'),entries.map(e=>'require('+JSON.stringify(e)+');').join('\n'));
 writeFileSync(path.join(fixture,'dnd-ssr.mjs'),`import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToString} from 'react-dom/server';import {KanbanBoard} from '@alneas/appkit-react/tools/kanban';import {DataTable} from '@alneas/appkit-react/tools/data-table';import {DnDProvider,Draggable,Droppable} from '@alneas/appkit-react/tools/ui';import {FileBrowser,FileListView,FileGridView} from '@alneas/appkit-react/tools/file-browser';const provider=new Proxy({},{get(){return ()=>{throw Error('SSR must not perform file I/O');};}});assert(renderToString(createElement(FileBrowser,{provider})).includes('Root'));for(const View of [FileListView,FileGridView]){assert(renderToString(createElement(DnDProvider,null,createElement(View,{nodes:[{id:'one',name:'One.txt',kind:'file'},{id:'folder',name:'Folder',kind:'folder'}],selectedIds:[],onSelect(){},onOpen(){},onDelete(){}}))).includes('One.txt'));}const board=renderToString(createElement(KanbanBoard,{tasks:[{id:'one',title:'One',status:'todo'}],columns:[{id:'todo',title:'Todo'}],showSort:false}));assert(board.includes('One'));const table=renderToString(createElement(DataTable,{data:[{id:'one',title:'One'}],columns:[{accessorKey:'title',header:'Title'}]}));assert(table.includes('table'));console.log('PASS Kanban and DataTable packed SSR');`);
 console.log(run(process.execPath,['dnd-ssr.mjs'],fixture));
 console.log(run(process.execPath,['probe.mjs'],fixture));run(process.execPath,['probe.cjs'],fixture);
 console.log(run('bun',['probe.mjs'],fixture));run('bun',['probe.cjs'],fixture);
 console.log(run('npm',['exec','--yes','--package=node@24.0.0','--','node','probe.mjs'],fixture));
 run('npm',['exec','--yes','--package=node@24.0.0','--','node','probe.cjs'],fixture);
 for(const name of names){const css=path.join(fixture,'node_modules/@alneas',name,'dist/styles.css');if(name==='appkit-react')assert(readFileSync(css,'utf8').length>1000,'CSS must be generated');}
 assert.deepEqual(sourceSelection(),records.sources,'Consumer checks changed selected source inputs');
 records.verified=true;records.completedAt=new Date().toISOString();records.checks={nodeMinimum:'24.0.0',hostNode:process.version,nativeEsm:true,commonJs:true,bun:true,nodeNextDeclarations:true,skipLibCheck:false,readmeAndFeatureExamples:index,requestFormSSR:true,css:true,optionalPeersOmitted:true};
 writeFileSync(path.join(artifacts,'archives.json'),JSON.stringify(records,null,2)+'\n');console.log('PASS: two-package archives and isolated consumers');
 if(process.env.APPKIT_RELEASE_CONSUMER==='true'){
  const handoff=path.join(root,'.verification/publish');mkdirSync(handoff,{recursive:true});
  writeFileSync(path.join(handoff,'consumer.json'),JSON.stringify(records,null,2)+'\n');
 }
} finally {rmSync(fixture,{recursive:true,force:true});rmSync(coreOnly,{recursive:true,force:true});}
