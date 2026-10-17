/**
 * @fileoverview Schema-Aware Supabase Adapter
 *
 * Adapter extending SupabaseAdapter with JSON Schema-based automatic snake_case <-> camelCase
 * conversion, relation joining (populate), MongoDB-style operators, and SQL schema cache retries.
 *
 * @module lib/data-access/schema-aware-adapter
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAdapter } from "../supabase-adapter";
import type { Filter, QueryOptions } from "../types";
import { SchemaDataConverter } from '../schema/schema-converter';
import type { JSONSchema } from '../schema/types';

// =============================================================================
// Types
// =============================================================================

export interface SchemaAwareAdapterOptions {
  /** Map of collection name to JSONSchema */
  schemas: Record<string, JSONSchema>;
  /**
   * Automatic metadata injection hook for EDI document-type tables.
   */
  ediMetadataInjector?: (collection: string) => Record<string, unknown> | null;
}

// =============================================================================
// Adapter
// =============================================================================

/**
 *
 */
export class SchemaAwareSupabaseAdapter extends SupabaseAdapter {
  private schemas: Record<string, JSONSchema>;
  private converterCache: Map<string, SchemaDataConverter | null> = new Map();
  private ediMetadataInjector?: (collection: string) => Record<string, unknown> | null;
  private missingSchemaWarnings = new Set<string>();

  /**
   * Creates a new instance of SchemaAwareSupabaseAdapter.
   * @param client SupabaseClient instance
   * @param options Schema and metadata configuration options
   */
  constructor(client: SupabaseClient, options: SchemaAwareAdapterOptions) {
    super(client);
    this.schemas = options.schemas;
    this.ediMetadataInjector = options.ediMetadataInjector;
  }

  private warnMissingSchemaOnce(collection: string) {
    if (this.missingSchemaWarnings.has(collection)) return;
    this.missingSchemaWarnings.add(collection);
    console.warn(
      `[dbAdapter] Schema not registered for collection "${collection}". ` +
        'Falling back to camelCase/snake_case conversion only.',
    );
  }

  /**
   * Retrieves the data converter for a specific collection.
   */
  getConverter<T = unknown>(collection: string): SchemaDataConverter<T> | null {
    if (this.converterCache.has(collection)) {
      return this.converterCache.get(collection) as SchemaDataConverter<T> | null;
    }

    const schema = this.schemas[collection];
    if (!schema) {
      this.warnMissingSchemaOnce(collection);
      this.converterCache.set(collection, null);
      return null;
    }

    const converter = new SchemaDataConverter<T>(schema);
    this.converterCache.set(collection, converter as SchemaDataConverter);
    return converter;
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private isPopulateObject(populate: unknown): populate is {
    collection: string;
    as?: string;
    localRef?: string;
    foreignRef?: string;
    populate?: unknown[];
  } {
    return (
      !!populate &&
      typeof populate === 'object' &&
      typeof (populate as { collection?: unknown }).collection === 'string'
    );
  }

  private resolveColumnName(collection: string, field: string): string {
    if (!field) return field;
    const converter = this.getConverter(collection);
    if (!converter) {
      return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }
    return converter.resolveColumnName(field);
  }

  private resolveTableName(collection: string): string {
    const schema = this.schemas[collection];
    const xDb = (schema as { ['x-db']?: { tableName?: string } } | undefined)?.['x-db'];
    if (xDb?.tableName) {
      return xDb.tableName;
    }
    if (collection.includes('_resolved')) {
      return collection;
    }
    return collection.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private mapFilter(collection: string, filter?: Filter): Filter | undefined {
    if (!filter) return filter;
    const mapped: Filter = {};

    function normalizeUUID(id: unknown): string | undefined {
      if (id === null || id === undefined || id === '' || id === 'null' || id === 'undefined')
        return undefined;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(id).trim(),
      );
      return isUuid ? String(id).trim() : undefined;
    }

    Object.entries(filter).forEach(([key, value]) => {
      const columnName = this.resolveColumnName(collection, key);
      let normalizedValue = value;

      if (columnName.endsWith('_id') || columnName === 'id') {
        const uuid = normalizeUUID(value);
        normalizedValue = uuid !== undefined ? uuid : value;
      }

      mapped[columnName] = normalizedValue;
    });

    return mapped;
  }

  private mapQueryOptions(collection: string, options?: QueryOptions): QueryOptions | undefined {
    if (!options) return options;
    const mapped: QueryOptions = { ...options };

    if (options.sort) {
      mapped.sort = Object.fromEntries(
        Object.entries(options.sort).map(([key, value]) => [
          this.resolveColumnName(collection, key),
          value,
        ]),
      );
    }

    if (Array.isArray(options.projection)) {
      mapped.projection = options.projection.map((key) => this.resolveColumnName(collection, key));
    } else if (options.projection && typeof options.projection === 'object') {
      mapped.projection = Object.fromEntries(
        Object.entries(options.projection).map(([key, value]) => [
          this.resolveColumnName(collection, key),
          value,
        ]),
      );
    }

    if (Array.isArray(options.populate)) {
      mapped.populate = (options.populate as any[]).map((populate: any) => {
        if (!this.isPopulateObject(populate)) {
          throw new Error('populate shorthand is not supported.');
        }

        const result: any = {
          ...populate,
          collection: this.resolveTableName(populate.collection),
        };

        if (populate.localRef) {
          result.localRef = this.resolveColumnName(collection, populate.localRef);
        }

        if (populate.foreignRef) {
          result.foreignRef = this.resolveColumnName(populate.collection, populate.foreignRef);
        }

        if (Array.isArray((populate as { populate?: unknown[] }).populate)) {
          const nestedOptions = this.mapQueryOptions(populate.collection, {
            populate: (populate as { populate?: unknown[] }).populate as any,
          });
          result.populate = nestedOptions?.populate;
        }

        return result;
      }) as any;
    }

    return mapped;
  }

  private buildSelectLocal(options?: QueryOptions, useRelationHints = true): string {
    const buildSelect = (opts?: QueryOptions): string => {
      if (!opts?.projection && !opts?.populate) return '*';

      const rootFields: string[] = [];
      const nestedFields: Record<string, string[]> = {};
      let projectionKeys: string[] = [];

      if (opts?.projection) {
        if (Array.isArray(opts.projection)) {
          projectionKeys = opts.projection;
        } else {
          projectionKeys = Object.entries(opts.projection)
            .filter(([, value]) => !!value)
            .map(([key]) => key);
        }
      }

      if (projectionKeys.length > 0) {
        projectionKeys.forEach((field) => {
          if (field.includes('.')) {
            const [alias, ...rest] = field.split('.');
            const subField = rest.join('.');
            if (!nestedFields[alias]) nestedFields[alias] = [];
            nestedFields[alias].push(subField);
          } else if (field !== '*') {
            rootFields.push(field);
          }
        });
      }

      const selections: string[] = [];

      if (projectionKeys.length === 0 || projectionKeys.includes('*')) {
        selections.push('*');
      } else if (rootFields.length > 0) {
        selections.push([...new Set(rootFields)].join(','));
      }

      if (opts?.populate) {
        (opts.populate as unknown[]).forEach((populate) => {
          if (!this.isPopulateObject(populate)) {
            throw new Error('populate shorthand is not supported.');
          }
          const normalized = populate as {
            collection: string;
            as?: string;
            localRef?: string;
            foreignRef?: string;
            populate?: unknown[];
          };

          const alias = normalized.as || normalized.collection;
          const explicitSubFields = nestedFields[alias];

          const subOptions: QueryOptions = {};
          if (explicitSubFields) subOptions.projection = explicitSubFields;
          if (normalized.populate) subOptions.populate = normalized.populate as any;

          const subSelect =
            subOptions.projection || subOptions.populate ? buildSelect(subOptions) : '*';

          const collectionName = normalized.collection;
          const refHint = normalized.foreignRef || normalized.localRef;
          const relationSuffix = useRelationHints && refHint ? `!${refHint}` : '';

          selections.push(`${alias}:${collectionName}${relationSuffix}(${subSelect})`);
        });
      }

      return selections.join(',');
    };

    return buildSelect(options) || '*';
  }

  private isRelationSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as { code?: string; message?: string; details?: string };
    if (e.code === 'PGRST200') return true;
    const msg = `${e.message || ''} ${e.details || ''}`.toLowerCase();
    return msg.includes('relationship') && msg.includes('schema cache');
  }

  private applyFilterLocal(query: any, filter: Record<string, unknown>, collection?: string): any {
    if (filter.$or && Array.isArray(filter.$or)) {
      const orParts = filter.$or
        .map((part) => {
          const entries = Object.entries(part as Record<string, unknown>);
          if (entries.length === 0) return '';
          const [key, value] = entries[0];
          const columnName = collection ? this.resolveColumnName(collection, key) : key;

          if (typeof value === 'object' && value !== null) {
            const [op, opValue] = Object.entries(value)[0];
            switch (op) {
              case '$gt':
                return `${columnName}.gt.${opValue}`;
              case '$lt':
                return `${columnName}.lt.${opValue}`;
              case '$gte':
                return `${columnName}.gte.${opValue}`;
              case '$lte':
                return `${columnName}.lte.${opValue}`;
              case '$ilike':
                return `${columnName}.ilike.${opValue}`;
              case '$like':
                return `${columnName}.like.${opValue}`;
              case '$eq':
                return `${columnName}.eq.${opValue}`;
              case '$neq':
                return `${columnName}.neq.${opValue}`;
              default:
                return `${columnName}.eq.${opValue}`;
            }
          }
          return `${columnName}.eq.${value}`;
        })
        .filter((p) => !!p);

      if (orParts.length > 0) {
        query = query.or(orParts.join(','));
      }

      const remainingFilter = { ...filter };
      delete remainingFilter.$or;
      return this.applyFilterLocal(query, remainingFilter, collection);
    }

    Object.entries(filter).forEach(([key, value]) => {
      if (value === null) {
        query = query.is(key, null);
        return;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([op, opValue]) => {
          switch (op) {
            case '$gt':
              query = query.gt(key, opValue);
              break;
            case '$lt':
              query = query.lt(key, opValue);
              break;
            case '$gte':
              query = query.gte(key, opValue);
              break;
            case '$lte':
              query = query.lte(key, opValue);
              break;
            case '$eq':
              query = opValue === null ? query.is(key, null) : query.eq(key, opValue);
              break;
            case '$ne':
            case '$neq':
              query = opValue === null ? query.not(key, 'is', null) : query.neq(key, opValue);
              break;
            case '$in':
              query = query.in(key, Array.isArray(opValue) ? opValue : []);
              break;
            case '$nin':
              query = query.not(
                key,
                'in',
                `(${(Array.isArray(opValue) ? opValue : []).map((v) => (typeof v === 'string' ? `"${v}"` : v)).join(',')})`,
              );
              break;
            case '$regex':
            case '$ilike':
              query = query.ilike(key, opValue);
              break;
            case '$like':
              query = query.like(key, opValue);
              break;
            case '$contains':
              query = query.contains(key, opValue);
              break;
            default:
              console.warn(`Unsupported operator ${op} for key ${key}`);
          }
        });
        return;
      }

      query = query.eq(key, value);
    });

    return query;
  }

  private fromDb<T>(collection: string, data: T, options?: QueryOptions): T {
    const converter = this.getConverter(collection);
    let result = data;
    if (converter) {
      result = converter.fromDB(data) as T;
    }

    if (result && typeof result === 'object' && options?.populate) {
      const populated = result as Record<string, unknown>;
      (options.populate as unknown[]).forEach((populate) => {
        const norm = populate as {
          collection: string;
          as?: string;
          populate?: unknown[];
        };
        const key = norm.as || norm.collection;
        if (populated[key]) {
          if (Array.isArray(populated[key])) {
            populated[key] = this.fromDbList(norm.collection, populated[key], {
              populate: norm.populate as any,
            });
          } else {
            populated[key] = this.fromDb(norm.collection, populated[key], {
              populate: norm.populate as any,
            });
          }
        }
      });
    }
    return result;
  }

  private fromDbList<T>(collection: string, data: T[], options?: QueryOptions): T[] {
    return data.map((item) => this.fromDb(collection, item, options));
  }

  private toDb(collection: string, data: Record<string, unknown>): Record<string, unknown> {
    const converter = this.getConverter(collection);
    if (!converter) return data;
    return converter.toDB(data);
  }

  private injectEdiMetadata(
    collection: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!this.ediMetadataInjector) return data;
    const ediFields = this.ediMetadataInjector(collection);
    if (!ediFields) return data;
    return { ...ediFields, ...data };
  }

  // ---------------------------------------------------------------------------
  // Overridden CRUD Methods
  // ---------------------------------------------------------------------------

  /**
   *
   */
  override async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    const mappedFilter = this.mapFilter(collection, filter);
    const mappedOptions = this.mapQueryOptions(collection, options);
    const tableName = this.resolveTableName(collection);
    const selectWithHints = this.buildSelectLocal(mappedOptions, true);
    const selectWithoutHints = this.buildSelectLocal(mappedOptions, false);

    // Override built-in select for SQL relations resolution
    let query = (this.client as any).from(tableName).select(selectWithHints);

    if (mappedFilter) {
      query = this.applyFilterLocal(query, mappedFilter, collection);
    }

    if (mappedOptions?.sort) {
      Object.entries(mappedOptions.sort).forEach(([key, value]) => {
        if (key.includes('.')) return;
        query = query.order(key, { ascending: value === 1 });
      });
    }

    if (mappedOptions?.limit) {
      query = query.limit(mappedOptions.limit);
    }

    if (mappedOptions?.skip) {
      query = query.range(mappedOptions.skip, mappedOptions.skip + (mappedOptions.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (!error) {
      return this.fromDbList<T>(collection, data, options);
    }
    if (!this.isRelationSchemaError(error)) throw error;

    // Retry without schema hints
    let retry = (this.client as any).from(tableName).select(selectWithoutHints);
    if (mappedFilter) {
      retry = this.applyFilterLocal(retry, mappedFilter, collection);
    }
    const retryResult = await retry;
    if (retryResult.error) throw retryResult.error;
    return this.fromDbList<T>(collection, retryResult.data, options);
  }

  /**
   *
   */
  override async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T | null> {
    const mappedOptions = this.mapQueryOptions(collection, options);
    const tableName = this.resolveTableName(collection);
    const selectWithHints = this.buildSelectLocal(mappedOptions, true);
    const selectWithoutHints = this.buildSelectLocal(mappedOptions, false);

    const query = (this.client as any)
      .from(tableName)
      .select(selectWithHints)
      .eq(this.resolveColumnName(collection, 'id'), id)
      .limit(1);

    const { data, error } = await query;
    if (!error) {
      if (!data || data.length === 0) return null;
      return this.fromDb<T>(collection, data[0], options);
    }
    if (!this.isRelationSchemaError(error)) throw error;

    // Retry without hints
    const retry = (this.client as any)
      .from(tableName)
      .select(selectWithoutHints)
      .eq(this.resolveColumnName(collection, 'id'), id)
      .limit(1);
    const retryResult = await retry;
    if (retryResult.error) throw retryResult.error;
    if (!retryResult.data || retryResult.data.length === 0) return null;
    return this.fromDb<T>(collection, retryResult.data[0], options);
  }

  /**
   *
   */
  override async create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    const withEdi = this.injectEdiMetadata(collection, data);
    const payload = this.toDb(collection, withEdi);
    const tableName = this.resolveTableName(collection);

    const { data: created, error } = await (this.client as any)
      .from(tableName)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return this.fromDb<T>(collection, created, options);
  }

  /**
   *
   */
  override async update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    const withEdi = this.injectEdiMetadata(collection, data);
    const payload = this.toDb(collection, withEdi);
    const tableName = this.resolveTableName(collection);

    const { data: updated, error } = await (this.client as any)
      .from(tableName)
      .update(payload)
      .eq(this.resolveColumnName(collection, 'id'), id)
      .select()
      .single();
    if (error) throw error;
    return this.fromDb<T>(collection, updated, options);
  }

  /**
   *
   */
  override async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    const payload = this.toDb(collection, data);
    const tableName = this.resolveTableName(collection);

    const { data: replaced, error } = await (this.client as any)
      .from(tableName)
      .update(payload)
      .eq(this.resolveColumnName(collection, 'id'), id)
      .select()
      .single();
    if (error) throw error;
    return this.fromDb<T>(collection, replaced, options);
  }

  /**
   *
   */
  override async delete<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T> {
    const tableName = this.resolveTableName(collection);

    const { data: deleted, error } = await (this.client as any)
      .from(tableName)
      .delete()
      .eq(this.resolveColumnName(collection, 'id'), id)
      .select()
      .single();
    if (error) throw error;
    return this.fromDb<T>(collection, deleted, options);
  }

  /**
   *
   */
  override async count(
    collection: string,
    filter?: Filter,
    _options?: QueryOptions,
  ): Promise<number> {
    const mappedFilter = this.mapFilter(collection, filter);
    // const _mappedOptions = this.mapQueryOptions(collection, options);
    const tableName = this.resolveTableName(collection);

    let query = (this.client as any).from(tableName).select('*', { count: 'exact', head: true });

    if (mappedFilter) {
      query = this.applyFilterLocal(query, mappedFilter, collection);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  /**
   *
   */
  override async createMany<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    options?: QueryOptions,
  ): Promise<T[]> {
    const payload = data.map((item) => this.toDb(collection, item));
    const tableName = this.resolveTableName(collection);

    const { data: created, error } = await (this.client as any)
      .from(tableName)
      .insert(payload)
      .select();
    if (error) throw error;
    return this.fromDbList<T>(collection, created, options);
  }

  /**
   *
   */
  override async updateMany<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]> {
    const mappedFilter = this.mapFilter(collection, filter);
    const payload = this.toDb(collection, data);
    const tableName = this.resolveTableName(collection);

    let query = (this.client as any).from(tableName).update(payload);

    if (mappedFilter) {
      query = this.applyFilterLocal(query, mappedFilter, collection);
    }

    const { data: updated, error } = await query.select();
    if (error) throw error;
    return this.fromDbList<T>(collection, updated, options);
  }

  /**
   *
   */
  override async deleteMany<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    const mappedFilter = this.mapFilter(collection, filter);
    const tableName = this.resolveTableName(collection);

    let query = (this.client as any).from(tableName).delete();

    if (mappedFilter) {
      query = this.applyFilterLocal(query, mappedFilter, collection);
    }

    const { data: deleted, error } = await query.select();
    if (error) throw error;
    return this.fromDbList<T>(collection, deleted, options);
  }
}
