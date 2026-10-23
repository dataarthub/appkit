import React from 'react';
import { createPortal } from 'react-dom';
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { Accessibility, Feedback, PointerSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import { closestCenter } from '@dnd-kit/collision';
import { ColumnKeyboardSensor } from './candidate-keyboard';
import { resolveKanbanMove } from './candidate-resolver';
import { type Task, columns, initialTasks, instructions, useTableModel, moveOrder, TableBody } from './shared';
function Card({ task, readOnly }: {
    task: Task;
    readOnly: boolean;
}) {
    const { ref, isDragging } = useDraggable({ id: task.id, data: { type: 'Task', task }, disabled: readOnly });
    return <div ref={ref} data-card={task.id} className="card" style={{ opacity: isDragging ? .3 : 1 }}>{task.title}<button data-inner={task.id}>Details</button></div>;
}
function Column({ id, tasks, readOnly }: {
    id: string;
    tasks: Task[];
    readOnly: boolean;
}) {
    const { ref, isDropTarget } = useDroppable({ id, data: { type: 'Column' }, collisionDetector: closestCenter });
    return <section ref={ref} data-column={id} data-over={isDropTarget} className="column"><h3>{id}</h3>{tasks.map(task => <Card key={task.id} task={task} readOnly={readOnly}/>)}</section>;
}
const kanbanSensors = [PointerSensor.configure({ activationConstraints(event) { return event.pointerType === 'touch' ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })] : [new PointerActivationConstraints.Distance({ value: 10 })]; } }), ColumnKeyboardSensor];
export function Board({ mode, readOnly }: {
    mode: string;
    readOnly: boolean;
}) {
    const [tasks, setTasks] = React.useState(initialTasks);
    const [calls, setCalls] = React.useState<unknown[]>([]);
    const [active, setActive] = React.useState<Task | null>(null);
    const [trace, setTrace] = React.useState<unknown[]>([]);
    return <><DragDropProvider sensors={kanbanSensors} plugins={defaults => [...defaults, Accessibility.configure({ screenReaderInstructions: { draggable: instructions } })]} onDragStart={({ operation }) => { setTrace(t => [...t, { start: operation.source?.id }]); setActive(tasks.find(t => t.id === operation.source?.id) ?? null); }} onDragOver={({ operation }) => setTrace(t => [...t, { over: operation.target?.id }])} onDragEnd={({ operation, canceled }) => {
            setTrace(t => [...t, { end: operation.source?.id, target: operation.target?.id, canceled }]);
            setActive(null);
            const { source, target } = operation;
            if (canceled || readOnly || !source)
                return;
            const move = resolveKanbanMove({ active: { id: source.id }, over: target ? { id: target.id, data: { current: target.data } } : null }, tasks, 'status', mode === 'compound' ? undefined : columns.map(id => ({ id, title: id })));
            if (move) {
                setCalls(c => [...c, move]);
                setTasks(ts => ts.map(t => t.id === move.taskId ? { ...t, status: move.status } : t));
            }
        }}><div className="board">{columns.map(id => <Column key={id} id={id} tasks={tasks.filter(t => t.status === id)} readOnly={readOnly}/>)}</div>{createPortal(<DragOverlay dropAnimation={null}>{active && <div data-overlay className="card">{active.title}</div>}</DragOverlay>, document.body)}</DragDropProvider><output data-tasks>{JSON.stringify(tasks)}</output><output data-calls>{JSON.stringify(calls)}</output><output data-trace>{JSON.stringify(trace)}</output></>;
}
function Header({ id, index, sort, setSort }: {
    id: string;
    index: number;
    sort: string;
    setSort: (s: string) => void;
}) {
    const { ref, handleRef } = useSortable({ id, index, group: 'headers', type: 'header', accept: 'header', collisionDetector: closestCenter });
    return <th ref={ref} data-header={id} aria-sort={id === 'status' ? sort as 'none' | 'ascending' | 'descending' : undefined}><button ref={handleRef} aria-label={'Reorder column ' + id}>↔</button><button onClick={() => setSort(sort === 'ascending' ? 'descending' : 'ascending')}>{id}</button></th>;
}
export function TableDemo() {
    const model = useTableModel('candidate');
    const [events, setEvents] = React.useState<unknown[]>([]);
    return <><DragDropProvider sensors={defaults => [...defaults.filter(s => s !== PointerSensor), PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })] })]} plugins={defaults => [...defaults, Feedback.configure({ feedback: 'clone', dropAnimation: { duration: 0 } })]} onDragEnd={({ operation, canceled, nativeEvent }) => {
            const { source, target } = operation;
            if (!isSortable(source))
                return;
            setEvents(events => [...events, { source: source.id, target: target?.id, initialIndex: source.initialIndex, index: source.index, canceled }]);
            if (!canceled)
                model.setOrder(order => moveOrder(order, source.initialIndex, source.index));
        }}><table><thead><tr>{model.order.map((id, index) => <Header key={id} id={id} index={index} sort={model.sort} setSort={model.setSort}/>)}</tr></thead><TableBody order={model.order}/></table></DragDropProvider><output data-order>{JSON.stringify(model.order)}</output><output data-sort>{model.sort}</output><output data-events>{JSON.stringify(events)}</output></>;
}
