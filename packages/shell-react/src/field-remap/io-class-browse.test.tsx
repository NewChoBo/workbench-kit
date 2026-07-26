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
        { id: 'a.user.name', label: 'name', path: 'user.name', dataType: 'string' },
        {
          id: 'a.user.secret',
          label: 'secret',
          path: 'user.secret',
          dataType: 'string',
          hidden: true,
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
  });

  it('shows hidden badges when includeHidden is true', () => {
    mount(<FieldRemapIoClassBrowse includeHidden sources={sources} targets={targets} />);
    expect(container?.textContent).toContain('user.secret');
    expect(container?.textContent).toContain('Hidden');
  });
});
