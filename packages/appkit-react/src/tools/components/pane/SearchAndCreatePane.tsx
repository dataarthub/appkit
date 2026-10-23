'use client';
import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { GenericSearchPane } from './GenericSearchPane';
import { DisplayField } from './types';
import { CreatePane } from './CreatePane';
import { SelectedItemPane } from './SelectedItemPane';
import { CollectionSchema } from '../filter/filter-types';

export interface SearchAndCreatePaneProps<T extends Record<string, unknown>> {
  /** スキーマ定義 / Collection schema definition */
  schema: CollectionSchema;
  /** ペインが開いているか / Whether the pane is open */
  isOpen: boolean;
  /** 閉じるボタン押下時のコールバック / Callback when close button is clicked */
  onClose: () => void;
  /** 検索実行時のコールバック / Search execution callback */
  onSearch: (params: { globalFilter: string; filterResult: unknown }) => Promise<T[]>;
  /**
   * アイテム選択時のコールバック / Item selection callback.
   * junctionFields が空の場合は即座に呼び出され、ペインが閉じます。
   * junctionFields が指定されている場合は、詳細入力後に呼び出されます。
   */
  onItemSelect: (item: T) => void;
  /**
   * 直接追加時のコールバック / Direct add callback.
   * junctionFields の有無に関わらず、選択時に即座に呼び出されます（中間入力をスキップ）。
   */
  onDirectAdd?: (item: T & Record<string, unknown>) => void;
  /** 新規作成時のコールバック / Create new callback */
  onCreateNew: (
    formData: Record<string, unknown>,
    junctionData: Record<string, unknown>,
  ) => void | Promise<void>;
  /** 追加情報の入力フィールド定義 / Definition of junction fields */
  junctionFields?: Array<{ name: string; label: string; type: 'text' | 'number' | 'date' }>;
  /** 追加情報の初期値 / Initial junction data */
  initialJunctionData?: Record<string, unknown>;
  /** 検索プレースホルダー / Search placeholder */
  searchPlaceholder?: string;
  /** 新規作成タイトル / Create title */
  createTitle?: string;
  /** 新規作成説明 / Create description */
  createDescription?: string;
  /** 初期状態で作成フォームを表示するか / Whether to start with create form */
  startWithCreateForm?: boolean;
  /** 表示フィールドの定義 / Fields to display */
  displayFields?: DisplayField<T>[];
  /** 直接追加機能を有効にするか / Whether to enable direct add */
  enableDirectAdd?: boolean;
  /** 簡易的な作成フィールド定義 / Simple fields for creation */
  simpleCreateFields?: Array<{
    name: string;
    label: string;
    required?: boolean;
    placeholder?: string;
  }>;
  /** カスタム作成フォーム（children） / Custom create form content */
  children?: React.ReactNode;
}

/**
 * 検索・選択と新規作成を切り替え可能な高機能ペイン。
 *
 * リソースの検索、既存アイテムの選択、および新しいアイテムの即時作成を
 * 一つのインターフェースで提供します。
 *
 * @remarks Retained forwardRef during the React 19 migration because useImperativeHandle
 * exposes an openCreateNew operation rather than a DOM node. A future ref-as-prop
 * migration should separately verify the imperative handle and its create-form state
 * transition; forwardRef is not technically required by React 19 for this pattern.
 *
 * @example
 * ```tsx
 * <SearchAndCreatePane
 *   schema={userSchema}
 *   isOpen={isOpen}
 *   onSearch={handleSearch}
 *   onItemSelect={handleSelect}
 *   onCreateNew={handleCreate}
 * />
 * ```
 */
export const SearchAndCreatePane = forwardRef<
  unknown,
  SearchAndCreatePaneProps<Record<string, unknown>>
>(
  (
    {
      schema,
      isOpen,
      onClose,
      onSearch,
      onItemSelect,
      onDirectAdd,
      onCreateNew,
      junctionFields = [],
      initialJunctionData = {},
      searchPlaceholder = '検索...',
      createTitle = '新規作成',
      createDescription = '新しいアイテムを作成して追加します',
      startWithCreateForm = false,
      displayFields,
      enableDirectAdd = false,
      simpleCreateFields,
      children,
    },
    ref,
  ) => {
    // State management
    const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(startWithCreateForm);

    // Reset state when pane opens
    useEffect(() => {
      if (isOpen) {
        setSelectedItem(null);
        setIsCreatingNew(startWithCreateForm);
      }
    }, [isOpen, startWithCreateForm]);

    // Expose openCreateNew function to parent component
    useImperativeHandle(
      ref,
      () => ({
        openCreateNew: () => setIsCreatingNew(true),
      }),
      [],
    );

    const handleItemSelect = (item: Record<string, unknown>) => {
      setSelectedItem(item);
      if (!junctionFields.length) {
        onItemSelect(item);
        onClose();
      }
    };

    const handleDirectAdd = (item: Record<string, unknown>) => {
      if (onDirectAdd) {
        const defaultJunctionData = junctionFields.reduce(
          (acc, field) => {
            acc[field.name] = '';
            return acc;
          },
          {} as Record<string, unknown>,
        );

        onDirectAdd({ ...item, ...defaultJunctionData });
        onClose();
      }
    };

    const handleAddToPending = (itemWithJunction: Record<string, unknown>) => {
      onItemSelect(itemWithJunction);
      setSelectedItem(null);
      onClose();
    };

    const handleCreateNew = async (
      formData: Record<string, unknown>,
      junctionData: Record<string, unknown>,
    ) => {
      try {
        await onCreateNew(formData, junctionData);
        setIsCreatingNew(false);
        onClose();
      } catch (error) {
        console.error('Failed to create item from pane', error);
      }
    };

    const handleCancel = () => {
      setSelectedItem(null);
      setIsCreatingNew(false);
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className='space-y-3'>
        {isCreatingNew ? (
          <CreatePane
            onCreateNew={handleCreateNew}
            onCancel={handleCancel}
            junctionFields={junctionFields}
            createTitle={createTitle}
            createDescription={createDescription}
            simpleCreateFields={simpleCreateFields}
          >
            {children}
          </CreatePane>
        ) : selectedItem ? (
          <SelectedItemPane
            key={String(selectedItem.id || 'new')}
            selectedItem={selectedItem}
            onAdd={handleAddToPending}
            onCancel={handleCancel}
            junctionFields={junctionFields}
            initialJunctionData={initialJunctionData}
          />
        ) : (
          <GenericSearchPane
            schema={schema}
            onSearch={onSearch}
            onItemSelect={handleItemSelect}
            onDirectAdd={handleDirectAdd}
            searchPlaceholder={searchPlaceholder}
            onCreateNew={() => setIsCreatingNew(true)}
            displayFields={displayFields}
            enableDirectAdd={enableDirectAdd}
          />
        )}
      </div>
    );
  },
);

SearchAndCreatePane.displayName = 'SearchAndCreatePane';
