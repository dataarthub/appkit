// @vitest-environment jsdom
import {render,cleanup,act} from '@testing-library/react';
import {afterEach,expect,test} from 'vitest';
import {KanbanBoard} from './KanbanBoard';
afterEach(cleanup);
const tasks=[{id:'one',title:'One',status:'todo'}];
const columns=[{id:'todo',title:'Todo'},{id:'done',title:'Done'}];
test('cards can receive focus immediately after mounting without waiting for the a11y plugin',()=>{
 const view=render(<KanbanBoard tasks={tasks} columns={columns} showSort={false}/>);
 const card=view.container.querySelector<HTMLElement>('[data-task-id=one]')!;
 card.focus();expect(document.activeElement).toBe(card);
 expect(card.getAttribute('role')).toBe('button');
});
test('read-only cards have no drag tab stop or drag role description',()=>{
 const view=render(<KanbanBoard tasks={tasks} columns={columns} showSort={false} readOnly/>);
 const card=view.container.querySelector<HTMLElement>('[data-task-id=one]')!;
 expect(card.getAttribute('tabindex')).toBeNull();
 expect(card.getAttribute('aria-roledescription')).toBeNull();
});

// Exercise the native lifecycle without relying on geometry in JSDOM.
import {DragDropProvider, useDragDropManager} from '@dnd-kit/react';
import {Accessibility} from '@dnd-kit/dom';
import {KanbanDraggableCard} from './kanban-primitives';
test('switching to read-only during a drag clears drag accessibility after reset',async()=>{
 let manager: NonNullable<ReturnType<typeof useDragDropManager>>;
 function Capture(){manager=useDragDropManager()!;return null;}
 function View({disabled=false}){return <DragDropProvider plugins={[Accessibility]}><Capture/><KanbanDraggableCard task={tasks[0]} disabled={disabled}>One</KanbanDraggableCard></DragDropProvider>;}
 const view=render(<View/>);
 await act(async()=>{await new Promise(r=>setTimeout(r,30));});
 const card=view.container.querySelector<HTMLElement>('[data-task-id=one]')!;
 await act(async()=>{manager.dragOperation.sourceIdentifier='one';manager.dragOperation.status.set('dragging');});
 view.rerender(<View disabled/>);
 await act(async()=>{await new Promise(r=>setTimeout(r,30));});
 await act(async()=>{manager.dragOperation.status.set('idle');manager.dragOperation.sourceIdentifier=null;await new Promise(r=>setTimeout(r,30));});
 expect(card.getAttribute('tabindex')).toBeNull();
 expect(card.getAttribute('role')).toBeNull();
 expect(card.getAttribute('aria-roledescription')).toBeNull();
 view.rerender(<View/>);
 card.focus();expect(document.activeElement).toBe(card);
});

test('read-only custom cards retain caller accessibility attributes',()=>{
 const view=render(<DragDropProvider plugins={[Accessibility]}><KanbanDraggableCard task={tasks[0]} disabled role="article" tabIndex={0} aria-describedby="help">One</KanbanDraggableCard></DragDropProvider>);
 const card=view.container.querySelector<HTMLElement>('[data-task-id=one]')!;
 expect(card.getAttribute('role')).toBe('article');
 expect(card.getAttribute('tabindex')).toBe('0');
 expect(card.getAttribute('aria-describedby')).toBe('help');
 view.rerender(<DragDropProvider plugins={[Accessibility]}><KanbanDraggableCard task={tasks[0]} disabled role="region" tabIndex={-1} aria-describedby="updated">One</KanbanDraggableCard></DragDropProvider>);
 expect(card.getAttribute('role')).toBe('region');
 expect(card.getAttribute('tabindex')).toBe('-1');
 expect(card.getAttribute('aria-describedby')).toBe('updated');
});
