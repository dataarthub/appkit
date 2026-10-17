'use client';
import { useState, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { X, Loader2 } from 'lucide-react';
import { QueryBuilderFilter } from '../filter/query-builder';
import { CollectionSchema } from '../filter/filter-types';
import { DisplayField } from './types';

export interface GenericSearchPaneProps<T> {
  /** スキーマ定義 / Collection schema definition */
  schema: CollectionSchema;
  /** 検索実行時のコールバック / Search execution callback */
  onSearch: (params: { globalFilter: string; filterResult: unknown }) => Promise<T[]>;
  /** アイテム選択時のコールバック / Item selection callback */
  onItemSelect: (item: T) => void;
  /** 直接追加時のコールバック / Direct add callback */
  onDirectAdd?: (item: T) => void;
  /** 検索プレースホルダー / Search placeholder text */
  searchPlaceholder?: string;
  /** 新規作成ボタンのコールバック / Create new button callback */
  onCreateNew?: () => void;
  /** 表示するフィールドの定義 / Fields to display in the result table */
  displayFields?: DisplayField<T>[];
  /** 初期表示するフィルターフィールド / Initial filter fields to show */
  searchFields?: string[];
  /** 直接追加機能を有効にするか / Whether to enable direct add functionality */
  enableDirectAdd?: boolean;
  /** テスト用ID / Test ID */
  testId?: string;
}

/**
 * 汎用的な検索・選択ペインコンポーネント。
 * サイドペイン内などでリソースを検索し、選択するためのUIを提供します。
 */
export function GenericSearchPane<T extends { [key: string]: unknown }>({
  schema,
  onSearch,
  onItemSelect,
  onDirectAdd,
  searchPlaceholder = '検索...',
  onCreateNew,
  displayFields,
  searchFields,
  enableDirectAdd = false,
  testId,
}: GenericSearchPaneProps<T>) {
  // Search state
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<T[]>([]);
  const [filterResult, setFilterResult] = useState<unknown>({});

  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async () => {
    try {
      setSearching(true);
      const results = await onSearch({
        globalFilter: searchText,
        filterResult,
      });
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setFilterResult({});
    // Note: QueryBuilderFilter will reset its internal state if key or props change
  };

  const handleItemSelect = (item: T) => {
    onItemSelect(item);
  };

  const handleItemClick = (item: T) => {
    if (!enableDirectAdd) {
      handleItemSelect(item);
      return;
    }

    // Double click logic
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      if (onDirectAdd) {
        onDirectAdd(item);
      } else {
        handleItemSelect(item);
      }
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      handleItemSelect(item);
      clickTimeoutRef.current = null;
    }, 300);
  };

  const fieldsToDisplay =
    displayFields ||
    Object.entries(schema)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .slice(0, 3)
      .map(([key, meta]) => ({
        key,
        label: meta.label || key,
        width: '33%',
        render: undefined as DisplayField<T>['render'],
      }));

  return (
    <div className='space-y-3' data-testid={testId}>
      <div className='space-y-2'>
        <Label htmlFor='global-search'>検索</Label>
        <div className='flex gap-2'>
          <Input
            id='global-search'
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? '検索中...' : '検索'}
          </Button>
          <Button variant='outline' onClick={clearFilters} disabled={searching}>
            <X className='h-4 w-4 mr-1' /> クリア
          </Button>
          {onCreateNew && (
            <Button variant='secondary' onClick={onCreateNew} className='ml-auto'>
              新規作成
            </Button>
          )}
        </div>
      </div>

      <div className='pt-2'>
        <QueryBuilderFilter
          schema={schema}
          initialFields={searchFields}
          onChange={(_, result) => setFilterResult(result)}
        />
      </div>

      <div className='text-xs text-muted-foreground'>
        検索結果の行をクリックしてアイテムを選択します。
      </div>

      {searching ? (
        <div className='flex justify-center items-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : hasSearched ? (
        searchResults.length === 0 ? (
          <div className='text-sm text-muted-foreground py-4 text-center border rounded-md bg-muted/10'>
            該当するアイテムが見つかりませんでした
          </div>
        ) : (
          <div className='space-y-2'>
            {enableDirectAdd && (
              <div className='text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-900'>
                💡 ヒント: クリックで選択、ダブルクリックで直接追加
              </div>
            )}
            <div className='border rounded-md overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {fieldsToDisplay.map((field) => (
                      <TableHead key={field.key} style={{ width: field.width }}>
                        {field.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((item, idx) => (
                    <TableRow
                      key={((item as Record<string, unknown>).id as string) || idx}
                      className='cursor-pointer hover:bg-muted/50'
                      onClick={() => handleItemClick(item)}
                    >
                      {fieldsToDisplay.map((field) => (
                        <TableCell key={field.key} className='align-top'>
                          {field.render ? (
                            field.render(item[field.key], item)
                          ) : (
                            <div className='line-clamp-2'>{item[field.key]?.toString() || '-'}</div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
