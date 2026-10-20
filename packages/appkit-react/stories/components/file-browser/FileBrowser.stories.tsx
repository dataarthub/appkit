import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileBrowser } from '../../../src/tools/components/file-browser/FileBrowser';
import { UUIDStorageFileProvider } from '../../../src/tools/components/file-browser/UUIDStorageFileProvider';
import { DataAccessFileProvider } from '../../../src/tools/components/file-browser/DataAccessFileProvider';

// Mock Adapter for Storybook
const mockAdapter = {
  list: async (options: any) => {
    console.log('Mock List:', options);

    // Root contents
    if (!options.prefix) {
      return {
        objects: [
          { key: 'readme.txt', size: 1024, lastModified: new Date(), contentType: 'text/plain' },
          { key: 'logo.png', size: 51200, lastModified: new Date(), contentType: 'image/png' },
        ],
        prefixes: ['documents/', 'photos/'],
        hasMore: false,
      };
    }

    // Documents contents
    if (options.prefix === 'documents/') {
      return {
        objects: [
          {
            key: 'documents/invoice_2026.pdf',
            size: 204800,
            lastModified: new Date(),
            contentType: 'application/pdf',
            metadata: { transactionDate: '2026-06-01', amount: '50000' },
          },
          {
            key: 'documents/report.docx',
            size: 45000,
            lastModified: new Date(),
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        ],
        prefixes: ['documents/archives/'],
        hasMore: false,
      };
    }

    return { objects: [], hasMore: false };
  },
  getUrl: async (key: string) => `https://example.com/${key}`,
  download: async () => Buffer.from('mock data'),
  upload: async (key: string) => ({
    key,
    size: 0,
    lastModified: new Date(),
    contentType: 'application/octet-stream',
  }),
  delete: async () => true,
  head: async () => null,
  exists: async () => true,
} as any;

const meta: Meta<typeof FileBrowser> = {
  title: 'Components/FileBrowser',
  component: FileBrowser,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FileBrowser>;

export const Default: Story = {
  args: {
    adapter: mockAdapter,
    className: 'h-[600px] w-full max-w-5xl m-4 mx-auto shadow-xl',
  },
};

export const ListView: Story = {
  args: {
    ...Default.args,
    initialViewMode: 'list',
  },
};

/**
 * Demonstrate database-indexed UUID storage with an in-memory provider.
 */
export const VaultMode: Story = {
  args: {
    ...Default.args,
    provider: new UUIDStorageFileProvider({
      adapter: mockAdapter,
      listNodes: async (_path) => {
        // DBから取得したデータを想定
        return {
          nodes: [
            {
              id: 'db-1',
              name: '顧客リスト.xlsx',
              kind: 'file',
              physicalKey: 'vault/uuid-1.xlsx',
              size: 15000,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              metadata: { tags: '重要,営業' },
            },
            {
              id: 'db-2',
              name: '2026年度計画.pdf',
              kind: 'file',
              physicalKey: 'vault/uuid-2.pdf',
              size: 250000,
              contentType: 'application/pdf',
              metadata: { tags: '社内' },
            },
            {
              id: 'db-3',
              name: 'マニュアル',
              kind: 'folder',
              physicalKey: '',
              size: 0,
              contentType: '',
            },
          ],
          hasMore: false,
        };
      },
      onNodeCreated: async (node) => {
        console.log('DBに保存しました:', node);
        alert(`DB保存: ${node.name} (Key: ${node.physicalKey})`);
      },
    }),
  },
};

/**
 * Demonstrate the public data-access adapter contract.
 */
export const DataAccessMode: Story = {
  args: {
    ...Default.args,
    provider: new DataAccessFileProvider({
      storage: mockAdapter,
      dataAccess: {
        find: async (collection: string, filter: any) => {
          console.log(`DB Find: ${collection}`, filter);
          return [
            {
              id: 'rec-1',
              folder: filter.folder,
              filename: '請求書_202606.pdf',
              physical_key: 'vault/uuid-999.pdf',
              size: 123456,
              content_type: 'application/pdf',
              tags: '経理,未処理',
              updated_at: new Date().toISOString(),
              kind: 'file',
            },
            {
              id: 'rec-2',
              folder: filter.folder,
              filename: 'アーカイブ',
              physical_key: '',
              size: 0,
              content_type: '',
              tags: '',
              updated_at: new Date().toISOString(),
              kind: 'folder',
            },
          ];
        },
        create: async (collection: string, data: any) => {
          console.log(`DB Create: ${collection}`, data);
          return data;
        },
        delete: async (collection: string, id: any) => {
          console.log(`DB Delete: ${collection}`, id);
          return id;
        },
      } as any,
    }),
  },
};
