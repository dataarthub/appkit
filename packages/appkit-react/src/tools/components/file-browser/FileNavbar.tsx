import React, { useState } from 'react';
import {
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Upload,
  ArrowUp,
  FolderPlus,
} from 'lucide-react';
import { Button, Input } from '../ui';
import { cn } from '../../lib/utils';
import type { FileBrowserViewMode } from './types';

export interface FileNavbarProps {
  /** 現在のパス */
  path: string;
  /** 表示モード */
  viewMode: FileBrowserViewMode;
  /** ローディング中かどうか */
  isLoading?: boolean;
  /** パスが変更された時のコールバック */
  onNavigate: (path: string) => void;
  /** 1つ上の階層へ移動するコールバック */
  onNavigateUp: () => void;
  /** 表示モードが変更された時のコールバック */
  onSetViewMode: (mode: FileBrowserViewMode) => void;
  /** リフレッシュボタンが押された時のコールバック */
  onRefresh: () => void;
  /** 検索が実行された時のコールバック */
  onSearch: (query: string) => void;
  /** アップロードボタンが押された時のコールバック */
  onUpload?: () => void;
  /** フォルダ作成ボタンが押された時のコールバック */
  onCreateFolder?: () => void;
}

/**
 * ファイルブラウザの上部ナビゲーション・ツールバー
 */
export function FileNavbar({
  path,
  viewMode,
  isLoading,
  onNavigate,
  onNavigateUp,
  onSetViewMode,
  onRefresh,
  onSearch,
  onUpload,
  onCreateFolder,
}: FileNavbarProps) {
  const [searchValue, setSearchValue] = useState('');

  // パスをセグメントに分割
  const segments = path.split('/').filter(Boolean);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchValue);
    }
  };

  return (
    <div className='flex flex-col gap-2 p-2 border-b bg-background/95 sticky top-0 z-10'>
      <div className='flex items-center justify-between gap-2'>
        {/* 左側: パンくずリスト */}
        <nav className='flex items-center text-sm font-medium overflow-x-auto no-scrollbar py-1'>
          <button
            type='button'
            onClick={() => onNavigate('')}
            className='p-1.5 hover:bg-muted rounded-md transition-colors flex items-center'
            title='Root'
          >
            <Home className='h-4 w-4' />
          </button>

          {segments.map((segment, index) => {
            const segmentPath = segments.slice(0, index + 1).join('/') + '/';
            return (
              <React.Fragment key={segmentPath}>
                <ChevronRight className='h-4 w-4 text-muted-foreground shrink-0 mx-0.5' />
                <button
                  type='button'
                  onClick={() => onNavigate(segmentPath)}
                  className='px-2 py-1 hover:bg-muted rounded-md transition-colors whitespace-nowrap'
                >
                  {segment}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* 右側: 表示切り替え・リフレッシュ */}
        <div className='flex items-center gap-1 shrink-0'>
          <div className='flex items-center bg-muted rounded-lg p-0.5'>
            <Button
              variant='ghost'
              size='icon'
              className={cn('h-8 w-8', viewMode === 'grid' && 'bg-background shadow-sm')}
              onClick={() => onSetViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className={cn('h-8 w-8', viewMode === 'list' && 'bg-background shadow-sm')}
              onClick={() => onSetViewMode('list')}
              aria-label="List view"
            >
              <List className='h-4 w-4' />
            </Button>
          </div>

          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={onRefresh}
              aria-label="Refresh files"
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        {/* 戻るボタン */}
        <Button
          variant='outline'
          size='icon'
          className='h-9 w-9 shrink-0'
          onClick={onNavigateUp}
          disabled={!path || isLoading}
          title='Up one level'
        >
          <ArrowUp className='h-4 w-4' />
        </Button>

        {/* 検索 */}
        <div className='relative flex-1 group'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground' />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder='Search files by name or tag...'
            aria-label='Search files'
            className='pl-9 h-9 rounded-lg bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-primary'
          />
        </div>

        {/* アクション */}
        <div className='flex items-center gap-1'>
          {onCreateFolder && (
            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9'
              onClick={onCreateFolder}
              title='New Folder'
            >
              <FolderPlus className='h-4 w-4' />
            </Button>
          )}
          {onUpload && (
            <Button size='sm' className='shrink-0 gap-2 h-9' onClick={onUpload} aria-label='Upload files'>
              <Upload className='h-4 w-4' />
              <span className='hidden sm:inline'>Upload</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
