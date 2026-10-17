/**
 * @fileoverview Content Module
 *
 * Content management for SSG (Astro, Next.js, Hugo).
 * Bridges ERP data with static site generators.
 *
 * @module lib/content
 */

// Types
export type {
  ContentAdapter,
  ContentItem,
  ContentFilter,
  ContentSyncResult,
  BuildResult,
  DeployResult,
  GitMarkdownConfig,
} from './types';

// Implementations
export { DatabaseContentAdapter } from './database-content-adapter';
export type { DatabaseContentAdapterConfig, ContentColumnMapping } from './database-content-adapter';
export { S3ContentAdapter } from './s3-content-adapter';
export type { S3ContentAdapterConfig, S3ContentFormat } from './s3-content-adapter';
export * from './studio';
