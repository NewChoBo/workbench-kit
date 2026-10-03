/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SideBarTree, type SideBarTreeDragAndDrop, type SideBarTreeProps } from './SideBarTree';

const cleanup: (() => void)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await act(close);
  vi.useRealTimers();
});
async function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  cleanup.push(() => {
    root.unmount();
    host.remove();
  });
  const onDrop = vi.fn(() => ({ accepted: true as const, message: 'Moved' }));
  const onSelectedIdsChange = vi.fn();
  const dnd: SideBarTreeDragAndDrop = {
    revisionKey: 1,
    canDrag: (id) => id !== 'root',
    getDropFeedback: ({ targetId, placement }) =>
      targetId === 'blocked'
        ? { accepted: false, reason: 'blocked', message: 'Cannot use this destination' }
        : { accepted: true, message: `${placement} ${targetId}` },
    onDrop,
  };
  const props: SideBarTreeProps = {
    items: [
      {
        id: 'root',
        label: 'Root',
        children: [
          { id: 'source', label: 'Source' },
          { id: 'container', label: 'Container', children: [] },
          { id: 'blocked', label: 'Blocked' },
          { id: 'disabled', label: 'Disabled', disabled: true },
        ],
      },
    ],
    expandedIds: new Set(['root']),
    selectedIds: new Set(['source']),
    onExpandedIdsChange: vi.fn(),
    onSelectedIdsChange,
    selectionMode: 'multi',
    dragAndDrop: dnd,
  };
  const render = async (changes: Partial<SideBarTreeProps> = {}) => {
    await act(async () => root.render(<SideBarTree {...props} {...changes} />));
    for (const row of Array.from(host.querySelectorAll('button,li')))
      row.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 100,
        bottom: 30,
        width: 100,
        height: 30,
        toJSON() {},
      });
  };
  await render();
  const row = (id: string) => host.querySelector(`[data-sidebar-tree-id="${id}"]`)!;
  const drag = async (type: string, id: string, clientY = 15) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: vi.fn(),
      getData: vi.fn(() => 'source'),
    };
    Object.defineProperties(event, {
      clientY: { value: clientY },
      dataTransfer: { value: dataTransfer },
    });
    await act(async () => {
      row(id).dispatchEvent(event);
    });
    return { event, dataTransfer };
  };
  return { host, row, drag, render, dnd, onDrop, onSelectedIdsChange };
}

describe('controlled sidebar placement', () => {
  it.each([
    [1, 'before'],
    [15, 'inside'],
    [29, 'after'],
  ] as const)('previews and commits %s as %s without changing selection', async (y, placement) => {
    const h = await setup();
    expect(h.row('source').closest('li')!.draggable).toBe(true);
    expect(h.row('source').getAttribute('draggable')).toBeNull();
    await h.drag('dragstart', 'source');
    const over = await h.drag('dragover', 'container', y);
    expect(over.dataTransfer.dropEffect).toBe('move');
    expect(h.row('container').parentElement!.getAttribute('data-drop-placement')).toBe(placement);
    expect(h.host.querySelector('[role="status"]')?.textContent).toBe(`${placement} container`);
    await h.drag('drop', 'container', y);
    expect(h.onDrop).toHaveBeenCalledExactlyOnceWith({
      sourceId: 'source',
      targetId: 'container',
      placement,
    });
    expect(h.onSelectedIdsChange).not.toHaveBeenCalled();
    expect(h.row('container').parentElement!.hasAttribute('data-drop-placement')).toBe(false);
    expect(document.activeElement).toBe(h.row('source'));
  });
  it('rejects external drops, invalid destinations and disabled rows', async () => {
    const h = await setup();
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
    await h.drag('dragstart', 'source');
    const over = await h.drag('dragover', 'blocked');
    expect(over.dataTransfer.dropEffect).toBe('none');
    expect(h.host.textContent).toContain('Cannot use this destination');
    await h.drag('drop', 'blocked');
    await h.drag('dragstart', 'disabled');
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
  });
  it('cancels Escape before the outer editor and ignores the later native drop', async () => {
    const h = await setup();
    const outer = vi.fn();
    h.host.addEventListener('keydown', outer);
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    await act(async () =>
      h
        .row('source')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        ),
    );
    expect(outer).not.toHaveBeenCalled();
    expect(h.host.querySelector('[data-drop-placement]')).toBeNull();
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
  });
  it('cancels leaving the tree and refuses a later return/drop from that gesture', async () => {
    const h = await setup();
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    const leave = new Event('dragleave', { bubbles: true });
    Object.defineProperties(leave, {
      relatedTarget: { value: document.body },
      clientX: { value: -100 },
      clientY: { value: -100 },
    });
    await act(async () => {
      h.row('container').dispatchEvent(leave);
    });
    expect(h.host.querySelector('[data-drop-placement]')).toBeNull();
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
  });
  it('invalidates a gesture on source revision change and permits a fresh gesture', async () => {
    const h = await setup();
    await h.drag('dragstart', 'source');
    await h.render({ dragAndDrop: { ...h.dnd, revisionKey: 2 } });
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
    await h.drag('dragstart', 'source');
    await h.drag('drop', 'container');
    expect(h.onDrop).toHaveBeenCalledTimes(1);
  });
  it('clears dragend and rechecks authoritative drop rejection without optimistic selection', async () => {
    const h = await setup();
    await h.drag('dragstart', 'source');
    await h.drag('dragend', 'source');
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
    const reject = vi.fn(() => ({
      accepted: false as const,
      reason: 'changed',
      message: 'Source changed',
    }));
    await h.render({ dragAndDrop: { ...h.dnd, onDrop: reject } });
    await h.drag('dragstart', 'source');
    await h.drag('drop', 'container');
    expect(h.host.querySelector('[role="status"]')?.textContent).toBe('Source changed');
    expect(h.onSelectedIdsChange).not.toHaveBeenCalled();
  });
});

describe('deferred exact feedback', () => {
  const deferredFeedback = {
    pendingMessage: 'Checking destination',
    unavailableMessage: 'Unavailable destination',
  };
  const advance = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
  it('responds pending immediately, survives its own hover rerenders and validates freshly at drop', async () => {
    vi.useFakeTimers();
    const h = await setup();
    const feedback = vi.fn(h.dnd.getDropFeedback);
    await h.render({ dragAndDrop: { ...h.dnd, deferredFeedback, getDropFeedback: feedback } });
    await h.drag('dragstart', 'source');
    const first = await h.drag('dragover', 'container');
    expect(first.dataTransfer.dropEffect).toBe('none');
    expect(h.row('container').closest('li')!.getAttribute('data-drop-pending')).toBe('true');
    expect(feedback).not.toHaveBeenCalled();
    await h.drag('dragover', 'container');
    await advance();
    expect(feedback).toHaveBeenCalledTimes(1);
    expect((await h.drag('dragover', 'container')).dataTransfer.dropEffect).toBe('move');
    await h.drag('dragover', 'container');
    expect(feedback).toHaveBeenCalledTimes(1);
    await h.drag('drop', 'container');
    expect(feedback).toHaveBeenCalledTimes(2);
    expect(h.onDrop).toHaveBeenCalledTimes(1);
  });
  it('never commits a pending release and retires its timer', async () => {
    vi.useFakeTimers();
    const h = await setup(),
      feedback = vi.fn(h.dnd.getDropFeedback);
    await h.render({ dragAndDrop: { ...h.dnd, deferredFeedback, getDropFeedback: feedback } });
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    await h.drag('drop', 'container');
    await advance();
    expect(feedback).not.toHaveBeenCalled();
    expect(h.onDrop).not.toHaveBeenCalled();
  });
  it('prepares only B after A changes and invalidates config/revision results', async () => {
    vi.useFakeTimers();
    const h = await setup(),
      feedback = vi.fn(h.dnd.getDropFeedback);
    const config = { ...h.dnd, deferredFeedback, getDropFeedback: feedback };
    await h.render({ dragAndDrop: config });
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    await h.drag('dragover', 'blocked');
    await advance();
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(feedback.mock.calls[0]![0].targetId).toBe('blocked');
    expect(h.host.textContent).toContain('Cannot use this destination');
    await h.drag('dragover', 'container');
    await h.render({ dragAndDrop: { ...config, revisionKey: 2 } });
    await advance();
    await h.drag('drop', 'container');
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(h.onDrop).not.toHaveBeenCalled();
  });
  it('retires a same-revision changed host callback and cancels on exit/unmount', async () => {
    vi.useFakeTimers();
    const h = await setup(),
      feedback = vi.fn(h.dnd.getDropFeedback);
    await h.render({ dragAndDrop: { ...h.dnd, deferredFeedback, getDropFeedback: feedback } });
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    await h.render({ dragAndDrop: { ...h.dnd, deferredFeedback, getDropFeedback: feedback } });
    await advance();
    expect(feedback).not.toHaveBeenCalled();
    await h.drag('dragover', 'container');
    await h.drag('dragend', 'source');
    await advance();
    expect(feedback).not.toHaveBeenCalled();
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    await act(cleanup.pop()!);
    await advance();
    expect(feedback).not.toHaveBeenCalled();
  });
  it('catches preparation and final exceptions and freshly rejects a previously accepted target', async () => {
    vi.useFakeTimers();
    const h = await setup();
    let phase: 'allow' | 'deny' | 'throw' = 'throw';
    const feedback = vi.fn(() => {
      if (phase === 'throw') throw new Error('host unavailable');
      return phase === 'allow'
        ? { accepted: true as const, message: 'Ready' }
        : { accepted: false as const, reason: 'changed', message: 'Changed' };
    });
    await h.render({ dragAndDrop: { ...h.dnd, deferredFeedback, getDropFeedback: feedback } });
    await h.drag('dragstart', 'source');
    await h.drag('dragover', 'container');
    await advance();
    expect(h.host.textContent).toContain('Unavailable destination');
    expect(h.host.querySelector('[data-drop-pending]')).toBeNull();
    await h.drag('drop', 'container');
    expect(h.onDrop).not.toHaveBeenCalled();
    for (const final of ['deny', 'throw'] as const) {
      phase = 'allow';
      await h.drag('dragstart', 'source');
      await h.drag('dragover', 'container');
      await advance();
      phase = final;
      await h.drag('drop', 'container');
      expect(h.onDrop).not.toHaveBeenCalled();
    }
  });
});
