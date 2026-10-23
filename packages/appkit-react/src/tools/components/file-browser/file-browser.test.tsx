// @vitest-environment jsdom
import {render,cleanup,waitFor,act} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import type {DnDProviderProps} from '../ui/dnd';
import type {FileProvider} from './types';
let drag: DnDProviderProps;
vi.mock('../ui/dnd',async()=>({...await vi.importActual('../ui/dnd'),DnDProvider:(props:DnDProviderProps)=>{drag=props;return <>{props.children}</>;}}));
import {FileBrowser} from './FileBrowser';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const nodes=[{id:'one.txt',name:'One.txt',kind:'file' as const},{id:'folder',name:'Folder',kind:'folder' as const}];
function setup(move=vi.fn(async()=>{})){
 const list=vi.fn(async()=>({nodes:[...nodes],hasMore:false}));
 const provider={listNodes:list,moveNode:move} as unknown as FileProvider;
 const view=render(<FileBrowser provider={provider} initialViewMode="list"/>);
 const source={id:nodes[0].id,data:nodes[0]},target={id:nodes[1].id,data:nodes[1]};
 const event={canceled:false,operation:{source,target}};
 const manager={registry:{draggables:{get:()=>source},droppables:{get:()=>target}}};
 const start=()=>act(()=>{drag.onDragStart?.(event as never,manager as never);});
 const end=(value=event)=>drag.onDragEnd?.(value as never,manager as never);
 return {view,list,move,provider,event,start,end};
}
test('file move writes once and refreshes only after the provider resolves',async()=>{
 let resolve!:()=>void;const pending=new Promise<void>(r=>resolve=r);
 const ctx=setup(vi.fn(()=>pending));await waitFor(()=>expect(ctx.list).toHaveBeenCalledTimes(1));
 await waitFor(()=>expect(ctx.view.getByText('One.txt')).toBeTruthy());ctx.start();
 let result:unknown;act(()=>{result=ctx.end();});
 expect(ctx.move).toHaveBeenCalledExactlyOnceWith('one.txt','folder/');expect(ctx.list).toHaveBeenCalledTimes(1);
 await act(async()=>{resolve();await result;});await waitFor(()=>expect(ctx.list).toHaveBeenCalledTimes(2));
});
test('cancellation, no target and navigation during drag never write',async()=>{
 const ctx=setup();await waitFor(()=>expect(ctx.view.getByText('One.txt')).toBeTruthy());
 ctx.start();await act(async()=>{await ctx.end({...ctx.event,canceled:true});});
 ctx.start();await act(async()=>{await ctx.end({...ctx.event,operation:{...ctx.event.operation,target:null}} as never);});
 ctx.start();ctx.view.rerender(<FileBrowser provider={ctx.provider} initialPath="elsewhere/" initialViewMode="list"/>);
 await waitFor(()=>expect(ctx.list).toHaveBeenLastCalledWith('elsewhere/'));
 await act(async()=>{await ctx.end();});expect(ctx.move).not.toHaveBeenCalled();
});
test('rejected moves report the error and never refresh as success',async()=>{
 const ctx=setup(vi.fn(async()=>{throw Error('Move refused');}));const alert=vi.spyOn(window,'alert').mockImplementation(()=>{});
 await waitFor(()=>expect(ctx.view.getByText('One.txt')).toBeTruthy());ctx.start();await act(async()=>{await ctx.end();});
 expect(alert).toHaveBeenCalledExactlyOnceWith('Move refused');expect(ctx.list).toHaveBeenCalledTimes(1);
});
test('navigation while a move is pending does not refresh the old listing',async()=>{
 let resolve!:()=>void;const pending=new Promise<void>(r=>resolve=r);
 const ctx=setup(vi.fn(()=>pending));await waitFor(()=>expect(ctx.view.getByText('One.txt')).toBeTruthy());ctx.start();
 let result:unknown;act(()=>{result=ctx.end();});
 ctx.view.rerender(<FileBrowser provider={ctx.provider} initialPath="elsewhere/" initialViewMode="list"/>);
 await waitFor(()=>expect(ctx.list).toHaveBeenLastCalledWith('elsewhere/'));
 const before=ctx.list.mock.calls.length;
 await act(async()=>{resolve();await result;});expect(ctx.list).toHaveBeenCalledTimes(before);
});
test('view-only changes during a pending move still refresh the same folder',async()=>{
 let resolve!:()=>void;const pending=new Promise<void>(r=>resolve=r);
 const ctx=setup(vi.fn(()=>pending));await waitFor(()=>expect(ctx.view.getByText('One.txt')).toBeTruthy());ctx.start();
 let result:unknown;act(()=>{result=ctx.end();});
 act(()=>{ctx.view.getByRole('button',{name:'Grid view'}).click();});
 await act(async()=>{resolve();await result;});await waitFor(()=>expect(ctx.list).toHaveBeenCalledTimes(2));
});
test('each overlapping successful move refreshes the current folder',async()=>{
 let first!:()=>void,second!:()=>void;
 const pendingA=new Promise<void>(r=>first=r),pendingB=new Promise<void>(r=>second=r);
 const move=vi.fn(()=>pendingA).mockImplementationOnce(()=>pendingA).mockImplementationOnce(()=>pendingB);
 const ctx=setup(move);await waitFor(()=>expect(ctx.view.getByText('One.txt')).toBeTruthy());
 ctx.start();let a:unknown,b:unknown;act(()=>{a=ctx.end();});ctx.start();act(()=>{b=ctx.end();});
 await act(async()=>{first();await a;});await waitFor(()=>expect(ctx.list).toHaveBeenCalledTimes(2));
 await act(async()=>{second();await b;});await waitFor(()=>expect(ctx.list).toHaveBeenCalledTimes(3));
});
