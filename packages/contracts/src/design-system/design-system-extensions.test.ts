import { describe, expect, it } from 'vitest';

import {
  designSystemComponentRoleRefKey,
  isSameDesignSystemComponentRoleRequirements,
  validateDesignSystemPackDescriptor,
  type DesignSystemPackDescriptor,
  type UiComponentDescriptor,
} from '../index';

const button: UiComponentDescriptor = {
  id: 'button.primary',
  version: '1.0.0',
  kind: 'atomic',
  properties: [{ id: 'label', value: { type: 'string', allowedSources: ['literal', 'token'] } }],
  events: [{ id: 'activate', payload: { type: 'string' } }],
  bindings: [{ id: 'value', direction: 'input', value: { type: 'string' } }],
  layout: {
    childSlots: [{ id: 'content', cardinality: 'many' }],
    supportedStrategyIds: ['flex'],
  },
  accessibility: { supportedRoles: ['button'] },
  designTime: { label: 'Primary button' },
};

function pack(overrides: Partial<DesignSystemPackDescriptor> = {}): DesignSystemPackDescriptor {
  return {
    ref: { id: 'test.design', version: '1.0.0' },
    defaultThemeId: 'light',
    themes: [{ id: 'light' }],
    components: [button],
    provenance: { source: 'builtin', sourceId: 'test', sourceVersion: '1.0.0' },
    ...overrides,
  };
}

const roleRequirements = {
  properties: [{ id: 'label', type: 'string' as const, allowedSources: ['literal'] as const }],
  events: [{ id: 'activate', payloadType: 'string' as const }],
  bindings: [{ id: 'value', direction: 'input' as const, type: 'string' as const }],
  childSlots: [{ id: 'content', cardinality: 'many' as const }],
  supportedStrategyIds: ['flex'],
  accessibilityRoles: ['button'],
};

describe('Design System typed descriptor extensions', () => {
  it('keeps public role helpers fail-closed without executing accessors', () => {
    let getterCalled = false;
    const accessorRef = { version: '1.0.0' } as Record<string, unknown>;
    Object.defineProperty(accessorRef, 'id', {
      enumerable: true,
      get() {
        getterCalled = true;
        return 'unsafe';
      },
    });
    const accessorRequirements = {} as Record<string, unknown>;
    Object.defineProperty(accessorRequirements, 'properties', {
      enumerable: true,
      get() {
        getterCalled = true;
        return [];
      },
    });

    expect(designSystemComponentRoleRefKey(accessorRef as never)).toBe('');
    expect(isSameDesignSystemComponentRoleRequirements(accessorRequirements as never, {})).toBe(
      false,
    );
    expect(isSameDesignSystemComponentRoleRequirements({ properties: {} } as never, {})).toBe(
      false,
    );
    expect(getterCalled).toBe(false);
  });

  it('normalizes role equality without changing existing allowed-source defaults', () => {
    expect(
      isSameDesignSystemComponentRoleRequirements(
        {
          properties: [
            { id: 'label', type: 'string' },
            { id: 'tone', type: 'enum', allowedSources: ['token', 'literal'] },
          ],
          supportedStrategyIds: ['grid', 'flex'],
        },
        {
          supportedStrategyIds: ['flex', 'grid'],
          properties: [
            { id: 'tone', type: 'enum', allowedSources: ['literal', 'token', 'token'] },
            { id: 'label', type: 'string', allowedSources: ['literal'] },
          ],
        },
      ),
    ).toBe(true);
  });

  it('keeps 072B descriptors valid and accepts bounded token/resource/role metadata', () => {
    expect(validateDesignSystemPackDescriptor(pack())).toEqual([]);
    expect(
      validateDesignSystemPackDescriptor(
        pack({
          tokens: [
            { id: 'color.text', value: { type: 'color' } },
            { id: 'color.action', value: { type: 'color', allowedSources: ['token'] } },
          ],
          resources: [
            {
              id: 'brand.logo',
              value: { type: 'string' },
              mediaType: 'image/svg+xml',
              trust: 'authorized-pack',
              loading: 'renderer-resolved',
            },
          ],
          componentRoles: [
            {
              role: { id: 'action.primary', version: '1.0.0' },
              requirements: roleRequirements,
              component: { id: 'button.primary', version: '1.0.0' },
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('rejects duplicate exact component refs before role resolution', () => {
    expect(
      validateDesignSystemPackDescriptor(pack({ components: [button, { ...button }] })).map(
        (diagnostic) => diagnostic.code,
      ),
    ).toEqual(['invalid-component-descriptor']);
  });

  it('rejects duplicate ids, forbidden token sources and invalid resource requirements', () => {
    const diagnostics = validateDesignSystemPackDescriptor(
      pack({
        tokens: [
          { id: 'color.text', value: { type: 'color' } },
          {
            id: 'color.text',
            value: { type: 'color', allowedSources: ['binding'] },
          },
        ],
        resources: [
          {
            id: 'brand.logo',
            value: { type: 'string' },
            trust: 'authorized-pack',
            loading: 'renderer-resolved',
          },
          {
            id: 'brand.logo',
            value: { type: 'string' },
            trust: 'host-trusted',
            loading: 'url',
          } as never,
          {
            id: 'brand.unsafe',
            value: { type: 'string' },
            trust: 'authorized-pack',
            loading: 'renderer-resolved',
            url: 'https://example.invalid/logo.svg',
          } as never,
        ],
      }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'duplicate-token-id',
      'invalid-token-descriptor',
      'duplicate-resource-id',
      'invalid-resource-descriptor',
      'invalid-resource-descriptor',
    ]);
  });

  it('fails closed for duplicate requirements, missing targets and capability mismatches', () => {
    const diagnostics = validateDesignSystemPackDescriptor(
      pack({
        componentRoles: [
          {
            role: { id: 'action.primary', version: '1.0.0' },
            requirements: {
              properties: [
                { id: 'label', type: 'number' },
                { id: 'label', type: 'string' },
              ],
            },
            component: { id: 'button.primary', version: '1.0.0' },
          },
          {
            role: { id: 'surface.card', version: '1.0.0' },
            requirements: { accessibilityRoles: ['region'] },
            component: { id: 'missing', version: '1.0.0' },
          },
        ],
      }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'invalid-component-role',
      'component-role-target-not-found',
    ]);
  });

  it('diagnoses every duplicate role requirement list without set-normalizing ids', () => {
    const diagnostics = validateDesignSystemPackDescriptor(
      pack({
        componentRoles: [
          {
            role: { id: 'action.primary', version: '1.0.0' },
            requirements: {
              properties: [
                { id: 'label', type: 'string' },
                { id: 'label', type: 'string' },
              ],
              events: [{ id: 'activate' }, { id: 'activate' }],
              bindings: [
                { id: 'value', direction: 'input', type: 'string' },
                { id: 'value', direction: 'input', type: 'string' },
              ],
              childSlots: [
                { id: 'content', cardinality: 'many' },
                { id: 'content', cardinality: 'many' },
              ],
              supportedStrategyIds: ['flex', 'flex'],
              accessibilityRoles: ['button', 'button'],
            },
            component: { id: button.id, version: button.version },
          },
        ],
      }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      Array.from({ length: 6 }, () => 'invalid-component-role'),
    );
  });

  it('diagnoses each unsupported component capability arm', () => {
    const diagnostics = validateDesignSystemPackDescriptor(
      pack({
        componentRoles: [
          {
            role: { id: 'action.primary', version: '1.0.0' },
            requirements: {
              properties: [{ id: 'label', type: 'number' }],
              events: [{ id: 'activate', payloadType: 'number' }],
              bindings: [{ id: 'value', direction: 'output', type: 'number' }],
              childSlots: [{ id: 'content', cardinality: 'one' }],
              supportedStrategyIds: ['grid'],
              accessibilityRoles: ['link'],
            },
            component: { id: button.id, version: button.version },
          },
        ],
      }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      Array.from({ length: 6 }, () => 'component-role-capability-mismatch'),
    );
  });

  it('invalidates every mapping that conflicts on one exact role contract', () => {
    const secondary = { ...button, id: 'button.secondary' } satisfies UiComponentDescriptor;
    const diagnostics = validateDesignSystemPackDescriptor(
      pack({
        components: [button, secondary],
        componentRoles: [
          {
            role: { id: 'action.primary', version: '1.0.0' },
            requirements: { events: [{ id: 'activate' }] },
            component: { id: button.id, version: button.version },
          },
          {
            role: { id: 'action.primary', version: '1.0.0' },
            requirements: { accessibilityRoles: ['button'] },
            component: { id: secondary.id, version: secondary.version },
          },
        ],
      }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'conflicting-component-role-contract',
      'conflicting-component-role-contract',
    ]);
  });
});
