import './legacy-jsx-shim';
import React from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useKanbanSensors, kanbanAccessibility } from './baseline-sensors';
import { resolveKanbanMove } from './baseline-resolver';
import { type Task, columns, initialTasks, useTableModel, moveOrder, TableBody } from './shared';
function Card({ task, readOnly }: {
    task: Task;
    readOnly: boolean;
}) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'Task', task }, disabled: readOnly });
    return <div ref={setNodeRef} {...(!readOnly ? attributes : {})} {...(!readOnly ? listeners : {})} data-card={task.id} className="card" style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .3 : 1 }}>{task.title}<button data-inner={task.id}>Details</button></div>;
}
function Column({ id, tasks, readOnly }: {
    id: string;
    tasks: Task[];
    readOnly: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'Column' } });
    return <section ref={setNodeRef} data-column={id} data-over={isOver} className="column"><h3>{id}</h3><SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>{tasks.map(task => <Card key={task.id} task={task} readOnly={readOnly}/>)}</SortableContext></section>;
}
export function Board({ mode, readOnly }: {
    mode: string;
    readOnly: boolean;
}) {
    const [tasks, setTasks] = React.useState(initialTasks);
    const [calls, setCalls] = React.useState<unknown[]>([]);
    const [active, setActive] = React.useState<Task | null>(null);
    const sensors = useKanbanSensors('status');
    return <><DndContext sensors={sensors} accessibility={kanbanAccessibility} onDragStart={({ active }) => setActive(tasks.find(t => t.id === active.id) ?? null)} onDragCancel={() => setActive(null)} onDragEnd={event => {
            setActive(null);
            if (readOnly)
                return;
            const move = resolveKanbanMove(event, tasks, 'status', mode === 'compound' ? undefined : columns.map(id => ({ id, title: id })));
            if (move) {
                setCalls(c => [...c, move]);
                setTasks(ts => ts.map(t => t.id === move.taskId ? { ...t, status: move.status } : t));
            }
        }}><div className="board">{columns.map(id => <Column key={id} id={id} tasks={tasks.filter(t => t.status === id)} readOnly={readOnly}/>)}</div>{createPortal(<DragOverlay>{active && <div data-overlay className="card">{active.title}</div>}</DragOverlay>, document.body)}</DndContext><output data-tasks>{JSON.stringify(tasks)}</output><output data-calls>{JSON.stringify(calls)}</output></>;
}
function Header({ id, sort, setSort }: {
    id: string;
    sort: string;
    setSort: (s: string) => void;
}) {
    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition } = useSortable({ id });
    return <th ref={setNodeRef} data-header={id} aria-sort={id === 'status' ? sort as 'none' | 'ascending' | 'descending' : undefined} style={{ transform: CSS.Translate.toString(transform), transition }}><button ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={'Reorder column ' + id}>↔</button><button onClick={() => setSort(sort === 'ascending' ? 'descending' : 'ascending')}>{id}</button></th>;
}
export function TableDemo() {
    const model = useTableModel('legacy');
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    return <><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over && active.id !== over.id)
        model.setOrder(order => moveOrder(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)))); }}><table><thead><SortableContext items={model.order} strategy={horizontalListSortingStrategy}><tr>{model.order.map(id => <Header key={id} id={id} sort={model.sort} setSort={model.setSort}/>)}</tr></SortableContext></thead><TableBody order={model.order}/></table></DndContext><output data-order>{JSON.stringify(model.order)}</output><output data-sort>{model.sort}</output></>;
}
