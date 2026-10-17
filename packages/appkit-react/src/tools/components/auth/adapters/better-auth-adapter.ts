import { AuthAdapter, User } from '../types';

type BetterAuthError = { message?: string } | null;
type BetterAuthUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  role?: string;
} & Record<string, unknown>;
type BetterAuthSession = {
  token?: string;
  activeOrganizationId?: string;
  activeTeamId?: string;
} & Record<string, unknown>;
type BetterAuthSessionData = {
  user: BetterAuthUser | null;
  session: BetterAuthSession | null;
} | null;
type BetterAuthResponse<T> = { data: T | null; error: BetterAuthError };
type BetterAuthTokenData = { token?: string } | string;
type BetterAuthOrganizationActionResponse =
  | { error?: BetterAuthError }
  | BetterAuthResponse<unknown>;
type BetterAuthOrganizationNamespace = {
  setActive?: (params: { organizationId: string }) => Promise<BetterAuthOrganizationActionResponse>;
  setActiveOrganization?: (params: {
    organizationId: string;
  }) => Promise<BetterAuthOrganizationActionResponse>;
};

// Define a type that matches the minimal client interface we need.
// This avoids strict dependency on the exact generic types of the client.
type MinimalAuthClient = {
  signIn: {
    email: (
      params: { email: string; password: string },
      options?: Record<string, unknown>,
    ) => Promise<BetterAuthResponse<{ user?: BetterAuthUser | null }>>;
  };
  signUp: {
    email: (
      params: { email: string; password: string; name?: string },
      options?: Record<string, unknown>,
    ) => Promise<BetterAuthResponse<{ user?: BetterAuthUser | null }>>;
  };
  signOut: () => Promise<{ error?: BetterAuthError }>;
  getSession: () => Promise<BetterAuthResponse<BetterAuthSessionData>>;
  token?: () => Promise<BetterAuthResponse<BetterAuthTokenData>>;
  forgetPassword?: (params: {
    email: string;
    redirectTo?: string;
  }) => Promise<{ error?: BetterAuthError }>;
  changePassword?: (params: {
    newPassword: string;
    currentPassword?: string;
    revokeOtherSessions?: boolean;
  }) => Promise<{ error?: BetterAuthError }>;
  changeEmail?: (params: {
    newEmail: string;
  }) => Promise<{ error?: BetterAuthError }>;
  organization?: BetterAuthOrganizationNamespace;
};

export interface BetterAuthAdapterOptions {
  /**
   * onAuthStateChanged で監視するカスタムイベント名
   * @default "better-auth:session-changed"
   */
  sessionChangeEventName?: string;
  /**
   * セッションポーリング間隔(ms)。0以下で無効化
   * @default 30000
   */
  pollIntervalMs?: number;
}

/**
 * Better Auth 用のアダプタークラス
 *
 * Better Auth クライアントをラップし、アプリケーション共通の AuthAdapter インターフェースを提供します。
 * これにより、UIコンポーネントは認証プロバイダーの実装詳細を気にすることなく利用できます。
 * Better Auth SDKはこのパッケージの依存ではありません。利用アプリでSDKを導入し、
 * 必要なメソッドを持つクライアントを渡してください。
 *
 * @example
 * ```tsx
 * import { createAuthClient } from 'better-auth/react'; // installed by the consuming application
 * const authClient = createAuthClient();
 * import { BetterAuthAdapter, AuthProvider } from "@alneas/appkit-react/tools/auth";
 *
 * const adapter = new BetterAuthAdapter(authClient);
 *
 * <AuthProvider adapter={adapter}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export class BetterAuthAdapter implements AuthAdapter {
  private client: MinimalAuthClient;
  private eventName: string;
  private pollIntervalMs: number;
  private inFlightSession: Promise<User | null> | null = null;

  /**
   * @param client Better Auth クライアントインスタンス (createAuthClient で作成されたもの)
   */
  constructor(client: MinimalAuthClient, options: BetterAuthAdapterOptions = {}) {
    this.client = client;
    this.eventName = options.sessionChangeEventName ?? 'better-auth:session-changed';
    this.pollIntervalMs = options.pollIntervalMs ?? 30000;
  }

  /**
   * メールアドレスとパスワードでログインします。
   *
   * @param email ユーザーのメールアドレス
   * @param password パスワード
   * @returns ログインしたユーザー情報
   * @throws ログインに失敗した場合にエラーを投げます
   */
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await this.client.signIn.email({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Login failed');
    }

    if (!data?.user) {
      throw new Error('No user returned');
    }
    this.emitSessionChanged();
    return this.mapUser(data.user);
  }

  /**
   * 新規ユーザー登録を行います。
   *
   * @param email メールアドレス
   * @param password パスワード
   * @param data 追加データ (現在は name のみサポート)
   * @returns 登録されたユーザー情報
   * @throws 登録に失敗した場合にエラーを投げます
   */
  async register(email: string, password: string, data?: { name?: string }): Promise<User> {
    const { data: resData, error } = await this.client.signUp.email({
      email,
      password,
      name: data?.name || '',
    });

    if (error) {
      throw new Error(error.message || 'Registration failed');
    }

    if (!resData?.user) {
      throw new Error('No user returned');
    }
    this.emitSessionChanged();
    return this.mapUser(resData.user);
  }

  /**
   * ログアウトします。
   *
   * @returns 完了時の Promise
   * @throws ログアウトに失敗した場合にエラーを投げます
   */
  async logout(): Promise<void> {
    const { error } = await this.client.signOut();
    if (error) {
      throw new Error(error.message || 'Logout failed');
    }
    this.emitSessionChanged();
  }

  /**
   * 現在のユーザーを取得します。
   * Better Auth の getSession メソッドを使用してセッション情報を取得します。
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.inFlightSession) return this.inFlightSession;
    this.inFlightSession = (async () => {
      try {
        const session = await this.getSessionData();
        if (session?.user) {
          return this.mapUser(session.user, session.session);
        }
        return null;
      } catch {
        return null;
      } finally {
        this.inFlightSession = null;
      }
    })();
    return this.inFlightSession;
  }

  /**
   * SupabaseTokenProvider 用に認証トークンを取得します。
   *
   * 優先順位:
   * 1. Better Auth JWT plugin の `/token` エンドポイント
   * 2. セッションの `session.token`
   */
  async getToken(): Promise<string | null> {
    // 1) JWT plugin endpoint (/token) が利用可能なら優先
    if (this.client.token) {
      try {
        const { data, error } = await this.client.token();
        if (!error) {
          const token = this.extractToken(data);
          if (token) return token;
        }
      } catch {
        // fallback to session token
      }
    }

    // 2) セッションの token を使用
    const sessionData = await this.getSessionData();
    return this.extractSessionToken(sessionData);
  }

  /**
   * organization plugin が有効な場合、アクティブな組織を切り替えます。
   */
  async setActiveOrganization(organizationId: string): Promise<void> {
    const organizationApi = this.client.organization;
    const setActive = organizationApi?.setActive ?? organizationApi?.setActiveOrganization;

    if (!setActive) {
      throw new Error('Organization plugin is not configured on Better Auth client.');
    }

    const result = await setActive({ organizationId });
    const error = 'error' in result ? result.error : null;
    if (error) {
      throw new Error(error.message || 'Failed to set active organization');
    }

    this.emitSessionChanged();
  }

  /**
   * 現在の organization / team コンテキストを取得します。
   */
  async getOrganizationContext(): Promise<{
    activeOrganizationId: string | null;
    activeTeamId: string | null;
  }> {
    const sessionData = await this.getSessionData();
    return {
      activeOrganizationId:
        typeof sessionData?.session?.activeOrganizationId === 'string'
          ? sessionData.session.activeOrganizationId
          : null,
      activeTeamId:
        typeof sessionData?.session?.activeTeamId === 'string'
          ? sessionData.session.activeTeamId
          : null,
    };
  }

  /**
   * 認証状態の変更を監視します。
   *
   * Better Auth は内部的に nanostore (atom) を使用して状態管理を行いますが、
   * window イベントは発火しません。このメソッドは以下の方法で状態変化を検出します：
   *
   * 1. 初回呼び出し時に現在のユーザーを取得
   * 2. カスタムウィンドウイベントをリッスン (デフォルト: 'better-auth:session-changed')
   * 3. 定期的なポーリング（フォールバック）
   *
   * @deprecated React コンポーネント内では useAuth() の使用を推奨します。
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    let isActive = true;

    // 1. Initial call - get current user immediately
    this.getCurrentUser().then((user) => {
      if (isActive) callback(user);
    });

    if (typeof window === 'undefined') {
      return () => {
        isActive = false;
      };
    }

    // 2. Listen for custom window events
    const handleAuthChange = async () => {
      if (!isActive) return;
      const user = await this.getCurrentUser();
      callback(user);
    };

    window.addEventListener(this.eventName, handleAuthChange);

    // 3. Polling fallback
    const intervalId =
      this.pollIntervalMs > 0
        ? setInterval(async () => {
            if (!isActive) return;
            const user = await this.getCurrentUser();
            callback(user);
          }, this.pollIntervalMs)
        : null;

    // Return cleanup function
    return () => {
      isActive = false;
      window.removeEventListener(this.eventName, handleAuthChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }

  /**
   * メールアドレスを更新します。
   */
  async updateEmail(email: string): Promise<void> {
    if (!this.client.changeEmail) {
      throw new Error('Update email is not available. Configure Better Auth changeEmail endpoint.');
    }
    const res = await this.client.changeEmail({ newEmail: email });
    if (res.error) {
      throw new Error(res.error.message || 'Failed to update email');
    }
  }

  /**
   * パスワードを更新します。
   */
  async updatePassword(password: string): Promise<void> {
    if (!this.client.changePassword) {
      throw new Error('Update password is not available. Configure Better Auth changePassword endpoint.');
    }
    const res = await this.client.changePassword({ newPassword: password });
    if (res.error) {
      throw new Error(res.error.message || 'Failed to update password');
    }
  }

  /**
   * パスワードリセットメールを送信します。
   */
  async resetPassword(email: string): Promise<void> {
    if (!this.client.forgetPassword) {
      throw new Error(
        'Reset password is not available. Configure Better Auth email/password reset endpoint.',
      );
    }

    const { error } = await this.client.forgetPassword({
      email,
      redirectTo: '/reset-password',
    });

    if (error) {
      throw new Error(error.message || 'Failed to send reset password email');
    }
  }

  private async getSessionData(): Promise<BetterAuthSessionData> {
    const session = await this.client.getSession();
    if (session?.error) {
      return null;
    }
    return session?.data ?? null;
  }

  private extractSessionToken(sessionData: BetterAuthSessionData): string | null {
    const token = sessionData?.session?.token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  }

  private extractToken(data: BetterAuthTokenData | null): string | null {
    if (!data) return null;
    if (typeof data === 'string') {
      return data.length > 0 ? data : null;
    }
    const token = data.token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  }

  private buildMetadata(
    user: BetterAuthUser,
    session?: BetterAuthSession | null,
  ): Record<string, unknown> {
    const { id: _id, email: _email, name: _name, image: _image, role: _role, ...rest } = user;
    const metadata: Record<string, unknown> = { ...rest };

    if (session?.activeOrganizationId) {
      metadata.activeOrganizationId = session.activeOrganizationId;
    }
    if (session?.activeTeamId) {
      metadata.activeTeamId = session.activeTeamId;
    }

    return metadata;
  }

  private emitSessionChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(this.eventName));
  }

  // Helper to map Better Auth user to our User type
  private mapUser(betterAuthUser: BetterAuthUser, session?: BetterAuthSession | null): User {
    if (!betterAuthUser) {
      // throw error or return generic
      throw new Error('User data missing');
    }
    return {
      id: betterAuthUser.id,
      email: betterAuthUser.email || '',
      name: betterAuthUser.name,
      avatarUrl: betterAuthUser.image,
      role: betterAuthUser.role,
      metadata: this.buildMetadata(betterAuthUser, session),
    };
  }
}
