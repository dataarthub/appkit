import { useMemo, useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  BarChart3,
  Edit,
  Eye as EyeIcon,
  MoreHorizontal,
  Trash2,
  Filter,
  File,
  Loader2,
} from 'lucide-react';
import { DataTableView, createColumnsFromHeads, schemaToTableHeads } from './index';
import type { CollectionSchema, FilterFieldType } from '../filter';
import type { ColumnDef, ColumnFiltersState, SortingState } from './table-engine';
import { useDelete } from '../../lib/data-access/react-query';

export interface DataTableParams {
  currentPage: number;
  pageSize: number;
  globalFilter: string;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
}

export type RowRefLike = {
  name?: unknown;
  title?: unknown;
  companyName?: unknown;
  code?: unknown;
};

export type SchemaProperty = {
  type?: string;
  enum?: unknown[];
  format?: string;
  description?: string;
  ['x-ui']?: {
    hidden?: boolean;
    filter?: boolean;
    label?: string;
    type?: string;
    options?: Array<{ value?: string | number; label?: string }>;
  };
};

export type RowData = Record<string, unknown>;

export type SchemaLike = {
  properties?: Record<string, SchemaProperty>;
};

export interface ResourceDataTableProps<TData extends RowData> {
  resource: string;
  title: string;
  description: string;
  params: DataTableParams;
  updateSearchParams: (updates: Record<string, string>) => void;
  detailUrlBuilder?: (item: TData) => string;
  editUrlBuilder?: (item: TData) => string;
  statusUrlBuilder?: (item: TData) => string;
  getItemName?: (item: TData) => string;
  getItemId?: (item: TData) => string;
  canDelete?: (item: TData) => boolean;
  // Generic injection props
  schema: SchemaLike | undefined;
  getRefTableForField?: (fieldName: string) => string | undefined;
  getSignedUrl?: (filePath: string, mode: 'download' | 'view') => Promise<string>;
  navigate?: (to: string) => void;
  renderLink?: (props: {
    to: string;
    children: React.ReactNode;
    className?: string;
    title?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => React.ReactElement;
  searchString?: string;
}

/**
 * 汎用的なリソース一覧のデータテーブルコンポーネント。
 * 特定のルーティングやスキーマの実装に依存せず、プロップス経由で注入された情報をもとに動作します。
 */
export function ResourceDataTable<TData extends RowData>({
  resource,
  title,
  description,
  params: _params,
  updateSearchParams: _updateSearchParams,
  detailUrlBuilder,
  editUrlBuilder,
  statusUrlBuilder,
  getItemName,
  getItemId,
  canDelete,
  schema,
  getRefTableForField,
  getSignedUrl,
  navigate,
  renderLink,
  searchString,
}: ResourceDataTableProps<TData>) {
  const resolvedSearchString = searchString ?? '';

  const filterSchema = useMemo(() => buildFilterSchema(schema), [schema]);

  // Calculate all possible filter fields
  const allFilterConfig = useMemo(() => {
    const exclude = new Set(['id', 'createdAt', 'updatedAt']);
    const properties = schema?.properties || {};

    return Object.keys(filterSchema)
      .filter((field) => {
        if (exclude.has(field)) return false;
        return true;
      })
      .map((field) => {
        const prop = (properties as Record<string, SchemaProperty>)[field];
        const xui = prop?.['x-ui'] || {};
        const label = xui.label || (filterSchema[field] as { label?: string })?.label || field;
        const isDefault = xui.filter === true;
        return {
          field,
          label,
          isDefault,
        };
      });
  }, [filterSchema, schema]);

  // Start with default filters (x-ui.filter: true)
  const defaultFilters = useMemo(
    () => new Set(allFilterConfig.filter((c) => c.isDefault).map((c) => c.field)),
    [allFilterConfig],
  );

  const [visibleFilterFields, setVisibleFilterFields] = useState<Set<string>>(defaultFilters);

  const filterFields = useMemo(() => {
    return allFilterConfig
      .filter((config) => visibleFilterFields.has(config.field))
      .map((config) => ({
        field: config.field,
        label: config.label,
        placeholder: config.label,
      }));
  }, [allFilterConfig, visibleFilterFields]);

  const resolvedGetItemId = useCallback(
    (item: TData) => (getItemId ? getItemId(item) : String(item.id)),
    [getItemId],
  );
  const defaultDetailUrlBuilder = useCallback(
    (item: TData) => {
      const id = resolvedGetItemId(item);
      return `/${resource}/${id}`;
    },
    [resource, resolvedGetItemId],
  );
  const defaultEditUrlBuilder = useCallback(
    (item: TData) => {
      const id = resolvedGetItemId(item);
      return `/${resource}/${id}/edit`;
    },
    [resource, resolvedGetItemId],
  );

  const buildUrlWithSearch = useCallback(
    (baseUrl: string) => {
      if (!resolvedSearchString) return baseUrl;
      return `${baseUrl}?${resolvedSearchString}`;
    },
    [resolvedSearchString],
  );

  const deleteMutation = useDelete(String(resource));
  const handleDelete = useCallback(
    (id: string | number) => {
      deleteMutation.mutate({ id: String(id) });
    },
    [deleteMutation],
  );

  const optionsMaps = useMemo(() => buildOptionsMaps(schema), [schema]);
  const heads = useMemo(() => {
    const h = schemaToTableHeads(schema as any, {
      exclude: ['createdAt', 'updatedAt'],
      optionsMaps,
    });
    // Inject 'code' column at the front if schema has a code property but it's hidden
    const properties = (schema as SchemaLike | undefined)?.properties;
    const hasCode =
      properties?.code && !h.some((col) => (col as { field: string }).field === 'code');
    if (hasCode) {
      h.unshift({
        field: 'code',
        text: 'コード',
        type: 'String',
        enableSorting: true,
      });
    }
    return h;
  }, [schema, optionsMaps]);

  const baseColumns = useMemo(() => {
    const cols = createColumnsFromHeads(heads);
    return cols.map((col) => {
      const fieldName =
        (col as { accessorKey?: string; id?: string }).accessorKey ||
        (col as { accessorKey?: string; id?: string }).id;
      if (!fieldName) return col;

      // Check if this is a file field
      const prop = (schema?.properties as Record<string, SchemaProperty>)?.[fieldName];
      const isFileField =
        prop?.['x-ui']?.type === 'file' ||
        prop?.type === 'file' ||
        fieldName.toLowerCase().endsWith('filePath') ||
        fieldName === 'filePath' ||
        fieldName === 'path' ||
        prop?.['x-ui']?.type === 'file-array';

      if (isFileField) {
        return {
          ...col,
          cell: (props: { getValue: () => unknown }) => {
            const rawValue = props.getValue();
            if (!rawValue) return '-';

            // if array of files
            if (Array.isArray(rawValue)) {
              return (
                <div className='flex flex-col gap-1 py-1' onClick={(e) => e.stopPropagation()}>
                  {rawValue.map((path) => (
                    <FileCell key={path} filePath={path} getSignedUrl={getSignedUrl} />
                  ))}
                </div>
              );
            }

            // if single file
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <FileCell filePath={String(rawValue)} getSignedUrl={getSignedUrl} />
              </div>
            );
          },
        };
      }

      const refTable = getRefTableForField ? getRefTableForField(fieldName) : undefined;
      if (refTable && fieldName !== 'id') {
        return {
          ...col,
          cell: (props: { getValue: () => unknown; row: { original: TData } }) => {
            const rawValue = props.getValue();
            if (rawValue == null || rawValue === '') return '-';

            const idStr = String(rawValue);
            const rowData = props.row.original;

            // Try to find a joined display name or a denormalized code in the same row
            const prefix = fieldName.replace(/Id$/, '').replace(/_id$/, '');
            const camelPrefix = prefix.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());

            // Priority: Denormalized Name/Title > Nested Object Name/Title > Denormalized Code > Nested Object Code > Shortened ID
            const joinedName = String(
              rowData[`${camelPrefix}Name`] ||
                rowData[`${camelPrefix}Title`] ||
                rowData[`${camelPrefix}CompanyName`] ||
                rowData[`${camelPrefix}Code`] ||
                rowData[`${prefix}_name`] ||
                rowData[`${prefix}_title`] ||
                rowData[`${prefix}_companyName`] ||
                rowData[`${prefix}_code`] ||
                rowData[`${prefix}Name`] ||
                rowData[`${prefix}Code`] ||
                (rowData[camelPrefix] &&
                  typeof rowData[camelPrefix] === 'object' &&
                  ((rowData[camelPrefix] as RowRefLike).name ||
                    (rowData[camelPrefix] as RowRefLike).companyName ||
                    (rowData[camelPrefix] as RowRefLike).title ||
                    (rowData[camelPrefix] as RowRefLike).code)) ||
                (idStr.length > 8 && idStr.includes('-') ? `...${idStr.slice(-6)}` : idStr),
            );

            const linkUrl = `/${refTable}/${idStr}`;
            const clickHandler = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (navigate) {
                e.preventDefault();
                navigate(linkUrl);
              }
            };

            return (
              <div onClick={(e) => e.stopPropagation()}>
                {renderLink ? (
                  renderLink({
                    to: linkUrl,
                    children: joinedName,
                    className:
                      'text-primary hover:underline font-medium decoration-primary/30 underline-offset-2 transition-all',
                    title: `${refTable}: ${idStr}`,
                    onClick: clickHandler,
                  })
                ) : (
                  <a
                    href={linkUrl}
                    onClick={clickHandler}
                    className='text-primary hover:underline font-medium decoration-primary/30 underline-offset-2 transition-all'
                    title={`${refTable}: ${idStr}`}
                  >
                    {joinedName}
                  </a>
                )}
              </div>
            );
          },
        };
      }

      // Formatting for long string IDs (like UUIDs) for the primary ID column
      if (fieldName === 'id') {
        return {
          ...col,
          cell: (props: { getValue: () => unknown }) => {
            const rawValue = props.getValue();
            if (rawValue == null || rawValue === '') return '-';
            const idStr = String(rawValue);
            if (idStr.length > 8 && idStr.includes('-')) {
              return (
                <span className='font-mono text-xs text-muted-foreground' title={idStr}>
                  ...{idStr.slice(-6)}
                </span>
              );
            }
            return <span className='font-mono text-sm'>{idStr}</span>;
          },
        };
      }

      return col;
    });
  }, [heads, schema?.properties, getRefTableForField, getSignedUrl, renderLink, navigate]);

  const actionColumn = useMemo<ColumnDef<TData>>(
    () => ({
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions
            item={row.original}
            onDelete={canDelete && !canDelete(row.original) ? undefined : handleDelete}
            detailUrlBuilder={detailUrlBuilder ?? defaultDetailUrlBuilder}
            editUrlBuilder={editUrlBuilder ?? defaultEditUrlBuilder}
            statusUrlBuilder={statusUrlBuilder}
            getItemName={getItemName}
            getItemId={resolvedGetItemId}
            buildUrlWithSearch={buildUrlWithSearch}
            navigate={navigate}
            renderLink={renderLink}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    [
      handleDelete,
      detailUrlBuilder,
      defaultDetailUrlBuilder,
      editUrlBuilder,
      defaultEditUrlBuilder,
      statusUrlBuilder,
      getItemName,
      resolvedGetItemId,
      buildUrlWithSearch,
      canDelete,
      navigate,
      renderLink,
    ],
  );

  const columns = useMemo(() => [...baseColumns, actionColumn], [baseColumns, actionColumn]);

  const handleAddClick = useCallback(() => {
    const url = `/${resource}/new`;
    if (navigate) {
      navigate(url);
    }
  }, [navigate, resource]);

  const handleRowClick = useCallback(
    (row: TData) => {
      const url = buildUrlWithSearch((detailUrlBuilder ?? defaultDetailUrlBuilder)(row));
      if (navigate) {
        navigate(url);
      }
    },
    [buildUrlWithSearch, detailUrlBuilder, defaultDetailUrlBuilder, navigate],
  );

  return (
    <Card className='overflow-hidden border-primary/10 shadow-sm'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4 border-b border-primary/10'>
        <div className='space-y-1'>
          <CardTitle className='text-primary font-bold text-xl'>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant='default' size='sm' className='ml-auto'>
              <Filter className='mr-2 h-4 w-4' />
              フィルター追加
            </Button>} />
          <DropdownMenuContent align='end' className='w-[200px] max-h-[300px] overflow-y-auto'>
            {allFilterConfig.map((config) => (
              <DropdownMenuCheckboxItem
                key={config.field}
                checked={visibleFilterFields.has(config.field)}
                onCheckedChange={(checked: boolean) => {
                  setVisibleFilterFields((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(config.field);
                    else next.delete(config.field);
                    return next;
                  });
                }}
              >
                {config.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setVisibleFilterFields(new Set())}
              className='justify-center text-sm text-primary hover:text-primary'
            >
              すべてクリア
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className='pt-6'>
        <DataTableView<TData>
          testId={`${String(resource)}-table`}
          collection={String(resource)}
          schema={filterSchema}
          columns={columns as ColumnDef<TData, unknown>[]}
          filterFields={filterFields}
          filterLayout='grid'
          variant='default'
          storageKey={`resource:${String(resource)}:v3`}
          showRowNumber={true}
          onAdd={navigate ? handleAddClick : undefined}
          onRowClick={navigate ? handleRowClick : undefined}
        />
      </CardContent>
    </Card>
  );
}

interface RowActionsProps<TData extends object> {
  item: TData;
  onDelete?: (id: string) => void;
  detailUrlBuilder?: (item: TData) => string;
  editUrlBuilder?: (item: TData) => string;
  statusUrlBuilder?: (item: TData) => string;
  getItemName?: (item: TData) => string;
  getItemId?: (item: TData) => string;
  buildUrlWithSearch: (baseUrl: string) => string;
  navigate?: (to: string) => void;
  renderLink?: (props: {
    to: string;
    children: React.ReactNode;
    className?: string;
    title?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) => React.ReactElement;
}

function RowActions<TData extends object>({
  item,
  onDelete,
  detailUrlBuilder,
  editUrlBuilder,
  statusUrlBuilder,
  getItemName,
  getItemId,
  buildUrlWithSearch,
  navigate,
  renderLink,
}: RowActionsProps<TData>) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const itemName = getItemName ? getItemName(item) : 'このアイテム';
  const itemId = getItemId ? getItemId(item) : '';
  const detailUrl = detailUrlBuilder ? buildUrlWithSearch(detailUrlBuilder(item)) : '#';
  const editUrl = editUrlBuilder ? buildUrlWithSearch(editUrlBuilder(item)) : '#';
  const statusUrl = statusUrlBuilder ? buildUrlWithSearch(statusUrlBuilder(item)) : '#';

  const handleDelete = () => {
    if (onDelete && itemId) {
      onDelete(itemId);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleLinkClick = (url: string) => (e: React.MouseEvent) => {
    if (url === '#') return;
    if (navigate) {
      e.preventDefault();
      navigate(url);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0 text-muted-foreground hover:text-primary'>
            <span className='sr-only'>メニューを開く</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>} />
        <DropdownMenuContent align='end'>
          {detailUrlBuilder && (
            <DropdownMenuItem render={renderLink ? (
                renderLink({
                  to: detailUrl,
                  children: (
                    <>
                      <EyeIcon className='mr-2 h-4 w-4 text-primary' />
                      詳細
                    </>
                  ),
                  className: 'flex items-center w-full',
                  onClick: handleLinkClick(detailUrl),
                })
              ) : (
                <a
                  href={detailUrl}
                  onClick={handleLinkClick(detailUrl)}
                  className='flex items-center w-full'
                >
                  <EyeIcon className='mr-2 h-4 w-4 text-primary' />
                  詳細
                </a>
              )} />
          )}
          {statusUrlBuilder && (
            <DropdownMenuItem render={renderLink ? (
                renderLink({
                  to: statusUrl,
                  children: (
                    <>
                      <BarChart3 className='mr-2 h-4 w-4 text-primary' />
                      状況
                    </>
                  ),
                  className: 'flex items-center w-full',
                  onClick: handleLinkClick(statusUrl),
                })
              ) : (
                <a
                  href={statusUrl}
                  onClick={handleLinkClick(statusUrl)}
                  className='flex items-center w-full'
                >
                  <BarChart3 className='mr-2 h-4 w-4 text-primary' />
                  状況
                </a>
              )} />
          )}
          {editUrlBuilder && (
            <DropdownMenuItem render={renderLink ? (
                renderLink({
                  to: editUrl,
                  children: (
                    <>
                      <Edit className='mr-2 h-4 w-4 text-primary' />
                      編集
                    </>
                  ),
                  className: 'flex items-center w-full',
                  onClick: handleLinkClick(editUrl),
                })
              ) : (
                <a
                  href={editUrl}
                  onClick={handleLinkClick(editUrl)}
                  className='flex items-center w-full'
                >
                  <Edit className='mr-2 h-4 w-4 text-primary' />
                  編集
                </a>
              )} />
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='flex items-center text-destructive focus:text-destructive'
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                削除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>
              {itemName}を削除しますか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function buildFilterSchema(schema: SchemaLike | undefined): CollectionSchema {
  const properties = schema?.properties ?? {};
  const result: CollectionSchema = {};

  Object.entries(properties).forEach(([key, prop]) => {
    const xui = prop['x-ui'] ?? {};
    if (xui.hidden) return;

    let type: FilterFieldType = 'string';

    if (prop.enum) {
      type = 'enum';
    } else if (prop.type === 'integer' || prop.type === 'number') {
      type = 'number';
    } else if (prop.type === 'boolean') {
      type = 'boolean';
    } else if (prop.type === 'array') {
      type = 'array';
    } else if (prop.format === 'date' || prop.format === 'date-time') {
      type = 'date';
    }

    result[key] = {
      type,
      label: String(xui.label || prop.description || key),
      enum: Array.isArray(prop.enum) ? prop.enum.map((value) => String(value)) : undefined,
    };
  });

  return result;
}

function buildOptionsMaps(schema: SchemaLike | undefined) {
  const properties = schema?.properties ?? {};
  const maps: Record<string, Record<string | number, string>> = {};

  Object.entries(properties).forEach(([key, prop]) => {
    const options = prop['x-ui']?.options;
    if (!Array.isArray(options)) return;

    maps[key] = options.reduce(
      (
        acc: Record<string | number, string>,
        option: { value?: string | number; label?: string },
      ) => {
        if (option?.value === undefined) return acc;
        acc[option.value] = String(option.label ?? option.value);
        return acc;
      },
      {},
    );
  });

  return maps;
}

function FileCell({
  filePath,
  getSignedUrl,
}: {
  filePath: string;
  getSignedUrl?: (path: string, mode: 'download' | 'view') => Promise<string>;
}) {
  const [loading, setLoading] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [signedUrlCache, setSignedUrlCache] = useState<string | null>(null);

  const fileName = filePath.split('/').pop() || filePath;
  const displayFileName = fileName.replace(/^\d+-/, '');

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!getSignedUrl) {
      alert('ファイルの取得機能が設定されていません');
      return;
    }

    // Check if it's an image or PDF for preview
    const extMatch = filePath.match(/\.(jpg|jpeg|png|gif|webp|bmp|pdf)(\?.*)?$/i);
    if (extMatch) {
      setIsViewDialogOpen(true);
      if (!signedUrlCache && !loading) {
        try {
          setLoading(true);
          const url = await getSignedUrl(filePath, 'download');
          setSignedUrlCache(url);
        } catch (_error) {
          alert('ファイルの取得に失敗しました');
          setIsViewDialogOpen(false);
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // Direct download for other files
    if (
      !window.confirm(
        `「${displayFileName}」はプレビューできないファイル形式です。\nダウンロードしますか？`,
      )
    ) {
      return;
    }

    if (loading) return;
    try {
      setLoading(true);
      const url = await getSignedUrl(filePath, 'download');
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (_error) {
      alert('ファイルの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!signedUrlCache) return;
    const link = document.createElement('a');
    link.href = signedUrlCache;
    link.download = fileName;
    link.click();
  };

  return (
    <>
      <div
        onClick={handleClick}
        className='inline-flex items-center gap-1 text-primary hover:underline cursor-pointer flex-nowrap'
        title={filePath}
      >
        {loading && !isViewDialogOpen ? (
          <Loader2 className='w-4 h-4 animate-spin shrink-0' />
        ) : (
          <File className='w-4 h-4 shrink-0' />
        )}
        <span className='truncate max-w-[200px]'>{displayFileName}</span>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className='max-w-4xl max-h-[90vh] flex flex-col pt-10'
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className='flex justify-between items-center mb-2'>
            <h2 className='text-lg font-semibold truncate pr-4'>{displayFileName}</h2>
            {signedUrlCache && (
              <Button onClick={handleDownload} size='sm' variant='outline'>
                <File className='w-4 h-4 mr-2' />
                ダウンロード
              </Button>
            )}
          </div>
          <div className='flex-1 min-h-[50vh] bg-muted/30 rounded-md border flex justify-center items-center overflow-auto'>
            {!signedUrlCache ? (
              <Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
            ) : signedUrlCache.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/) ? (
              <img
                src={signedUrlCache}
                alt={displayFileName}
                className='max-w-full max-h-[70vh] object-contain'
              />
            ) : signedUrlCache.toLowerCase().match(/\.pdf(\?.*)?$/) ? (
              <iframe
                src={`${signedUrlCache}#toolbar=0`}
                className='w-full h-[70vh] bg-white border-0'
                title={displayFileName}
              />
            ) : (
              <p className='text-muted-foreground'>プレビューできないファイル形式です</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
