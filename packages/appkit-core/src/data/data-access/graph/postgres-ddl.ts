/**
 * PostgreSQL Graph DDL and Recursive CTE Query Templates
 *
 * Table definitions and view/query templates for task dependency graph analysis
 * utilizing PostgreSQL recursive CTEs (WITH RECURSIVE).
 */

import { graphSqlIdentifier } from './sql-identifier';

export interface PostgresGraphDdlOptions {
  /** Tasks table name (default: 'tasks') */
  tasksTable?: string;
  /** Dependencies table name (default: 'task_dependencies') */
  dependenciesTable?: string;
}

/**
 * Generates DDL script (tables + indexes + recursive CTE view) for task graph in PostgreSQL.
 */
export function generatePostgresGraphDdl(options: PostgresGraphDdlOptions = {}): string {
  const tasks = graphSqlIdentifier(options.tasksTable ?? 'tasks');
  const deps = graphSqlIdentifier(options.dependenciesTable ?? 'task_dependencies');

  return `-- =========================================================================
-- PostgreSQL Task Graph Setup (Recursive CTE)
-- =========================================================================

-- 1. Tasks Table (Vertices)
CREATE TABLE IF NOT EXISTS ${tasks} (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    duration_hours NUMERIC DEFAULT 1 NOT NULL,
    status VARCHAR(30) DEFAULT 'TODO' NOT NULL,
    due_date TIMESTAMPTZ,
    assignee VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Task Dependencies Table (Edges)
CREATE TABLE IF NOT EXISTS ${deps} (
    predecessor_id VARCHAR(64) NOT NULL REFERENCES ${tasks}(id) ON DELETE CASCADE,
    successor_id VARCHAR(64) NOT NULL REFERENCES ${tasks}(id) ON DELETE CASCADE,
    dependency_type VARCHAR(30) DEFAULT 'FINISH_TO_START' NOT NULL,
    lag_hours NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_${deps}_succ ON ${deps}(successor_id);

-- 3. Recursive CTE View for Blocker Analysis (Top blockers view)
CREATE OR REPLACE VIEW task_blocker_summary AS
WITH RECURSIVE downstream_tasks AS (
    -- Initial edges (directly blocking tasks)
    SELECT 
        d.predecessor_id AS root_blocker_id,
        d.successor_id AS blocked_id
    FROM ${deps} d
    JOIN ${tasks} t ON t.id = d.predecessor_id
    WHERE t.status != 'DONE'

    UNION

    -- Recursive traversal (traverse all downstream tasks)
    SELECT 
        dt.root_blocker_id,
        d.successor_id AS blocked_id
    FROM downstream_tasks dt
    JOIN ${deps} d ON d.predecessor_id = dt.blocked_id
)
SELECT 
    t.id AS task_id,
    t.title,
    t.status,
    t.duration_hours,
    COUNT(DISTINCT dt.blocked_id) AS blocked_count
FROM ${tasks} t
JOIN downstream_tasks dt ON dt.root_blocker_id = t.id
GROUP BY t.id, t.title, t.status, t.duration_hours
ORDER BY blocked_count DESC;
`;
}

/**
 * Recursive CTE query to retrieve downstream affected nodes for a specific task.
 */
export function getPostgresDownstreamQuery(
  options: PostgresGraphDdlOptions = {},
): string {
  const tasks = graphSqlIdentifier(options.tasksTable ?? 'tasks');
  const deps = graphSqlIdentifier(options.dependenciesTable ?? 'task_dependencies');

  return `
WITH RECURSIVE downstream AS (
    SELECT 
        successor_id AS id,
        1 AS depth,
        ARRAY[predecessor_id, successor_id]::text[] AS path
    FROM ${deps}
    WHERE predecessor_id = $1

    UNION

    SELECT 
        d.successor_id AS id,
        dt.depth + 1 AS depth,
        dt.path || d.successor_id::text AS path
    FROM downstream dt
    JOIN ${deps} d ON d.predecessor_id = dt.id
    WHERE NOT d.successor_id::text = ANY(dt.path)
)
SELECT 
    t.id,
    t.title,
    t.status,
    t.duration_hours,
    t.assignee,
    MIN(dt.depth) AS depth
FROM downstream dt
JOIN ${tasks} t ON t.id = dt.id
GROUP BY t.id, t.title, t.status, t.duration_hours, t.assignee
ORDER BY depth ASC;
`;
}
