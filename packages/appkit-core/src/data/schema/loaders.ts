/**
 * @fileoverview Registry & Codelist Loaders
 *
 * Helpers for loading regional-edi style registries and code lists.
 *
 * @module lib/schema/loaders
 */

// Node-only imports are moved inside functions using dynamic import()
import { parseCodelist } from './codelists';
import type { Codelist } from './codelists';
import type { DirectoryCapabilities, RegistryFile } from './types';
import { parseDirectoryCapabilities, parseRegistryFile } from './registry';

export interface LoaderOptions {
  /** YAML parser (e.g. yaml.parse) */
  parseYaml?: (input: string) => unknown;
}

export interface RegionalEdiCodelistOptions extends LoaderOptions {
  /** Version directory name (default: v1) */
  versionDir?: string;
}

export interface RegionalEdiDirectoryOptions extends LoaderOptions {
  /** Directory file name without extension (default: directory) */
  fileBaseName?: string;
}

/**
 * Loads JSON/YAML and returns it as a RegistryFile.
 *
 * @param filePath - Registry file path
 * @param options - Loader options including YAML parser
 * @returns RegistryFile
 */
export async function loadRegistryFile(
  filePath: string,
  options: LoaderOptions = {},
): Promise<RegistryFile> {
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');

  if (isYaml) {
    const { parse: defaultParseYaml } = await import('yaml');
    const parser = options.parseYaml ?? defaultParseYaml;
    return parseRegistryFile(parser(content));
  }

  return parseRegistryFile(JSON.parse(content));
}

/**
 * Loads JSON/YAML and returns it as a Codelist.
 *
 * @param filePath - Codelist file path
 * @param options - Loader options including YAML parser
 * @returns Codelist
 */
export async function loadCodelistFile(
  filePath: string,
  options: LoaderOptions = {},
): Promise<Codelist> {
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');

  if (isYaml) {
    const { parse: defaultParseYaml } = await import('yaml');
    const parser = options.parseYaml ?? defaultParseYaml;
    return parseCodelist(parser(content));
  }

  return parseCodelist(JSON.parse(content));
}

/**
 * Loads JSON/YAML and returns it as DirectoryCapabilities.
 *
 * @param filePath - Directory file path
 * @param options - Loader options including YAML parser
 * @returns DirectoryCapabilities
 */
export async function loadDirectoryCapabilitiesFile(
  filePath: string,
  options: LoaderOptions = {},
): Promise<DirectoryCapabilities> {
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');

  if (isYaml) {
    const { parse: defaultParseYaml } = await import('yaml');
    const parser = options.parseYaml ?? defaultParseYaml;
    return parseDirectoryCapabilities(parser(content));
  }

  return parseDirectoryCapabilities(JSON.parse(content));
}

/**
 * Loads regional-edi registry/registry.yaml or registry.json.
 *
 * @param rootDir - Root directory of regional-edi
 * @param options - Loader options including YAML parser
 * @returns RegistryFile
 */
export async function loadRegionalEdiRegistry(
  rootDir: string,
  options: LoaderOptions = {},
): Promise<RegistryFile> {
  const { join } = await import('node:path');
  const yamlPath = join(rootDir, 'registry', 'registry.yaml');
  const jsonPath = join(rootDir, 'registry', 'registry.json');

  try {
    return await loadRegistryFile(yamlPath, options);
  } catch {
    return await loadRegistryFile(jsonPath, options);
  }
}

/**
 * Loads a regional-edi directory file.
 *
 * @param rootDir - Root directory of regional-edi
 * @param options - Options including YAML parser and file base name
 * @returns DirectoryCapabilities
 */
export async function loadRegionalEdiDirectory(
  rootDir: string,
  options: RegionalEdiDirectoryOptions = {},
): Promise<DirectoryCapabilities> {
  const { join } = await import('node:path');
  const baseName = options.fileBaseName ?? 'directory';
  const yamlPath = join(rootDir, 'directory', `${baseName}.yaml`);
  const jsonPath = join(rootDir, 'directory', `${baseName}.json`);

  try {
    return await loadDirectoryCapabilitiesFile(yamlPath, options);
  } catch {
    return await loadDirectoryCapabilitiesFile(jsonPath, options);
  }
}

/**
 * Loads a regional-edi codelist.
 *
 * @param rootDir - Root directory of regional-edi
 * @param codelistId - Codelist ID
 * @param options - Options including YAML parser and version directory
 * @returns Codelist
 */
export async function loadRegionalEdiCodelist(
  rootDir: string,
  codelistId: string,
  options: RegionalEdiCodelistOptions = {},
): Promise<Codelist> {
  const { join } = await import('node:path');
  const versionDir = options.versionDir ?? 'v1';
  const baseDir = join(rootDir, 'codelists', codelistId, versionDir);
  const yamlPath = join(baseDir, 'codelist.yaml');
  const jsonPath = join(baseDir, 'codelist.json');

  try {
    return await loadCodelistFile(jsonPath, options);
  } catch {
    return await loadCodelistFile(yamlPath, options);
  }
}
