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
