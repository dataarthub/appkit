/**
 * @fileoverview useFormData - フォームデータ操作用フック
 *
 * useFindOne/useCreate/useUpdate/useDeleteを統合したフォームデータAPI。
 * FormViewと組み合わせて使用、または単独でフォームデータ操作に利用。
 *
 * @module form/use-form-data
 */

'use client';

import { useCallback, useMemo } from 'react';
import type { FieldValues } from 'react-hook-form';
import { useFindOne, useCreate, useUpdate, useDelete } from "../../lib/data-access/react-query";
import type { QueryOptions } from "../../lib/data-access/types";

// =============================================================================
// Types
// =============================================================================

/**
 * フォームデータステータス
 * Form data status for tracking operation state
 */
export type FormDataStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'success' | 'error';

/**
 * useFormDataオプション
 * Options for the useFormData hook
 */
export interface UseFormDataOptions {
  /** クエリオプション（populate等） / Query options */
  queryOptions?: QueryOptions;
  /** 作成成功時のコールバック / Create success callback */
  onCreateSuccess?: (data: unknown) => void;
  /** 更新成功時のコールバック / Update success callback */
  onUpdateSuccess?: (data: unknown) => void;
  /** 削除成功時のコールバック / Delete success callback */
  onDeleteSuccess?: () => void;
  /** エラー時のコールバック / Error callback */
  onError?: (error: Error) => void;
}

/**
 * useFormData戻り値
 * Return type for the useFormData hook
 *
 * ## AI/Automation Features
 * - `status`: idle | loading | saving | deleting | success | error
 * - Use for programmatic form data operations
 */
export interface UseFormDataResult<T> {
  /** 取得したデータ / Fetched data */
  data: T | null | undefined;
  /** 現在のステータス / Current status */
  status: FormDataStatus;
  /** ローディング中 / Is loading */
  isLoading: boolean;
  /** 保存中 / Is saving */
  isSaving: boolean;
  /** 削除中 / Is deleting */
  isDeleting: boolean;
  /** エラー / Error object */
  error: Error | null;
  /** データ取得 / Fetch data */
  fetch: () => void;
  /** データ作成 / Create data */
  create: (data: Partial<T>) => Promise<T>;
  /** データ更新 / Update data */
  update: (data: Partial<T>) => Promise<T>;
  /** データ保存（IDがあれば更新、なければ作成） / Save data (update if ID exists, create otherwise) */
  save: (data: Partial<T>) => Promise<T>;
  /** データ削除 / Delete data */
  remove: () => Promise<void>;
  /** データリセット / Reset to initial state */
  reset: () => void;
}

// =============================================================================
// useFormData Hook
// =============================================================================

/**
 * useFormData Hook
 * フォームデータ操作用の統合フック
 *
 * Provides a unified API for form data CRUD operations.
 * useFindOne/useCreate/useUpdate/useDeleteを統合したフォームデータ操作API。
 *
 * ## AI/Automation Features
 * - Use `status` property to track current operation state
 * - Programmatic access to form data without component
 *
 * @template T - データの型 / Data type
 * @param collection - コレクション名 / Collection name
 * @param id - ドキュメントID（編集時） / Document ID for editing
 * @param options - フックオプション / Hook options
 * @returns フォームデータ操作API / Form data operation API
 *
 * @example Basic usage
 * ```tsx
 * const { data, status, save, remove } = useFormData<User>('users', userId);
 *
 * // Save form data
 * const handleSubmit = async (values: User) => {
 *   await save(values);
 * };
 *
 * // Delete
 * const handleDelete = async () => {
 *   await remove();
 * };
 * ```
 *
 * @example Create mode (no ID)
 * ```tsx
 * const { create, status } = useFormData<User>('users');
 *
 * const handleCreate = async (values: User) => {
 *   const newUser = await create(values);
 *   console.log('Created:', newUser.id);
 * };
 * ```
 *
 * @example With callbacks
 * ```tsx
 * const { save, remove } = useFormData<User>('users', userId, {
 *   onUpdateSuccess: (data) => toast.success('保存しました'),
 *   onDeleteSuccess: () => navigate('/users'),
 *   onError: (error) => toast.error(error.message),
 * });
 * ```
 */
export function useFormData<T extends FieldValues>(
  collection: string,
  id?: string,
  options: UseFormDataOptions = {},
): UseFormDataResult<T> {
  const { queryOptions, onCreateSuccess, onUpdateSuccess, onDeleteSuccess, onError } = options;

  // Fetch data for edit mode
  const {
    data: fetchedData,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = useFindOne<T>(collection, id || '', queryOptions, { enabled: !!id });

  // Create mutation
  const createMutation = useCreate<T>(collection, {
    onSuccess: onCreateSuccess,
  });

  // Update mutation
  const updateMutation = useUpdate<T>(collection, {
    onSuccess: onUpdateSuccess,
  });

  // Delete mutation
  const deleteMutation = useDelete(collection, {
    onSuccess: onDeleteSuccess,
  });

  // Compute current status
  const status = useMemo<FormDataStatus>(() => {
    if (isFetching) return 'loading';
    if (createMutation.isPending || updateMutation.isPending) return 'saving';
    if (deleteMutation.isPending) return 'deleting';
    if (fetchError || createMutation.isError || updateMutation.isError || deleteMutation.isError) {
      return 'error';
    }
    if (createMutation.isSuccess || updateMutation.isSuccess || deleteMutation.isSuccess) {
      return 'success';
    }
    return 'idle';
  }, [
    isFetching,
    createMutation.isPending,
    createMutation.isError,
    createMutation.isSuccess,
    updateMutation.isPending,
    updateMutation.isError,
    updateMutation.isSuccess,
    deleteMutation.isPending,
    deleteMutation.isError,
    deleteMutation.isSuccess,
    fetchError,
  ]);

  // Get combined error
  const error = useMemo<Error | null>(() => {
    return (
      fetchError ||
      (createMutation.error as Error | null) ||
      (updateMutation.error as Error | null) ||
      (deleteMutation.error as Error | null)
    );
  }, [fetchError, createMutation.error, updateMutation.error, deleteMutation.error]);

  // Call onError when error changes
  useMemo(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Fetch function
  const fetch = useCallback(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Create function
  const create = useCallback(
    async (data: Partial<T>): Promise<T> => {
      const result = await createMutation.mutateAsync({
        data: data as Record<string, unknown>,
      });
      return result;
    },
    [createMutation],
  );

  // Update function
  const update = useCallback(
    async (data: Partial<T>): Promise<T> => {
      if (!id) {
        throw new Error('Cannot update without an ID');
      }
      const result = await updateMutation.mutateAsync({
        id,
        data: data as Record<string, unknown>,
      });
      return result;
    },
    [id, updateMutation],
  );

  // Save function (create or update based on ID)
  const save = useCallback(
    async (data: Partial<T>): Promise<T> => {
      if (id) {
        return update(data);
      }
      return create(data);
    },
    [id, create, update],
  );

  // Remove function
  const remove = useCallback(async (): Promise<void> => {
    if (!id) {
      throw new Error('Cannot delete without an ID');
    }
    await deleteMutation.mutateAsync({ id });
  }, [id, deleteMutation]);

  // Reset function
  const reset = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  }, [createMutation, updateMutation, deleteMutation]);

  return {
    data: fetchedData,
    status,
    isLoading: isFetching,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error,
    fetch,
    create,
    update,
    save,
    remove,
    reset,
  };
}
