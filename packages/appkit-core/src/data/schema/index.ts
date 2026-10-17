/** Framework-free aggregation. Prefer /core or /compiler for narrower entry points. */
export * from './core';
export * from './compiler';
// Preserve the legacy aggregation's own declarations where ./types also defines them.
export type { FieldDefinition, FieldRelationDefinition, FieldType, FieldWidth, RelationInputDisplay, RelationSearchMode, SchemaDefinition } from './compiler';
export * from './geo-data';
export * from './codelists';
export * from './schema-converter';
export * from './json-extensions';
export * from './cast';
