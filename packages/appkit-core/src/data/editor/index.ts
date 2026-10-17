/** JSON document operations independent of React and BlockNote's runtime/types. */
import { z } from 'zod';

export interface SerializationOptions { pretty?: boolean; }
export interface DocumentBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: string | unknown[];
  children?: DocumentBlock[];
}
export const BlockSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string(), type: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  content: z.union([z.string(), z.array(z.unknown())]).optional(),
  children: z.array(BlockSchema).optional(),
}));
export const BlockNoteDocumentSchema = z.array(BlockSchema);

/** Serialize document JSON without instantiating an editor. */
export function serializeBlocksToJson(document: readonly unknown[], options: SerializationOptions = {}): string {
  return options.pretty ?? true ? JSON.stringify(document, null, 2) : JSON.stringify(document);
}
/** Validate and parse document JSON. BlockNote-specific typing is supplied by the UI adapter. */
export function parseJsonToBlocks(json: string): DocumentBlock[] {
  const validated = BlockNoteDocumentSchema.safeParse(JSON.parse(json));
  if (!validated.success) throw new Error(`Invalid BlockNote document JSON: ${validated.error.message}`);
  return validated.data;
}
export * from './storage-adapter';
