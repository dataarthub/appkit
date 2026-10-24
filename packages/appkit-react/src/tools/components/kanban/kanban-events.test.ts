import {expect, test} from 'bun:test';
import {resolveKanbanDrop} from './kanban-events';
import {resolveKanbanMove} from './kanban-drag';
const tasks=[{id:'one',title:'One',status:'todo',stage:'todo'},{id:'two',title:'Two',status:'done',stage:'done'}];
const columns=[{id:'todo',title:'Todo'},{id:'empty',title:'Empty'},{id:'done',title:'Done'}];
const drop=(target: {id: string; data: Record<string, unknown>} | null, canceled=false)=>({operation:{source:{id:'one'},target},canceled});

test('new end event moves into an empty registered column using a custom status field',()=>{
 expect(resolveKanbanDrop(drop({id:'empty',data:{type:'Column'}}),tasks,'stage',columns)).toEqual({taskId:'one',status:'empty'});
});
test('new event resolves compound columns without a columns array and legacy task-shaped targets',()=>{
 expect(resolveKanbanDrop(drop({id:'empty',data:{type:'Column'}}),tasks,'status')).toEqual({taskId:'one',status:'empty'});
 expect(resolveKanbanDrop(drop({id:'two',data:{type:'Task'}}),tasks,'stage',columns)).toEqual({taskId:'one',status:'done'});
});
test('cancellation, null entities, removed tasks/columns and same-status drops cannot emit a move',()=>{
 for(const event of [drop(null),drop({id:'todo',data:{type:'Column'}}),drop({id:'empty',data:{type:'Column'}},true),{...drop(null),operation:{source:null,target:{id:'empty',data:{type:'Column'}}}}]) expect(resolveKanbanDrop(event,tasks,'status',columns)).toBeNull();
 expect(resolveKanbanDrop(drop({id:'empty',data:{type:'Column'}}),[], 'status',columns)).toBeNull();
 expect(resolveKanbanDrop(drop({id:'removed',data:{type:'Column'}}),tasks,'status',columns)).toBeNull();
});
test('legacy-shaped public resolver arguments remain valid without mutating task data',()=>{
 const before=structuredClone(tasks);
 expect(resolveKanbanMove({active:{id:'one'},over:{id:'empty',data:{current:{type:'Column'}}}},tasks,'status')).toEqual({taskId:'one',status:'empty'});
 expect(tasks).toEqual(before);
});
