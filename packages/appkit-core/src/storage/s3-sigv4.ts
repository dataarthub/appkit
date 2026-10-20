import {
  sha256Hex,
  sha256Bytes,
  hmacSha256,
  hmacSha256Hex,
  base64EncodeUtf8,
  base64DecodeUtf8,
} from './crypto';
import type {
  StorageListOptions,
  StorageListResult,
  StorageObject,
  StorageURLOptions,
} from './types';

/**
 * Credentials, endpoint addressing and expiry defaults for signed S3-compatible requests.
 *
 * @see {@link S3CompatibleRuntime.putObject} for a runtime-client usage example.
 */
export interface S3RuntimeConfig {

  /** SigV4 signing region; use the provider-required region (for example auto for R2). */
  region: string;

  /** Bucket namespace to address in request paths or hostnames. */
  bucket: string;

  /** Optional absolute S3-compatible endpoint; omitted uses the AWS regional endpoint. */
  endpoint?: string;

  /** Credential identifier included in SigV4 authorization; supplied by the host. */
  accessKeyId: string;

  /** Host-supplied signing secret; keep it outside untrusted client code. */
  secretAccessKey: string;

  /** For a custom endpoint, use bucket-in-path addressing unless explicitly false. */
  forcePathStyle?: boolean;

  /** Default signed-URL lifetime in whole seconds (1–604800); omitted uses 3600. */
  defaultExpiresIn?: number;
}

/**
 * Object body and headers to send in one signed PUT request.
 *
 * @see {@link S3CompatibleRuntime.putObject} for a runtime-client usage example.
 */
export interface S3PutInput {

  /** Destination key within the configured bucket. */
  key: string;

  /** Complete payload bytes or UTF-8 text to send. */
  body: Uint8Array | string;

  /** Optional Content-Type header; omitted sends no MIME header. */
  contentType?: string;

  /** Optional Cache-Control response metadata to store. */
  cacheControl?: string;

  /** Optional string metadata stored under lowercase x-amz-meta-* headers; non-ASCII values are encoded. */
  metadata?: Record<string, string>;

  /** Optional retention mode header; requires provider-side Object Lock support and permissions. */
  objectLockMode?: 'GOVERNANCE' | 'COMPLIANCE';

  /** Optional absolute retention expiry sent as an ISO timestamp. */
  objectLockRetainUntilDate?: Date;
}

function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeS3Path(path: string): string {
  return path
    .split('/')
    .map((segment) => rfc3986Encode(segment))
    .join('/');
}

function formatAmzDate(now = new Date()): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function deriveSigningKey(secretAccessKey: string, dateStamp: string, region: string): Uint8Array {
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, 's3');
  return hmacSha256(kService, 'aws4_request');
}

function resolveTargetUrl(
  config: S3RuntimeConfig,
  key?: string,
): { origin: string; hostHeader: string; canonicalUri: string } {
  const encodedKey = key ? encodeS3Path(key.replace(/^\/+/, '')) : '';
  const encodedBucket = rfc3986Encode(config.bucket);

  if (config.endpoint) {
    const base = new URL(config.endpoint);
    const basePath = base.pathname.replace(/\/+$/, '');
    if (config.forcePathStyle !== false) {
      const canonicalUri = encodedKey
        ? `${basePath}/${encodedBucket}/${encodedKey}`
        : `${basePath}/${encodedBucket}`;
      return {
        origin: base.origin,
        hostHeader: base.host,
        canonicalUri: canonicalUri.startsWith('/') ? canonicalUri : `/${canonicalUri}`,
      };
    }
    const virtualHost = `${config.bucket}.${base.host}`;
    const canonicalUri = encodedKey ? `${basePath}/${encodedKey}` : basePath || '/';
    return {
      origin: `${base.protocol}//${virtualHost}`,
      hostHeader: virtualHost,
      canonicalUri: canonicalUri.startsWith('/') ? canonicalUri : `/${canonicalUri}`,
    };
  }

  if (config.forcePathStyle) {
    const hostHeader = `s3.${config.region}.amazonaws.com`;
    const canonicalUri = encodedKey
      ? `/${encodedBucket}/${encodedKey}`
      : `/${encodedBucket}`;
    return {
      origin: `https://${hostHeader}`,
      hostHeader,
      canonicalUri,
    };
  }

  const hostHeader = `${config.bucket}.s3.${config.region}.amazonaws.com`;
  const canonicalUri = encodedKey ? `/${encodedKey}` : '/';
  return {
    origin: `https://${hostHeader}`,
    hostHeader,
    canonicalUri,
  };
}

/**
 * Generates an S3-compatible signed GET URL using AWS Signature Version 4.
 * Operates standalone without requiring external AWS SDK packages.
 */
function presignS3Url(
  config: S3RuntimeConfig,
  key: string,
  options: StorageURLOptions | undefined,
  method: 'GET' | 'PUT',
): string {
  const expiresIn = options?.expiresIn ?? config.defaultExpiresIn ?? 3600;
  if (!Number.isSafeInteger(expiresIn) || expiresIn < 1 || expiresIn > 604800) throw new Error('Presigned URL expiry must be between 1 and 604800 seconds');
  const { amzDate, dateStamp } = formatAmzDate();
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const { origin, hostHeader, canonicalUri } = resolveTargetUrl(config, key);

  const queryParams: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  if (options?.downloadFilename) {
    queryParams.push([
      'response-content-disposition',
      `attachment; filename="${options.downloadFilename}"`,
    ]);
  }

  queryParams.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${rfc3986Encode(k)}=${rfc3986Encode(v)}`)
    .join('&');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    `host:${hostHeader}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = deriveSigningKey(config.secretAccessKey, dateStamp, config.region);
  const signature = hmacSha256Hex(signingKey, stringToSign);

  return `${origin}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

/**
 * Generate a signed download URL without an SDK.
 *
 * @param config - Host-supplied bucket, signing credentials and endpoint settings.
 * @param key - Key inside the configured bucket.
 * @param options - Optional whole-second expiry from 1 to 604800; defaults to config.defaultExpiresIn or 3600. GET additionally supports downloadFilename.
 * @returns A signed URL without a network request or existence check.
 * @throws Throws for invalid expiry or malformed endpoint configuration.
 *
 * @example
 * ```typescript
 * import { presignS3GetUrl, type S3RuntimeConfig } from "@alneas/appkit-core/storage";
 *
 * export function sign(config: S3RuntimeConfig) {
 *   return presignS3GetUrl(config, "reports/note.txt", { expiresIn: 300 });
 * }
 * ```
 */
export function presignS3GetUrl(config: S3RuntimeConfig, key: string, options?: StorageURLOptions): string {
  return presignS3Url(config, key, options, 'GET');
}

/**
 * Generate a signed PUT URL. Upload the bytes with HTTP PUT to this exact URL.
 *
 * @param config - Host-supplied bucket, signing credentials and endpoint settings.
 * @param key - Key inside the configured bucket.
 * @param options - Optional whole-second expiry from 1 to 604800; defaults to config.defaultExpiresIn or 3600. GET additionally supports downloadFilename.
 * @returns A signed URL without a network request or existence check.
 * @throws Throws for invalid expiry or malformed endpoint configuration.
 *
 * @example
 * ```typescript
 * import { presignS3PutUrl, type S3RuntimeConfig } from "@alneas/appkit-core/storage";
 *
 * export function sign(config: S3RuntimeConfig) {
 *   return presignS3PutUrl(config, "reports/note.txt", { expiresIn: 300 });
 * }
 * ```
 */
export function presignS3PutUrl(config: S3RuntimeConfig, key: string, options?: Pick<StorageURLOptions, 'expiresIn'>): string {
  return presignS3Url(config, key, options, 'PUT');
}

function decodeXmlEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  // Decode once: MinIO uses numeric quote entities in CopyObject ETags.
  return value.replace(/&(#(?:x[\da-fA-F]+|\d+)|amp|lt|gt|quot|apos);/g, (entity, name: string) => {
    if (!name.startsWith('#')) return named[name];
    const point = name.startsWith('#x') ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : entity;
  });
}

function extractXmlTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? decodeXmlEntities(match[1].trim()) : undefined;
}

/**
 * Common runtime client for S3, R2, and OCI.
 * Always uses standard fetch + SigV4. Installing an unrelated SDK never changes behavior.
 *
 * @example
 * ```typescript
 * import { S3CompatibleRuntime, type S3RuntimeConfig } from "@alneas/appkit-core/storage";
 *
 * export function createRuntime(config: S3RuntimeConfig) {
 *   return new S3CompatibleRuntime(config);
 * }
 * ```
 */
export class S3CompatibleRuntime {
  private readonly config: S3RuntimeConfig;

  /**
   * Snapshots connection and signing settings without sending a request.
   *
   * @param config - Host-supplied S3-compatible endpoint and signing credentials.
   * @example
   * ```typescript
   * import { S3CompatibleRuntime, type S3RuntimeConfig } from "@alneas/appkit-core/storage";
   *
   * export function createRuntime(config: S3RuntimeConfig) {
   *   return new S3CompatibleRuntime(config);
   * }
   * ```
   */
  constructor(config: S3RuntimeConfig) {
    this.config = Object.freeze({ ...config });
  }

  private async signedFetch(
    method: string,
    key: string | undefined,
    options: {
      query?: Record<string, string | undefined>;
      headers?: Record<string, string | undefined>;
      body?: Uint8Array | string;
    } = {},
  ): Promise<Response> {
    const { amzDate, dateStamp } = formatAmzDate();
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const { origin, hostHeader, canonicalUri } = resolveTargetUrl(this.config, key);
    const payloadHash = sha256Hex(options.body ?? '');

    const queryEntries = Object.entries(options.query ?? {})
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    const canonicalQueryString = queryEntries
      .map(([k, v]) => `${rfc3986Encode(k)}=${rfc3986Encode(v)}`)
      .join('&');

    const headerMap = new Map<string, string>();
    headerMap.set('host', hostHeader);
    headerMap.set('x-amz-content-sha256', payloadHash);
    headerMap.set('x-amz-date', amzDate);

    for (const [k, v] of Object.entries(options.headers ?? {})) {
      if (v !== undefined) {
        headerMap.set(k.toLowerCase(), v.trim());
      }
    }

    const sortedHeaders = [...headerMap.entries()].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const canonicalHeaders = sortedHeaders.map(([k, v]) => `${k}:${v}\n`).join('');
    const signedHeaders = sortedHeaders.map(([k]) => k).join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = deriveSigningKey(
      this.config.secretAccessKey,
      dateStamp,
      this.config.region,
    );
    const signature = hmacSha256Hex(signingKey, stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const requestHeaders: Record<string, string> = {};
    for (const [k, v] of sortedHeaders) {
      if (k !== 'host') requestHeaders[k] = v;
    }
    requestHeaders['authorization'] = authorization;

    const url = canonicalQueryString
      ? `${origin}${canonicalUri}?${canonicalQueryString}`
      : `${origin}${canonicalUri}`;

    const body = typeof options.body === 'string'
      ? options.body
      : options.body
        ? new Uint8Array(options.body)
        : undefined;

    return fetch(url, {
      method,
      headers: requestHeaders,
      body,
    });
  }


  /**
   * Signs a URL for an HTTP GET download.
   *
   * @param key - Object key to retrieve.
   * @param options - Optional expiry in seconds (1–604800) and download filename; signing is always performed.
   * @returns A signed GET URL; no object is fetched by this call.
   * @throws Rejects expiry outside 1–604800 whole seconds or malformed endpoint configuration.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.getSignedGetUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  async getSignedGetUrl(key: string, options?: StorageURLOptions): Promise<string> {
    return presignS3GetUrl(this.config, key, options);
  }


  /**
   * Signs a URL for a direct HTTP PUT upload.
   *
   * @param key - Destination object key.
   * @param options - Optional expiry in seconds, defaulting to the configured value or 3600; valid range 1–604800.
   * @returns A signed PUT URL; no object is uploaded by this call.
   * @throws Rejects expiry outside 1–604800 whole seconds or malformed endpoint configuration.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.getSignedPutUrl("reports/note.txt", { expiresIn: 300 });
   * }
   * ```
   */
  async getSignedPutUrl(key: string, options?: Pick<StorageURLOptions, 'expiresIn'>): Promise<string> {
    return presignS3PutUrl(this.config, key, options);
  }


  /**
   * Uploads a complete payload with SigV4 authorization and optional metadata/retention headers.
   *
   * @param input - Destination key, buffered payload and optional headers; see S3PutInput.
   * @returns No value; resolves after a successful HTTP PUT response.
   * @throws Rejects signing/network errors, invalid retention dates or unsuccessful PUT responses.
   * @remarks This does not configure bucket access policies or infer MIME types.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(runtime: S3CompatibleRuntime) {
   *   await runtime.putObject({ key: "notes.txt", body: "hello", contentType: "text/plain" });
   * }
   * ```
   */
  async putObject(input: S3PutInput): Promise<void> {
    const headers: Record<string, string | undefined> = {
      'content-type': input.contentType,
      'cache-control': input.cacheControl,
      ...(input.objectLockMode || input.objectLockRetainUntilDate ? {
        'x-amz-sdk-checksum-algorithm': 'SHA256',
        'x-amz-checksum-sha256': btoa(String.fromCharCode(...sha256Bytes(input.body))),
      } : {}),
      'x-amz-object-lock-mode': input.objectLockMode,
      'x-amz-object-lock-retain-until-date': input.objectLockRetainUntilDate?.toISOString(),
    };
    for (const [k, v] of Object.entries(input.metadata ?? {})) {
      if (v !== undefined) {
        // HTTP header values cannot contain non-ASCII characters.
        // If non-ASCII characters are present, encode as base64 with a distinguishable prefix 'b64:'
        // so literal strings like 'literal%20value' are preserved intact without accidental corruption.
        const hasNonAscii = /[^\t\x20-\x7e]/.test(v) || v.startsWith('b64:');
        const headerValue = hasNonAscii
          ? `b64:${base64EncodeUtf8(v)}`
          : v;
        headers[`x-amz-meta-${k.toLowerCase()}`] = headerValue;
      }
    }

    const response = await this.signedFetch('PUT', input.key, {
      headers,
      body: input.body,
    });
    if (!response.ok) {
      throw new Error(`S3 PUT failed with status ${response.status}`);
    }
  }


  /**
   * Reads the complete stored object into memory.
   *
   * @param key - Object key to retrieve.
   * @returns The downloaded bytes, or null when the object is absent.
   * @throws Rejects invalid signing configuration, network failures or unsuccessful provider responses.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.getObject("reports/note.txt");
   * }
   * ```
   */
  async getObject(key: string): Promise<Uint8Array | null> {
    const response = await this.signedFetch('GET', key);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`S3 GET failed with status ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }


  /**
   * Requests deletion of the object key.
   *
   * @param key - Object key to delete.
   * @returns Whether deletion was acknowledged; false also covers caught transport failures.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.deleteObject("reports/note.txt");
   * }
   * ```
   */
  async deleteObject(key: string): Promise<boolean> {
    try {
      const response = await this.signedFetch('DELETE', key);
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  }


  /**
   * Retrieves metadata without downloading the object body.
   *
   * @param key - Object key to inspect.
   * @returns Object metadata, or null when the key is absent.
   * @throws Rejects invalid signing configuration, network failures or unsuccessful provider responses.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.headObject("reports/note.txt");
   * }
   * ```
   */
  async headObject(key: string): Promise<StorageObject | null> {
    const response = await this.signedFetch('HEAD', key);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`S3 HEAD failed with status ${response.status}`);
    }
    const metadata: Record<string, string> = {};
    response.headers.forEach((value, header) => {
      if (header.toLowerCase().startsWith('x-amz-meta-')) {
        const keyName = header.slice('x-amz-meta-'.length).toLowerCase();
        let decodedValue = value;
        if (value.startsWith('b64:')) {
          try {
            decodedValue = base64DecodeUtf8(value.slice(4));
          } catch {
            decodedValue = value;
          }
        }
        metadata[keyName] = decodedValue;
      }
    });
    const lengthHeader = response.headers.get('content-length');
    const lastModifiedHeader = response.headers.get('last-modified');
    return {
      key,
      size: lengthHeader !== null ? Number(lengthHeader) : undefined,
      contentType: response.headers.get('content-type') ?? undefined,
      lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : undefined,
      etag: response.headers.get('etag') ?? undefined,
      metadata,
    };
  }


  /**
   * Lists one provider page of object keys and optional common prefixes.
   *
   * @param options - Optional prefix, delimiter, page limit and continuation token; a missing or zero limit uses 1000.
   * @returns Objects and prefixes with provider continuation state; includeMetadata is ignored.
   * @throws Rejects invalid signing configuration, network failures or unsuccessful provider responses.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.listObjects({ prefix: "reports/", limit: 100 });
   * }
   * ```
   */
  async listObjects(options?: StorageListOptions): Promise<StorageListResult> {
    const response = await this.signedFetch('GET', undefined, {
      query: {
        'list-type': '2',
        prefix: options?.prefix,
        delimiter: options?.delimiter,
        'max-keys': String(options?.limit || 1000),
        'continuation-token': options?.cursor,
      },
    });
    if (!response.ok) {
      throw new Error(`S3 LIST failed with status ${response.status}`);
    }
    const xml = await response.text();
    const objects: StorageObject[] = [];
    for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1];
      const itemKey = extractXmlTag(block, 'Key') ?? '';
      const sizeStr = extractXmlTag(block, 'Size');
      const lastModStr = extractXmlTag(block, 'LastModified');
      const etag = extractXmlTag(block, 'ETag');
      objects.push({
        key: itemKey,
        size: sizeStr !== undefined ? Number(sizeStr) : undefined,
        lastModified: lastModStr ? new Date(lastModStr) : undefined,
        etag,
      });
    }
    const prefixes: string[] = [];
    for (const match of xml.matchAll(/<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g)) {
      const prefix = extractXmlTag(match[1], 'Prefix');
      if (prefix) prefixes.push(prefix);
    }
    const isTruncated = extractXmlTag(xml, 'IsTruncated') === 'true';
    const nextCursor = extractXmlTag(xml, 'NextContinuationToken');
    return {
      objects,
      prefixes,
      nextCursor,
      hasMore: isTruncated,
    };
  }


  /**
   * Copies an object into a destination key.
   *
   * @param sourceKey - Existing source object key.
   * @param destinationKey - Destination key to create or overwrite.
   * @returns Metadata confirming the destination, or source metadata for a same-key copy.
   * @throws Rejects invalid signing configuration, network failures or unsuccessful provider responses.
   * @example
   * ```typescript
   * import type { S3CompatibleRuntime } from '@alneas/appkit-core/storage';
   *
   * export async function example(storage: S3CompatibleRuntime) {
   *   return storage.copyObject("reports/note.txt", "archive/note.txt");
   * }
   * ```
   */
  async copyObject(sourceKey: string, destinationKey: string): Promise<StorageObject> {
    if (sourceKey === destinationKey) {
      const existing = await this.headObject(sourceKey);
      if (!existing) throw new Error('S3 COPY source does not exist');
      return existing;
    }
    const copySource = `/${rfc3986Encode(this.config.bucket)}/${encodeS3Path(sourceKey.replace(/^\/+/, ''))}`;
    const response = await this.signedFetch('PUT', destinationKey, {
      headers: {
        'x-amz-copy-source': copySource,
      },
    });
    if (!response.ok) {
      throw new Error(`S3 COPY failed with status ${response.status}`);
    }
    // CopyObject can report an error inside an HTTP 200 response. Consume the
    // entire response before acknowledging a copy or allowing a source deletion.
    const xml = await response.text();
    const etag = extractXmlTag(xml, 'ETag');
    if (/<(?:\w+:)?Error(?:\s|>)/.test(xml) || !/<CopyObjectResult(?:\s|>)/.test(xml) || !etag) {
      throw new Error('S3 COPY returned an error or invalid result');
    }
    const copied = await this.headObject(destinationKey);
    if (!copied || (copied.etag && copied.etag !== etag)) throw new Error('S3 COPY destination could not be confirmed');
    return copied;
  }
}
