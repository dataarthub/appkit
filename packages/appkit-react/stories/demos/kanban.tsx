import { useState } from 'react';
import { KanbanBoard } from '../../src/tools/kanban';

/** Controlled status changes shared by docs and Storybook. */
export default function KanbanDemo() {
  const [tasks, setTasks] = useState([
    { id: 'one', title: 'デモを試す / Try the demo', status: 'todo' },
  ]);
  const [result, setResult] = useState('未操作 / Ready');
  return (
    <>
      <KanbanBoard
        tasks={tasks}
        columns={[
          { id: 'todo', title: '未着手 / Todo' },
          { id: 'done', title: '完了 / Done' },
        ]}
        showSort={false}
        onStatusChange={(id, status) => {
          setTasks((previous) =>
            previous.map((task) => (task.id === id ? { ...task, status } : task)),
          );
          setResult(`${id}: ${status}`);
        }}
      />
      <output aria-live='polite'>{result}</output>
    </>
  );
}
