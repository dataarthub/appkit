import { AuthAdapter, OAuthProvider, User } from '../types';

/**
 * Simulates authentication in memory for tests and isolated development previews.
 *
 * @remarks Never authenticates a backend, verifies a password or persists state. Listener
 * callbacks run synchronously and may throw. Use a real host adapter for production.
 *
 * @example
 * ```ts
 * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
 * const adapter = new MockAuthAdapter();
 * const user = await adapter.login('preview@example.com', 'preview-only');
 * await adapter.logout();
 * ```
 */
export class MockAuthAdapter implements AuthAdapter {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  /**
   * Creates an isolated in-memory authentication fixture.
   *
   * @param initialUser - Initial display user, default null.
   *
   * @see MockAuthAdapter for a complete preview-only example.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter({ id: 'preview-1', email: 'preview@example.com' });
   * ```
   */
  constructor(initialUser: User | null = null) {
    this.currentUser = initialUser;
  }

  /**
   * Simulates email login with a fixed user ID of 1.
   *
   * @param email - Display email.
   *
   * @param password - Only the literal error triggers invalid-credentials rejection.
   *
   * @returns Mock user after synchronous listener notification.
   *
   * @throws Rejects for password error or a throwing listener.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.login('preview@example.com', 'preview-only');
   * ```
   */
  async login(email: string, password: string): Promise<User> {
    if (password === 'error') throw new Error('Invalid credentials');
    this.currentUser = { id: '1', email, name: 'Mock User' };
    this.notifyListeners();
    return this.currentUser;
  }

  /**
   * Simulates registration with fixed user ID 2.
   *
   * @param email - Display email.
   *
   * @param _password - Ignored; no credentials are stored.
   *
   * @param data - Optional name; empty/omitted uses New User.
   *
   * @returns Mock user after synchronous listener notification.
   *
   * @throws Rejects if a listener throws.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.register('preview@example.com', 'preview-only', { name: 'Preview' });
   * ```
   */
  async register(email: string, _password: string, data?: {
    /** Optional display name; omission/empty uses New User. */
    name?: string;
  }): Promise<User> {
    this.currentUser = { id: '2', email, name: data?.name || 'New User' };
    this.notifyListeners();
    return this.currentUser;
  }

  /**
   * Clears the in-memory user and synchronously notifies listeners.
   *
   *
   * @returns No value after notification.
   *
   * @throws Rejects if a listener throws.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.logout();
   * ```
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  /**
   * Logs a reset request without sending email.
   *
   * @param email - Email included in console output.
   *
   * @returns No value; no reset token or email is created.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.resetPassword('preview@example.com');
   * ```
   */
  async resetPassword(email: string): Promise<void> {
    console.log(`Reset password for ${email}`);
  }

  /**
   * Changes the current mock user email when a user exists.
   *
   * @param email - Replacement display email.
   *
   * @returns No value; without a current user the operation does nothing.
   *
   * @throws Rejects if a listener throws.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.updateEmail('new@example.com');
   * ```
   */
  async updateEmail(email: string): Promise<void> {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, email };
      this.notifyListeners();
    }
  }

  /**
   * Logs a password update without checking or storing credentials.
   *
   * @param _password - Ignored new password.
   *
   * @returns No value after console output.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.updatePassword('preview-only');
   * ```
   */
  async updatePassword(_password: string): Promise<void> {
    console.log('Password updated');
  }

  /**
   * Reads the current in-memory display user.
   *
   *
   * @returns Current user or null, returned by reference.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.getCurrentUser();
   * ```
   */
  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  /**
   * Creates a synthetic display user for an OAuth provider without contacting it.
   *
   * @param provider - Used in the synthetic ID, email and name.
   *
   * @returns Synthetic user after synchronous listener notification.
   *
   * @throws Rejects if a listener throws.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * await adapter.loginWithProvider('google');
   * ```
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
   * Registers a synchronous listener and immediately calls it with the current user.
   *
   * @param callback - Receives the current user or null on registration and each mutation.
   *
   * @returns Cleanup removing this callback from the listener list.
   *
   * @throws Callback errors propagate; a failed initial callback is already registered.
   *
   * @example
   * ```ts
   * import { MockAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * const adapter = new MockAuthAdapter();
   * const stop = adapter.onAuthStateChanged(user => { console.log(user?.id); });
   * stop();
   * ```
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
