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

import {expect,fn,userEvent,within,waitFor} from 'storybook/test';
import type {FileProvider,FileNode} from '../../../src/tools/components/file-browser/types';
const moveFile:FileNode={id:'report.txt',name:'Report.txt',kind:'file',size:12,contentType:'text/plain'};
const otherFile:FileNode={id:'other.txt',name:'Other.txt',kind:'file',size:8};
const moveFolder:FileNode={id:'archive',name:'Archive',kind:'folder'};
function movementProvider():FileProvider{
 let moved=false;
 return {
  listNodes:fn(async()=>({nodes:moved?[moveFolder]:[moveFile,moveFolder,otherFile],hasMore:false})),
  moveNode:fn(async()=>{moved=true;}),
  getUrl:fn(async()=> 'https://example.com/report.txt'),
  searchNodes:fn(async()=>[]),createFolder:fn(),uploadFile:fn(),deleteNode:fn(),renameNode:fn(),
 } as unknown as FileProvider;
}
async function moveWithKeyboard(canvasElement:HTMLElement,mode:'grid'|'list'){
 const canvas=within(canvasElement);const handle=await canvas.findByRole('button',{name:'Move Report.txt'});
 handle.focus();
 // Native keyboard movement uses 10px increments; reach the folder using actual geometry.
 const source=handle.closest(mode==='list'?'tr':'[data-file-drag]')!;
 const folder=canvas.getByText('Archive').closest(mode==='list'?'tr':'[data-file-drop]')!;
 const a=source.getBoundingClientRect(),b=folder.getBoundingClientRect();
 const dx=b.x+b.width/2-(a.x+a.width/2),dy=b.y+b.height/2-(a.y+a.height/2);
 await userEvent.keyboard('[Space]');
 await waitFor(()=>expect(source).toHaveAttribute('data-dnd-dragging','true'));
 for(let i=0;i<Math.round(Math.abs(dx)/10);i++)await userEvent.keyboard(dx>0?'{ArrowRight}':'{ArrowLeft}');
 for(let i=0;i<Math.round(Math.abs(dy)/10);i++)await userEvent.keyboard(dy>0?'{ArrowDown}':'{ArrowUp}');
 await waitFor(()=>expect(folder).toHaveAttribute('data-drop-over','true'));
 await userEvent.keyboard('[Space]');
}
export const GridMoveContract:Story={
 args:{provider:movementProvider(),initialViewMode:'grid',className:'h-[550px] w-full'},
 play:async({canvasElement,args})=>{
  const canvas=within(canvasElement);await canvas.findByRole('button',{name:'Move Report.txt'});
  const user=userEvent.setup();
  await user.click(canvas.getByText('Report.txt'));await user.keyboard('{Meta>}');await user.click(canvas.getByText('Other.txt'));await user.keyboard('{/Meta}');
  await expect(canvas.getByText('2 selected')).toBeTruthy();
  await moveWithKeyboard(canvasElement,'grid');
  await waitFor(()=>expect(args.provider!.moveNode).toHaveBeenCalledWith('report.txt','archive/'));
  await expect(args.provider!.moveNode).toHaveBeenCalledTimes(1);
  await waitFor(()=>expect(canvas.queryByText('Report.txt')).toBeNull());
 },
};
export const ListMoveContract:Story={
 args:{provider:movementProvider(),initialViewMode:'list',className:'h-[550px] w-full'},
 play:async({canvasElement,args})=>{
  await moveWithKeyboard(canvasElement,'list');
  await waitFor(()=>expect(args.provider!.moveNode).toHaveBeenCalledWith('report.txt','archive/'));
  await expect(args.provider!.moveNode).toHaveBeenCalledTimes(1);
 },
};
export const CancelMoveContract:Story={
 args:{provider:movementProvider(),initialViewMode:'list',className:'h-[550px] w-full'},
 play:async({canvasElement,args})=>{
  const canvas=within(canvasElement);const handle=await canvas.findByRole('button',{name:'Move Report.txt'});handle.focus();
  await userEvent.keyboard('[Space]{ArrowDown}{Escape}');
  await waitFor(()=>expect(document.activeElement).toBe(handle));await expect(args.provider!.moveNode).not.toHaveBeenCalled();
  await userEvent.click(canvas.getByText('Report.txt'));await expect(canvas.getByText('1 selected')).toBeTruthy();
  await userEvent.pointer({target:canvas.getByText('Report.txt'),keys:'[MouseRight]'});await expect(await within(document.body).findByRole('menu')).toBeTruthy();
  await userEvent.keyboard('{Escape}');
 },
};
