/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatPanel } from './ChatPanel';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function createFileList(files: File[]): FileList {
  const list: Record<string | number | symbol, unknown> = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  };
  files.forEach((file, index) => {
    list[index] = file;
  });
  return list as unknown as FileList;
}

function createFilesDataTransfer(files: File[]): DataTransfer {
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: createFileList(files),
    items: [] as unknown as DataTransferItemList,
    types: ['Files'],
    clearData: () => undefined,
    getData: () => '',
    setData: () => undefined,
    setDragImage: () => undefined,
  } as DataTransfer;
}

/** jsdom lacks `DragEvent`; attach `dataTransfer` on a cancelable Event instead. */
function dispatchDragLike(
  target: Element,
  type: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  dataTransfer: DataTransfer,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    configurable: true,
    value: dataTransfer,
  });
  target.dispatchEvent(event);
}

describe('ChatPanel file drop', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('calls onFilesDrop with dropped File entries', async () => {
    const onFilesDrop = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <ChatPanel
          messages={[]}
          value=""
          onFilesDrop={onFilesDrop}
          onSubmit={() => undefined}
          onValueChange={() => undefined}
        />,
      );
    });

    const dropTarget = container.querySelector('.chat-panel-drop-target');
    expect(dropTarget).toBeTruthy();

    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });
    const dataTransfer = createFilesDataTransfer([file]);

    await act(async () => {
      dispatchDragLike(dropTarget!, 'dragenter', dataTransfer);
      dispatchDragLike(dropTarget!, 'dragover', dataTransfer);
      dispatchDragLike(dropTarget!, 'drop', dataTransfer);
    });

    expect(onFilesDrop).toHaveBeenCalledTimes(1);
    expect(onFilesDrop.mock.calls[0]?.[0]).toEqual([file]);
    expect(container.querySelector('.chat-panel-drop-overlay')).toBeNull();
  });

  it('does not drop while isRunning', async () => {
    const onFilesDrop = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <ChatPanel
          isRunning
          messages={[]}
          value=""
          onFilesDrop={onFilesDrop}
          onSubmit={() => undefined}
          onValueChange={() => undefined}
        />,
      );
    });

    const dropTarget = container.querySelector('.chat-panel-drop-target');
    expect(dropTarget).toBeTruthy();

    const file = new File(['x'], 'x.txt', { type: 'text/plain' });
    const dataTransfer = createFilesDataTransfer([file]);

    await act(async () => {
      dispatchDragLike(dropTarget!, 'drop', dataTransfer);
    });

    expect(onFilesDrop).not.toHaveBeenCalled();
  });

  it('allows hosts to wrap or replace the default composer', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <ChatPanel
          messages={[]}
          renderComposer={(defaultComposer) => (
            <div data-testid="host-composer-wrap">{defaultComposer}</div>
          )}
          value=""
          onSubmit={() => undefined}
          onValueChange={() => undefined}
        />,
      );
    });

    expect(container.querySelector('[data-testid="host-composer-wrap"]')).not.toBeNull();
    expect(container.querySelector('.composer')).not.toBeNull();
  });
});
