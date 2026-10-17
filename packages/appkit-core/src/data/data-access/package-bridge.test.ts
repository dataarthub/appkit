import { test, expect } from 'bun:test';
import { createResourceService as canonical } from "..";
import { SQLiteDataAccessAdapter as SQLite } from "../sqlite";
import { createResourceService, SQLiteDataAccessAdapter } from './index';
import { calculateCriticalPath } from '../integrations/task-graph';
test('record adapters and services have one implementation; graph APIs remain in engine', () => {
  expect(createResourceService).toBe(canonical); expect(SQLiteDataAccessAdapter).toBe(SQLite);
  expect(typeof calculateCriticalPath).toBe('function');
});
