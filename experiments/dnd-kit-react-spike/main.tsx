import React from 'react';
import { createRoot } from 'react-dom/client';
import * as legacy from './legacy';
import * as candidate from './candidate';
import './style.css';
const params = new URLSearchParams(location.search);
const engine = params.get('engine') ?? 'candidate';
const { Board, TableDemo } = engine === 'legacy' ? legacy : candidate;
function App() { const [readOnly, setReadOnly] = React.useState(params.has('readonly')); return <><h1>{engine}: disposable migration spike</h1><button onClick={() => setReadOnly(v => !v)}>Toggle read only</button><h2>Kanban</h2><Board mode={params.get('mode') ?? 'preset'} readOnly={readOnly}/><h2>Table</h2><TableDemo /></>; }
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
