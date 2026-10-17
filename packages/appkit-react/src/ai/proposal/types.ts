import type {
  ApplyProposalPayload,
  CandidateValidationResult,
  FieldDecision,
  FieldKey,
  ProposalReviewStatus,
  RecordProposal,
  ReviewDecisions,
} from "@alneas/appkit-core/ai";

/** Props for ProposalReviewCard. */
export interface ProposalReviewCardProps<
  TRecord extends Record<string, any> = Record<string, any>,
> {
  /** 変更提案オブジェクト（イミュータブル） */
  proposal: RecordProposal<TRecord>;

  /** 最新の元データレコード */
  currentRecord: TRecord;

  /** アプリケーションが保持する元データの現在バージョン */
  currentVersion: string | number;

  /**
   * レコード全体の業務検証関数（相関チェックやスキーマ検証）
   * 候補レコード（現在値＋採用分）全体を検証します。
   */
  validateCandidate?: (candidate: TRecord) => CandidateValidationResult;

  /**
   * 適用ハンドラ（フォームへの反映、またはサーバーへの永続化リクエスト）
   */
  onApply?: (payload: ApplyProposalPayload<TRecord>) => void | Promise<void>;

  /** 提案全体の破棄・スキップハンドラ */
  onDismiss?: () => void;

  /** 適用ボタンのラベル（デフォルト: "適用する"） */
  applyLabel?: string;

  /** カードの見出し（デフォルト: proposal.targetName または "変更提案の確認"） */
  title?: string;

  /** カスタムクラス名 */
  className?: string;

  /** テストID */
  testId?: string;
}

/** Return type of useProposalReview hook. */
export interface UseProposalReviewReturn<
  TRecord extends Record<string, any> = Record<string, any>,
> {
  /** 各フィールドの決定マップ */
  decisions: ReviewDecisions<TRecord>;

  /** 特定フィールドの決定を更新 */
  setDecision: (field: FieldKey<TRecord>, decision: FieldDecision) => void;

  /** 全フィールドを一括で採用 */
  acceptAll: () => void;

  /** 全フィールドを一括で却下 */
  rejectAll: () => void;

  /** 全フィールドの選択を初期状態（pending）にリセット */
  resetDecisions: () => void;

  /** 合成された候補レコード */
  candidateRecord: TRecord;

  /** 全体のレビュー決定状況 */
  reviewStatus: ProposalReviewStatus;

  /** 現在値・バージョンとの整合性チェック結果 */
  consistency: ReturnType<typeof import('@alneas/appkit-core/ai/proposal').verifyCurrentState<TRecord>>;

  /** 候補レコード全体の検証結果 */
  candidateValidation?: CandidateValidationResult;

  /** 適用可能かどうか */
  canApply: boolean;

  /** 適用実行中フラグ */
  isSubmitting: boolean;

  /** 保存/適用失敗時のエラーメッセージ */
  saveError: string | null;

  /** 適用処理の実行関数 */
  handleApply: () => Promise<boolean>;
}
