import type { Disposable } from '@workbench-kit/base';

export const WORKBENCH_AUTH_CAPABILITY_ID = 'workbench.auth' as const;
export const WORKBENCH_SECRETS_CAPABILITY_ID = 'workbench.secrets' as const;

export interface WorkbenchAccount {
  readonly avatarUrl?: string;
  readonly displayName: string;
  readonly id: string;
  readonly providerId: string;
  readonly sessionId?: string;
}

export interface WorkbenchAccountChangeEvent {
  readonly activeAccount?: WorkbenchAccount;
  readonly accounts: readonly WorkbenchAccount[];
}

export interface WorkbenchAccountService {
  getAccounts(): readonly WorkbenchAccount[] | Promise<readonly WorkbenchAccount[]>;
  getActiveAccount(): WorkbenchAccount | Promise<WorkbenchAccount | undefined> | undefined;
  onDidChangeAccounts(listener: (event: WorkbenchAccountChangeEvent) => void): Disposable;
}

export interface WorkbenchAuthSession {
  readonly accountId: string;
  readonly expiresAt?: number;
  readonly id: string;
  readonly providerId: string;
  readonly scopes: readonly string[];
}

export interface WorkbenchAuthSignInOptions {
  readonly providerId?: string;
  readonly scopes?: readonly string[];
  readonly silent?: boolean;
}

export interface WorkbenchAuthProvider {
  readonly id: string;
  readonly label: string;
  getSessions(
    scopes?: readonly string[],
  ): readonly WorkbenchAuthSession[] | Promise<readonly WorkbenchAuthSession[]>;
  signIn(
    options?: WorkbenchAuthSignInOptions,
  ): WorkbenchAuthSession | Promise<WorkbenchAuthSession>;
  signOut(sessionId: string): void | Promise<void>;
}

export interface WorkbenchAuthenticationService {
  getProvider(providerId: string): WorkbenchAuthProvider | undefined;
  getProviders(): readonly WorkbenchAuthProvider[];
  registerProvider(provider: WorkbenchAuthProvider): Disposable;
}

export interface WorkbenchSecretStorageNamespace {
  delete(key: string): void | Promise<void>;
  get(key: string): string | Promise<string | undefined> | undefined;
  set(key: string, value: string): void | Promise<void>;
}

export interface WorkbenchSecretStorageService {
  forExtension(extensionId: string): WorkbenchSecretStorageNamespace;
}
