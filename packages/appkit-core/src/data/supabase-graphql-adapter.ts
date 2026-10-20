import { validateFilter, comparisonOperators } from './internal/query-safety';
import type { FetchLike } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DataAccessAdapter, Filter, QueryOptions } from './types';

type GraphQLError = Record<string, unknown>;
type GraphQLResponse<T> = { data: T; errors?: GraphQLError[] };
interface FieldTree {
  [key: string]: FieldTree | true;
}

/**
 * Provides partial read support for Supabase pg_graphql. Only find and count execute GraphQL; findOne always resolves null, and mutations reject as unimplemented. The host must enable pg_graphql and supply a compatible schema, session and authorization policy.
 * @remarks Queries assume camel-cased collection names ending in Collection. There is no schema introspection, automatic pagination, cancellation or HTTP status validation. JSON GraphQL errors reject; other response shape errors may surface during result access.
 * @example
 * ```ts
 * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
 * import type { SupabaseClient } from '@supabase/supabase-js';
 * export function graphqlAdapter(client: SupabaseClient, url: string, publicKey: string) {
 *   return new SupabaseGraphQLAdapter(client, { supabaseUrl: url, supabaseKey: publicKey });
 * }
 * ```
 */
export class SupabaseGraphQLAdapter implements DataAccessAdapter {
  private client: SupabaseClient;
  private graphqlUrl: string;
  private apiKey: string;
  private fetchFn: FetchLike;

  /**
   * Configures the GraphQL endpoint and transport without making a request.
   * @param client - Host Supabase client used to obtain a session before each request.
   * @param config - Optional URL/key overrides and fetch; missing URL/key fall back to client metadata, and fetch defaults to bound global fetch. Session access_token is used when truthy, otherwise the configured key becomes the bearer token.
   * @throws An error when URL or key cannot be resolved.
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * import type { SupabaseClient } from '@supabase/supabase-js';
   * export function graphqlAdapter(client: SupabaseClient, url: string, publicKey: string) {
   *   return new SupabaseGraphQLAdapter(client, { supabaseUrl: url, supabaseKey: publicKey });
   * }
   * ```
   */
  constructor(client: SupabaseClient, config?: {
    /**
     * Base project URL; truthy override takes precedence over client metadata. The adapter appends /graphql/v1 without trimming slashes.
     */
    supabaseUrl?: string;
    /**
     * API key used for apikey and bearer fallback when no session access token exists. Use credentials appropriate to the runtime and its authorization boundary.
     */
    supabaseKey?: string;
    /**
     * Optional host transport, defaulting to bound global fetch. QueryOptions.signal is not forwarded.
     */
    fetch?: FetchLike }) {
    this.client = client;
    this.fetchFn = config?.fetch ?? globalThis.fetch.bind(globalThis);

    // standard is https://<project-ref>.supabase.co/graphql/v1
    // Try to get from config, then client internal props
    const clientMeta = client as unknown as Record<string, unknown>;
    const supabaseUrl = config?.supabaseUrl || (clientMeta.supabaseUrl as string | undefined);
    const supabaseKey = config?.supabaseKey || (clientMeta.supabaseKey as string | undefined);

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SupabaseGraphQLAdapter: URL and Key must be provided either via config or be accessible on the client instance.',
      );
    }

    this.graphqlUrl = `${supabaseUrl}/graphql/v1`;
    this.apiKey = supabaseKey;
  }

  private async request<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    const {
      data: { session },
    } = await this.client.auth.getSession();
    const token = session?.access_token || this.apiKey;

    const response = await this.fetchFn(this.graphqlUrl, {
      method: 'POST',
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = (await response.json()) as GraphQLResponse<T>;
    if (result.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
    }
    return result;
  }

  // --- Translation Helpers ---

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  private buildSelection(options?: QueryOptions): string {
    // If no projection/populate, specific fallback is hard without schema introspection.
    // We will default to "id" and warn.
    if (!options?.projection && !options?.populate) {
      console.warn("SupabaseGraphQLAdapter: No projection/populate specified. Defaulting to 'id'.");
      return 'id';
    }

    const fieldsTree: FieldTree = {};

    // 1. Handle Projection
    if (options?.projection) {
      let projKeys: string[];
      if (Array.isArray(options.projection)) {
        projKeys = options.projection;
      } else {
        projKeys = Object.entries(options.projection)
          .filter(([, v]) => !!v)
          .map(([k]) => k);
      }

      projKeys.forEach((key) => {
        // Convert dot notation to nested/camelCase
        // user.name -> user { name }
        // user_id -> userId
        const parts = key.split('.');
        let current = fieldsTree;
        parts.forEach((part, index) => {
          const camelPart = this.toCamelCase(part);
          if (index === parts.length - 1) {
            current[camelPart] = true; // Leaf
          } else {
            if (current[camelPart] === true || !current[camelPart]) {
              current[camelPart] = {};
            }
            current = current[camelPart] as FieldTree;
          }
        });
      });
    }

    // 2. Handle Populate
    // populate: [{ field: 'user_id', as: 'user' }]
    // GQL: user { ... }
    if (options?.populate) {
      options.populate.forEach((p) => {
        // In pg_graphql, relations are usually named by the foreign table or a name derived from FK.
        // If FK is `user_id`, relation might be `user` (if `user_id` refs `users`).
        // Or `users`?
        // Depending on `as` alias usage in MongoAdapter vs Supabase.
        // Supabase REST: `user:users!user_id(...)`.
        // GQL: `userByUserId { ... }` or just `user`?
        // By default pg_graphql uses `tableNameByFkColumn` logic if ambiguous, or `tableName` if simple.
        // We will rely on `p.as` (user provided alias) assuming it matches the GQL relation name,
        // OR we fallback to `p.collection` camelCased.
        // The user might need to adjust `as` to match GQL schema relation name.

        const relationName = p.as ? this.toCamelCase(p.as) : this.toCamelCase(p.collection);

        if (!fieldsTree[relationName]) {
          fieldsTree[relationName] = {};
        }

        // If we have specific fields for this relation from projection, they are already in fieldsTree[relationName].
        // If empty object (no projection for relation), we probably need default fields or *?
        // GQL requires sub-selection. Return 'id' if empty?
        if (Object.keys(fieldsTree[relationName]).length === 0) {
          // Default to id if nothing specified
          fieldsTree[relationName] = { id: true };
        }
      });
    }

    // 3. Convert Tree to String
    const stringifyTree = (node: FieldTree | true): string => {
      if (node === true) return ''; // leaf scalar, but leaves are keys in parent map.
      return Object.keys(node)
        .map((key) => {
          const val = node[key];
          if (val === true) return key; // Scalar
          return `${key} { ${stringifyTree(val)} }`; // Object/Relation
        })
        .join(' ');
    };

    return stringifyTree(fieldsTree);
  }

  private buildFilter(filter?: Filter): string {
    validateFilter(filter, comparisonOperators.filter(op => op !== '$nin'), []);
    if (!filter || Object.keys(filter).length === 0) return '';

    // Mongo Filter: { "age": { "$gt": 20 }, "user.name": "Taro" }
    // GQL Filter: { age: { gt: 20 }, user: { name: { eq: "Taro" } } }

    const filterTree: Record<string, unknown> = {};

    Object.entries(filter).forEach(([key, value]) => {
      const parts = key.split('.');
      let current = filterTree;

      // Navigate/Build structure
      parts.forEach((part, index) => {
        const camelPart = this.toCamelCase(part);
        if (index === parts.length - 1) {
          // Leaf: Handle Operators
          current[camelPart] = this.translateOperators(value);
        } else {
          if (current[camelPart] === true || !current[camelPart]) {
            current[camelPart] = {};
          }
          current = current[camelPart] as Record<string, unknown>;
        }
      });
    });

    // Convert key:value to GQL string argument format (no quotes on keys)
    // JSON.stringify quotes keys: {"age":...} -> age: ...
    // We can use a regex to strip quotes from keys.
    const serialize = (value: unknown, key = ''): string => {
      if (key === 'is' && (value === 'NULL' || value === 'NOT_NULL')) return value;
      if (Array.isArray(value)) return '[' + value.map(v => serialize(v)).join(',') + ']';
      if (value && typeof value === 'object') return '{' + Object.entries(value).map(([k,v]) => {
        if (!/^[_A-Za-z][_0-9A-Za-z]*$/.test(k)) throw new Error('Invalid GraphQL filter field');
        return k + ':' + serialize(v,k);
      }).join(',') + '}';
      return JSON.stringify(value);
    };
    return serialize(filterTree);
  }

  private translateOperators(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return value === null ? { is: 'NULL' } : { eq: value };
    }

    const gqlOp: Record<string, unknown> = {};
    let hasOperator = false;
    Object.entries(value as Record<string, unknown>).forEach(([op, val]) => {
      switch (op) {
        case '$eq':
          if (val === null) gqlOp.is = 'NULL'; else gqlOp.eq = val;
          hasOperator = true;
          break;
        case '$ne':
          if (val === null) gqlOp.is = 'NOT_NULL'; else gqlOp.neq = val;
          hasOperator = true;
          break;
        case '$neq':
          if (val === null) gqlOp.is = 'NOT_NULL'; else gqlOp.neq = val;
          hasOperator = true;
          break;
        case '$gt':
          gqlOp.gt = val;
          hasOperator = true;
          break;
        case '$gte':
          gqlOp.gte = val;
          hasOperator = true;
          break;
        case '$lt':
          gqlOp.lt = val;
          hasOperator = true;
          break;
        case '$lte':
          gqlOp.lte = val;
          hasOperator = true;
          break;
        case '$in':
          gqlOp.in = val;
          hasOperator = true;
          break;
        case '$regex':
          gqlOp.regex = val;
          hasOperator = true;
          break; // regex to ilike approximation
        // Add more operators as needed
        default:
          // If it's not a recognized operator, treat it as a direct value for 'eq'
          // This handles cases like { "field": "value" } directly
          // But if it's { "field": { "nested": "value" } }, this might be wrong.
          // For now, assume if it's an object but not an operator, it's a direct value.
          // This might need refinement for complex nested filters without explicit operators.
          break;
      }
    });
    // If no recognized operator was found, treat the entire value as an equality check.
    if (!hasOperator && Object.keys(value as Record<string, unknown>).length > 0) {
      return value === null ? { is: 'NULL' } : { eq: value };
    }
    return gqlOp;
  }

  /**
   * Queries one connection page using generated selection/filter text.
   * @typeParam T - Expected node shape; defaults to unknown and is not validated.
   * @param collection - Schema-compatible collection name converted from snake_case to camelCase, then suffixed with Collection.
   * @param filter - Supported comparisons without logical operators or $nin. Dotted keys become nested fields; unsupported operators reject.
   * @param options - Projection/populate shape for selection. With neither, only id is selected and a warning is logged. Relation names must match the schema; sort, limit, skip and signal are ignored.
   * @returns Connection edge nodes, or [] when edges is absent. No later pages are fetched and empty projections can produce invalid GraphQL selections.
   * @throws Rejects on filter validation, transport/session/JSON failure, GraphQL errors or incompatible response shape. Collection/selection names must be trusted schema identifiers.
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function taskTitles(adapter: SupabaseGraphQLAdapter) {
   *   return adapter.find<{ id: string; title: string }>('tasks', { status: 'open' }, { projection: ['id', 'title'] });
   * }
   * ```
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    // collection: 'users' -> 'usersCollection' (default pg_graphql naming often pluralizes? or matches table?)
    // If table is `users`, GQL connection is `usersCollection`.
    // We usually need CamelCase. `users` -> `usersCollection`. `order_items` -> `orderItemsCollection`.
    const camelCollection = this.toCamelCase(collection);
    const queryName = `${camelCollection}Collection`;

    const selection = this.buildSelection(options);
    const filterStr = this.buildFilter(filter);

    const query = `
            query {
                ${queryName}${filterStr ? `(filter: ${filterStr})` : ''} {
                    edges {
                        node {
                            ${selection}
                        }
                    }
                }
            }
        `;



    const result = await this.request<Record<string, { edges?: Array<{ node: T }> }>>(query);
    // Result structure: data: { usersCollection: { edges: [...] } }
    // We assume safe access or catch
    const edges = result.data[queryName]?.edges;
    if (!edges) return [];
    return edges.map((e) => e.node) as T[];
  }

  // ... Stubs for other methods ...
  /**
   * Unimplemented lookup stub that performs no request.
   * @typeParam T - Reserved expected record shape; no record is fetched.
   * @param _collection - Ignored.
   * @param _id - Ignored.
   * @param _options - Ignored.
   * @returns Always resolves null, regardless of whether the record exists.
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function lookupStub(adapter: SupabaseGraphQLAdapter) {
   *   return adapter.findOne('tasks', 'task-1'); // Always null; use a supported adapter for lookup.
   * }
   * ```
   */
  async findOne<T = unknown>(
    _collection: string,
    _id: string,
    _options?: QueryOptions,
  ): Promise<T | null> {
    return null;
  }
  /**
   * Unimplemented mutation stub that performs no request or write.
   * @typeParam T - Reserved result shape; this stub never resolves with a value.
   * @param _collection - Ignored.
   * @param _data - Ignored.
   * @param _options - Ignored.
   * @returns A promise that always rejects.
   * @throws Always rejects with Error("Not impl").
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function unsupportedWrite(adapter: SupabaseGraphQLAdapter) {
   *   try {
   *     await adapter.create('tasks', { title: 'Draft' });
   *   } catch (error) {
   *     // Expected for this unimplemented operation; select a supported write adapter.
   *     return error;
   *   }
   * }
   * ```
   */
  async create<T = unknown>(
    _collection: string,
    _data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    throw new Error('Not impl');
  }
  /**
   * Unimplemented mutation stub that performs no request or write.
   * @typeParam T - Reserved result shape; this stub never resolves with a value.
   * @param _collection - Ignored.
   * @param _id - Ignored.
   * @param _data - Ignored.
   * @param _options - Ignored.
   * @returns A promise that always rejects.
   * @throws Always rejects with Error("Not impl").
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function unsupportedWrite(adapter: SupabaseGraphQLAdapter) {
   *   try {
   *     await adapter.update('tasks', 'task-1', { title: 'Draft' });
   *   } catch (error) {
   *     // Expected for this unimplemented operation; select a supported write adapter.
   *     return error;
   *   }
   * }
   * ```
   */
  async update<T = unknown>(
    _collection: string,
    _id: string,
    _data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    throw new Error('Not impl');
  }
  /**
   * Unimplemented mutation stub that performs no request or write.
   * @typeParam T - Reserved result shape; this stub never resolves with a value.
   * @param _collection - Ignored.
   * @param _id - Ignored.
   * @param _data - Ignored.
   * @param _options - Ignored.
   * @returns A promise that always rejects.
   * @throws Always rejects with Error("Not impl").
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function unsupportedWrite(adapter: SupabaseGraphQLAdapter) {
   *   try {
   *     await adapter.replace?.('tasks', 'task-1', { title: 'Draft' });
   *   } catch (error) {
   *     // Expected for this unimplemented operation; select a supported write adapter.
   *     return error;
   *   }
   * }
   * ```
   */
  async replace?<T = unknown>(
    _collection: string,
    _id: string,
    _data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    throw new Error('Not impl');
  }
  /**
   * Unimplemented mutation stub that performs no request or write.
   * @typeParam T - Reserved result shape; this stub never resolves with a value.
   * @param _collection - Ignored.
   * @param _id - Ignored.
   * @param _options - Ignored.
   * @returns A promise that always rejects.
   * @throws Always rejects with Error("Not impl").
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function unsupportedWrite(adapter: SupabaseGraphQLAdapter) {
   *   try {
   *     await adapter.delete('tasks', 'task-1');
   *   } catch (error) {
   *     // Expected for this unimplemented operation; select a supported write adapter.
   *     return error;
   *   }
   * }
   * ```
   */
  async delete<T = unknown>(_collection: string, _id: string, _options?: QueryOptions): Promise<T> {
    throw new Error('Not impl');
  }

  /**
   * Queries the connection totalCount field for a supported filter.
   * @param collection - Schema-compatible collection name converted to camelCase and suffixed with Collection.
   * @param filter - Supported comparison filter; no logical operators or $nin.
   * @param _options - Ignored, including signal.
   * @returns totalCount or zero when absent/falsy; the field must be exposed by the host schema and is not runtime-validated.
   * @throws Rejects on filter validation, transport/session/JSON failure, GraphQL errors or incompatible response shape.
   * @example
   * ```ts
   * import { SupabaseGraphQLAdapter } from '@alneas/appkit-core/data/supabase-graphql';
   * export async function openTaskCount(adapter: SupabaseGraphQLAdapter) {
   *   return adapter.count('tasks', { status: 'open' });
   * }
   * ```
   */
  async count(collection: string, filter?: Filter, _options?: QueryOptions): Promise<number> {
    const camelCollection = this.toCamelCase(collection);
    const queryName = `${camelCollection}Collection`;
    const filterStr = this.buildFilter(filter);

    // Using totalCount from pg_graphql connection
    const query = `
           query {
               ${queryName}${filterStr ? `(filter: ${filterStr})` : ''} {
                   totalCount
               }
           }
       `;
    const result = await this.request<Record<string, { totalCount?: number }>>(query);
    return result.data[queryName]?.totalCount || 0;
  }
}
