import {test,expect} from 'bun:test';
import {resolveFileDrop} from './file-drop';
const nodes=[{id:'one.txt',name:'One',kind:'file' as const},{id:'folder',name:'Folder',kind:'folder' as const}];
const event=(source: any=nodes[0],target: any=nodes[1],canceled=false)=>({canceled,operation:{source:source&&{id:source.id,data:source},target:target&&{id:target.id,data:target}}});
test('native file drops normalize folder paths and move only the dragged file',()=>{
 expect(resolveFileDrop(event(),nodes)).toEqual({nodeId:'one.txt',targetPath:'folder/'});
 const trailing=[nodes[0],{...nodes[1],id:'folder/'}];
 expect(resolveFileDrop(event(trailing[0],trailing[1]),trailing)).toEqual({nodeId:'one.txt',targetPath:'folder/'});
});
test('cancel, outside, missing metadata, stale entities and invalid kinds never move',()=>{
 for(const drop of [event(null),event(nodes[0],null),event(nodes[0],nodes[1],true),event(nodes[1],nodes[0]),event(nodes[0],{}),{canceled:false,operation:{source:{id:'one.txt',data:{}},target:{id:'folder',data:{}}}}])expect(resolveFileDrop(drop,nodes)).toBeNull();
 expect(resolveFileDrop(event(),[nodes[0]])).toBeNull();
 expect(resolveFileDrop(event(),[nodes[1]])).toBeNull();
 expect(resolveFileDrop(event(),[nodes[0],{...nodes[1],kind:'file'}])).toBeNull();
});
test('same folder prefix is a no-op and immutable inputs remain untouched',()=>{
 const inside={...nodes[0],id:'folder/one.txt'};const input=[inside,nodes[1]];const before=structuredClone(input);
 expect(resolveFileDrop(event(inside),input)).toBeNull();expect(input).toEqual(before);
});
