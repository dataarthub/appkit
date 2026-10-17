import { it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePostgresGraphDdl, getPostgresDownstreamQuery } from './postgres-ddl';
import { PostgresGraphAdapter } from '../postgres-graph-adapter';

it('rejects interpolated SQL fragments in graph identifiers', () => {
  for (const tasksTable of ['tasks; DROP TABLE users;--', 'schema.tasks', 'tasks"', '']) {
    assert.throws(() => generatePostgresGraphDdl({ tasksTable }), /identifiers/);
    assert.throws(() => new PostgresGraphAdapter({ tasksTable, query: async () => [] }), /identifiers/);
  }
});
it('uses finite pair reachability and path guards for cyclic database data', () => {
  const ddl = generatePostgresGraphDdl();
  assert(!ddl.includes('dt.depth + 1'));
  assert(ddl.includes('UNION'));
  const query = getPostgresDownstreamQuery();
  assert(query.includes('ANY(dt.path)'));
  assert(query.includes('predecessor_id = $1'));
});
it('keeps normalized IDs and zero durations when mapping database rows', async () => {
  const adapter = new PostgresGraphAdapter({ query: async sql => sql.includes('dependency_type') ? [] : [{ id: 12, title: 'Milestone', duration_hours: 0 }] });
  const data = await adapter.loadGraph();
  assert.equal(data.tasks[0].id, '12');
  assert.equal(data.tasks[0].durationHours, 0);
});
