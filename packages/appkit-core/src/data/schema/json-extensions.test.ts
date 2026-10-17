import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { generateJsonExtensionSql, buildJsonMergeExpression, type TableJsonExtensions } from './json-extensions';

test('generateJsonExtensionSql in app-core generates valid SQLite DDL and works with json_extract', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE test_projects (
        tenant_id TEXT NOT NULL,
        id TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (tenant_id, id)
      );
    `);

    const extensions: TableJsonExtensions = {
      jsonColumn: 'payload',
      virtualColumns: [
        {
          name: 'hotel_room_id',
          jsonPath: '$.plugins.hotel.roomId',
          type: { default: 'TEXT' },
          unique: true,
        },
      ],
    };

    const stmts = generateJsonExtensionSql('test_projects', extensions, 'sqlite');
    expect(stmts).toHaveLength(2);
    for (const sql of stmts) {
      db.exec(sql);
    }

    db.exec(`
      INSERT INTO test_projects (tenant_id, id, payload)
      VALUES ('tenant-1', 'proj-1', '{"plugins":{"hotel":{"roomId":"room-101"}}}');
    `);

    const row = db.query(`SELECT hotel_room_id FROM test_projects WHERE id = 'proj-1'`).get() as { hotel_room_id: string };
    expect(row.hotel_room_id).toBe('room-101');
  } finally {
    db.close();
  }
});

test('generateJsonExtensionSql in app-core generates zero-downtime DDL for Postgres and Oracle', () => {
  const extensions: TableJsonExtensions = {
    jsonColumn: 'payload',
    virtualColumns: [
      {
        name: 'hotel_room_id',
        jsonPath: '$.plugins.hotel.roomId',
        type: { postgres: 'VARCHAR(256)', oracle: 'VARCHAR2(256)', default: 'TEXT' },
        references: {
          table: 'hotel_rooms',
          columns: ['tenant_id', 'id'],
        },
        unique: true,
      },
    ],
    validations: [
      {
        name: 'hotel_schema',
        jsonPath: '$.plugins.hotel',
        schema: {
          type: 'object',
          properties: { roomId: { type: 'string' } },
        },
      },
    ],
  };

  const pgSql = generateJsonExtensionSql('PROJECTS', extensions, 'postgres');
  expect(pgSql.some(s => s.includes('GENERATED ALWAYS AS') && s.includes('STORED'))).toBe(true);
  expect(pgSql.some(s => s.includes('NOT VALID'))).toBe(true);

  const oraSql = generateJsonExtensionSql('PROJECTS', extensions, 'oracle');
  expect(oraSql.some(s => s.includes('JSON_VALUE') && s.includes('GENERATED ALWAYS AS'))).toBe(true);
  expect(oraSql.some(s => s.includes('ENABLE NOVALIDATE'))).toBe(true);
});

test('buildJsonMergeExpression supports safe partial update without wiping other plugins', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE test_multi_plugin (
        tenant_id TEXT NOT NULL,
        id TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (tenant_id, id)
      );
    `);

    // Initially have crm data
    db.exec(`
      INSERT INTO test_multi_plugin (tenant_id, id, payload)
      VALUES ('t1', 'rec-1', '{"plugins":{"crm":{"leadScore":80}},"customFields":{"tag":"VIP"}}');
    `);

    // Now update hotel data via buildJsonMergeExpression
    const merge = buildJsonMergeExpression('payload', '$.plugins.hotel', { roomId: '101' }, 'sqlite');
    db.run(
      `UPDATE test_multi_plugin SET payload = ${merge.valueExpression} WHERE id = 'rec-1'`,
      [merge.paramValue as string]
    );

    const updated = db.query(`SELECT payload FROM test_multi_plugin WHERE id = 'rec-1'`).get() as { payload: string };
    const parsed = JSON.parse(updated.payload);

    // Verify hotel was added
    expect(parsed.plugins.hotel).toEqual({ roomId: '101' });
    // Verify existing CRM and customFields were preserved intact!
    expect(parsed.plugins.crm).toEqual({ leadScore: 80 });
    expect(parsed.customFields).toEqual({ tag: 'VIP' });

    // Verify postgres and oracle expression shapes
    const pgMerge = buildJsonMergeExpression('payload', '$.plugins.hotel', { roomId: '102' }, 'postgres');
    expect(pgMerge.valueExpression).toContain('jsonb_set');
    expect(pgMerge.valueExpression).toContain("'{plugins,hotel}'");

    const oraMerge = buildJsonMergeExpression('payload', '$.plugins.hotel', { roomId: '103' }, 'oracle');
    expect(oraMerge.valueExpression).toContain('JSON_TRANSFORM');
    expect(oraMerge.valueExpression).toContain("SET '$.plugins.hotel' =");
  } finally {
    db.close();
  }
});

