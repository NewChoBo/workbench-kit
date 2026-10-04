import { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { WidgetRegistryContract, WidgetTypeDefinition } from '@workbench-kit/contracts';
import {
  createWidgetRegistry,
  jdwNodeToGenericWidget,
  layoutWidget,
  parseJsonWidgetData,
  type GenericWidget,
} from '@workbench-kit/jdw';

import { BUILTIN_JDW_REGISTRY } from '../createBuiltinJdwRegistry.js';
import { renderCssLayoutTree } from '../cssRenderBackend.js';
import { renderJdw } from '../renderJdw.js';
import { createKitJdwRegistry } from './createKitJdwRegistry.js';
import { KIT_JDW_PRIMITIVE_DESCRIPTORS } from './primitive-specs.js';

const constraints = { minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: 200 };
const leaves = [
  { type: 'kit.button.v1', label: 'Open', actionKey: 'open' },
  { type: 'kit.icon-button.v1', label: 'More', icon: 'more', actionKey: 'more' },
  { type: 'kit.badge.v1', text: 'Ready' },
  { type: 'kit.media-slot.v1', resourceKey: 'cover', alt: 'Record cover' },
] satisfies GenericWidget[];

function build(registry: WidgetRegistryContract, widget: GenericWidget): ReactNode {
  return (registry.get(widget.type) as (input: GenericWidget) => ReactNode)(widget);
}

function markup(widget: GenericWidget, registry = createKitJdwRegistry()): string {
  return renderToStaticMarkup(<>{build(registry, widget)}</>);
}

function registryWithDefinitions(
  definitions: WidgetTypeDefinition[],
): WidgetRegistryContract<unknown> {
  return {
    has: (type) => definitions.some((definition) => definition.type === type),
    get: (type) => definitions.find((definition) => definition.type === type)?.build,
    definition: (type) => definitions.find((definition) => definition.type === type),
    definitions: () => definitions,
    types: () => definitions.map((definition) => definition.type),
  };
}

describe('createKitJdwRegistry identity and isolation', () => {
  it('preserves every builtin definition, builder, measure hook, and build result', () => {
    const before = BUILTIN_JDW_REGISTRY.types();
    const registry = createKitJdwRegistry();
    for (const definition of BUILTIN_JDW_REGISTRY.definitions()) {
      expect(registry.definition(definition.type)).toBe(definition);
      expect(registry.get(definition.type)).toBe(definition.build);
      expect(registry.definition(definition.type)?.measure).toBe(definition.measure);
    }
    expect(BUILTIN_JDW_REGISTRY.types()).toEqual(before);
    expect(BUILTIN_JDW_REGISTRY.has('kit.button.v1')).toBe(false);
    expect(markup({ type: 'button', label: 'Legacy' }, registry)).toBe(
      markup({ type: 'button', label: 'Legacy' }, BUILTIN_JDW_REGISTRY),
    );
    expect(registry.types()).toEqual([...before, ...leaves.map((leaf) => leaf.type)]);
  });

  it('has fresh factory identity and stable read-only adapter definitions', () => {
    const first = createKitJdwRegistry();
    const second = createKitJdwRegistry();
    expect(first).not.toBe(second);
    expect('bind' in first).toBe(false);
    expect('bindMany' in first).toBe(false);
    for (const leaf of leaves) {
      expect(first.definition(leaf.type)).toBe(first.definition(leaf.type));
      expect(first.get(leaf.type)).toBe(first.get(leaf.type));
      expect(first.definition(leaf.type)?.componentDescriptor).toBe(
        KIT_JDW_PRIMITIVE_DESCRIPTORS.find((descriptor) => descriptor.id === leaf.type),
      );
    }
    for (const type of ['kit.button.v2', 'Kit.button.v1', 'kit.button', 'unknown']) {
      expect(first.has(type)).toBe(false);
      expect(first.get(type)).toBeUndefined();
    }
  });

  it('snapshots the base array without freezing or changing caller-owned definitions', () => {
    const measure = vi.fn(() => ({ width: 12, height: 8 }));
    const original = { type: 'consumer.leaf', build: () => 'Consumer', measure };
    const definitions: WidgetTypeDefinition[] = [original];
    const registry = createKitJdwRegistry({ baseRegistry: registryWithDefinitions(definitions) });
    definitions.push({ type: 'late.leaf', build: () => null });
    expect(registry.has('late.leaf')).toBe(false);
    expect(registry.definition('consumer.leaf')).toBe(original);
    expect(Object.isFrozen(original)).toBe(false);
    expect(Object.isFrozen(definitions)).toBe(false);
    expect(definitions).toHaveLength(2);
  });

  it('does not adopt later binds into a mutable caller registry', () => {
    const baseRegistry = createWidgetRegistry([{ type: 'consumer.leaf', build: () => null }]);
    const registry = createKitJdwRegistry({ baseRegistry });
    baseRegistry.bind({ type: 'late.leaf', build: () => null });
    expect(registry.has('late.leaf')).toBe(false);
    expect(baseRegistry.has('kit.button.v1')).toBe(false);
  });

  it('rejects duplicate type strings in a supplied definition array', () => {
    const definitions = [
      { type: 'duplicate', build: vi.fn() },
      { type: 'duplicate', build: vi.fn() },
    ];
    expect(() =>
      createKitJdwRegistry({ baseRegistry: registryWithDefinitions(definitions) }),
    ).toThrow(TypeError);
    expect(definitions).toHaveLength(2);
    for (const definition of definitions) expect(definition.build).not.toHaveBeenCalled();
  });

  it('rejects duplicate exact descriptor identities even with distinct type strings', () => {
    const componentDescriptor = {
      id: 'consumer.button',
      version: '1',
      kind: 'atomic' as const,
      designTime: { label: 'Consumer button' },
    };
    const definitions = [
      { type: 'first', build: vi.fn(), componentDescriptor },
      { type: 'second', build: vi.fn(), componentDescriptor: { ...componentDescriptor } },
    ];
    expect(() =>
      createKitJdwRegistry({ baseRegistry: registryWithDefinitions(definitions) }),
    ).toThrow(TypeError);
    expect(Object.isFrozen(componentDescriptor)).toBe(false);
  });

  it.each(leaves)('rejects type and descriptor collisions for $type', ({ type }) => {
    const descriptor = KIT_JDW_PRIMITIVE_DESCRIPTORS.find((entry) => entry.id === type)!;
    for (const definition of [
      { type, build: vi.fn() },
      { type: 'consumer.alias', build: vi.fn(), componentDescriptor: descriptor },
    ]) {
      const definitions = [definition];
      expect(() =>
        createKitJdwRegistry({ baseRegistry: registryWithDefinitions(definitions) }),
      ).toThrow(TypeError);
      expect(definitions).toEqual([definition]);
      expect(definition.build).not.toHaveBeenCalled();
    }
  });
});

describe('actual Kit leaf rendering and bounded measurement', () => {
  it.each([
    [leaves[0]!, 'ui-button'],
    [leaves[1]!, 'ui-icon-button'],
    [leaves[2]!, 'ui-badge'],
    [leaves[3]!, 'ui-workbench-media-slot'],
  ])('renders actual primitive classes for %o', (widget, className) => {
    expect(markup(widget as GenericWidget)).toContain(className);
  });

  it('passes only explicitly supported presentation fields to real primitives', () => {
    const button = markup({ ...leaves[0]!, compact: true, block: true, variant: 'primary' });
    expect(button).toContain('ui-button--compact');
    expect(button).toContain('ui-button--block');
    expect(button).toContain('data-variant="primary"');
    expect(button).toContain('disabled=""');
    expect(button).not.toContain('actionKey');
    const icon = markup(leaves[1]!);
    expect(icon).toContain('aria-label="More"');
    expect(icon).toContain('title="More"');
    expect(icon).not.toContain('<button><button');
    const media = markup({ ...leaves[3]!, fit: 'contain' });
    expect(media).toContain('--ui-workbench-media-object-fit:contain');
    expect(media).toContain('ui-workbench-media-slot--fill');
    expect(media).not.toContain('resourceKey');
  });

  it('does not let one registered builder execute a different leaf type', () => {
    const registry = createKitJdwRegistry();
    const buildButton = registry.get('kit.button.v1') as (widget: GenericWidget) => ReactNode;
    expect(buildButton({ type: 'kit.badge.v1', text: 'Wrong adapter' })).toBeNull();
    expect(buildButton({ type: 'kit.button.v2', label: 'Wrong version' })).toBeNull();
  });

  it('rejects accessor widgets without reading getters or consulting the host', () => {
    const getter = vi.fn(() => 'Open');
    const host = {
      subscribe: vi.fn(() => () => undefined),
      getSnapshot: vi.fn(() => ({ mode: 'live' as const, contextKey: {} })),
      getAction: vi.fn(),
      resolveMedia: vi.fn(),
    };
    const registry = createKitJdwRegistry({ host });
    const widget = Object.defineProperty({ type: 'kit.button.v1' }, 'label', {
      get: getter,
      enumerable: true,
    });
    expect(build(registry, widget)).toBeNull();
    expect(registry.definition(widget.type)?.measure?.(widget, constraints)).toEqual({
      width: 0,
      height: 0,
    });
    expect(getter).not.toHaveBeenCalled();
    for (const callback of Object.values(host)) expect(callback).not.toHaveBeenCalled();
  });

  it('accepts canonical ids and finite layout hints without leaking them onto the primitive', () => {
    const registry = createKitJdwRegistry();
    const widget = { ...leaves[0]!, id: 'open-record', flex: 2, flexFit: 'tight' };
    expect(markup(widget, registry)).toContain('ui-button');
    expect(markup(widget, registry)).not.toMatch(/flexFit|flex=|id="open-record"/);
    for (const invalid of [
      { id: '' },
      { id: ' padded ' },
      { flex: Number.NaN },
      { flex: Number.POSITIVE_INFINITY },
      { flex: '2' },
      { flexFit: 'stretch' },
    ]) {
      expect(build(registry, { ...leaves[0]!, ...invalid })).toBeNull();
    }
  });

  it.each([
    { $authoring: { component: { id: 'kit.button.v1', version: '1' } } },
    { authoredNode: { type: 'kit.button.v1' } },
    { width: 100 },
    { style: { color: 'red' } },
    { className: 'injected' },
    { children: [] },
    { child: { type: 'text', text: 'Nested' } },
    { onClick: () => undefined },
    { href: 'https://example.invalid' },
    { dangerouslySetInnerHTML: { __html: '<b>Injected</b>' } },
  ])('rejects metadata and arbitrary props at both build and measure: %o', (extra) => {
    const registry = createKitJdwRegistry();
    const widget = { ...leaves[0]!, ...extra };
    expect(build(registry, widget)).toBeNull();
    const measured = registry.definition(widget.type)?.measure?.(widget, constraints);
    expect(measured == null || (measured.width === 0 && measured.height === 0)).toBe(true);
  });

  it.each(leaves)('clamps valid $type measures to both finite bounds', (widget) => {
    const registry = createKitJdwRegistry();
    const measure = registry.definition(widget.type)!.measure!;
    expect(measure(widget, { minWidth: 3, maxWidth: 7, minHeight: 2, maxHeight: 5 })).toEqual({
      width: 7,
      height: 5,
    });
    expect(
      measure(widget, { minWidth: 400, maxWidth: 450, minHeight: 200, maxHeight: 250 }),
    ).toEqual({
      width: 400,
      height: 200,
    });
  });

  it('uses documented heights and host-independent synchronous measurements', () => {
    const host = {
      subscribe: vi.fn(() => () => undefined),
      getSnapshot: vi.fn(() => ({ mode: 'live' as const, contextKey: {} })),
      getAction: vi.fn(),
      resolveMedia: vi.fn(),
    };
    const registry = createKitJdwRegistry({ host });
    const measure = (widget: GenericWidget) =>
      registry.definition(widget.type)!.measure!(widget, constraints);
    expect(measure(leaves[0]!)?.height).toBe(28);
    expect(measure({ ...leaves[0]!, compact: true })?.height).toBe(24);
    expect(measure(leaves[1]!)).toEqual({ width: 28, height: 28 });
    expect(measure({ ...leaves[1]!, compact: true })).toEqual({ width: 24, height: 24 });
    expect(measure(leaves[2]!)?.height).toBe(20);
    expect(measure(leaves[3]!)).toEqual({ width: 120, height: 80 });
    for (const callback of Object.values(host)) expect(callback).not.toHaveBeenCalled();
  });

  it('renders nested row, column, and grid leaves through the real layout tree', () => {
    const registry = createKitJdwRegistry();
    const source = JSON.stringify({
      type: 'column',
      args: {
        children: [
          { type: 'text', args: { text: 'Record' } },
          {
            type: 'grid',
            args: {
              columns: 2,
              children: [
                { type: 'kit.media-slot.v1', args: { resourceKey: 'cover', alt: 'Cover' } },
                {
                  type: 'row',
                  args: {
                    children: leaves.slice(0, 3).map(({ type, ...args }) => ({ type, args })),
                  },
                },
              ],
            },
          },
        ],
      },
    });
    const parsed = parseJsonWidgetData(source);
    expect(parsed.parseError).toBeNull();
    const tree = layoutWidget(
      jdwNodeToGenericWidget(parsed.value!),
      constraints,
      { x: 0, y: 0 },
      { registry },
    );
    const output = renderToStaticMarkup(<>{renderCssLayoutTree(tree, { registry })}</>);
    for (const className of [
      'ui-button',
      'ui-icon-button',
      'ui-badge',
      'ui-workbench-media-slot',
    ]) {
      expect(output).toContain(className);
    }
    expect(output).toContain('data-widget-type="grid"');
    expect(output).toContain('data-widget-type="row"');
    expect(output).toContain('overflow:hidden');
    expect(output).not.toContain('data-widget-interactive="true"');
  });

  it('resolves scalar bindings before strict decode and rejects incomplete or malformed bindings', () => {
    const registry = createKitJdwRegistry();
    const source = JSON.stringify({
      type: 'kit.button.v1',
      args: { label: '${title}', compact: '${compact}', actionKey: '${action}' },
    });
    const render = (values: Record<string, unknown>) =>
      renderToStaticMarkup(<>{renderJdw(source, { registry, values, strictKnownTypes: true })}</>);
    expect(render({ title: 'Resolved title', compact: true, action: 'open' })).toContain(
      'ui-button--compact',
    );
    expect(render({ title: 'Resolved title', compact: true, action: 'open' })).toContain(
      'Resolved title',
    );
    for (const values of [
      {},
      { title: 'Good', compact: 'false', action: 'open' },
      { title: {}, compact: false, action: 'open' },
      { title: 'Still ${missing}', compact: false, action: 'open' },
      { title: 'Good', compact: false, action: 'https://example.invalid' },
    ]) {
      expect(render(values)).not.toContain('ui-button');
    }
  });

  it('pins inherited optional-null omission separately from direct builder rejection', () => {
    const registry = createKitJdwRegistry();
    const source = '{"type":"kit.button.v1","args":{"label":"Open","disabled":null}}';
    const parsed = parseJsonWidgetData(source);
    expect(parsed.value?.args).toEqual({ label: 'Open' });
    expect(renderToStaticMarkup(<>{renderJdw(source, { registry })}</>)).toContain('ui-button');
    expect(build(registry, { type: 'kit.button.v1', label: 'Open', disabled: null })).toBeNull();
  });

  it('leaves unsupported versions unresolved and supports existing strict-known-type rejection', () => {
    const registry = createKitJdwRegistry();
    const source = '{"type":"kit.button.v2","args":{"label":"Future"}}';
    expect(renderJdw(source, { registry, strictKnownTypes: true })).toBeNull();
    expect(renderToStaticMarkup(<>{renderJdw(source, { registry })}</>)).not.toContain('ui-button');
  });
});
