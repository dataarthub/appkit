import { useMemo } from 'react';
import { ResourceDataTable, type RowData, type SchemaLike } from './ResourceDataTable';

export interface BaseResourcePageProps<T extends RowData> {
  resource: string;
  title: string;
  description: string;
  getItemName: (item: T) => string;
  detailUrlBuilder?: (item: T) => string;
  editUrlBuilder?: (item: T) => string;
  statusUrlBuilder?: (item: T) => string;
  canDelete?: (item: T) => boolean;

  // Generic router and schema injections
  schema: SchemaLike | undefined;
  getRefTableForField?: (fieldName: string) => string | undefined;
  getSignedUrl?: (filePath: string, mode: 'download' | 'view') => Promise<string>;

  // Router parameters
  page: number;
  pageSize: number;
  globalFilter: string;
  sortingState: any;
  columnFiltersState: any;
  updateSearchParams: (updates: Record<string, string>) => void;
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
 * 汎用リソース一覧ページコンポーネント。
 * ルーティングおよびスキーマに直接依存せず、プロップスとして渡された状態と処理をもとにリソースのデータテーブルを提供します。
 */
export function BaseResourcePage<T extends RowData>({
  resource,
  title,
  description,
  getItemName,
  detailUrlBuilder,
  editUrlBuilder,
  statusUrlBuilder,
  canDelete,
  schema,
  getRefTableForField,
  getSignedUrl,
  page,
  pageSize,
  globalFilter,
  sortingState,
  columnFiltersState,
  updateSearchParams,
  navigate,
  renderLink,
  searchString,
}: BaseResourcePageProps<T>) {
  const defaultDetailUrlBuilder = useMemo(
    () => detailUrlBuilder ?? ((item: T) => `/${resource}/${item.id ?? ''}`),
    [detailUrlBuilder, resource],
  );

  const defaultEditUrlBuilder = useMemo(
    () => editUrlBuilder ?? ((item: T) => `/${resource}/${item.id ?? ''}/edit`),
    [editUrlBuilder, resource],
  );

  const params = useMemo(
    () => ({
      currentPage: page,
      pageSize,
      globalFilter,
      sorting: sortingState,
      columnFilters: columnFiltersState,
    }),
    [page, pageSize, globalFilter, sortingState, columnFiltersState],
  );

  return (
    <ResourceDataTable<T>
      resource={resource}
      title={title}
      description={description}
      params={params}
      updateSearchParams={updateSearchParams}
      getItemName={getItemName}
      detailUrlBuilder={defaultDetailUrlBuilder}
      editUrlBuilder={defaultEditUrlBuilder}
      statusUrlBuilder={statusUrlBuilder}
      canDelete={canDelete}
      schema={schema}
      getRefTableForField={getRefTableForField}
      getSignedUrl={getSignedUrl}
      navigate={navigate}
      renderLink={renderLink}
      searchString={searchString}
    />
  );
}
