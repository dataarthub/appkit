import { AuthAdapter, OAuthProvider, User } from '../types';

/**
 * テストおよび開発用のモック認証アダプター
 * 認証プロバイダーと通信することなく、メモリ上の状態のみで認証機能をシミュレートします。
 */
export class MockAuthAdapter implements AuthAdapter {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  /**
   * MockAuthAdapter インスタンスを初期化します。
   * @param initialUser 初期状態のユーザー情報
   */
  constructor(initialUser: User | null = null) {
    this.currentUser = initialUser;
  }

  /**
   * メールアドレスとパスワードによるログイン処理をシミュレートします。
   * @param email メールアドレス
   * @param password パスワード（"error" の場合は失敗します）
   * @returns ログインしたユーザー情報
   */
  async login(email: string, password: string): Promise<User> {
    if (password === 'error') throw new Error('Invalid credentials');
    this.currentUser = { id: '1', email, name: 'Mock User' };
    this.notifyListeners();
    return this.currentUser;
  }

  /**
   * 新規ユーザー登録処理をシミュレートします。
   * @param email メールアドレス
   * @param _password パスワード
   * @param data 追加のユーザー情報（氏名など）
   * @returns 登録されたユーザー情報
   */
  async register(email: string, _password: string, data?: { name?: string }): Promise<User> {
    this.currentUser = { id: '2', email, name: data?.name || 'New User' };
    this.notifyListeners();
    return this.currentUser;
  }

  /**
   * ログアウト処理をシミュレートします。現在のユーザー状態をクリアします。
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  /**
   * パスワードリセット処理をシミュレートします。
   * @param email メールアドレス
   */
  async resetPassword(email: string): Promise<void> {
    console.log(`Reset password for ${email}`);
  }

  /**
   * ユーザーのメールアドレス変更処理をシミュレートします。
   * @param email 新しいメールアドレス
   */
  async updateEmail(email: string): Promise<void> {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, email };
      this.notifyListeners();
    }
  }

  /**
   * ユーザーのパスワード変更処理をシミュレートします。
   * @param _password 新しいパスワード
   */
  async updatePassword(_password: string): Promise<void> {
    console.log('Password updated');
  }

  /**
   * 現在ログインしているユーザーを取得します。
   * @returns ログインユーザー、または未ログインの場合は null
   */
  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  /**
   * OAuthプロバイダーを使用したログイン処理をシミュレートします。
   * @param provider OAuthプロバイダー名
   * @returns ログインしたユーザー情報
   */
  async loginWithProvider(provider: OAuthProvider): Promise<User> {
    this.currentUser = {
      id: `${provider}-1`,
      email: `${provider}@example.com`,
      name: `${provider} User`,
    };
    this.notifyListeners();
    return this.currentUser;
  }

  /**
   * 認証状態の変更イベントリスナーを登録します。
   * @param callback 認証状態変更時に呼び出される関数
   * @returns リスナーを解除するためのクリーンアップ関数
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.currentUser));
  }
}
