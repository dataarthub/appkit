/**
 * @fileoverview Universal Web-standard Storage Abstraction for Browser, Edge, Cloudflare Workers, Deno, Bun, and Node.js.
 *
 * Zero native dependencies. Zero node:crypto. Zero @aws-sdk requirement.
 *
 * @module @alneas/appkit-core/storage
 */

// Core types and interfaces
export * from './types';

// Cryptographic helpers (pure Web-standard SHA-256, HMAC-SHA256, Base64)
export {
  sha256Hex,
  sha256Bytes,
  hmacSha256,
  hmacSha256Hex,
  base64EncodeUtf8,
  base64DecodeUtf8,
} from './crypto';

// SigV4 Presigning and runtime HTTP client
export { S3CompatibleRuntime, presignS3GetUrl, presignS3PutUrl } from './s3-sigv4';
export type { S3RuntimeConfig, S3PutInput } from './s3-sigv4';

// Storage Adapters
export { S3StorageAdapter, calculateSHA256 } from './s3-adapter';
export type { S3UploadOptions } from './s3-adapter';
export { R2StorageAdapter } from './r2-adapter';
export { OCIStorageAdapter } from './oci-adapter';
export type { OCIUploadOptions } from './oci-adapter';

export { zipStored } from './zip';
