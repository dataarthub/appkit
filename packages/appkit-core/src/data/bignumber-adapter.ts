import type { DataAccessAdapter, Filter, OperationResult, QueryOptions } from './types';

/**
 * Selects configured read values as BigNumber-like instances or fixed-point strings. This does not change unconfigured fields.
 * @see {@link BigNumberDataAccessAdapterConfig.decodeMode}.
 */
export type DecimalDecodeMode = 'bignumber' | 'string';
/**
 * BigNumber.js-compatible rounding modes 0 through 8. The supplied numeric constructor must interpret these values consistently.
 * @see {@link DecimalFieldConfig.roundingMode}.
 */
export type DecimalRoundingMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Minimal decimal-instance operations used by the wrapper; supply a compatible exact-decimal implementation.
 * @see {@link BigNumberDataAccessAdapter} for construction.
 */
export interface BigNumberLike {
  /**
   * Rounds to a decimal scale before write serialization.
   * @param decimalPlaces - Requested fractional digit count from field.scale.
   * @param roundingMode - Field/adapter rounding mode.
   * @returns Decimal instance whose toFixed serializes the rounded value; mutation behavior belongs to the supplied library.
   */
  decimalPlaces: (decimalPlaces: number, roundingMode?: DecimalRoundingMode) => BigNumberLike;
  /**
   * Checks newly constructed decimal values before conversion.
   * @returns True when the instance represents a finite decimal according to the supplied library.
   */
  isFinite: () => boolean;
  /**
   * Serializes a decimal to fixed-point text.
   * @param decimalPlaces - Optional fractional scale; absence requests the full fixed-point representation.
   * @returns Fixed-point decimal text with library-defined rounding when a scale is supplied.
   */
  toFixed: (decimalPlaces?: number) => string;
}

/**
 * Structural exact-decimal constructor and instance predicate. Existing values accepted by isBigNumber pass through without a new finite-value check.
 * @see {@link BigNumberDataAccessAdapter} for usage.
 */
export interface BigNumberConstructorLike {
  /**
   * Constructs a decimal from input text or a JavaScript number. Numbers may already have lost precision before construction.
   * @param value - Decimal input; the wrapper checks isFinite on newly constructed results.
   * @returns A compatible decimal instance.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * import type { BigNumberConstructorLike } from '@alneas/appkit-core/data/bignumber-adapter';
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export function decimalAdapter(base: DataAccessAdapter, BigNumber: BigNumberConstructorLike) {
   *   return new BigNumberDataAccessAdapter({ base, BigNumber, fields: { amount: { scale: 2 } }, decodeMode: 'string' });
   * }
   * ```
   */
  new (value: string | number): BigNumberLike;
  /**
   * Recognizes existing decimal instances.
   * @param value - Value encountered during configured-field conversion.
   * @returns True when value can be used directly as a BigNumberLike; no additional finite check follows this branch.
   */
  isBigNumber: (value: unknown) => value is BigNumberLike;
  /**
   * Optional half-up mode constant; the wrapper falls back to numeric mode 4 when absent.
   */
  ROUND_HALF_UP?: DecimalRoundingMode;
}

/**
 * Per-path write scale, write rounding and read representation. Null/undefined values are preserved; scale/range validation belongs to the numeric library.
 * @see {@link BigNumberDataAccessAdapterConfig.fields}.
 */
export interface DecimalFieldConfig {
  /**
   * Decimal scale for DB serialization.
   * If set, values are rounded and zero-padded via `toFixed(scale)`.
   */
  scale?: number;
  /**
   * Write rounding override, falling back to the adapter setting. Scaled read-side string conversion calls toFixed(scale) without this override and uses the supplied library default.
   */
  roundingMode?: DecimalRoundingMode;
  /**
   * Decoded representation for read-side values.
   * Defaults to adapter-level `decodeMode`.
   */
  decodeMode?: DecimalDecodeMode;
}

/**
 * Host adapter, compatible decimal constructor and configured decimal paths. The wrapper does not change backend storage types or schema.
 * @example
 * ```ts
 * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
 * import type { BigNumberConstructorLike } from '@alneas/appkit-core/data/bignumber-adapter';
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export function decimalAdapter(base: DataAccessAdapter, BigNumber: BigNumberConstructorLike) {
 *   return new BigNumberDataAccessAdapter({ base, BigNumber, fields: { amount: { scale: 2 } }, decodeMode: 'string' });
 * }
 * ```
 */
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
   * Default write rounding mode; falls back to BigNumber.ROUND_HALF_UP, then 4. Read-side string rounding uses the library default.
   */
  roundingMode?: DecimalRoundingMode;
  /**
   * Defaults to true. Rejects configured non-null inputs that are neither recognized instances nor finite string/number conversions. False preserves unsupported/non-finite newly parsed inputs; exceptions thrown by the supplied library still propagate. Existing recognized instances are not checked for finiteness.
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
 * Wraps a host adapter to encode configured decimal paths as fixed-point strings and decode returned rows as decimal instances or strings. Dot paths and array wildcards are supported; the first matching configured path wins. Input JavaScript numbers may already have lost precision.
 * @remarks Null/undefined pass through; unconfigured values are preserved. Traversed objects/arrays are rebuilt, but untouched values can retain references. Backend capabilities and authorization remain with base. Optional methods are exposed but reject when the base capability is absent; replacements retain the base adapter's semantics. Conversion after a successful write can still reject without rollback.
 * @example
 * ```ts
 * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
 * import type { BigNumberConstructorLike } from '@alneas/appkit-core/data/bignumber-adapter';
 * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
 * export function decimalAdapter(base: DataAccessAdapter, BigNumber: BigNumberConstructorLike) {
 *   return new BigNumberDataAccessAdapter({ base, BigNumber, fields: { amount: { scale: 2 } }, decodeMode: 'string' });
 * }
 * ```
 */
export class BigNumberDataAccessAdapter implements DataAccessAdapter {
  private readonly BigNumber: BigNumberConstructorLike;
  private readonly base: DataAccessAdapter;
  private readonly decodeMode: DecimalDecodeMode;
  private readonly roundingMode: DecimalRoundingMode;
  private readonly strict: boolean;
  private readonly fields: CompiledFieldConfig[];

  /**
   * Compiles configured paths and stores the supplied adapter/numeric implementation without issuing backend operations.
   * @param config - Required base, BigNumber and field rules. decodeMode defaults to bignumber, strict to true, and write rounding to the supplied half-up mode or 4.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * import type { BigNumberConstructorLike } from '@alneas/appkit-core/data/bignumber-adapter';
   * import type { DataAccessAdapter } from '@alneas/appkit-core/data';
   * export function decimalAdapter(base: DataAccessAdapter, BigNumber: BigNumberConstructorLike) {
   *   return new BigNumberDataAccessAdapter({ base, BigNumber, fields: { amount: { scale: 2 } }, decodeMode: 'string' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function findInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.find('invoices', { amount: { $gte: '10.00' } });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function findOneInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.findOne('invoices', 'invoice-1');
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function createInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.create('invoices', { amount: '12.50' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function updateInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.update('invoices', 'invoice-1', { amount: '12.50' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function deleteInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.delete('invoices', 'invoice-1');
   * }
   * ```
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
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function countInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.count('invoices', { amount: { $gte: '10.00' } });
   * }
   * ```
   */
  async count(collection: string, filter?: Filter, options?: QueryOptions): Promise<number> {
    return this.base.count(collection, this.encodeFilter(filter), options);
  }

  /**
   * Delegates replacement to base.replace after encoding decimal fields. Whole-record versus partial-update behavior depends on that base adapter.
   * @param collection Collection name
   * @param id Document ID to replace
   * @param data Replacement data content
   * @param options Query options
   * @returns Decoded replaced document
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function replaceInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.replace('invoices', 'invoice-1', { amount: '12.50' });
   * }
   * ```
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
   * @remarks Only known $match, $set/$addFields, nested $facet pipelines and $lookup.pipeline stages are encoded. Other stages are forwarded; result decoding still uses the original configured paths, so renamed/projected paths are not inferred.
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function aggregateInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.aggregate('invoices', [{ $match: { amount: { $gte: '10.00' } } }]);
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function createManyInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.createMany('invoices', [{ amount: '12.50' }]);
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function updateManyInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.updateMany('invoices', { status: 'open' }, { amount: '12.50' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function deleteManyInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.deleteMany('invoices', { status: 'archived' });
   * }
   * ```
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
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function insertOneInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.insertOne('invoices', { amount: '12.50' });
   * }
   * ```
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
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function updateOneInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.updateOne('invoices', { id: 'invoice-1' }, { amount: '12.50' });
   * }
   * ```
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
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function replaceOneInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.replaceOne('invoices', { id: 'invoice-1' }, { amount: '12.50' });
   * }
   * ```
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
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function deleteOneInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.deleteOne('invoices', { id: 'invoice-1' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function findOneAndUpdateInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.findOneAndUpdate('invoices', { id: 'invoice-1' }, { amount: '12.50' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function findOneAndReplaceInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.findOneAndReplace('invoices', { id: 'invoice-1' }, { amount: '12.50' });
   * }
   * ```
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
   * @typeParam T - Expected decoded result shape; defaults to unknown. The wrapper trusts this type and does not infer changed decimal property types.
   * @throws Rejects on configured decimal conversion/library errors, base operation rejection, or an unavailable optional base capability. A decode failure after a write does not undo the write.
   * @example
   * ```ts
   * import { BigNumberDataAccessAdapter } from '@alneas/appkit-core/data/bignumber-adapter';
   * export async function findOneAndDeleteInvoices(adapter: BigNumberDataAccessAdapter) {
   *   return adapter.findOneAndDelete('invoices', { id: 'invoice-1' });
   * }
   * ```
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
