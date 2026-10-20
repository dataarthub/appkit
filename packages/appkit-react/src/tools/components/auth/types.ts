import { z } from 'zod';

/**
 * Zod schema for Appkit display-user records with a required ID and valid email.
 *
 * @remarks Optional metadata accepts arbitrary values; this schema does not establish
 * session validity or authorization. See AuthProvider for session verification.
 *
 * @example
 * ```ts
 * import { UserSchema } from '@alneas/appkit-react/tools/auth';
 * const user = UserSchema.parse({ id: 'display-1', email: 'reader@example.com' });
 * ```
 */
export const UserSchema = z.object({
  /**
   * Stable display user identifier.
   */
  id: z.string(),
  /**
   * Required valid email address.
   */
  email: z.string().email(),
  /**
   * Optional display name.
   */
  name: z.string().optional(),
  /**
   * Optional avatar URL; not validated as a URL by this schema.
   */
  avatarUrl: z.string().optional(),
  /**
   * Optional host role string used for display.
   */
  role: z.string().optional(),
  /**
   * Optional host assertion of email verification.
   */
  emailVerified: z.boolean().optional(),
  /**
   * Optional string-keyed metadata; arbitrary values are accepted.
   */
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Display-user shape inferred from UserSchema; exclude credentials from optimistic storage.
 *
 * @see AuthProvider for consumption.
 */
export type User = z.infer<typeof UserSchema>;

/**
 * Common OAuth identifiers; actual support depends on the host adapter/backend.
 *
 * @see AuthAdapter.loginWithProvider.
 */
export type BuiltInOAuthProvider = 'google' | 'line' | 'apple' | 'github';

/**
 * OAuth identifier supporting both common names and host-defined custom provider names.
 *
 * @see AuthAdapter.loginWithProvider.
 */
export type OAuthProvider = BuiltInOAuthProvider | (string & {});

/**
 * Optional OAuth redirect, scopes and provider query parameters interpreted by the host adapter.
 *
 * @see AuthAdapter.loginWithProvider.
 */
export interface OAuthLoginOptions {
  /**
   * Post-authentication destination interpreted by the adapter.
   */
  redirectTo?: string;
  /**
   * Optional requested provider scopes; adapter support varies.
   */
  scopes?: string[];
  /**
   * Additional provider query parameters; host validation is required.
   */
  queryParams?: Record<string, string>;
}

/**
 * Host authentication contract consumed by AuthProvider.
 *
 * @remarks Implementations own network access, credentials, session validation and backend
 * authorization. Optional methods are exposed only when supplied. Methods may reject with
 * backend/transport errors; AuthProvider tracks login/register/logout/OAuth errors.
 *
 * @see AuthProvider for a complete host-adapter example.
 */
export interface AuthAdapter {
  /**
   * Optional non-secret backend/tenant namespace for optimistic display cache reuse; omission uses runtime adapter identity.
   */
  readonly cacheScope?: string;
  /**
   * Sign in with email/password.
   *
   * @param email - Account email.
   *
   * @param password - Account password.
   *
   * @returns Signed-in user after adapter completion.
   */
  login: (email: string, password: string) => Promise<User>;
  /**
   * Create an account through the host backend.
   *
   * @param email - New account email.
   *
   * @param password - New account password.
   *
   * @param data - Optional name passed by the bundled registration form.
   *
   * @returns Registered user.
   */
  register: (email: string, password: string, data?: {
    /** Optional display name. */
    name?: string;
  }) => Promise<User>;
  /**
   * End the host session.
   *
   * @returns No value after sign-out completion.
   */
  logout: () => Promise<void>;
  /**
   * Request a password reset.
   *
   * @param email - Account email.
   *
   * @returns No value after the host accepts the request; email delivery is host-owned.
   */
  resetPassword: (email: string) => Promise<void>;
  /**
   * Request an account email change.
   *
   * @param email - New account email.
   *
   * @returns No value after host completion.
   */
  updateEmail: (email: string) => Promise<void>;
  /**
   * Request an account password change.
   *
   * @param password - New password.
   *
   * @returns No value after host completion.
   */
  updatePassword: (password: string) => Promise<void>;
  /**
   * Optional confirmation of current credentials.
   *
   * @param password - Current account password.
   *
   * @returns No value after host confirmation.
   */
  reauthenticate?: (password: string) => Promise<void>;
  /**
   * Optional verification-email request.
   *
   * @returns No value after request completion; delivery is host-owned.
   */
  sendVerificationEmail?: () => Promise<void>;
  /**
   * Optional host token lookup.
   *
   * @returns Token string or null when unavailable; token type is adapter-specific.
   */
  getToken?: () => Promise<string | null>;
  /**
   * Read the current host session user.
   *
   * @returns User or null for no session; adapter-specific error handling may reject.
   */
  getCurrentUser: () => Promise<User | null>;
  /**
   * Subscribe to host user-state changes.
   *
   * @param callback - Receives each observed user or null; timing and initial invocation are adapter-specific.
   *
   * @returns Cleanup that stops future observation subject to in-flight adapter work.
   */

  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  /**
   * Optional OAuth sign-in operation.
   *
   * @param provider - Host-configured provider identifier.
   *
   * @param options - Optional redirect, scopes and query parameters.
   *
   * @returns User when available, or null for a redirect-only/incomplete sign-in.
   */
  loginWithProvider?: (
    provider: OAuthProvider,
    options?: OAuthLoginOptions,
  ) => Promise<User | null>;
}

/**
 * Persisted profile keyed by the authentication user ID.
 *
 * @see UserProfileProvider for adapter usage.
 */
export interface BaseProfile {
  /**
   * Authentication user ID used as the profile key.
   */
  id: string;
  /**
   * Profile email stored by the host.
   */
  email: string;
  /**
   * Optional host creation timestamp; no format validation is performed.
   */
  created_at?: Date | string;
  /**
   * Optional update timestamp; UserProfileProvider updates use an ISO string.
   */
  updated_at?: Date | string;
}

/**
 * Host persistence contract for authenticated profile records.
 *
 * @typeParam T - Persisted record extending BaseProfile; defaults to BaseProfile.
 *
 * @remarks No concrete profile backend is bundled. The host must enforce authorization
 * and decide persistence/transaction behavior; operations may reject with backend errors.
 *
 * @see UserProfileProvider for setup.
 */
export interface ProfileAdapter<T extends BaseProfile = BaseProfile> {
  /**
   * Collection name used in detail/list query keys.
   */
  tableName: string;
  /**
   * Create a profile for an authenticated user.
   *
   * @param uid - Authentication user ID.
   *
   * @param authUser - Authenticated display user.
   *
   * @param additionalData - Optional default profile fields supplied by UserProfileProvider.
   *
   * @returns Created persisted profile.
   */

  create: (uid: string, authUser: User, additionalData?: Partial<T>) => Promise<T>;
  /**
   * Read a profile by authentication user ID.
   *
   * @param uid - Profile/user identifier.
   *
   * @returns Profile or null when absent.
   */

  get: (uid: string) => Promise<T | null>;
  /**
   * Persist partial profile updates.
   *
   * @param uid - Profile identifier.
   *
   * @param updates - Partial fields to persist.
   *
   * @returns Updated persisted record.
   */

  update: (uid: string, updates: Partial<T>) => Promise<T>;
  /**
   * Delete a persisted profile.
   *
   * @param uid - Profile identifier.
   *
   * @returns No value after deletion completes.
   */

  delete: (uid: string) => Promise<void>;
  /**
   * Optional existence check.
   *
   * @param uid - Profile/user identifier.
   *
   * @returns Whether the host record exists.
   */

  exists?: (uid: string) => Promise<boolean>;
}

// =====================================================
// Invitation System
// =====================================================

/**
 * Target category for a host-managed invitation.
 *
 * @see InvitationAdapter.create.
 */
export type InvitationType = 'organization' | 'project' | 'team';

/**
 * Host invitation lifecycle state; the type does not perform transitions or expiry checks.
 *
 * @see InvitationAdapter.
 */
export type InvitationState = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

/**
 * Host-managed invitation record with target, recipient and response metadata.
 *
 * @see InvitationAdapter.getByToken.
 */
export interface Invitation {
  /**
   * Host invitation identifier.
   */
  id: string;
  /**
   * Invited resource category.
   */
  type: InvitationType;
  /**
   * Host resource identifier.
   */
  targetId: string;
  /**
   * Optional target display name.
   */
  targetName?: string;
  /**
   * Recipient email address.
   */
  inviteeEmail: string;
  /**
   * Recipient user identifier when already known.
   */
  inviteeUserId?: string;
  /**
   * Role to grant after host acceptance.
   */
  role: string;
  /**
   * Current host-managed lifecycle state.
   */
  state: InvitationState;
  /**
   * Invitation-link token; validate and protect it in host code.
   */
  token: string;
  /**
   * Host expiration timestamp as Date or string.
   */
  expiresAt: Date | string;
  /**
   * Inviting user identifier.
   */
  invitedBy: string;
  /**
   * Optional inviting user display name.
   */
  invitedByName?: string;
  /**
   * Host creation timestamp.
   */
  createdAt: Date | string;
  /**
   * Optional host acceptance/decline timestamp.
   */
  respondedAt?: Date | string;
}

/**
 * Inputs for host invitation creation; no bundled implementation imposes defaults.
 *
 * @see InvitationAdapter.create.
 */
export interface CreateInvitationParams {
  /**
   * Invited resource category.
   */
  type: InvitationType;
  /**
   * Target resource identifier.
   */
  targetId: string;
  /**
   * Recipient email address.
   */
  inviteeEmail: string;
  /**
   * Role requested for the recipient.
   */
  role: string;
  /**
   * Optional lifetime in hours; this interface does not enforce a seven-day or other default.
   */
  expirationHours?: number;
  /**
   * Optional host-delivered message.
   */
  message?: string;
}

/**
 * Host callback for adding an accepted user to the invited resource.
 *
 * @param invitation - Invitation being accepted.
 *
 * @param userId - Accepting user identifier.
 *
 * @returns No value after host membership work completes.
 *
 * @remarks Invocation order and rollback on rejection depend on the host adapter.
 *
 * @see InvitationAdapter.accept.
 */
export type OnInvitationAcceptedCallback = (
  invitation: Invitation,
  userId: string,
) => Promise<void>;

/**
 * Host contract for invitation persistence and lifecycle operations.
 *
 * @remarks No implementation is bundled here. Host code owns expiry, token validation,
 * permissions, delivery and transaction semantics. Any operation may reject on backend
 * failure; optional cleanup is undefined when unsupported.
 *
 * @example
 * ```ts
 * import type { InvitationAdapter } from '@alneas/appkit-react/tools/auth';
 * export async function inspectInvitation(adapter: InvitationAdapter, token: string) {
 *   return adapter.getByToken(token);
 * }
 * ```
 */
export interface InvitationAdapter {
  /**
   * Host collection name for invitations.
   */
  tableName: string;
  /**
   * Create and optionally deliver an invitation through the host.
   *
   * @param params - Recipient, target, role and optional lifetime/message.
   *
   * @param invitedBy - Inviting user identifier.
   *
   * @returns Created invitation.
   */

  create: (params: CreateInvitationParams, invitedBy: string) => Promise<Invitation>;
  /**
   * Find an invitation by host token.
   *
   * @param token - Invitation-link token.
   *
   * @returns Matching invitation or null.
   */

  getByToken: (token: string) => Promise<Invitation | null>;
  /**
   * Accept an invitation and optionally perform membership work.
   *
   * @param token - Invitation-link token.
   *
   * @param userId - Accepting user identifier.
   *
   * @param onAccepted - Optional async host membership callback; host implementation defines ordering and rollback.
   *
   * @returns No value after host acceptance completes.
   */

  accept: (
    token: string,
    userId: string,
    onAccepted?: OnInvitationAcceptedCallback,
  ) => Promise<void>;
  /**
   * Decline a host invitation.
   *
   * @param token - Invitation-link token.
   *
   * @returns No value after host completion.
   */

  decline: (token: string) => Promise<void>;
  /**
   * List pending invitations for a recipient.
   *
   * @param email - Recipient email.
   *
   * @returns Invitation array, possibly empty.
   */

  listPendingForUser: (email: string) => Promise<Invitation[]>;
  /**
   * List pending invitations for a resource.
   *
   * @param type - Resource category.
   *
   * @param targetId - Resource identifier.
   *
   * @returns Invitation array, possibly empty.
   */

  listPendingForTarget: (type: InvitationType, targetId: string) => Promise<Invitation[]>;
  /**
   * Cancel a host invitation.
   *
   * @param invitationId - Invitation identifier.
   *
   * @returns No value after cancellation completes.
   */

  cancel: (invitationId: string) => Promise<void>;
  /**
   * Request host invitation reissue/delivery.
   *
   * @param invitationId - Invitation identifier.
   *
   * @returns Updated invitation; token/expiry policy is host-owned.
   */

  resend: (invitationId: string) => Promise<Invitation>;
  /**
   * Optional host expiry cleanup.
   *
   * @returns Count of invitations affected by the host cleanup policy.
   */

  cleanupExpired?: () => Promise<number>;
}
