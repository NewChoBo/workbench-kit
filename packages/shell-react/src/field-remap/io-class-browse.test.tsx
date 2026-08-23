/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SourceField, TargetSlot } from '@workbench-kit/field-remap';

import { FieldRemapIoClassBrowse, resolveFieldRemapIoChrome } from './io-class-browse.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('FieldRemapIoClassBrowse', () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  const mount = (node: ReactNode) => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root!.render(node);
    });
  };

  const sources: SourceField[] = [
    {
      id: 'a.user',
      label: 'user',
      dataType: 'object',
      classRef: { id: 'User', version: 1 },
      children: [
        {
          id: 'a.user.name',
          label: 'name',
          path: 'user.name',
          dataType: 'string',
          classRef: { id: 'DisplayName', version: 1 },
        },
        {
          id: 'a.user.secret',
          label: 'secret',
          path: 'user.secret',
          dataType: 'string',
          hidden: true,
        },
        {
          id: 'a.user.address',
          label: 'address',
          path: 'user.address',
          dataType: 'object',
          children: [
            {
              id: 'a.user.address.city',
              label: 'city',
              path: 'user.address.city',
              dataType: 'string',
            },
          ],
        },
      ],
    },
  ];
  const targets: TargetSlot[] = [{ id: 'b.name', label: 'name', path: 'name', dataType: 'string' }];

  it('resolves ioChrome from editableShapes when omitted', () => {
    expect(resolveFieldRemapIoChrome(undefined, true)).toBe('edit');
    expect(resolveFieldRemapIoChrome(undefined, false)).toBe('none');
    expect(resolveFieldRemapIoChrome('browse', false)).toBe('browse');
  });

  it('hides hidden fields by default and shows classRef badges', () => {
    mount(<FieldRemapIoClassBrowse sources={sources} targets={targets} />);
    expect(container?.textContent).toContain('User@1');
    expect(container?.textContent).toContain('user.name');
    expect(container?.textContent).not.toContain('user.secret');
    expect(container?.querySelectorAll('.ui-sidebar-row').length).toBeGreaterThan(0);
    expect(container?.querySelectorAll('.ui-badge[data-variant="muted"]').length).toBeGreaterThan(
      0,
    );
  });

  it('keeps shallow and nested browse content static and list-semantic', () => {
    mount(<FieldRemapIoClassBrowse sources={sources} targets={targets} />);
    const browse = container?.querySelector('[data-testid="field-remap-io-browse"]');
    const sourceSection = browse?.querySelector('section[aria-label="Inputs"]');
    const sourcePort = sourceSection?.querySelector(':scope > ul > li');
    const nestedLists = sourcePort?.querySelectorAll('ul ul');

    expect(sourcePort?.textContent).toContain('user.name');
    expect(sourcePort?.textContent).toContain('user.address.city');
    expect(nestedLists?.length).toBeGreaterThan(0);
    expect(sourcePort?.querySelectorAll('ul').length).toBeGreaterThan(0);
    expect(browse?.querySelector('button')).toBeNull();
    expect(browse?.querySelector('[tabindex]')).toBeNull();
    expect(browse?.querySelector('[role="tree"], [role="treeitem"]')).toBeNull();
  });

  it('shows hidden badges when includeHidden is true', () => {
    mount(<FieldRemapIoClassBrowse includeHidden sources={sources} targets={targets} />);
    expect(container?.textContent).toContain('user.secret');
    expect(container?.textContent).toContain('Hidden');
    expect(container?.querySelector('[title="classRef"]')).toBeTruthy();
  });

  it('uses host-provided chrome labels', () => {
    mount(
      <FieldRemapIoClassBrowse
        includeHidden
        labels={{ classRefTitle: 'Class reference', hiddenBadge: 'Internal' }}
        sources={sources}
        targets={targets}
      />,
    );
    expect(container?.textContent).toContain('Internal');
    expect(container?.textContent).not.toContain('Hidden');
    expect(container?.querySelector('[title="Class reference"]')).toBeTruthy();
  });

  it('uses host titles and empty copy without adding interaction chrome', () => {
    mount(
      <FieldRemapIoClassBrowse
        emptyLabel="Nothing declared"
        sources={[]}
        sourcesTitle="Incoming"
        targets={[]}
        targetsTitle="Outgoing"
      />,
    );

    expect(container?.querySelector('section[aria-label="Incoming"]')?.textContent).toContain(
      'Nothing declared',
    );
    expect(container?.querySelector('section[aria-label="Outgoing"]')?.textContent).toContain(
      'Nothing declared',
    );
    expect(container?.querySelector('button, [tabindex]')).toBeNull();
  });
});
