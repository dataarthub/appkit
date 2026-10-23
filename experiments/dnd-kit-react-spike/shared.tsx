import React from 'react';
export type Task = {
    id: string;
    title: string;
    status: string;
};
export const columns = ['todo', 'empty', 'done'];
export const initialTasks: Task[] = [{ id: 'a', title: 'Alpha', status: 'todo' }, { id: 'b', title: 'Beta', status: 'todo' }, { id: 'c', title: 'Gamma', status: 'done' }];
export const instructions = 'SpaceまたはEnterで移動開始。左右矢印で列を選択し、SpaceまたはEnterで確定。Escapeで取り消します。';
export const initialOrder = ['select', 'status', 'email', 'amount'];
export function moveOrder(order: string[], from: number, to: number) {
    if (from < 0 || to < 0 || from >= order.length || to >= order.length || from === to)
        return order;
    const result = [...order];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
}
export function useTableModel(engine: string) {
    const [order, setOrder] = React.useState<string[]>(() => JSON.parse(localStorage.getItem(engine + '-order') || JSON.stringify(initialOrder)));
    const [sort, setSort] = React.useState('none');
    React.useEffect(() => localStorage.setItem(engine + '-order', JSON.stringify(order)), [order, engine]);
    return { order, setOrder, sort, setSort };
}
export function TableBody({ order }: {
    order: string[];
}) {
    return <tbody>{[0, 1].map(i => <tr key={i}>{order.map(id => <td key={id} data-cell={id}>{id === 'email' ? ['b@example.com', 'a@example.com'][i] : `${id}-${i}`}</td>)}</tr>)}</tbody>;
}
