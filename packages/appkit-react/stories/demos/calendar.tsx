import { useState } from 'react';
import { ResourceCalendar } from '../../src/tools/calendar';

const date = new Date(2026, 8, 16);
const events = [
  {
    id: 'meeting',
    title: 'デモ会議 / Demo meeting',
    start: new Date(2026, 8, 16, 9),
    end: new Date(2026, 8, 16, 10),
  },
];
/** Fixed-date event selection shared by docs and Storybook. */
export default function CalendarDemo() {
  const [result, setResult] = useState('予定を選択 / Select an event');
  return (
    <>
      <ResourceCalendar
        defaultDate={date}
        defaultView='day'
        events={events}
        onEventClick={(event) => setResult(event.title)}
      />
      <output aria-live='polite'>{result}</output>
    </>
  );
}
