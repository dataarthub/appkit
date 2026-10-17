// @vitest-environment jsdom
import {StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {act,cleanup,render,renderHook,fireEvent} from '@testing-library/react';
import {afterEach,test,expect,vi} from 'vitest';
import {ActionRegistry} from "@alneas/appkit-core/ai";
import type {RecordProposal} from "@alneas/appkit-core/ai";
import {ScreenActionProvider} from './action/ScreenActionContext';
import {useScreenAction} from './action/use-screen-action';
import {useExecutionSession} from './action/use-execution-session';
import {useProposalReview} from './proposal/use-proposal-review';
import {useProposalBatchReview} from './proposal/use-proposal-batch-review';
import {MinimalErrorBoundary} from './generative-ui/error-boundary';
import {createGenerativeUIRegistry,defineGenerativeUIComponent,GenerativeUIRenderer} from './generative-ui';
afterEach(cleanup);
type Row={id:string;amount:number};
const row:Row={id:'r',amount:1};
const proposal:RecordProposal<Row>={id:'p',targetId:'r',baseVersion:1,createdAt:'2026-10-16',changes:[{field:'amount',before:1,after:2}]};
test('StrictMode registers once, uses latest handler after render and unregisters on unmount',async()=>{
  const registry=new ActionRegistry();
  function Child({value}:{value:number}){useScreenAction({id:'value',description:'value',validate:()=>({ok:true,data:{}}),handler:async()=>value});return null;}
  const view=(value:number)=><StrictMode><ScreenActionProvider registry={registry}><Child value={value}/></ScreenActionProvider></StrictMode>;
  const mounted=render(view(1));expect(registry.listActions()).toHaveLength(1);
  expect(await registry.executeAction('value',{})).toMatchObject({ok:true,data:1});
  mounted.rerender(view(2));expect(await registry.executeAction('value',{})).toMatchObject({ok:true,data:2});
  mounted.unmount();expect(registry.hasAction('value')).toBe(false);
});
test('rapid clicks apply once and proposal changes reject stale completion',async()=>{
  let finish!:()=>void;const apply=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
  function Review({id}:{id:string}){const review=useProposalReview({proposal:{...proposal,id},currentRecord:row,currentVersion:1,onApply:apply});return <><button onClick={review.acceptAll}>accept</button><button onClick={()=>void review.handleApply()}>apply</button><span>{review.reviewStatus}</span></>;}
  const view=render(<Review id="p"/>);fireEvent.click(view.getByText('accept'));
  fireEvent.click(view.getByText('apply'));fireEvent.click(view.getByText('apply'));expect(apply).toHaveBeenCalledTimes(1);
  view.rerender(<Review id="p2"/>);await act(async()=>finish());expect(view.getByText('all_pending')).toBeTruthy();
});
test('unmount aborts an active execution session',async()=>{
  const hook=renderHook(()=>useExecutionSession(),{wrapper:StrictMode});let signal!:AbortSignal;let finish!:()=>void;
  let running!:Promise<unknown>;
  act(()=>{running=hook.result.current.session.run('work',ctx=>{signal=ctx.signal;return new Promise<void>(r=>{finish=r;});});});
  hook.unmount();expect(signal.aborted).toBe(true);await act(async()=>{finish();await running;});
});
test('batch switch resets review and cancellation stops subsequent rows',async()=>{
  let finish!:()=>void;const apply=vi.fn(()=>new Promise<void>(r=>{finish=r;}));
  const items=[{proposal,currentRecord:row,currentVersion:1},{proposal:{...proposal,id:'p2',targetId:'r2'},currentRecord:{...row,id:'r2'},currentVersion:1}];
  const hook=renderHook(({id})=>useProposalBatchReview({batchId:id,items,onApply:apply}),{initialProps:{id:'a'}});
  act(()=>{hook.result.current.selectAll(true);hook.result.current.decideAll('p','accepted');hook.result.current.decideAll('p2','accepted');});
  let run!:Promise<boolean>;act(()=>{run=hook.result.current.apply();});
  await act(async()=>{await Promise.resolve();});expect(apply).toHaveBeenCalledTimes(1);
  act(()=>hook.result.current.cancel());await act(async()=>{finish();await run;});expect(apply).toHaveBeenCalledTimes(1);
  hook.rerender({id:'b'});expect(hook.result.current.selectedIds.size).toBe(0);expect(hook.result.current.decisions.size).toBe(0);
});
test('the actual renderer/provider/hooks hydrate, execute clicks, rerender and unregister',async()=>{
  const registry=new ActionRegistry();
  function Button({data}:{data:{label:string}}){
    useScreenAction({id:'hydrated',description:'hydrated',validate:()=>({ok:true,data:{}}),handler:async()=>data.label});
    return <button onClick={()=>void registry.executeAction('hydrated',{})}>{data.label}</button>;
  }
  const components=createGenerativeUIRegistry([defineGenerativeUIComponent({type:'button',validate:data=>typeof data.label==='string'?{ok:true,data:{label:data.label}}:{ok:false},component:Button})]);
  const tree=(label:string)=><StrictMode><ScreenActionProvider registry={registry}><GenerativeUIRenderer input={{version:1,id:'doc',blocks:[{id:'a',type:'button',data:{label}}]}} registry={components}/></ScreenActionProvider></StrictMode>;
  const errors:unknown[]=[];const host=document.createElement('div');host.innerHTML=renderToString(tree('Hello'));document.body.appendChild(host);const html=host.innerHTML;
  let root:ReturnType<typeof hydrateRoot>|undefined;
  try{
    await act(async()=>{root=hydrateRoot(host,tree('Hello'),{onRecoverableError:error=>errors.push(error)});});
    expect(errors).toEqual([]);expect(host.innerHTML).toBe(html);expect(registry.listActions()).toHaveLength(1);
    const execute=vi.spyOn(registry,'executeAction');
    fireEvent.click(host.querySelector('button')!);expect(execute).toHaveBeenCalledWith('hydrated',{});
    await act(async()=>{root!.render(tree('Updated'));});
    expect(host.textContent).toBe('Updated');expect(await registry.executeAction('hydrated',{})).toMatchObject({ok:true,data:'Updated'});
  }finally{if(root)await act(async()=>root!.unmount());host.remove();}
  expect(registry.hasAction('hydrated')).toBe(false);
});
test('rendering errors remain inside their boundary',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  function Broken():never{throw new Error('broken');}
  try{const view=render(<MinimalErrorBoundary fallback={error=><p>{error.message}</p>}><Broken/></MinimalErrorBoundary>);expect(view.getByText('broken')).toBeTruthy();}finally{log.mockRestore();}
});
