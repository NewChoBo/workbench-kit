/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { sourceFieldsFromPlainObject } from '@workbench-kit/field-remap';

import { FieldRemapShapeIoEditor, ingestSourceShape } from './shape-io-editor.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('FieldRemapShapeIoEditor', () => {
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

  it('applies pasted JSON and reports parse errors', () => {
    const onApplySample = vi.fn();
    const fields = sourceFieldsFromPlainObject({ name: 'Ada' }, { idPrefix: 'a' });

    mount(
      <FieldRemapShapeIoEditor
        role="source"
        title="A"
        idPrefix="a"
        sampleJson="{not-json"
        fields={fields}
        onSampleJsonChange={() => {}}
        onApplySample={onApplySample}
        onFieldsChange={() => {}}
      />,
    );

    act(() => {
      container!.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onApplySample).not.toHaveBeenCalled();
    expect(container!.textContent).toMatch(/JSON/i);

    act(() => {
      root!.render(
        <FieldRemapShapeIoEditor
          role="source"
          title="A"
          idPrefix="a"
          sampleJson={'{"name":"Grace"}'}
          fields={fields}
          onSampleJsonChange={() => {}}
          onApplySample={onApplySample}
          onFieldsChange={() => {}}
        />,
      );
    });
    act(() => {
      container!.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onApplySample).toHaveBeenCalledWith({ name: 'Grace' });
  });

  it('ingests source shapes for hosts', () => {
    const ingested = ingestSourceShape({ user_name: 'Ada' }, 'a');
    expect(ingested.fields[0]?.id).toBe('a.user_name');
    expect(ingested.sampleJson).toContain('Ada');
  });
});
