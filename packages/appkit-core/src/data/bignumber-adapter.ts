import type { DataAccessAdapter, Filter, OperationResult, QueryOptions } from './types';

export type DecimalDecodeMode = 'bignumber' | 'string';
/** BigNumber.js rounding modes: 0 (away from zero) through 8 (half floor). */
export type DecimalRoundingMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BigNumberLike {
  decimalPlaces: (decimalPlaces: number, roundingMode?: DecimalRoundingMode) => BigNumberLike;
  isFinite: () => boolean;
  toFixed: (decimalPlaces?: number) => string;
}

export interface BigNumberConstructorLike {
  /** Existing instances pass through isBigNumber; only strings/numbers are constructed. */
  new (value: string | number): BigNumberLike;
  isBigNumber: (value: unknown) => value is BigNumberLike;
  ROUND_HALF_UP?: DecimalRoundingMode;
}

export interface DecimalFieldConfig {
  /**
   * Decimal scale for DB serialization.
   * If set, values are rounded and zero-padded via `toFixed(scale)`.
   */
  scale?: number;
  /**
   * Rounding mode for serialization. Defaults to `BigNumber.ROUND_HALF_UP`.
   */
  roundingMode?: DecimalRoundingMode;
  /**
   * Decoded representation for read-side values.
   * Defaults to adapter-level `decodeMode`.
   */
  decodeMode?: DecimalDecodeMode;
}

export interface BigNumberDataAccessAdapterConfig {
  /**
   * Wrapped adapter (Supabase/Mongo/Convex/Oracle ORDS etc.)
   */
  base: DataAccessAdapter;
  /**
   * BigNumber constructor from `bignumber.js`.
   */
  BigNumber: BigNumberConstructorLike;
  /**
   * Decimal field rules by dot path.
   *
   * Examples:
   * - `amount`
   * - `price.net_amount`
   * - `lines[].unit_price` (array wildcard)
   */
  fields: Record<string, DecimalFieldConfig>;
  /**
   * Default decode mode for read-side conversion.
   * @default 'bignumber'
   */
  decodeMode?: DecimalDecodeMode;
  /**
   * Default rounding mode for DB serialization.
   * @default BigNumber.ROUND_HALF_UP
   */
  roundingMode?: DecimalRoundingMode;
  /**
   * When true, invalid decimal inputs throw errors.
   * @default true
   */
  strict?: boolean;
}

type CompiledFieldConfig = DecimalFieldConfig & {
  path: string;
  tokens: string[];
};

function isPlainObject(
  value: unknown,
  isBigNumber: ((v: unknown) => boolean) | null = null,
): value is Record<string, unknown> {
  const isBigNumberValue = isBigNumber ? isBigNumber(value) : false;
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isBigNumberValue;
}

function normalizePathToTokens(path: string): string[] {
  const parts = path.split('.');
  const tokens: string[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part === '[]' || part === '[*]' || part === '*') {
      tokens.push('*');
      continue;
    }

    if (part.endsWith('[]')) {
      const base = part.slice(0, -2);
      if (base) tokens.push(base);
      tokens.push('*');
      continue;
    }

    if (part.endsWith('[*]')) {
      const base = part.slice(0, -3);
      if (base) tokens.push(base);
      tokens.push('*');
      continue;
    }

    tokens.push(part);
  }

  return tokens;
}

function matchesPath(configTokens: string[], targetTokens: string[]): boolean {
  if (configTokens.length !== targetTokens.length) return false;
  for (let i = 0; i < configTokens.length; i += 1) {
    if (configTokens[i] !== '*' && configTokens[i] !== targetTokens[i]) {
      return false;
    }
  }
  return true;
}

/**
 * DataAccessAdapter wrapper for exact decimal handling with BigNumber.js.
 *
 * This adapter converts configured decimal fields:
 * - write side: `BigNumber | string | number` -> DB-safe decimal string
 * - read side: DB value -> `BigNumber` (default) or string
 *
 * Use this when the DB stores values as DECIMAL/NUMERIC(precision, scale).
 */
export class BigNumberDataAccessAdapter implements DataAccessAdapter {
  private readonly BigNumber: BigNumberConstructorLike;
  private readonly base: DataAccessAdapter;
  private readonly decodeMode: DecimalDecodeMode;
  private readonly roundingMode: DecimalRoundingMode;
  private readonly strict: boolean;
  private readonly fields: CompiledFieldConfig[];

  /**
   * Creates a new instance of BigNumberDataAccessAdapter.
   * @param config Adapter configuration
   */
  constructor(config: BigNumberDataAccessAdapterConfig) {
    this.BigNumber = config.BigNumber;
    this.base = config.base;
    this.decodeMode = config.decodeMode ?? 'bignumber';
    this.roundingMode = config.roundingMode ?? config.BigNumber.ROUND_HALF_UP ?? 4;
    this.strict = config.strict ?? true;
    this.fields = Object.entries(config.fields).map(([path, field]) => ({
      ...field,
      path,
      tokens: normalizePathToTokens(path),
    }));
  }

  private findField(pathTokens: string[]): CompiledFieldConfig | null {
    for (const field of this.fields) {
      if (matchesPath(field.tokens, pathTokens)) return field;
    }
    return null;
  }

  private toBigNumber(value: unknown, path: string): BigNumberLike | null {
    if (this.BigNumber.isBigNumber(value)) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const bn = new this.BigNumber(value);
      if (bn.isFinite()) return bn;
    }
    if (this.strict) {
      throw new Error(`BigNumberDataAccessAdapter: invalid decimal value at "${path}"`);
    }
    return null;
  }

  private encodeDecimal(value: unknown, field: CompiledFieldConfig): unknown {
    if (value === null || value === undefined) return value;

    const bn = this.toBigNumber(value, field.path);
    if (!bn) return value;

    if (field.scale !== undefined) {
      const roundingMode = field.roundingMode ?? this.roundingMode;
      return bn.decimalPlaces(field.scale, roundingMode).toFixed(field.scale);
    }
    return bn.toFixed();
  }

  private decodeDecimal(value: unknown, field: CompiledFieldConfig): unknown {
    if (value === null || value === undefined) return value;

    const bn = this.toBigNumber(value, field.path);
    if (!bn) return value;

    const mode = field.decodeMode ?? this.decodeMode;
    if (mode === 'string') {
      if (field.scale !== undefined) {
        return bn.toFixed(field.scale);
      }
      return bn.toFixed();
    }
    return bn;
  }

  /**
   * Encodes literal values inside expression objects for a decimal field.
   * Field references like `"$amount"` are kept as-is.
   */
  private encodeExpressionValue(value: unknown, field: CompiledFieldConfig): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.encodeExpressionValue(v, field));
    }

    if (isPlainObject(value, this.BigNumber.isBigNumber)) {
      const transformed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        transformed[k] = this.encodeExpressionValue(v, field);
      }
      return transformed;
    }

    if (typeof value === 'string' && value.startsWith('$')) {
      return value;
    }

    try {
      return this.encodeDecimal(value, field);
    } catch {
      // Keep non-numeric literals untouched inside expressions.
      return value;
    }
  }

  private transformOperators(
    value: unknown,
    field: CompiledFieldConfig,
    mode: 'encode' | 'decode',
  ): unknown {
    if (!isPlainObject(value, this.BigNumber.isBigNumber)) {
      return mode === 'encode'
        ? this.encodeDecimal(value, field)
        : this.decodeDecimal(value, field);
    }

    const transformed: Record<string, unknown> = {};
    for (const [op, opVal] of Object.entries(value)) {
      if (op === '$in' || op === '$nin') {
        transformed[op] = Array.isArray(opVal)
          ? opVal.map((v) =>
              mode === 'encode' ? this.encodeDecimal(v, field) : this.decodeDecimal(v, field),
            )
          : opVal;
        continue;
      }
      transformed[op] =
        mode === 'encode' ? this.encodeDecimal(opVal, field) : this.decodeDecimal(opVal, field);
    }
    return transformed;
  }

  private transformByPaths(
    value: unknown,
    pathTokens: string[],
    mode: 'encode' | 'decode',
  ): unknown {
    const field = this.findField(pathTokens);
    if (field) {
      if (mode === 'encode') {
        if (
          isPlainObject(value, this.BigNumber.isBigNumber) &&
          Object.keys(value).some((k) => k.startsWith('$'))
        ) {
          return this.encodeExpressionValue(value, field);
        }
        return this.encodeDecimal(value, field);
      }
      return this.decodeDecimal(value, field);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transformByPaths(item, [...pathTokens, '*'], mode));
    }

    if (!isPlainObject(value, this.BigNumber.isBigNumber)) return value;

    const transformed: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('$') && isPlainObject(child, this.BigNumber.isBigNumber)) {
        transformed[key] = this.transformByPaths(child, pathTokens, mode);
        continue;
      }

      if (key.includes('.')) {
        const dottedTokens = [...pathTokens, ...normalizePathToTokens(key)];
        const dottedField = this.findField(dottedTokens);
        if (dottedField) {
          transformed[key] =
            mode === 'encode'
              ? this.encodeDecimal(child, dottedField)
              : this.decodeDecimal(child, dottedField);
          continue;
        }
      }

      transformed[key] = this.transformByPaths(child, [...pathTokens, key], mode);
    }

    return transformed;
  }

  private encodeData(data: Record<string, unknown>): Record<string, unknown> {
    return this.transformByPaths(data, [], 'encode') as Record<string, unknown>;
  }

  private decodeData<T>(data: T): T {
    return this.transformByPaths(data, [], 'decode') as T;
  }

  private encodeFilter(filter?: Filter): Filter | undefined {
    if (!filter) return filter;
    return this.encodeFilterInternal(filter, []) as Filter;
  }

  private encodeFilterInternal(value: unknown, pathTokens: string[]): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.encodeFilterInternal(v, pathTokens));
    }
    if (!isPlainObject(value, this.BigNumber.isBigNumber)) return value;

    const result: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value)) {
      if (key === '$and' || key === '$or' || key === '$nor') {
        result[key] = Array.isArray(child)
          ? child.map((v) => this.encodeFilterInternal(v, pathTokens))
          : child;
        continue;
      }

      if (key === '$not') {
        result[key] = this.encodeFilterInternal(child, pathTokens);
        continue;
      }

      if (key.startsWith('$')) {
        result[key] = this.encodeFilterInternal(child, pathTokens);
        continue;
      }

      const keyTokens = normalizePathToTokens(key);
      const targetTokens = key.includes('.') ? [...pathTokens, ...keyTokens] : [...pathTokens, key];
      const field = this.findField(targetTokens);
      if (field) {
        result[key] = this.transformOperators(child, field, 'encode');
        continue;
      }

      if (
        isPlainObject(child, this.BigNumber.isBigNumber) &&
        !Object.keys(child).some((k) => k.startsWith('$'))
      ) {
        result[key] = this.encodeFilterInternal(child, targetTokens);
        continue;
      }

      result[key] = child;
    }

    return result;
  }

  /**
   * Encodes aggregate pipeline with decimal transforms where semantics are known.
   *
   * Supported stage transforms:
   * - `$match`: filter transform (operators + compare values)
   * - `$set` / `$addFields`: data transform (literal assignments)
   * - `$facet`: recursively encode each facet pipeline
   * - `$lookup.pipeline`: recursively encode nested lookup pipeline
   */
  private encodeAggregatePipeline(pipeline: unknown[]): unknown[] {
    return pipeline.map((stage) => this.encodeAggregateStage(stage));
  }

  private encodeAggregateStage(stage: unknown): unknown {
    if (!isPlainObject(stage, this.BigNumber.isBigNumber)) return stage;

    const encodedStage: Record<string, unknown> = {};

    for (const [op, value] of Object.entries(stage)) {
      if (op === '$match' && isPlainObject(value, this.BigNumber.isBigNumber)) {
        encodedStage[op] = this.encodeFilter(value as Filter) || {};
        continue;
      }

      if (
        (op === '$set' || op === '$addFields') &&
        isPlainObject(value, this.BigNumber.isBigNumber)
      ) {
        encodedStage[op] = this.encodeData(value);
        continue;
      }

      if (op === '$facet' && isPlainObject(value, this.BigNumber.isBigNumber)) {
        const encodedFacet: Record<string, unknown> = {};
        for (const [facetName, facetPipeline] of Object.entries(value)) {
          encodedFacet[facetName] = Array.isArray(facetPipeline)
            ? this.encodeAggregatePipeline(facetPipeline)
            : facetPipeline;
        }
        encodedStage[op] = encodedFacet;
        continue;
      }

      if (op === '$lookup' && isPlainObject(value, this.BigNumber.isBigNumber)) {
        const encodedLookup: Record<string, unknown> = { ...value };
        const nested = encodedLookup.pipeline;
        if (Array.isArray(nested)) {
          encodedLookup.pipeline = this.encodeAggregatePipeline(nested);
        }
        encodedStage[op] = encodedLookup;
        continue;
      }

      encodedStage[op] = value;
    }

    return encodedStage;
  }

  /**
   * Retrieves a list of documents matching the criteria and decodes decimal fields.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param options Query options
   * @returns Decoded document array
   */
  async find<T = unknown>(
    collection: string,
    filter?: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    const result = await this.base.find<T>(collection, this.encodeFilter(filter), options);
    return result.map((item) => this.decodeData(item));
  }

  /**
   * Retrieves the document corresponding to the specified ID and decodes decimal fields.
   * @param collection Collection name
   * @param id Document ID
   * @param options Query options
   * @returns Decoded document, or null if not found
   */
  async findOne<T = unknown>(
    collection: string,
    id: string,
    options?: QueryOptions,
  ): Promise<T | null> {
    const result = await this.base.findOne<T>(collection, id, options);
    return result ? this.decodeData(result) : null;
  }

  /**
   * Creates a new document. Input decimal fields are encoded before saving.
   * @param collection Collection name
   * @param data Data to create
   * @param options Query options
   * @returns Decoded created document
   */
  async create<T = unknown>(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    const created = await this.base.create<T>(collection, this.encodeData(data), options);
    return this.decodeData(created);
  }

  /**
   * Updates a document. Specified decimal fields are encoded before updating.
   * @param collection Collection name
   * @param id Document ID to update
   * @param data Data to update
   * @param options Query options
   * @returns Decoded updated document
   */
  async update<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    const updated = await this.base.update<T>(collection, id, this.encodeData(data), options);
    return this.decodeData(updated);
  }

  /**
   * Deletes the document with the specified ID.
   * @param collection Collection name
   * @param id Document ID to delete
   * @param options Query options
   * @returns Decoded deleted document
   */
  async delete<T = unknown>(collection: string, id: string, options?: QueryOptions): Promise<T> {
    const deleted = await this.base.delete<T>(collection, id, options);
    return this.decodeData(deleted);
  }

  /**
   * Counts the number of documents matching the criteria.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param options Query options
   * @returns Number of matching documents
   */
  async count(collection: string, filter?: Filter, options?: QueryOptions): Promise<number> {
    return this.base.count(collection, this.encodeFilter(filter), options);
  }

  /**
   * Completely replaces the document with the specified ID. Decimal fields are encoded.
   * @param collection Collection name
   * @param id Document ID to replace
   * @param data Replacement data content
   * @param options Query options
   * @returns Decoded replaced document
   */
  async replace<T = unknown>(
    collection: string,
    id: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T> {
    if (!this.base.replace) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support replace');
    }
    const replaced = await this.base.replace<T>(collection, id, this.encodeData(data), options);
    return this.decodeData(replaced);
  }

  /**
   * Executes an aggregation pipeline. Encodes corresponding decimal fields in the pipeline and decodes results.
   * @param collection Collection name
   * @param pipeline Aggregation pipeline definition
   * @param options Query options
   * @returns Decoded aggregation result array
   */
  async aggregate<T = unknown>(
    collection: string,
    pipeline: unknown[],
    options?: QueryOptions,
  ): Promise<T[]> {
    if (!this.base.aggregate) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support aggregate');
    }
    const encodedPipeline = this.encodeAggregatePipeline(pipeline);
    const rows = await this.base.aggregate<T>(collection, encodedPipeline, options);
    return rows.map((row) => this.decodeData(row));
  }

  /**
   * Bulk creates multiple documents.
   * @param collection Collection name
   * @param data Array of data objects to create
   * @param options Query options
   * @returns Decoded array of created documents
   */
  async createMany<T = unknown>(
    collection: string,
    data: Record<string, unknown>[],
    options?: QueryOptions,
  ): Promise<T[]> {
    if (!this.base.createMany) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support createMany');
    }
    const rows = await this.base.createMany<T>(
      collection,
      data.map((d) => this.encodeData(d)),
      options,
    );
    return rows.map((row) => this.decodeData(row));
  }

  /**
   * Updates multiple documents matching the criteria.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param data Data to update
   * @param options Query options
   * @returns Decoded array of updated documents
   */
  async updateMany<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]> {
    if (!this.base.updateMany) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support updateMany');
    }
    const rows = await this.base.updateMany<T>(
      collection,
      this.encodeFilter(filter) || {},
      this.encodeData(data),
      options,
    );
    return rows.map((row) => this.decodeData(row));
  }

  /**
   * Deletes multiple documents matching the criteria.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param options Query options
   * @returns Decoded array of deleted documents
   */
  async deleteMany<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T[]> {
    if (!this.base.deleteMany) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support deleteMany');
    }
    const rows = await this.base.deleteMany<T>(
      collection,
      this.encodeFilter(filter) || {},
      options,
    );
    return rows.map((row) => this.decodeData(row));
  }

  /**
   * Inserts a single document and returns the operation result.
   * @param collection Collection name
   * @param data Data to insert
   * @param options Query options
   * @returns Operation result
   */
  async insertOne(
    collection: string,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    if (!this.base.insertOne) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support insertOne');
    }
    return this.base.insertOne(collection, this.encodeData(data), options);
  }

  /**
   * Updates a single document matching the criteria and returns the operation result.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param data Data to update
   * @param options Query options
   * @returns Operation result
   */
  async updateOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    if (!this.base.updateOne) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support updateOne');
    }
    return this.base.updateOne(
      collection,
      this.encodeFilter(filter) || {},
      this.encodeData(data),
      options,
    );
  }

  /**
   * Replaces a single document matching the criteria and returns the operation result.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param data Replacement data content
   * @param options Query options
   * @returns Operation result
   */
  async replaceOne(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    if (!this.base.replaceOne) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support replaceOne');
    }
    return this.base.replaceOne(
      collection,
      this.encodeFilter(filter) || {},
      this.encodeData(data),
      options,
    );
  }

  /**
   * Deletes a single document matching the criteria and returns the operation result.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param options Query options
   * @returns Operation result
   */
  async deleteOne(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<OperationResult> {
    if (!this.base.deleteOne) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support deleteOne');
    }
    return this.base.deleteOne(collection, this.encodeFilter(filter) || {}, options);
  }

  /**
   * Updates a single document matching the criteria and returns pre- or post-update data.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param data Update data
   * @param options Query options
   * @returns Document data, or null if not found
   */
  async findOneAndUpdate<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    if (!this.base.findOneAndUpdate) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support findOneAndUpdate');
    }
    const row = await this.base.findOneAndUpdate<T>(
      collection,
      this.encodeFilter(filter) || {},
      this.encodeData(data),
      options,
    );
    return row ? this.decodeData(row) : null;
  }

  /**
   * Replaces a single document matching the criteria and returns pre- or post-replacement data.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param data Replacement data content
   * @param options Query options
   * @returns Document data, or null if not found
   */
  async findOneAndReplace<T = unknown>(
    collection: string,
    filter: Filter,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    if (!this.base.findOneAndReplace) {
      throw new Error(
        'BigNumberDataAccessAdapter: base adapter does not support findOneAndReplace',
      );
    }
    const row = await this.base.findOneAndReplace<T>(
      collection,
      this.encodeFilter(filter) || {},
      this.encodeData(data),
      options,
    );
    return row ? this.decodeData(row) : null;
  }

  /**
   * Deletes a single document matching the criteria and returns the deleted document data.
   * @param collection Collection name
   * @param filter Filter criteria
   * @param options Query options
   * @returns Deleted document data, or null if not found
   */
  async findOneAndDelete<T = unknown>(
    collection: string,
    filter: Filter,
    options?: QueryOptions,
  ): Promise<T | null> {
    if (!this.base.findOneAndDelete) {
      throw new Error('BigNumberDataAccessAdapter: base adapter does not support findOneAndDelete');
    }
    const row = await this.base.findOneAndDelete<T>(
      collection,
      this.encodeFilter(filter) || {},
      options,
    );
    return row ? this.decodeData(row) : null;
  }
}
