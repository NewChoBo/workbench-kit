import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import type {
  WidgetMeasureConstraints,
  WidgetMeasureResult,
  WidgetRegistryContract,
  WidgetTypeDefinition,
  WidgetTypeShape,
} from '@workbench-kit/contracts';
import { createWidgetRegistry, estimateWrappedTextSize } from '@workbench-kit/jdw';

import { PanelLoading } from '../../primitives/panel-loading/PanelLoading.js';
import { Button } from '../../primitives/button/Button.js';
import { IconButton } from '../../primitives/icon-button/IconButton.js';
import { Badge } from '../../primitives/badge/Badge.js';
import { WorkbenchMediaSlot } from '../../primitives/workbench-media-slot/WorkbenchMediaSlot.js';
import { BUILTIN_JDW_REGISTRY } from '../createBuiltinJdwRegistry.js';
import type {
  CreateKitJdwRegistryOptions,
  KitJdwAction,
  KitJdwHostPort,
  KitJdwHostSnapshot,
  KitJdwPrimitive,
} from './contracts.js';
import { decodeKitJdwPrimitive, ownDataRecord } from './decode.js';
import {
  KIT_JDW_PRIMITIVE_DESCRIPTORS,
  KIT_PRIMITIVE_SPECS,
  primitiveInspector,
  primitiveSchema,
} from './primitive-specs.js';

const UNAVAILABLE: KitJdwHostSnapshot = Object.freeze({
  mode: 'preview',
  contextKey: Object.freeze({}),
});
const noop = () => {};

function createSafeHost(host: KitJdwHostPort | undefined) {
  // A connection fault is separate from the host-owned action/busy state.
  let quarantined = false;
  const subscriptions = new Set<{ readonly listener: () => void; readonly retire: () => void }>();
  const getSnapshot = (): KitJdwHostSnapshot => {
    if (host === undefined || quarantined) return UNAVAILABLE;
    try {
      const snapshot = host.getSnapshot();
      const record = ownDataRecord(snapshot);
      return record !== undefined &&
        (record.mode === 'live' || record.mode === 'preview') &&
        typeof record.contextKey === 'object' &&
        record.contextKey !== null
        ? snapshot
        : UNAVAILABLE;
    } catch {
      return UNAVAILABLE;
    }
  };
  const quarantine = () => {
    if (quarantined) return;
    quarantined = true;
    const current = [...subscriptions];
    for (const subscription of current) subscription.retire();
    // All leaves share this connection. Retire visible resources even if the host
    // never emits again after one subscription failed.
    for (const subscription of current) {
      try {
        subscription.listener();
      } catch {
        /* A listener cannot revive the port. */
      }
    }
  };
  const subscribe = (listener: () => void): (() => void) => {
    if (host === undefined || quarantined) return noop;
    let active = true;
    let cleanup: (() => void) | undefined;
    const subscription: { readonly listener: () => void; readonly retire: () => void } = {
      listener,
      retire: () => {
        if (!active) return;
        active = false;
        subscriptions.delete(subscription);
        const release = cleanup;
        cleanup = undefined;
        try {
          release?.();
        } catch {
          /* Host cleanup cannot break unmount. */
        }
      },
    };
    subscriptions.add(subscription);
    const notify = () => {
      if (active && !quarantined) listener();
    };
    try {
      const release = host.subscribe(notify);
      if (typeof release !== 'function') throw new TypeError('Invalid host subscription.');
      cleanup = release;
      if (!active) {
        cleanup = undefined;
        try {
          release();
        } catch {
          /* A synchronous connection fault retired it. */
        }
      }
      return subscription.retire;
    } catch {
      quarantine();
      return noop;
    }
  };
  const getAction = (
    key: string | undefined,
    snapshot: KitJdwHostSnapshot,
  ): KitJdwAction | undefined => {
    if (host === undefined || snapshot === UNAVAILABLE || quarantined || key === undefined)
      return undefined;
    try {
      const action = host.getAction(key, snapshot.contextKey);
      const record = ownDataRecord(action);
      if (
        record === undefined ||
        !['ready', 'disabled', 'busy', 'denied'].includes(record.state as string) ||
        typeof record.run !== 'function'
      )
        return undefined;
      return getSnapshot() === snapshot ? action : undefined;
    } catch {
      return undefined;
    }
  };
  const imageUrl = (key: string, snapshot: KitJdwHostSnapshot): string | undefined => {
    if (host === undefined || snapshot === UNAVAILABLE || quarantined) return undefined;
    try {
      const resource = ownDataRecord(host.resolveMedia(key, snapshot.contextKey));
      const url = resource?.imageUrl;
      if (typeof url !== 'string' || url.trim().length === 0) return undefined;
      for (let index = 0; index < url.length; index += 1) {
        const code = url.charCodeAt(index);
        if (code <= 0x1f || code === 0x7f) return undefined;
      }
      return getSnapshot() === snapshot ? url : undefined;
    } catch {
      return undefined;
    }
  };
  const reportError = (error: unknown): void => {
    try {
      // A host's asynchronous reporter must not create an unhandled rejection either.
      Promise.resolve(host?.onActionError?.(error)).catch(noop);
    } catch {
      /* Error reporting is not another action or UI state owner. */
    }
  };
  return Object.freeze({ getSnapshot, subscribe, getAction, imageUrl, reportError });
}

type SafeHost = ReturnType<typeof createSafeHost>;
type ActionPrimitive = Extract<KitJdwPrimitive, { type: 'kit.button.v1' | 'kit.icon-button.v1' }>;

function ActionLeaf({
  primitive,
  host,
  renderContextKey,
}: {
  readonly primitive: ActionPrimitive;
  readonly host: SafeHost;
  readonly renderContextKey: object;
}) {
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot);
  const action =
    snapshot.contextKey === renderContextKey
      ? host.getAction(primitive.props.actionKey, snapshot)
      : undefined;
  const disabled =
    primitive.props.disabled ||
    snapshot.contextKey !== renderContextKey ||
    snapshot.mode !== 'live' ||
    action?.state !== 'ready';
  const activate = () => {
    if (primitive.props.disabled) return;
    const current = host.getSnapshot();
    if (
      current === UNAVAILABLE ||
      current.mode !== 'live' ||
      current.contextKey !== renderContextKey
    )
      return;
    const latest = host.getAction(primitive.props.actionKey, current);
    if (latest?.state !== 'ready') return;
    try {
      Promise.resolve(latest.run()).catch(host.reportError);
    } catch (error) {
      host.reportError(error);
    }
  };
  if (primitive.type === 'kit.icon-button.v1') {
    const props = primitive.props;
    return (
      <IconButton
        label={props.label}
        icon={props.icon}
        variant={props.variant}
        compact={props.compact}
        disabled={disabled}
        onClick={activate}
      />
    );
  }
  const props = primitive.props;
  return (
    <Button
      variant={props.variant}
      compact={props.compact}
      block={props.block}
      disabled={disabled}
      onClick={activate}
    >
      {props.label}
    </Button>
  );
}

function MediaLeaf({
  primitive,
  host,
  renderContextKey,
}: {
  readonly primitive: Extract<KitJdwPrimitive, { type: 'kit.media-slot.v1' }>;
  readonly host: SafeHost;
  readonly renderContextKey: object;
}) {
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getSnapshot);
  const props = primitive.props;
  const imageUrl =
    snapshot.contextKey === renderContextKey
      ? host.imageUrl(props.resourceKey, snapshot)
      : undefined;
  const fallback =
    props.alt.length === 0 ? (
      <span aria-hidden="true" />
    ) : (
      <span role="img" aria-label={props.alt}>
        {props.alt}
      </span>
    );
  return (
    <WorkbenchMediaSlot
      imageUrl={imageUrl ?? null}
      alt={props.alt}
      fill
      fallback={fallback}
      style={{ '--ui-workbench-media-object-fit': props.fit } as CSSProperties}
    />
  );
}

function renderPrimitive(primitive: KitJdwPrimitive, host: SafeHost): ReactNode {
  // Binding a new context requires the host to recompose the resolved presentation tree.
  // Store notifications alone must not retarget an old leaf to a different record.
  const renderContextKey = host.getSnapshot().contextKey;
  switch (primitive.type) {
    case 'kit.button.v1':
    case 'kit.icon-button.v1':
      return <ActionLeaf primitive={primitive} host={host} renderContextKey={renderContextKey} />;
    case 'kit.panel-loading.v1':
      return (
        <PanelLoading label={primitive.props.label} showSpinner={primitive.props.showSpinner} />
      );
    case 'kit.badge.v1':
      return <Badge variant={primitive.props.variant}>{primitive.props.text}</Badge>;
    case 'kit.media-slot.v1':
      return <MediaLeaf primitive={primitive} host={host} renderContextKey={renderContextKey} />;
  }
}

/** Layout hints belong to existing JDW wrappers; no authored metadata is guessed or spread. */
function decodeWidget(widget: WidgetTypeShape): KitJdwPrimitive | undefined {
  const record = ownDataRecord(widget);
  if (record === undefined) return undefined;
  const props: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (key === 'type') continue;
    if (key === 'id') {
      if (typeof value !== 'string' || value.length === 0 || value !== value.trim())
        return undefined;
      continue;
    }
    if (key === 'flex') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
      continue;
    }
    if (key === 'flexFit') {
      if (value !== 'tight' && value !== 'loose') return undefined;
      continue;
    }
    Object.defineProperty(props, key, { value, enumerable: true, configurable: true });
  }
  const result = decodeKitJdwPrimitive(record.type, props);
  return result.status === 'valid' ? result.value : undefined;
}

function measurePrimitive(
  widget: WidgetTypeShape,
  constraints: WidgetMeasureConstraints,
): WidgetMeasureResult {
  const primitive = decodeWidget(widget);
  if (primitive === undefined) return { width: 0, height: 0 };
  let width: number;
  let height: number;
  switch (primitive.type) {
    case 'kit.button.v1':
      width = Math.max(56, [...primitive.props.label].length * 8 + 24);
      height = primitive.props.compact ? 24 : 28;
      break;
    case 'kit.icon-button.v1':
      width = height = primitive.props.compact ? 24 : 28;
      break;
    case 'kit.badge.v1':
      width = [...primitive.props.text].length * 6 + 14;
      height = 20;
      break;
    case 'kit.media-slot.v1':
      width = 120;
      height = 80;
      break;
    case 'kit.panel-loading.v1': {
      const maxWidth =
        constraints.maxWidth === Infinity
          ? Infinity
          : Number.isFinite(constraints.maxWidth)
            ? Math.max(0, constraints.maxWidth)
            : 0;
      const spinnerLane = primitive.props.showSpinner ? 24 : 0;
      // Intrinsic hints only: existing estimator defaults are not browser font metrics.
      const text = estimateWrappedTextSize({
        text: primitive.props.label.replace(/[ \t\r\n\f]+/g, ' ').replace(/^ | $/g, ''),
        fontSize: 13,
        maxWidth: Math.max(0, maxWidth - 16 - spinnerLane),
      });
      width = text.width + 16 + spinnerLane;
      height = 48 + Math.max(text.height, primitive.props.showSpinner ? 16 : 0);
      break;
    }
  }
  const clamp = (value: number, min: number, max: number): number => {
    const maximum = max === Infinity ? Infinity : Number.isFinite(max) ? Math.max(0, max) : 0;
    const minimum = Number.isFinite(min) ? Math.max(0, min) : 0;
    return Math.min(Math.max(value, minimum), maximum);
  };
  return {
    width: clamp(width, constraints.minWidth, constraints.maxWidth),
    height: clamp(height, constraints.minHeight, constraints.maxHeight),
  };
}

function checkIdentities(
  definitions: readonly WidgetTypeDefinition<WidgetTypeShape, unknown>[],
): void {
  const types = new Set<string>();
  const components = new Set<string>();
  for (const definition of definitions) {
    if (types.has(definition.type))
      throw new TypeError(`Duplicate widget type: ${definition.type}`);
    types.add(definition.type);
    const descriptor = definition.componentDescriptor;
    if (descriptor === undefined) continue;
    const identity = JSON.stringify([descriptor.id, descriptor.version]);
    if (components.has(identity)) throw new TypeError(`Duplicate component identity: ${identity}`);
    components.add(identity);
  }
}

/**
 * Adds five strict leaf adapters without replacing or mutating any supplied definition.
 * Use strictKnownTypes at the existing renderer boundary to reject unknown document types.
 */
export function createKitJdwRegistry(
  options: CreateKitJdwRegistryOptions = {},
): WidgetRegistryContract<unknown> {
  const base = [...(options.baseRegistry ?? BUILTIN_JDW_REGISTRY).definitions()];
  const host = createSafeHost(options.host);
  const additions: readonly WidgetTypeDefinition<WidgetTypeShape, unknown>[] =
    KIT_PRIMITIVE_SPECS.map((spec, index) =>
      Object.freeze({
        type: spec.type,
        displayName: spec.label,
        componentDescriptor: KIT_JDW_PRIMITIVE_DESCRIPTORS[index]!,
        schema: primitiveSchema(spec.type),
        inspector: primitiveInspector(spec.type),
        measure: measurePrimitive,
        build: (widget: WidgetTypeShape): ReactNode => {
          const primitive = decodeWidget(widget);
          return primitive?.type === spec.type ? renderPrimitive(primitive, host) : null;
        },
      }),
    );
  checkIdentities([...base, ...additions]);
  const registry = createWidgetRegistry([...base, ...additions]);
  // Do not expose the underlying mutable registry, or freeze caller-owned definitions.
  return Object.freeze({
    has: (type: string) => registry.has(type),
    get: (type: string) => registry.get(type),
    definition: (type: string) => registry.definition(type),
    definitions: () => Object.freeze(registry.definitions()),
    types: () => Object.freeze(registry.types()),
  });
}
