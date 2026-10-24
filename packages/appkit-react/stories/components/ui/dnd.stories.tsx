import type {Meta,StoryObj} from '@storybook/react-vite';
import {expect,fn,userEvent,within,waitFor} from 'storybook/test';
import {DnDProvider,Draggable,Droppable} from '../../../src/tools/components/ui/dnd';
const meta:Meta<typeof DnDProvider>={title:'UI/DnD',component:DnDProvider,parameters:{layout:'padded'}};
export default meta;
type Story=StoryObj<typeof DnDProvider>;
export const NativeLifecycle:Story={
 args:{onDragStart:fn(),onDragEnd:fn()},
 render:args=><DnDProvider {...args}><div style={{display:'flex',gap:48}}><Draggable id="source" data={{kind:'file'}}>{({ref,handleRef,isDragging,style})=><div ref={ref} data-testid="drag-source" data-dragging={isDragging} style={{...style,width:80,height:80}}><button ref={handleRef}>Move source</button><button>Nested action</button></div>}</Draggable><Droppable id="folder" data={{kind:'folder'}}>{({ref,isDropTarget})=><div ref={ref} data-testid="drop-folder" data-over={isDropTarget} style={{width:100,height:80,border:'1px solid'}}>Folder</div>}</Droppable><Droppable id="disabled" disabled>{({ref,isDropTarget})=><div ref={ref} data-testid="disabled" data-over={isDropTarget}>Disabled</div>}</Droppable></div></DnDProvider>,
 play:async({canvasElement,args})=>{
  const canvas=within(canvasElement);const handle=canvas.getByRole('button',{name:'Move source'});const source=canvas.getByTestId('drag-source');
  await userEvent.click(canvas.getByRole('button',{name:'Nested action'}));await expect(args.onDragStart).not.toHaveBeenCalled();
  handle.focus();await userEvent.keyboard('[Space]');await waitFor(()=>expect(source).toHaveAttribute('data-dragging','true'));
  await userEvent.keyboard('{ArrowRight}'.repeat(18));
  await waitFor(()=>expect(canvas.getByTestId('drop-folder')).toHaveAttribute('data-over','true'));
  await userEvent.keyboard('[Space]');await waitFor(()=>expect(args.onDragEnd).toHaveBeenCalledTimes(1));
  const end=(args.onDragEnd as ReturnType<typeof fn>).mock.calls[0][0];
  await expect(end.canceled).toBe(false);await expect(end.operation.source.data.kind).toBe('file');await expect(end.operation.target.id).toBe('folder');
  await waitFor(()=>expect(document.activeElement).toBe(handle));
  await userEvent.keyboard('[Space]{Escape}');
  await waitFor(()=>expect(args.onDragEnd).toHaveBeenCalledTimes(2));
  await expect((args.onDragEnd as ReturnType<typeof fn>).mock.calls[1][0].canceled).toBe(true);
  await expect(canvas.getByTestId('disabled')).toHaveAttribute('data-over','false');
 },
};
