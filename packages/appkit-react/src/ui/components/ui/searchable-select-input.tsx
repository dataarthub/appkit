import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Label } from './label';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { cn } from '../../lib/utils';
/** A value and its display text; independent of records or schemas. */
export interface SearchableSelectOption {
  value: string | number;
  label: string;
  description?: string;
  name?: string;
  code?: string;
}


/** options 未指定時に毎レンダーで新しい配列を作らないための安定参照 */
const EMPTY_OPTIONS: SearchableSelectOption[] = [];

/**
 * 候補ゼロ時の新規作成入力です。
 */
export interface SearchableSelectCreateInput {
  /** 新規レコードID */
  id?: string;
  /** 新規レコード名称 */
  name: string;
}

export type SearchableSelectCreateMode = 'manual_code' | 'sequence_code' | 'disabled';
export type SearchableSelectDisplayField =
  | 'label'
  | 'description'
  | 'name'
  | 'code'
  | 'value'
  | 'none';
export type SearchableSelectDisplayPosition = 'right' | 'below';

/**
 * 候補ゼロ時に親コンポーネントへ通知する「新規作成リクエスト」です。
 */
export interface SearchableSelectCreateRequest {
  /** ユーザーが入力していた検索文字列 */
  query: string;
  /** コード採番モード */
  mode: SearchableSelectCreateMode;
}

/**
 * SearchableSelectInput のプロパティです。
 */
export interface SearchableSelectInputProps {
  /** 現在の選択値（ID等）。null/undefined は未選択 */
  value?: string | number | null;
  /** 値が変更された際に呼ばれるコールバック */
  onValueChange: (value: string) => void;
  /** 同期的に利用可能な候補一覧（ローカルフィルタ対象） */
  options?: SearchableSelectOption[];
  /** 非同期検索関数 */
  onSearch?: (query: string) => Promise<SearchableSelectOption[]>;
  /** 新規作成関数 */
  onCreateOption?: (input: SearchableSelectCreateInput) => Promise<SearchableSelectOption>;
  /** 候補ゼロ時の「新規作成」選択を親へ通知 */
  onCreateRequested?: (request: SearchableSelectCreateRequest) => void;
  /** デバウンス時間（ms） */
  debounceMs?: number;
  /** 検索を開始する最小入力文字数 */
  minSearchLength?: number;
  /** 値（ID）による部分一致フィルタを有効にするか */
  matchByValue?: boolean;
  /** ラベル（名称）による部分一致フィルタを有効にするか */
  matchByLabel?: boolean;
  /** 補足説明（コード等）による部分一致フィルタを有効にするか */
  matchByDescription?: boolean;
  /** 候補リストにID（value）を表示するか */
  showValueInList?: boolean;
  /** 候補一覧に無い任意の値入力を許可するか */
  allowCustomValue?: boolean;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 入力を無効化するか */
  disabled?: boolean;
  /** 読み取り専用にするか */
  readOnly?: boolean;
  /** 追加CSSクラス名 */
  className?: string;
  /** blur イベント通知コールバック */
  onBlur?: () => void;
  /** 候補ゼロ時に表示するメッセージ */
  noOptionsMessage?: string;
  /** 新規作成ダイアログのタイトル */
  createDialogTitle?: string;
  /** 新規作成フォームのIDラベル */
  createIdLabel?: string;
  /** 新規作成フォームの名称ラベル */
  createNameLabel?: string;
  /** 新規作成時のコード採番モード */
  createMode?: SearchableSelectCreateMode;
  /** 入力要素への ref */
  inputRef?: React.Ref<HTMLInputElement>;
  /** ドロップダウンにインライン表示する候補の最大件数 */
  maxInlineResults?: number;
  /** 検索結果が maxInlineResults を超えた際に表示するメッセージ */
  tooManyMessage?: string;
  /** 検索結果が厳密に1件のみの場合に、自動的にその候補を選択するか */
  autoSelectSingle?: boolean;
  /** ダブルクリック時に呼ばれるコールバック */
  onDoubleClick?: () => void;
  /** 選択確定後にコード(ID)を表示する方法 */
  showIdInInput?: boolean | 'right' | 'below';
  /** 選択済み表示の主表示フィールド */
  primaryDisplayField?: SearchableSelectDisplayField;
  /** 選択済み表示の副表示フィールド */
  secondaryDisplayField?: SearchableSelectDisplayField;
  /** 副表示の配置位置 */
  secondaryDisplayPosition?: SearchableSelectDisplayPosition;
  /** 値をクリアするコールバック */
  onClear?: () => void;
  /** 選択確定後に2行目に表示する内容 */
  belowContent?: string | ((option: SearchableSelectOption) => string);
  /**
   * コード（値）入力と名称入力を別々のインプットとして分離して表示するレイアウト。
   * - 'horizontal': 横並び（左側にコード、右側に名称）
   * - 'vertical': 縦並び（上がコード、下が名称）
   * - undefined: 従来の単一インプット
   */
  splitLayout?: 'horizontal' | 'vertical';
  /** コード（値）入力欄のプレースホルダー */
  codePlaceholder?: string;
  /** 名称入力欄のプレースホルダー */
  namePlaceholder?: string;
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

/**
 * 入力されたテキストに基づいて候補を検索（ローカルまたは非同期）して選択できる、インクリメンタルサーチ対応のセレクトボックス。
 */
export function SearchableSelectInput({
  value,
  onValueChange,
  options = EMPTY_OPTIONS,
  onSearch,
  onCreateOption,
  onCreateRequested,
  debounceMs = 300,
  minSearchLength = 1,
  matchByValue = true,
  matchByLabel = true,
  allowCustomValue = true,
  placeholder,
  disabled,
  readOnly,
  className,
  onBlur,
  noOptionsMessage = '候補なし',
  createDialogTitle = '候補がありません。新規作成しますか？',
  createIdLabel = 'コード',
  createNameLabel = '名称',
  createMode = 'manual_code',
  inputRef,
  maxInlineResults = 10,
  tooManyMessage = 'さらに絞り込んでください',
  autoSelectSingle = false,
  onDoubleClick,
  showIdInInput = false,
  primaryDisplayField,
  secondaryDisplayField,
  secondaryDisplayPosition = 'right',
  onClear,
  belowContent,
  matchByDescription = true,
  showValueInList = true,
  splitLayout,
  codePlaceholder,
  namePlaceholder,
}: SearchableSelectInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [isFocused, setIsFocused] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [remoteOptions, setRemoteOptions] = React.useState<SearchableSelectOption[]>([]);
  const [knownOptions, setKnownOptions] = React.useState<SearchableSelectOption[]>(options);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createId, setCreateId] = React.useState('');
  const [createName, setCreateName] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [codeInputValue, setCodeInputValue] = React.useState('');
  const [isCodeFocused, setIsCodeFocused] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);
  const requestIdRef = React.useRef(0);
  const lastSearchQueryRef = React.useRef('');
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputElRef = React.useRef<HTMLInputElement | null>(null);
  const autoSelectedValueRef = React.useRef<string>('');
  const composingRef = React.useRef(false);
  const skipBlurClearRef = React.useRef(false);
  const isDeletingRef = React.useRef(false);
  const deletingTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (deletingTimerRef.current !== null) {
        window.clearTimeout(deletingTimerRef.current);
      }
    };
  }, []);

  const currentOptionsKey = React.useMemo(
    () => options.map((o) => String(o.value)).join(','),
    [options],
  );
  const [stabilizedOptions, setStabilizedOptions] = React.useState(options);
  const [prevOptionsKey, setPrevOptionsKey] = React.useState(currentOptionsKey);

  if (currentOptionsKey !== prevOptionsKey) {
    setStabilizedOptions(options);
    setPrevOptionsKey(currentOptionsKey);
  }

  React.useEffect(() => {
    if (stabilizedOptions.length === 0) return;
    queueMicrotask(() => {
      setKnownOptions((prev) => {
        const merged = uniqByValue([...prev, ...stabilizedOptions]);
        if (merged.length === prev.length) return prev;
        return merged;
      });
    });
  }, [stabilizedOptions]);

  const selectedRawValue = normalize(value);

  const selectedOption = React.useMemo(
    () => knownOptions.find((option) => String(option.value) === selectedRawValue),
    [knownOptions, selectedRawValue],
  );

  // splitLayout 時のコード入力値の同期
  React.useEffect(() => {
    if (splitLayout) {
      if (isCodeFocused) return;
      if (selectedOption) {
        const codeVal =
          selectedOption.code ||
          (selectedOption.description
            ? String(selectedOption.description)
            : String(selectedOption.value));
        queueMicrotask(() => {
          setCodeInputValue(codeVal);
        });
      } else {
        queueMicrotask(() => {
          setCodeInputValue(selectedRawValue);
        });
      }
    }
  }, [selectedOption, selectedRawValue, splitLayout, isCodeFocused]);

  const resolveDisplayField = React.useCallback(
    (option: SearchableSelectOption, field: SearchableSelectDisplayField | undefined): string => {
      if (!field || field === 'none') return '';
      switch (field) {
        case 'label':
          return option.label || '';
        case 'description':
          return option.description ? String(option.description) : '';
        case 'name':
          return option.name || option.label || '';
        case 'code':
          return option.code || (option.description ? String(option.description) : '');
        case 'value':
          return String(option.value);
        default:
          return '';
      }
    },
    [],
  );
  const hasExplicitDisplayConfig = Boolean(primaryDisplayField || secondaryDisplayField);
  const explicitPrimaryText = React.useMemo(() => {
    if (!selectedOption || !primaryDisplayField) return '';
    return resolveDisplayField(selectedOption, primaryDisplayField);
  }, [selectedOption, primaryDisplayField, resolveDisplayField]);
  const explicitSecondaryText = React.useMemo(() => {
    if (!selectedOption || !secondaryDisplayField || secondaryDisplayField === 'none') return '';
    const secondary = resolveDisplayField(selectedOption, secondaryDisplayField);
    const primary = primaryDisplayField
      ? resolveDisplayField(selectedOption, primaryDisplayField)
      : '';
    if (!secondary || secondary === primary) return '';
    return secondary;
  }, [selectedOption, secondaryDisplayField, primaryDisplayField, resolveDisplayField]);

  const lastValueRef = React.useRef(value);
  const inputValueRef = React.useRef(inputValue);
  React.useLayoutEffect(() => {
    inputValueRef.current = inputValue;
  });
  React.useEffect(() => {
    const currentInputValue = inputValueRef.current;
    const isExternalUpdate = value !== lastValueRef.current;
    const hasResolvedLabel =
      selectedOption && selectedOption.label !== String(selectedOption.value);
    const isCurrentlyUuid = currentInputValue === String(value) && value !== '';
    const targetLabel = selectedOption
      ? hasExplicitDisplayConfig
        ? primaryDisplayField === 'none'
          ? ''
          : explicitPrimaryText || selectedOption.label
        : selectedOption.label
      : selectedRawValue;

    if (currentInputValue === targetLabel && !isExternalUpdate) return;

    if (isFocused && isExternalUpdate && isDeletingRef.current) {
      lastValueRef.current = value;
      return;
    }

    if (isFocused && isExternalUpdate && String(value) === currentInputValue) {
      lastValueRef.current = value;
      return;
    }

    if (
      isExternalUpdate ||
      (isCurrentlyUuid && hasResolvedLabel) ||
      (!isFocused && (selectedOption || selectedRawValue))
    ) {
      setInputValue(targetLabel);
      lastValueRef.current = value;
    }
  }, [
    value,
    selectedOption,
    selectedRawValue,
    isFocused,
    hasExplicitDisplayConfig,
    explicitPrimaryText,
    primaryDisplayField,
  ]);

  const showIdBelow = !hasExplicitDisplayConfig && showIdInInput === 'below';
  const showIdRight =
    !hasExplicitDisplayConfig && (showIdInInput === true || showIdInInput === 'right');

  const displayIdSuffix = React.useMemo(() => {
    if (hasExplicitDisplayConfig) {
      if (!selectedOption || secondaryDisplayPosition !== 'right') return null;
      return explicitSecondaryText || null;
    }
    if (!showIdRight || !selectedOption) return null;
    const displayVal = selectedOption.description
      ? String(selectedOption.description)
      : String(selectedOption.value);
    if (displayVal === selectedOption.label || !displayVal) return null;
    return displayVal;
  }, [
    hasExplicitDisplayConfig,
    selectedOption,
    secondaryDisplayPosition,
    explicitSecondaryText,
    showIdRight,
  ]);

  const displayIdBelow = React.useMemo(() => {
    if (hasExplicitDisplayConfig) {
      if (!selectedOption || secondaryDisplayPosition !== 'below') return null;
      return explicitSecondaryText || null;
    }
    if (!showIdBelow || !selectedOption) return null;
    const displayVal = selectedOption.description
      ? String(selectedOption.description)
      : String(selectedOption.value);
    if (displayVal === selectedOption.label || !displayVal) return null;
    return displayVal;
  }, [
    hasExplicitDisplayConfig,
    selectedOption,
    secondaryDisplayPosition,
    explicitSecondaryText,
    showIdBelow,
  ]);

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const searchFn = onSearch ?? null;
  const createFn = onCreateOption ?? null;

  const localFilteredOptions = React.useMemo(() => {
    if (!normalizedQuery) {
      const base = stabilizedOptions;
      if (selectedOption && !base.find((o) => String(o.value) === String(selectedOption.value))) {
        return uniqByValue([...base, selectedOption]);
      }
      return base;
    }
    return knownOptions.filter((option) => {
      const byLabel = matchByLabel ? option.label.toLowerCase().includes(normalizedQuery) : false;
      const byValue = matchByValue
        ? String(option.value).toLowerCase().includes(normalizedQuery)
        : false;
      const byDescription = matchByDescription
        ? String(option.description || '')
            .toLowerCase()
            .includes(normalizedQuery)
        : false;
      return byLabel || byValue || byDescription;
    });
  }, [
    normalizedQuery,
    knownOptions,
    matchByLabel,
    matchByValue,
    matchByDescription,
    selectedOption,
    stabilizedOptions,
  ]);

  const searchFnRef = React.useRef(searchFn);
  React.useLayoutEffect(() => {
    searchFnRef.current = searchFn;
  });

  const canCreate = Boolean(createFn) && createMode !== 'disabled';
  const canRequestCreate = Boolean(onCreateRequested) && createMode !== 'disabled';
  const canStartCreate = canCreate || canRequestCreate;
  const idInputEnabled = createMode === 'manual_code';

  React.useEffect(() => {
    if (!searchFnRef.current) return;

    const isRefinement =
      lastSearchQueryRef.current &&
      normalizedQuery.startsWith(lastSearchQueryRef.current.toLowerCase()) &&
      remoteOptions.length > 0 &&
      remoteOptions.length <= 10;

    if (isRefinement) {
      return;
    }

    if (normalizedQuery.length < minSearchLength) {
      queueMicrotask(() => {
        setRemoteOptions((prev) => (prev.length === 0 ? prev : []));
        setLoading(false);
      });
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const fetched = await searchFnRef.current!(query);
        if (requestIdRef.current !== requestId) return;
        lastSearchQueryRef.current = query;
        setRemoteOptions(fetched);
        setKnownOptions((prev) => uniqByValue([...prev, ...fetched]));
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query, normalizedQuery, remoteOptions.length, minSearchLength, debounceMs]);

  const filteredOptions = React.useMemo(() => {
    if (!searchFn) return localFilteredOptions;
    if (normalizedQuery.length < minSearchLength) return localFilteredOptions;

    return remoteOptions.filter((option: SearchableSelectOption) => {
      const byLabel = matchByLabel ? option.label.toLowerCase().includes(normalizedQuery) : false;
      const byValue = matchByValue
        ? String(option.value).toLowerCase().includes(normalizedQuery)
        : false;
      const byDescription = matchByDescription
        ? String(option.description || '')
            .toLowerCase()
            .includes(normalizedQuery)
        : false;
      return byLabel || byValue || byDescription;
    });
  }, [
    searchFn,
    localFilteredOptions,
    normalizedQuery,
    minSearchLength,
    matchByLabel,
    matchByValue,
    matchByDescription,
    remoteOptions,
  ]);

  const visibleOptions = React.useMemo(() => {
    if (filteredOptions.length <= maxInlineResults) return filteredOptions;
    return filteredOptions.slice(0, maxInlineResults);
  }, [filteredOptions, maxInlineResults]);

  const hasTooMany = filteredOptions.length > maxInlineResults;

  const resolvedTooManyMessage = React.useMemo(() => {
    return tooManyMessage.replace('{count}', String(filteredOptions.length));
  }, [tooManyMessage, filteredOptions.length]);

  const applyOption = React.useCallback(
    (option: SearchableSelectOption, keepOpen: boolean, index: number) => {
      const nextValue = String(option.value);
      setKnownOptions((prev: SearchableSelectOption[]) => uniqByValue([...prev, option]));
      onValueChange(nextValue);
      const nextInputText = hasExplicitDisplayConfig
        ? resolveDisplayField(option, primaryDisplayField) || option.label
        : option.label;
      setInputValue(nextInputText);
      setQuery('');
      setOpen(keepOpen);
      setHighlightedIndex(keepOpen ? index : -1);
      if (!keepOpen) {
        const el = inputElRef.current;
        if (el) {
          const td = el.closest('td');
          const nextTd = td?.nextElementSibling as HTMLElement | null;
          const nextInput = nextTd?.querySelector<HTMLElement>(
            'input, textarea, select, [role="combobox"]',
          );
          if (nextInput) {
            skipBlurClearRef.current = true;
            nextInput.focus();
          } else {
            skipBlurClearRef.current = true;
            el.blur();
          }
        }
      }
    },
    [onValueChange, hasExplicitDisplayConfig, resolveDisplayField, primaryDisplayField],
  );

  // 自動選択
  React.useEffect(() => {
    if (
      !autoSelectSingle ||
      loading ||
      !isFocused ||
      composingRef.current ||
      isDeletingRef.current ||
      filteredOptions.length !== 1 ||
      normalizedQuery.length < minSearchLength
    ) {
      return;
    }
    const single = filteredOptions[0];
    const singleValue = String(single.value);
    if (autoSelectedValueRef.current === singleValue) return;
    autoSelectedValueRef.current = singleValue;
    setKnownOptions((prev: SearchableSelectOption[]) => uniqByValue([...prev, single]));

    onValueChange(singleValue);
    const singleInputText = hasExplicitDisplayConfig
      ? resolveDisplayField(single, primaryDisplayField) || single.label
      : single.label;
    setInputValue(singleInputText);
    setQuery('');
    setOpen(false);
    setHighlightedIndex(-1);

    const el = inputElRef.current;
    if (el) {
      const td = el.closest('td');
      const nextTd = td?.nextElementSibling as HTMLElement | null;
      const nextInput = nextTd?.querySelector<HTMLElement>(
        'input, textarea, select, [role="combobox"]',
      );
      if (nextInput) {
        skipBlurClearRef.current = true;
        nextInput.focus();
      } else {
        skipBlurClearRef.current = true;
        el.blur();
      }
    }
  }, [
    autoSelectSingle,
    loading,
    isFocused,
    filteredOptions,
    normalizedQuery,
    minSearchLength,
    onValueChange,
    hasExplicitDisplayConfig,
    resolveDisplayField,
    primaryDisplayField,
  ]);

  React.useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setHighlightedIndex(-1);
      });
      return;
    }
    if (visibleOptions.length === 0) {
      queueMicrotask(() => {
        setHighlightedIndex(-1);
      });
      return;
    }
    const selectedIndex = visibleOptions.findIndex(
      (option) => String(option.value) === selectedRawValue,
    );
    queueMicrotask(() => {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    });
  }, [open, visibleOptions, selectedRawValue]);

  const handleInputValue = React.useCallback(
    (raw: string) => {
      const prevLen = inputValueRef.current.length;
      const isDeleting = raw.length < prevLen;
      setInputValue(raw);
      setQuery(raw);
      setOpen(true);

      if (deletingTimerRef.current !== null) {
        window.clearTimeout(deletingTimerRef.current);
        deletingTimerRef.current = null;
      }

      if (isDeleting) {
        isDeletingRef.current = true;
        deletingTimerRef.current = window.setTimeout(() => {
          isDeletingRef.current = false;
          deletingTimerRef.current = null;
        }, 800);
      } else {
        isDeletingRef.current = false;
        autoSelectedValueRef.current = '';
      }

      if (!allowCustomValue) return;
      onValueChange(raw);
    },
    [allowCustomValue, onValueChange],
  );

  const showCreatePrompt =
    canStartCreate &&
    !loading &&
    trimmedQuery.length >= minSearchLength &&
    filteredOptions.length === 0;

  const createPromptLabel = trimmedQuery ? `「${trimmedQuery}」で新規作成` : '新規作成';

  const openCreateDialog = React.useCallback(() => {
    const nextValue = query.trim();
    setCreateId(idInputEnabled ? nextValue : '');
    setCreateName(nextValue);
    setCreateOpen(true);
  }, [query, idInputEnabled]);

  const triggerCreate = React.useCallback(() => {
    const nextValue = query.trim();
    if (!nextValue) return;
    if (onCreateRequested) {
      setOpen(false);
      setHighlightedIndex(-1);
      onCreateRequested({ query: nextValue, mode: createMode });
      return;
    }
    openCreateDialog();
  }, [query, onCreateRequested, createMode, openCreateDialog]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        if (event.key === 'Enter') {
          event.stopPropagation();
        }
        return;
      }
      const key = event.key;

      if (key === 'Enter' && open) {
        if ((event.ctrlKey || event.metaKey) && showCreatePrompt) {
          event.preventDefault();
          event.stopPropagation();
          triggerCreate();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const option = visibleOptions[highlightedIndex];
        if (option) {
          applyOption(option, false, highlightedIndex);
        }
        return;
      }

      if (key === 'Escape' || key === 'Esc') {
        event.preventDefault();
        if (open) {
          setOpen(false);
          setHighlightedIndex(-1);
        } else {
          if (onClear) {
            onClear();
          } else {
            onValueChange('');
          }
          setInputValue('');
          setQuery('');
          autoSelectedValueRef.current = '';
        }
        return;
      }

      if (key === 'F2' && onDoubleClick && !disabled && !readOnly) {
        event.preventDefault();
        setOpen(false);
        onDoubleClick();
        return;
      }
    },
    [
      visibleOptions,
      highlightedIndex,
      open,
      applyOption,
      onDoubleClick,
      disabled,
      readOnly,
      onClear,
      onValueChange,
      showCreatePrompt,
      triggerCreate,
    ],
  );

  const submitCreate = React.useCallback(async () => {
    if (!createFn) return;
    const id = idInputEnabled ? createId.trim() : '';
    const name = createName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const created = await createFn({ id, name });
      setKnownOptions((prev) => uniqByValue([...prev, created]));
      applyOption(created, false, -1);
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }, [createFn, createId, createName, applyOption, idInputEnabled]);

  const resolveCode = React.useCallback(
    async (raw: string) => {
      if (raw === '') {
        onValueChange('');
        setInputValue('');
        setQuery('');
        return;
      }

      // まずは既知の候補から
      let match = knownOptions.find(
        (o) =>
          String(o.value) === raw ||
          (o.code && o.code === raw) ||
          (o.description && String(o.description) === raw),
      );

      if (!match && searchFn) {
        setLoading(true);
        try {
          const fetched = await searchFn(raw);
          const exact = fetched.find(
            (o) =>
              String(o.value) === raw ||
              (o.code && o.code === raw) ||
              (o.description && String(o.description) === raw),
          );
          if (exact) {
            match = exact;
          }
        } catch (e) {
          console.error('Code lookup error', e);
        } finally {
          setLoading(false);
        }
      }

      if (match) {
        applyOption(match, false, -1);
      } else {
        if (allowCustomValue) {
          onValueChange(raw);
          setInputValue(raw);
        } else {
          if (canStartCreate) {
            setQuery(raw);
            if (onCreateRequested) {
              onCreateRequested({ query: raw, mode: createMode });
            } else {
              const nextValue = raw.trim();
              setCreateId(idInputEnabled ? nextValue : '');
              setCreateName('');
              setCreateOpen(true);
            }
          } else {
            // 一致せず作成も不可の場合は元に戻す
            setCodeInputValue(
              selectedOption ? selectedOption.code || String(selectedOption.value) : '',
            );
          }
        }
      }
    },
    [
      knownOptions,
      searchFn,
      applyOption,
      onValueChange,
      allowCustomValue,
      canStartCreate,
      onCreateRequested,
      createMode,
      idInputEnabled,
      selectedOption,
    ],
  );

  const handleCodeKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        resolveCode(codeInputValue);
      }
    },
    [codeInputValue, resolveCode],
  );

  const showLabelOverlay = !isFocused && selectedRawValue !== '';
  const overlayLabel = selectedOption
    ? hasExplicitDisplayConfig
      ? primaryDisplayField === 'none'
        ? ''
        : explicitPrimaryText || selectedOption.label
      : selectedOption.label
    : selectedRawValue;
  const showLookupIcon = Boolean(onDoubleClick) && isFocused && !disabled && !readOnly;

  return (
    <ComboboxPrimitive.Root
      open={open && !disabled && !readOnly}
      onOpenChange={setOpen}
      value={selectedRawValue}
      onValueChange={(next) => {
        if (next !== null && next !== undefined) {
          const opt = knownOptions.find((o) => String(o.value) === String(next));
          if (opt) {
            applyOption(opt, false, -1);
          } else {
            onValueChange(String(next));
          }
        }
      }}
    >
      <div ref={containerRef} className='relative w-full flex-1 flex flex-col'>
        <div
          className={cn(
            'w-full',
            splitLayout === 'horizontal'
              ? 'flex flex-row items-stretch'
              : splitLayout === 'vertical'
                ? 'flex flex-col'
                : 'relative',
          )}
        >
          {splitLayout && (
            <Input
              value={codeInputValue}
              placeholder={codePlaceholder || 'コード'}
              disabled={disabled}
              readOnly={readOnly}
              className={cn(
                'flex-shrink-0',
                splitLayout === 'horizontal'
                  ? 'w-28 rounded-r-none border-r-0'
                  : 'w-full rounded-b-none border-b-0',
                'focus:z-10 focus-visible:ring-1',
              )}
              onChange={(e) => setCodeInputValue(e.target.value)}
              onFocus={() => setIsCodeFocused(true)}
              onBlur={() => {
                setIsCodeFocused(false);
                resolveCode(codeInputValue);
              }}
              onKeyDown={handleCodeKeyDown}
            />
          )}
          <div className={cn('flex-1', splitLayout ? 'relative' : '')}>
            {showLabelOverlay && (
              <div
                className={className}
                aria-hidden='true'
                style={{
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: className?.includes('flex-col') ? 'flex-start' : 'center',
                  paddingLeft: 'inherit',
                  paddingRight: 'inherit',
                }}
              >
                {overlayLabel}
                {selectedOption &&
                  !hasExplicitDisplayConfig &&
                  belowContent != null &&
                  (() => {
                    const text =
                      typeof belowContent === 'function'
                        ? belowContent(selectedOption)
                        : belowContent;
                    return text ? (
                      <div style={{ fontSize: '0.75em', opacity: 0.6, lineHeight: 1.2 }}>
                        {text}
                      </div>
                    ) : null;
                  })()}
              </div>
            )}
            <ComboboxPrimitive.Input
              render={(inputProps) => (
                <Input
                  {...inputProps}
                  ref={(el: HTMLInputElement | null) => {
                    inputElRef.current = el;
                    // Chain refs correctly
                    if (typeof inputRef === 'function') {
                      inputRef(el);
                    } else if (inputRef) {
                      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }
                    if (typeof inputProps.ref === 'function') {
                      inputProps.ref(el);
                    } else if (inputProps.ref) {
                      (inputProps.ref as React.MutableRefObject<HTMLInputElement | null>).current =
                        el;
                    }
                  }}
                  value={inputValue}
                  placeholder={splitLayout ? namePlaceholder || placeholder : placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                  className={cn(
                    className,
                    splitLayout === 'horizontal'
                      ? 'rounded-l-none'
                      : splitLayout === 'vertical'
                        ? 'rounded-t-none'
                        : '',
                  )}
                  autoComplete='off'
                  style={{
                    ...(displayIdSuffix
                      ? { paddingRight: `${displayIdSuffix.length * 0.6 + 1.5}em` }
                      : {}),
                    ...(showLookupIcon ? { paddingRight: '2rem' } : {}),
                    ...(showLabelOverlay
                      ? { color: 'transparent', caretColor: 'transparent' }
                      : {}),
                  }}
                  onChange={(event) => {
                    inputProps.onChange?.(event);
                    if (!composingRef.current) {
                      handleInputValue(event.target.value);
                    } else {
                      setInputValue(event.target.value);
                    }
                  }}
                  onCompositionStart={(event) => {
                    inputProps.onCompositionStart?.(event);
                    composingRef.current = true;
                  }}
                  onCompositionEnd={(event) => {
                    inputProps.onCompositionEnd?.(event);
                    composingRef.current = false;
                    handleInputValue((event.target as HTMLInputElement).value);
                  }}
                  onFocus={(event) => {
                    inputProps.onFocus?.(event);
                    setIsFocused(true);
                    setOpen(true);
                    setQuery('');
                  }}
                  onClick={(event) => {
                    inputProps.onClick?.(event);
                    setOpen(true);
                    setQuery('');
                  }}
                  onDoubleClick={() => {
                    if (onDoubleClick && !disabled && !readOnly) {
                      setOpen(false);
                      onDoubleClick();
                    }
                  }}
                  onKeyDownCapture={(event) => {
                    inputProps.onKeyDown?.(event);
                    handleKeyDown(event);
                  }}
                  onBlur={(event) => {
                    inputProps.onBlur?.(event);
                    setIsFocused(false);
                    if (closeTimerRef.current !== null) {
                      window.clearTimeout(closeTimerRef.current);
                    }
                    closeTimerRef.current = window.setTimeout(() => {
                      setOpen(false);
                      skipBlurClearRef.current = false;
                    }, 120);
                    onBlur?.();
                  }}
                />
              )}
            />
            {showLookupIcon && (
              <button
                type='button'
                onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  onDoubleClick?.();
                }}
                style={{
                  position: 'absolute',
                  right: '0.25rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1.5rem',
                  height: '1.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.25rem',
                  color: 'var(--muted-foreground, #999)',
                  background: 'transparent',
                  zIndex: 2,
                }}
                aria-label='詳細検索'
                title='詳細検索 (F2)'
              >
                <Search size={14} />
              </button>
            )}
            {displayIdSuffix && (
              <span
                style={{
                  position: 'absolute',
                  right: '0.5em',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.75em',
                  color: 'var(--muted-foreground, #999)',
                  pointerEvents: 'none',
                  opacity: 0.7,
                  userSelect: 'none',
                  zIndex: 2,
                }}
              >
                {displayIdSuffix}
              </span>
            )}
          </div>
        </div>
        <div className='flex flex-col min-h-[1.25rem] pointer-events-none'>
          {(displayIdBelow || belowContent) && (
            <div className='text-[10px] text-muted-foreground leading-none px-2 py-1'>
              {(() => {
                const text =
                  typeof belowContent === 'function'
                    ? selectedOption
                      ? belowContent(selectedOption)
                      : null
                    : belowContent;
                return text || displayIdBelow;
              })()}
            </div>
          )}
        </div>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side='bottom'
          sideOffset={6}
          align='start'
          className='isolate z-50'
          anchor={containerRef}
        >
          <ComboboxPrimitive.Popup className='max-h-56 overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md min-w-[calc(var(--anchor-width))]'>
            {loading && <div className='px-3 py-1.5 text-sm text-muted-foreground'>検索中...</div>}

            {!loading &&
              visibleOptions.length > 0 &&
              visibleOptions.map((option, index) => {
                const isSelected =
                  selectedRawValue !== '' && String(option.value) === selectedRawValue;
                const showValue = showValueInList && String(option.value) !== option.label;

                return (
                  <ComboboxPrimitive.Item
                    key={String(option.value)}
                    value={String(option.value)}
                    className={cn(
                      'block w-full px-3 py-1.5 text-left text-sm cursor-default select-none outline-none',
                      'hover:bg-accent hover:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                      isSelected ? 'bg-primary/10 text-foreground font-semibold' : '',
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => applyOption(option, false, index)}
                  >
                    <div className='flex items-start justify-between gap-2 w-full'>
                      <div className='flex-1 truncate'>
                        <div className='truncate'>{option.label || String(option.value)}</div>
                      </div>
                      <div className='flex flex-col items-end gap-0.5 text-xs text-muted-foreground flex-shrink-0'>
                        {option.description ? (
                          <span className='leading-none'>{option.description}</span>
                        ) : (
                          showValue && <span className='leading-none'>{String(option.value)}</span>
                        )}
                      </div>
                    </div>
                  </ComboboxPrimitive.Item>
                );
              })}

            {!loading && hasTooMany && (
              <div className='border-t px-3 py-1.5 text-xs text-muted-foreground'>
                {filteredOptions.length}件中{maxInlineResults}件を表示 — {resolvedTooManyMessage}
              </div>
            )}

            {!loading && filteredOptions.length === 0 && (
              <div className='px-3 py-1.5 text-sm text-muted-foreground'>{noOptionsMessage}</div>
            )}

            {showCreatePrompt && (
              <div className='border-t'>
                <button
                  type='button'
                  className='block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground'
                  onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
                  onClick={triggerCreate}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <span className='truncate'>{createPromptLabel}</span>
                    <span className='text-[11px] text-muted-foreground whitespace-nowrap'>
                      Ctrl/Cmd+Enter
                    </span>
                  </div>
                </button>
              </div>
            )}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{createDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            {idInputEnabled && (
              <div className='space-y-1'>
                <Label htmlFor='searchable-select-create-id'>{createIdLabel}</Label>
                <Input
                  id='searchable-select-create-id'
                  value={createId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateId(event.target.value)
                  }
                  placeholder={createIdLabel}
                />
              </div>
            )}
            <div className='space-y-1'>
              <Label htmlFor='searchable-select-create-name'>{createNameLabel}</Label>
              <Input
                id='searchable-select-create-name'
                value={createName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateName(event.target.value)
                }
                placeholder='名称'
              />
            </div>
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                キャンセル
              </Button>
              <Button
                type='button'
                onClick={submitCreate}
                disabled={creating || !createName.trim() || (idInputEnabled && !createId.trim())}
              >
                {creating ? '作成中...' : '作成'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ComboboxPrimitive.Root>
  );
}
