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
 * DataAccessAdapter implementation for Supabase GraphQL API using pg_graphql extension.
 */
export class SupabaseGraphQLAdapter implements DataAccessAdapter {
  private client: SupabaseClient;
  private graphqlUrl: string;
  private apiKey: string;
  private fetchFn: FetchLike;

  /**
   * Creates a new instance of SupabaseGraphQLAdapter.
   * @param client SupabaseClient instance
   * @param config Configuration object for explicitly specifying URL or API key
   */
  constructor(client: SupabaseClient, config?: { supabaseUrl?: string; supabaseKey?: string; fetch?: FetchLike }) {
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
   * Retrieves a list of documents matching the criteria using a GraphQL query.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param options Query options
   * @returns Array of retrieved documents
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
   * Retrieves the document corresponding to the specified ID (not implemented).
   * @param _collection Collection name
   * @param _id Document ID
   * @param _options Query options
   * @returns Retrieved document, or null
   */
  async findOne<T = unknown>(
    _collection: string,
    _id: string,
    _options?: QueryOptions,
  ): Promise<T | null> {
    return null;
  }
  /**
   * Creates a document (not implemented).
   * @param _collection Collection name
   * @param _data Data to create
   * @param _options Query options
   * @returns Created document
   */
  async create<T = unknown>(
    _collection: string,
    _data: Record<string, unknown>,
    _options?: QueryOptions,
  ): Promise<T> {
    throw new Error('Not impl');
  }
  /**
   * Updates a document (not implemented).
   * @param _collection Collection name
   * @param _id Document ID to update
   * @param _data Update data
   * @param _options Query options
   * @returns Updated document
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
   * Replaces a document (not implemented).
   * @param _collection Collection name
   * @param _id Document ID to replace
   * @param _data Replacement data
   * @param _options Query options
   * @returns Replaced document
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
   * Deletes a document (not implemented).
   * @param _collection Collection name
   * @param _id Document ID to delete
   * @param _options Query options
   * @returns Deleted document
   */
  async delete<T = unknown>(_collection: string, _id: string, _options?: QueryOptions): Promise<T> {
    throw new Error('Not impl');
  }

  /**
   * Retrieves the total count of documents matching the criteria.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param _options Query options
   * @returns Number of matching documents
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
