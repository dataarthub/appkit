import { AuthAdapter, User } from '../types';

/**
 * Host endpoint error payload, or null when no endpoint error is present.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthError = {
  /** Optional endpoint error text used in adapter Error messages. */
  message?: string;
} | null;
/**
 * Minimal host user fields mapped to Appkit User; remaining keys become metadata.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthUser = {
  /** Stable host user ID. */
  id: string;
  /** Optional host email; mapped to an empty string if absent. */
  email?: string;
  /** Optional host display name. */
  name?: string;
  /** Optional avatar URL mapped to avatarUrl. */
  image?: string;
  /** Optional host role copied without authorization checks. */
  role?: string;
} & Record<string, unknown>;
/**
 * Minimal host session fields used for token and organization context lookup.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthSession = {
  /** Optional session token; nonempty values are used by fallback lookup. */
  token?: string;
  /** Optional active organization copied into user metadata. */
  activeOrganizationId?: string;
  /** Optional active team copied into user metadata. */
  activeTeamId?: string;
} & Record<string, unknown>;
/**
 * Nullable host session response; user and session may independently be null.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthSessionData = {
  /** Host session user, or null for no user. */
  user: BetterAuthUser | null;
  /** Host session metadata, or null when unavailable. */
  session: BetterAuthSession | null;
} | null;
/**
 * Host response envelope with nullable data and an endpoint error.
 *
 * @typeParam T - Successful response payload.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthResponse<T> = {
  /** Successful payload, or null when unavailable. */
  data: T | null;
  /** Endpoint failure; null represents no endpoint error. */
  error: BetterAuthError;
};
/**
 * Host token endpoint payload accepted as a string or optional token property.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthTokenData = {
  /** Nonempty token is preferred; missing/empty values trigger fallback. */
  token?: string;
} | string;
/**
 * Organization mutation response with an optional or envelope endpoint error.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthOrganizationActionResponse =
  | {
  /** Optional endpoint error; missing or null means no reported error. */
  error?: BetterAuthError;
}
  | BetterAuthResponse<unknown>;
/**
 * Optional host organization methods; setActive is preferred over setActiveOrganization.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type BetterAuthOrganizationNamespace = {
  /**
   * Optional preferred organization switch operation.
   *
   * @param params - Organization identifier.
   *
   * @returns Host completion response.
   */
  setActive?: (params: {
    /** Target organization identifier. */
    organizationId: string;
  }) => Promise<BetterAuthOrganizationActionResponse>;
  /**
   * Optional legacy organization switch operation, used only without setActive.
   *
   * @param params - Organization identifier.
   *
   * @returns Host completion response.
   */
  setActiveOrganization?: (params: {
    /** Target organization identifier. */
    organizationId: string;
  }) => Promise<BetterAuthOrganizationActionResponse>;
};

// Define a type that matches the minimal client interface we need.
// This avoids strict dependency on the exact generic types of the client.
/**
 * Structural host client accepted by BetterAuthAdapter without importing its SDK.
 *
 * @remarks Required email sign-in/up, sign-out and session methods may reject with client
 * errors. Optional account/plugin methods cause the matching adapter operation to reject
 * when absent, except token which falls back to session lookup.
 *
 * @see BetterAuthAdapter for the public host-input example.
 */
type MinimalAuthClient = {
  /**
   * Email sign-in namespace required by the adapter.
   */
  signIn: {
        /**
         * Submit email credentials through the host client.
         *
         * @param params - Account credentials and optional sign-up name.
         *
         * @param options - Optional SDK request options; the adapter does not supply them.
         *
         * @returns Host response whose user is required for adapter success.
         */
    email: (
      params: {
        /** Account email. */
        email: string;
        /** Account password. */
        password: string;
      },
      options?: Record<string, unknown>,
    ) => Promise<BetterAuthResponse<{
      /** User returned by email sign-in/up; adapter rejects when absent. */
      user?: BetterAuthUser | null;
    }>>;
  };
  /**
   * Email sign-up namespace required by the adapter.
   */
  signUp: {
        /**
         * Submit email credentials through the host client.
         *
         * @param params - Account credentials and optional sign-up name.
         *
         * @param options - Optional SDK request options; the adapter does not supply them.
         *
         * @returns Host response whose user is required for adapter success.
         */
    email: (
      params: {
        /** Account email. */
        email: string;
        /** Account password. */
        password: string;
        /** Optional display name. */
        name?: string;
      },
      options?: Record<string, unknown>,
    ) => Promise<BetterAuthResponse<{
      /** User returned by email sign-in/up; adapter rejects when absent. */
      user?: BetterAuthUser | null;
    }>>;
  };
  /**
   * End the host session.
   *
   * @returns Endpoint error payload after completion.
   */
  signOut: () => Promise<{
  /** Optional endpoint error; missing or null means no reported error. */
  error?: BetterAuthError;
}>;
  /**
   * Read the host session.
   *
   * @returns Nullable user/session payload and endpoint error.
   */
  getSession: () => Promise<BetterAuthResponse<BetterAuthSessionData>>;
    /**
     * Optional JWT/token endpoint; adapter swallows endpoint failures before session fallback.
     *
     * @returns Token payload and endpoint error.
     */
  token?: () => Promise<BetterAuthResponse<BetterAuthTokenData>>;
  /**
   * Optional password-reset endpoint.
   *
   * @param params - Account email and optional redirect destination.
   *
   * @returns Completion response with optional endpoint error.
   */
  forgetPassword?: (params: {
    /** Optional host email; mapped to an empty string if absent. */
    email: string;
    /** Optional reset redirect; adapter supplies /reset-password. */
    redirectTo?: string;
  }) => Promise<{
  /** Optional endpoint error; missing or null means no reported error. */
  error?: BetterAuthError;
}>;
  /**
   * Optional password-change endpoint.
   *
   * @param params - New password and optional host-only verification/session switches.
   *
   * @returns Completion response with optional endpoint error.
   */
  changePassword?: (params: {
    /** Replacement password sent by the adapter. */
    newPassword: string;
    /** Optional current password supported by the host; adapter does not supply it. */
    currentPassword?: string;
    /** Optional host session-revocation switch; adapter does not supply it. */
    revokeOtherSessions?: boolean;
  }) => Promise<{
  /** Optional endpoint error; missing or null means no reported error. */
  error?: BetterAuthError;
}>;
  /**
   * Optional email-change endpoint.
   *
   * @param params - New email address.
   *
   * @returns Completion response with optional endpoint error.
   */
  changeEmail?: (params: {
    /** Replacement account email. */
    newEmail: string;
  }) => Promise<{
  /** Optional endpoint error; missing or null means no reported error. */
  error?: BetterAuthError;
}>;
  /** Optional organization plugin namespace. */
  organization?: BetterAuthOrganizationNamespace;
};

/**
 * Polling and browser event settings; see BetterAuthAdapter for host setup.
 * @see BetterAuthAdapter for the canonical usage example.
 */
export interface BetterAuthAdapterOptions {
  /**
   * Custom window event observed by onAuthStateChanged.
   *
   * @defaultValue "better-auth:session-changed"
   */
  sessionChangeEventName?: string;
  /**
   * Session polling interval in milliseconds; zero or negative disables polling.
   *
   * @defaultValue 30000
   */
  pollIntervalMs?: number;
}

/**
 * Adapts a host-supplied Better Auth client to Appkit authentication operations.
 *
 * @remarks The host installs/configures the Better Auth SDK and server and supplies a
 * structurally compatible client. No SDK or working backend is created by this class.
 * Subscriptions use an initial session read, custom window events and optional polling;
 * each returned cleanup stops its listener/timer. AuthProvider requires an outer
 * QueryClientProvider; this adapter alone requires neither CSS nor a React provider.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react';
 * import { useMemo } from 'react';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { BetterAuthAdapter, AuthProvider } from '@alneas/appkit-react/tools/auth';
 * export function BetterAuthRoot({ authClient, queryClient, children }: {
 *   authClient: ConstructorParameters<typeof BetterAuthAdapter>[0];
 *   queryClient: QueryClient;
 *   children: ReactNode;
 * }) {
 *   const adapter = useMemo(() => new BetterAuthAdapter(authClient), [authClient]);
 *   return <QueryClientProvider client={queryClient}>
 *     <AuthProvider adapter={adapter}>{children}</AuthProvider>
 *   </QueryClientProvider>;
 * }
 * ```
 */
export class BetterAuthAdapter implements AuthAdapter {
  private client: MinimalAuthClient;
  private eventName: string;
  private pollIntervalMs: number;
  private inFlightSession: Promise<User | null> | null = null;

  /**
   * Creates an adapter around an already configured host client.
   *
   * @param client - Compatible Better Auth client with email sign-in/up, sign-out and getSession.
   *
   * @param options - Event name and polling interval; defaults to better-auth:session-changed and 30000 ms.
   *
   * @remarks Construction makes no requests and starts no listeners; see the class example.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export function adapt(client: ConstructorParameters<typeof BetterAuthAdapter>[0]) {
   *   return new BetterAuthAdapter(client, { pollIntervalMs: 0 });
   * }
   * ```
   */
  constructor(client: MinimalAuthClient, options: BetterAuthAdapterOptions = {}) {
    this.client = client;
    this.eventName = options.sessionChangeEventName ?? 'better-auth:session-changed';
    this.pollIntervalMs = options.pollIntervalMs ?? 30000;
  }

  /**
   * Signs in with the client email/password endpoint.
   *
   * @param email - User email address.
   *
   * @param password - User password.
   *
   * @returns The mapped signed-in user; emits the session-change event on success.
   *
   * @throws Rejects on client failure, endpoint error or a response missing a user.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.login('person@example.com', password);
   * }
   * ```
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
   * Creates an account through the client email sign-up endpoint.
   *
   * @param email - New account email.
   *
   * @param password - New account password.
   *
   * @param data - Optional name; omitted or empty names are sent as an empty string.
   *
   * @returns The mapped registered user; emits the session-change event on success.
   *
   * @throws Rejects on client failure, endpoint error or a response missing a user.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.register('person@example.com', password, { name: 'Reader' });
   * }
   * ```
   */
  async register(email: string, password: string, data?: {
    /** Optional display name forwarded as an empty string when omitted. */
    name?: string;
  }): Promise<User> {
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
   * Signs out through the supplied client.
   *
   *
   * @returns No value after sign-out succeeds and the session-change event is emitted.
   *
   * @throws Rejects on client failure or endpoint error.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.logout();
   * }
   * ```
   */
  async logout(): Promise<void> {
    const { error } = await this.client.signOut();
    if (error) {
      throw new Error(error.message || 'Logout failed');
    }
    this.emitSessionChanged();
  }

  /**
   * Reads the current user, coalescing concurrent reads on this adapter.
   *
   *
   * @returns The mapped session user, or null for no session, endpoint errors or thrown read failures.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.getCurrentUser();
   * }
   * ```
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
   * Reads a token, trying the optional token endpoint before the session token.
   *
   *
   * @returns A nonempty token string or null if no token is available.
   *
   * @throws Rejects if the fallback session request throws; token-endpoint failures are swallowed.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.getToken();
   * }
   * ```
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
   * Changes the active organization using the optional organization client namespace.
   *
   * @param organizationId - Organization identifier sent to setActive or setActiveOrganization.
   *
   * @returns No value after success; emits a session-change event.
   *
   * @throws Rejects if the plugin method is missing, the client rejects or an endpoint error is returned.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.setActiveOrganization('selected-organization');
   * }
   * ```
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
   * Reads active organization/team identifiers from the current session.
   *
   *
   * @returns An object whose two identifiers are strings when present and null otherwise.
   *
   * @throws Rejects if the session request throws; returned endpoint errors produce null identifiers.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.getOrganizationContext();
   * }
   * ```
   */
  async getOrganizationContext(): Promise<{
    /** Active organization, or null when absent. */
    activeOrganizationId: string | null;
    /** Active team, or null when absent. */
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
   * Observes session state using an initial read, browser events and optional polling.
   *
   * @param callback - Receives the mapped user or null after each read; callbacks can repeat unchanged values.
   *
   * @returns Cleanup that disables the initial callback and removes browser listeners/timers.
   *
   * @remarks On the server only the initial asynchronous read occurs. Browser polling defaults
   * to 30000 ms and is disabled by nonpositive intervals. Callback errors are not caught.
   * An already-running event/poll read may still invoke callback after cleanup.
   *
   * @deprecated React consumers should use useAuth under AuthProvider for managed lifecycle/state.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter, type User } from '@alneas/appkit-react/tools/auth';
   * export function observe(adapter: BetterAuthAdapter, onUser: (user: User | null) => void) {
   *   return adapter.onAuthStateChanged(onUser);
   * }
   * // The host calls the returned cleanup when observation ends.
   * ```
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
   * Requests an email change through the optional changeEmail endpoint.
   *
   * @param email - New email address.
   *
   * @returns No value after the endpoint succeeds; this method emits no session-change event.
   *
   * @throws Rejects if changeEmail is absent, the client rejects or an endpoint error is returned.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.updateEmail('new@example.com');
   * }
   * ```
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
   * Requests a password change through the optional changePassword endpoint.
   *
   * @param password - New password; this method does not send a current password.
   *
   * @returns No value after the endpoint succeeds; this method emits no session-change event.
   *
   * @throws Rejects if changePassword is absent, the client rejects or an endpoint error is returned.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.updatePassword(password);
   * }
   * ```
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
   * Requests a password-reset email with redirectTo set to /reset-password.
   *
   * @param email - Account email address.
   *
   * @returns No value after the endpoint succeeds; delivery is owned by the host backend.
   *
   * @throws Rejects if forgetPassword is absent, the client rejects or an endpoint error is returned.
   *
   * @example
   * ```ts
   * import { BetterAuthAdapter } from '@alneas/appkit-react/tools/auth';
   * export async function run(adapter: BetterAuthAdapter, password: string) {
   *   return adapter.resetPassword('person@example.com');
   * }
   * ```
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
