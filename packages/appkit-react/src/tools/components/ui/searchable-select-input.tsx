import * as React from 'react';
import { SearchableSelectInput as ControlledSearchableSelect, type SearchableSelectInputProps as ControlledProps, type SearchableSelectOption, type SearchableSelectCreateInput } from "../../../ui";
import { DataAccessContext } from '../../lib/data-access/data-access-context';
import type { DataAccessAdapter, Filter, QueryOptions } from '../../lib/data-access/types';
export type { SearchableSelectOption, SearchableSelectCreateInput, SearchableSelectCreateMode, SearchableSelectCreateRequest, SearchableSelectDisplayField, SearchableSelectDisplayPosition } from "../../../ui";
/**
 * DataAccess アダプターを利用した非同期検索の設定です。
 */
export interface SearchableSelectDataAccessConfig {
  /** 対象コレクション/テーブル名 */
  collection: string;
  /** IDフィールド名（既定: "id"） */
  idField?: string;
  /** 名称フィールド名（既定: "name"） */
  labelField?: string;
  /** 補足フィールド名（任意） */
  descriptionField?: string;
  /** 追加フィルタ（任意） */
  baseFilter?: Filter;
  /** 取得件数上限（既定: 20） */
  limit?: number;
  /** 候補ゼロ時の新規作成を許可するか */
  createEnabled?: boolean;
}

/** CRUD integration over the callback-only UI. Explicit callbacks take precedence. */
export interface SearchableSelectInputProps extends ControlledProps {
  dataAccessConfig?: SearchableSelectDataAccessConfig;
}
function normalize(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function uniqByValue(options: SearchableSelectOption[]): SearchableSelectOption[] {
  const map = new Map<string, SearchableSelectOption>();
  for (const option of options) {
    map.set(String(option.value), option);
  }
  return Array.from(map.values());
}

function recordToOption(
  record: Record<string, unknown>,
  idField: string,
  labelField: string,
  descriptionField?: string,
): SearchableSelectOption {
  return {
    value: normalize(record[idField]),
    label: normalize(record[labelField]),
    description: descriptionField ? normalize(record[descriptionField]) : undefined,
    name: normalize(record.name ?? record[labelField]),
    code: descriptionField
      ? normalize(record.code ?? record[descriptionField])
      : normalize(record.code),
  };
}

async function searchWithDataAccess(
  adapter: DataAccessAdapter,
  config: SearchableSelectDataAccessConfig,
  query: string,
): Promise<SearchableSelectOption[]> {
  const idField = config.idField || 'id';
  const labelField = config.labelField || 'name';
  const descriptionField = config.descriptionField;
  const limit = config.limit ?? 20;
  const baseFilter = (config.baseFilter || {}) as Record<string, unknown>;
  const opts: QueryOptions = { limit };

  const idFilter: Filter = {
    ...baseFilter,
    [idField]: { $regex: query },
  };

  const labelFilter: Filter = {
    ...baseFilter,
    [labelField]: { $regex: query },
  };

  const [idMatches, labelMatches] = await Promise.all([
    adapter.find<Record<string, unknown>>(config.collection, idFilter, opts),
    idField === labelField
      ? Promise.resolve([] as Record<string, unknown>[])
      : adapter.find<Record<string, unknown>>(config.collection, labelFilter, opts),
  ]);

  return uniqByValue(
    [...idMatches, ...labelMatches].map((record) =>
      recordToOption(record, idField, labelField, descriptionField),
    ),
  );
}

async function createWithDataAccess(
  adapter: DataAccessAdapter,
  config: SearchableSelectDataAccessConfig,
  input: SearchableSelectCreateInput,
): Promise<SearchableSelectOption> {
  const idField = config.idField || 'id';
  const labelField = config.labelField || 'name';
  const descriptionField = config.descriptionField;

  const payload: Record<string, unknown> = {
    ...(config.baseFilter || {}),
    [idField]: input.id,
    [labelField]: input.name,
  };

  const created = await adapter.create<Record<string, unknown>>(config.collection, payload);
  return recordToOption(created, idField, labelField, descriptionField);
}


export function SearchableSelectInput({ dataAccessConfig, onSearch, onCreateOption, ...props }: SearchableSelectInputProps) {
  const adapter = React.useContext(DataAccessContext);
  const search = React.useMemo(() => onSearch ?? (adapter && dataAccessConfig
    ? (query: string) => searchWithDataAccess(adapter, dataAccessConfig, query) : undefined), [onSearch, adapter, dataAccessConfig]);
  const create = React.useMemo(() => onCreateOption ?? (adapter && dataAccessConfig?.createEnabled
    ? (input: SearchableSelectCreateInput) => createWithDataAccess(adapter, dataAccessConfig, input) : undefined), [onCreateOption, adapter, dataAccessConfig]);
  return <ControlledSearchableSelect {...props} onSearch={search} onCreateOption={create} />;
}
