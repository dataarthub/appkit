'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  buildApplyPayload,
  buildCandidateRecord,
  canApplyProposal,
  computeReviewStatus,
  verifyCurrentState,
} from "@alneas/appkit-core/ai";
import type {
  CandidateValidationResult,
  FieldDecision,
  FieldKey,
  RecordProposal,
  ReviewDecisions,
} from "@alneas/appkit-core/ai";
import type { ProposalReviewCardProps, UseProposalReviewReturn } from './types';

/** Options for useProposalReview hook. */
export interface UseProposalReviewOptions<
  TRecord extends Record<string, any> = Record<string, any>,
> {
  proposal: RecordProposal<TRecord>;
  currentRecord: TRecord;
  currentVersion: string | number;
  validateCandidate?: (candidate: TRecord) => CandidateValidationResult;
  onApply?: ProposalReviewCardProps<TRecord>['onApply'];
}

/**
 * 変更提案のレビュー状態を管理するカスタムフック
 *
 * @template TRecord レコード型
 * @param options フックオプション
 * @returns レビュー状態と操作ハンドラ
 */
export function useProposalReview<
  TRecord extends Record<string, any> = Record<string, any>,
>(options: UseProposalReviewOptions<TRecord>): UseProposalReviewReturn<TRecord> {
  const { proposal, currentRecord, currentVersion, validateCandidate, onApply } = options;

  // 提案切替（proposal.id 変更）の検知用
  const [activeProposalId, setActiveProposalId] = useState<string>(proposal.id);
  const [rawDecisions, setRawDecisions] = useState<ReviewDecisions<TRecord>>(
    {} as ReviewDecisions<TRecord>
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 表示世代カウンター: 提案切替（A→B, B→A など）のたびにインクリメント
  const [displayGeneration, setDisplayGeneration] = useState<number>(1);
  const displayGenerationRef = useRef<number>(1);

  // 実行トークン: 適用実行ごとに一意なトークンをインクリメント
  const executionTokenRef = useRef<number>(0);
  // 同期実行ロック: 再レンダー完了前の高速な連続クリック（二重実行）を同期的にブロック
  const isExecutingLockRef = useRef<boolean>(false);

  // プロジェクト標準ルール: 「No synchronous setState in useEffect」
  // 提案 ID が切り替わった場合、レンダー中に状態を初期化して同期ズレを防ぐ
  let decisions = rawDecisions;
  if (proposal.id !== activeProposalId) {
    setActiveProposalId(proposal.id);
    setRawDecisions({} as ReviewDecisions<TRecord>);
    setSaveError(null);
    setIsSubmitting(false);
    setDisplayGeneration((prev) => prev + 1);
    decisions = {} as ReviewDecisions<TRecord>;
  }

  // 提案が切り替わった場合、実行ロックを非同期完了を待たずに解除し、表示世代Refを同期
  useEffect(() => {
    displayGenerationRef.current = displayGeneration;
    isExecutingLockRef.current = false;
  }, [displayGeneration]);

  // 個別フィールド決定の更新
  const setDecision = useCallback((field: FieldKey<TRecord>, decision: FieldDecision) => {
    setRawDecisions((prev) => ({
      ...prev,
      [field]: decision,
    }));
    setSaveError(null);
  }, []);

  // 全採用
  const acceptAll = useCallback(() => {
    const next: Partial<Record<FieldKey<TRecord>, FieldDecision>> = {};
    for (const change of proposal.changes) {
      next[change.field] = 'accepted';
    }
    setRawDecisions(next);
    setSaveError(null);
  }, [proposal.changes]);

  // 全却下
  const rejectAll = useCallback(() => {
    const next: Partial<Record<FieldKey<TRecord>, FieldDecision>> = {};
    for (const change of proposal.changes) {
      next[change.field] = 'rejected';
    }
    setRawDecisions(next);
    setSaveError(null);
  }, [proposal.changes]);

  // リセット（全 pending）
  const resetDecisions = useCallback(() => {
    setRawDecisions({} as ReviewDecisions<TRecord>);
    setSaveError(null);
  }, []);

  // 候補レコードの合成（不変・純粋関数）
  const candidateRecord = useMemo(() => {
    return buildCandidateRecord(currentRecord, proposal, decisions);
  }, [currentRecord, proposal, decisions]);

  // 現在値およびバージョンとの整合性検査
  const consistency = useMemo(() => {
    return verifyCurrentState(currentRecord, currentVersion, proposal, decisions);
  }, [currentRecord, currentVersion, proposal, decisions]);

  // 候補レコード全体のカスタム検証（相関チェック等）
  const candidateValidation = useMemo(() => {
    if (!validateCandidate) return undefined;
    return validateCandidate(candidateRecord);
  }, [validateCandidate, candidateRecord]);

  // 全体のレビュー状態（派生値）
  const reviewStatus = useMemo(() => {
    return computeReviewStatus(proposal, decisions);
  }, [proposal, decisions]);

  // 適用可能かどうかの判定（onApply が指定されていることも条件）
  const canApply = useMemo(() => {
    if (!onApply) return false;
    return canApplyProposal({
      proposal,
      decisions,
      consistency,
      candidateValidation,
    });
  }, [onApply, proposal, decisions, consistency, candidateValidation]);

  // 適用実行ハンドラ（提案世代・トークン・同期ロックによる完全隔離）
  const handleApply = useCallback(async (): Promise<boolean> => {
    // 1. 同期ロックおよび適用可否チェック（再レンダー前の重複実行も防止）
    if (!canApply || isExecutingLockRef.current || !onApply) {
      return false;
    }

    isExecutingLockRef.current = true;
    const executionGen = displayGenerationRef.current;
    const currentToken = ++executionTokenRef.current;

    setIsSubmitting(true);
    setSaveError(null);

    try {
      const payload = buildApplyPayload({
        proposal,
        candidateRecord,
        decisions,
      });

      await onApply(payload);

      // 非同期完了時: 表示世代および実行トークンが現在と一致している場合のみ状態を更新
      if (
        displayGenerationRef.current === executionGen &&
        executionTokenRef.current === currentToken
      ) {
        setIsSubmitting(false);
        setSaveError(null);
        isExecutingLockRef.current = false;
        return true;
      }
      return false;
    } catch (err) {
      // 非同期失敗時: 表示世代および実行トークンが現在と一致している場合のみエラーを設定
      if (
        displayGenerationRef.current === executionGen &&
        executionTokenRef.current === currentToken
      ) {
        setIsSubmitting(false);
        const message = err instanceof Error ? err.message : '適用の保存中にエラーが発生しました';
        setSaveError(message);
        isExecutingLockRef.current = false;
      }
      return false;
    } finally {
      // 過去世代の結果が遅れて完了した場合の finally では、現在のロックを解除しない
      if (
        displayGenerationRef.current === executionGen &&
        executionTokenRef.current === currentToken
      ) {
        isExecutingLockRef.current = false;
      }
    }
  }, [canApply, onApply, proposal, candidateRecord, decisions]);

  return {
    decisions,
    setDecision,
    acceptAll,
    rejectAll,
    resetDecisions,
    candidateRecord,
    reviewStatus,
    consistency,
    candidateValidation,
    canApply,
    isSubmitting,
    saveError,
    handleApply,
  };
}
