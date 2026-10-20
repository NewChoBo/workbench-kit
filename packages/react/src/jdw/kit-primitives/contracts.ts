import type { WidgetRegistryContract } from '@workbench-kit/contracts';

export type KitJdwPrimitiveType =
  | 'kit.button.v1'
  | 'kit.icon-button.v1'
  | 'kit.badge.v1'
  | 'kit.media-slot.v1'
  | 'kit.panel-loading.v1';

export type KitJdwActionState = 'ready' | 'disabled' | 'busy' | 'denied';

/** Host-owned capability. run must atomically recheck its own policy and busy gate. */
export interface KitJdwAction {
  readonly state: KitJdwActionState;
  readonly run: () => void | Promise<void>;
}

export interface KitJdwMediaResource {
  /** Ephemeral, host-vetted source; never written into the authored document. */
  readonly imageUrl: string;
}

export interface KitJdwHostSnapshot {
  readonly mode: 'preview' | 'live';
  /** Replace on record, document-generation, or authorization-scope changes. */
  readonly contextKey: object;
}

/**
 * Read-only view of an existing host store, not a new action executor.
 * Snapshots must retain identity until a change and subscriptions must announce it.
 * Live action hosts must render without JDW selection callbacks; authoring uses preview.
 */
export interface KitJdwHostPort {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => KitJdwHostSnapshot;
  readonly getAction: (key: string, contextKey: object) => KitJdwAction | undefined;
  readonly resolveMedia: (key: string, contextKey: object) => KitJdwMediaResource | undefined;
  readonly onActionError?: ((error: unknown) => void) | undefined;
}

export interface CreateKitJdwRegistryOptions {
  readonly baseRegistry?: WidgetRegistryContract<unknown> | undefined;
  readonly host?: KitJdwHostPort | undefined;
}

export type KitJdwIconName = 'add' | 'close' | 'edit' | 'check' | 'refresh' | 'more' | 'info';

export interface KitJdwButtonProps {
  readonly label: string;
  readonly variant: 'default' | 'primary' | 'danger';
  readonly compact: boolean;
  readonly block: boolean;
  readonly disabled: boolean;
  readonly actionKey?: string;
}

export interface KitJdwIconButtonProps {
  readonly label: string;
  readonly icon: KitJdwIconName;
  readonly variant: 'default' | 'danger';
  readonly compact: boolean;
  readonly disabled: boolean;
  readonly actionKey?: string;
}

export interface KitJdwBadgeProps {
  readonly text: string;
  readonly variant: 'accent' | 'muted' | 'danger';
}

export interface KitJdwMediaSlotProps {
  readonly resourceKey: string;
  readonly alt: string;
  readonly fit: 'contain' | 'cover';
}

export interface KitJdwPanelLoadingProps {
  readonly label: string;
  readonly showSpinner: boolean;
}

export type KitJdwPrimitive =
  | { readonly type: 'kit.button.v1'; readonly props: KitJdwButtonProps }
  | { readonly type: 'kit.icon-button.v1'; readonly props: KitJdwIconButtonProps }
  | { readonly type: 'kit.badge.v1'; readonly props: KitJdwBadgeProps }
  | {
      readonly type: 'kit.media-slot.v1';
      readonly props: KitJdwMediaSlotProps;
    }
  | { readonly type: 'kit.panel-loading.v1'; readonly props: KitJdwPanelLoadingProps };

export type KitJdwDecodeDiagnosticCode =
  'unknown-type' | 'invalid-props' | 'unknown-property' | 'missing-property' | 'invalid-property';

export type KitJdwDecodeResult =
  | { readonly status: 'valid'; readonly value: KitJdwPrimitive }
  | {
      readonly status: 'invalid';
      readonly code: KitJdwDecodeDiagnosticCode;
      readonly property?: string;
    };
