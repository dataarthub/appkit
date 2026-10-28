// @vitest-environment jsdom
import {render,cleanup,act} from '@testing-library/react';
import {afterEach,expect,test} from 'vitest';
import {useDragDropManager} from '@dnd-kit/react';
import {DnDProvider,Draggable,Droppable} from './index';
afterEach(cleanup);
test('wrappers expose native context, element/handle refs and droppable state',async()=>{
 let manager: ReturnType<typeof useDragDropManager>;
 function Capture(){manager=useDragDropManager();return null;}
 const view=render(<DnDProvider><Capture/><Draggable id="file" data={{kind:'file'}}>{({ref,handleRef,isDragging,style})=><div ref={ref} style={style} data-dragging={isDragging}><button ref={handleRef}>Move file</button></div>}</Draggable><Droppable id="folder" data={{kind:'folder'}} disabled>{({ref,isDropTarget})=><section ref={ref} data-over={isDropTarget}>Folder</section>}</Droppable></DnDProvider>);
 await act(async()=>{await new Promise(r=>setTimeout(r,30));});
 expect(manager!).not.toBeNull();
 const drag=manager!.registry.draggables.get('file')!;
 expect(drag.element).toBe(view.container.querySelector('[data-dragging]'));
 expect(drag.handle).toBe(view.getByRole('button',{name:'Move file'}));
 expect(drag.data).toEqual({kind:'file'});
 expect(manager!.registry.droppables.get('folder')!.disabled).toBe(true);
 expect(view.container.querySelector('section')!.getAttribute('data-over')).toBe('false');
 view.unmount();expect(manager!.registry.draggables.get('file')).toBeUndefined();
});

test('shared draggable activators omit deprecated drag state with and without a separate handle',async()=>{
 const view=render(<DnDProvider><Draggable id="whole">{({ref})=><div ref={ref}>Whole item</div>}</Draggable><Draggable id="handled">{({ref,handleRef})=><div ref={ref}><button ref={handleRef}>Move handled item</button></div>}</Draggable></DnDProvider>);
 await act(async()=>{await new Promise(r=>setTimeout(r,30));});
 const activators=[view.getByText('Whole item'),view.getByRole('button',{name:'Move handled item'})];
 for(const activator of activators){
  expect(activator.getAttribute('aria-pressed')).toBe('false');
  expect(activator.hasAttribute('aria-grabbed')).toBe(false);
  expect(activator.getAttribute('aria-describedby')).toBeTruthy();
 }
});

test('shared draggable activators update native drag state and release observer registrations',async()=>{
 let manager: NonNullable<ReturnType<typeof useDragDropManager>>;
 function Capture(){manager=useDragDropManager()!;return null;}
 const view=render(<DnDProvider><Capture/><Draggable id="whole">{({ref})=><div ref={ref}>Whole item</div>}</Draggable><Draggable id="handled">{({ref,handleRef})=><div ref={ref}><button ref={handleRef}>Move handled item</button></div>}</Draggable></DnDProvider>);
 const activators=[view.getByText('Whole item'),view.getByRole('button',{name:'Move handled item'})];
 for(const [index,id] of ['whole','handled'].entries()){
  await act(async()=>{manager!.dragOperation.sourceIdentifier=id;manager!.registry.draggables.get(id)!.status='dragging';await new Promise(r=>setTimeout(r,30));});
  expect(activators[index].getAttribute('aria-pressed')).toBe('true');
  expect(activators[index].hasAttribute('aria-grabbed')).toBe(false);
  await act(async()=>{manager!.registry.draggables.get(id)!.status='idle';manager!.dragOperation.sourceIdentifier=null;await new Promise(r=>setTimeout(r,30));});
  expect(activators[index].getAttribute('aria-pressed')).toBe('false');
  expect(activators[index].hasAttribute('aria-grabbed')).toBe(false);
 }
 view.unmount();
 for(const activator of activators)activator.setAttribute('aria-grabbed','detached');
 await act(async()=>{});
 expect(manager!.registry.draggables.get('whole')).toBeUndefined();
 expect(manager!.registry.draggables.get('handled')).toBeUndefined();
 for(const activator of activators)expect(activator.getAttribute('aria-grabbed')).toBe('detached');
});
