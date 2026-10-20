import { useState } from 'react';
import { GanttChart, type GanttTask } from '../../src/tools/gantt';

/** Controlled task dates shared by docs and Storybook. */
export default function GanttDemo() {
  const [tasks, setTasks] = useState<GanttTask[]>([
    {
      id: 'one',
      title: 'デモタスク / Demo task',
      status: 'todo',
      created_at: new Date(2026, 8, 16),
      start_date: new Date(2026, 8, 16),
      due_date: new Date(2026, 8, 18),
    },
  ]);
  const [result, setResult] = useState('バーを移動 / Move a task bar');
  return (
    <>
      <GanttChart
        tasks={tasks}
        initialViewMode='Day'
        dateEditing={{ enabled: true }}
        onTasksChange={async (next) => {
          setTasks(next);
          setResult(`${next[0].start_date} → ${next[0].due_date}`);
        }}
      />
      <output aria-live='polite'>{result}</output>
    </>
  );
}
