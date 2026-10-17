import { z } from 'zod';

export const UserSchema = z.object({
  /** ユーザーの一意識別子 */
  id: z.string(),
  /** メールアドレス */
  email: z.string().email(),
  /** 表示名 */
  name: z.string().optional(),
  /** アバター画像URL */
  avatarUrl: z.string().optional(),
  /** ユーザーロール (例: "admin", "user") */
  role: z.string().optional(),
  /** メールアドレスが認証済みかどうか（Firebase 等で利用） */
  emailVerified: z.boolean().optional(),
  /** 認証プロバイダー固有のメタデータ */
  metadata: z.record(z.string(), z.any()).optional(),
});

/** ユーザー情報の定義 */
export type User = z.infer<typeof UserSchema>;

/** 組み込み OAuth プロバイダー */
export type BuiltInOAuthProvider = 'google' | 'line' | 'apple' | 'github';

/**
 * OAuth プロバイダー
 *
 * 組み込みプロバイダー (`google`, `line`, `apple`, `github`) に加え、
 * Supabase Dashboard で設定したカスタム OIDC プロバイダー名も指定可能です。
 *
 * @example
 * ```tsx
 * // 組み込みプロバイダー
 * await loginWithProvider('google');
 *
 * // カスタム OIDC プロバイダー（Supabase Dashboard で設定した名前）
 * await loginWithProvider('line-oidc');
 * ```
 */
export type OAuthProvider = BuiltInOAuthProvider | (string & {});

export interface OAuthLoginOptions {
  redirectTo?: string;
  scopes?: string[];
  queryParams?: Record<string, string>;
}

/**
 * 認証アダプターのインターフェース
 * Firebase, Supabase, Mock などの認証プロバイダーを抽象化します。
 */
export interface AuthAdapter {
  /**
   * Optional non-secret namespace for this backend/tenant's optimistic session storage.
   * Defaults to runtime adapter identity (no cross-reload reuse). Never infer it from cached
   * profiles or credentials. Provider instances always have separate session query keys.
   */
  readonly cacheScope?: string;
  /** ログイン */
  login: (email: string, password: string) => Promise<User>;
  /** 新規登録 */
  register: (email: string, password: string, data?: { name?: string }) => Promise<User>;
  /** ログアウト */
  logout: () => Promise<void>;
  /** パスワードリセットメール送信 */
  resetPassword: (email: string) => Promise<void>;
  /** メールアドレス変更 */
  updateEmail: (email: string) => Promise<void>;
  /** パスワード変更 */
  updatePassword: (password: string) => Promise<void>;
  /**
   * 再認証（パスワード変更・メール変更前に必要）
   *
   * Firebase などのプロバイダーではセキュリティ上、メールアドレスや
   * パスワードの変更前に現在のパスワードで再認証する必要があります。
   * アダプターが対応していない場合は undefined になります。
   *
   * @param password - 現在のパスワード
   */
  reauthenticate?: (password: string) => Promise<void>;
  /**
   * メールアドレス確認メールを送信
   *
   * 新規登録後やメールアドレス変更後に、確認用メールを送信します。
   * アダプターが対応していない場合は undefined になります。
   */
  sendVerificationEmail?: () => Promise<void>;
  /**
   * 認証トークンを取得
   *
   * API 呼び出し時の Authorization ヘッダーに使用するトークンを返します。
   * Firebase の場合は ID Token、Supabase の場合は access_token を返します。
   * アダプターが対応していない場合は undefined になります。
   *
   * @returns トークン文字列、または未認証の場合は null
   */
  getToken?: () => Promise<string | null>;
  /** 現在のユーザーを取得 */
  getCurrentUser: () => Promise<User | null>;

  /**
   * 認証状態の変更を監視
   */
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  /** OAuth サインイン (Google/LINE など) */
  loginWithProvider?: (
    provider: OAuthProvider,
    options?: OAuthLoginOptions,
  ) => Promise<User | null>;
}

/**
 * ユーザープロファイルの基本型
 * id は認証ユーザーの uid と同一
 */
export interface BaseProfile {
  id: string;
  email: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * プロファイルアダプターのインターフェース
 * データベースとの同期を抽象化します。
 *
 * @template T プロファイルの型 (BaseProfile を継承)
 */
export interface ProfileAdapter<T extends BaseProfile = BaseProfile> {
  /** テーブル/コレクション名 */
  tableName: string;

  /**
   * 新規ユーザー作成時にプロファイルを作成
   * @param uid 認証ユーザーID
   * @param authUser 認証ユーザー情報
   * @param additionalData 追加データ
   */
  create: (uid: string, authUser: User, additionalData?: Partial<T>) => Promise<T>;

  /**
   * ログイン時にプロファイルを取得
   * @param uid 認証ユーザーID
   */
  get: (uid: string) => Promise<T | null>;

  /**
   * プロファイルを更新
   * @param uid 認証ユーザーID
   * @param updates 更新データ
   */
  update: (uid: string, updates: Partial<T>) => Promise<T>;

  /**
   * プロファイルを削除
   * @param uid 認証ユーザーID
   */
  delete: (uid: string) => Promise<void>;

  /**
   * プロファイルの存在確認
   * @param uid 認証ユーザーID
   */
  exists?: (uid: string) => Promise<boolean>;
}

// =====================================================
// Invitation System
// =====================================================

/** 招待種別 */
export type InvitationType = 'organization' | 'project' | 'team';

/** 招待ステータス */
export type InvitationState = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/**
 * 招待情報の定義
 */
export interface Invitation {
  id: string;
  /** 招待種別 */
  type: InvitationType;
  /** 対象ID (organization_id, project_id, team_id) */
  targetId: string;
  /** 対象名 (表示用) */
  targetName?: string;
  /** 招待先メールアドレス */
  inviteeEmail: string;
  /** 招待先ユーザーID (既存ユーザーの場合) */
  inviteeUserId?: string;
  /** 付与する役割 */
  role: string;
  /** ステータス */
  state: InvitationState;
  /** 招待トークン (リンク用) */
  token: string;
  /** 有効期限 */
  expiresAt: Date | string;
  /** 招待者ID */
  invitedBy: string;
  /** 招待者名 (表示用) */
  invitedByName?: string;
  /** 作成日時 */
  createdAt: Date | string;
  /** 応答日時 */
  respondedAt?: Date | string;
}

/**
 * 招待作成パラメータ
 */
export interface CreateInvitationParams {
  type: InvitationType;
  targetId: string;
  inviteeEmail: string;
  role: string;
  /** 有効期限 (時間, デフォルト: 168 = 7日) */
  expirationHours?: number;
  /** メッセージ */
  message?: string;
}

/**
 * 招待承諾時のコールバック
 * organization_members, project_members, team_members への追加処理を実装
 */
export type OnInvitationAcceptedCallback = (
  invitation: Invitation,
  userId: string,
) => Promise<void>;

/**
 * 招待アダプターのインターフェース
 * 組織/プロジェクト/チームへの招待・承認フローを抽象化します。
 */
export interface InvitationAdapter {
  /** テーブル/コレクション名 */
  tableName: string;

  /**
   * 招待を作成
   * @param params 招待パラメータ
   * @param invitedBy 招待者のユーザーID
   */
  create: (params: CreateInvitationParams, invitedBy: string) => Promise<Invitation>;

  /**
   * トークンで招待を取得
   * @param token 招待トークン
   */
  getByToken: (token: string) => Promise<Invitation | null>;

  /**
   * 招待を承諾
   * @param token 招待トークン
   * @param userId 承諾するユーザーID
   * @param onAccepted メンバー追加処理のコールバック
   */
  accept: (
    token: string,
    userId: string,
    onAccepted?: OnInvitationAcceptedCallback,
  ) => Promise<void>;

  /**
   * 招待を拒否
   * @param token 招待トークン
   */
  decline: (token: string) => Promise<void>;

  /**
   * ユーザーの保留中の招待を取得
   * @param email ユーザーのメールアドレス
   */
  listPendingForUser: (email: string) => Promise<Invitation[]>;

  /**
   * 対象の保留中の招待を取得
   * @param type 招待種別
   * @param targetId 対象ID
   */
  listPendingForTarget: (type: InvitationType, targetId: string) => Promise<Invitation[]>;

  /**
   * 招待をキャンセル
   * @param invitationId 招待ID
   */
  cancel: (invitationId: string) => Promise<void>;

  /**
   * 招待を再送信 (トークン再生成 + 期限延長)
   * @param invitationId 招待ID
   */
  resend: (invitationId: string) => Promise<Invitation>;

  /**
   * 期限切れ招待をクリーンアップ
   */
  cleanupExpired?: () => Promise<number>;
}
