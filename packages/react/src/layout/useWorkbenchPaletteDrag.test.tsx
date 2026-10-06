/** @vitest-environment jsdom */
import { act, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useWorkbenchPaletteDrag,
  type WorkbenchPaletteDragOptions,
  type WorkbenchPaletteDragResult,
  type WorkbenchPaletteDragTargetResolver,
  type WorkbenchPaletteDragTargetProps,
} from './useWorkbenchPaletteDrag';

interface Source {
  readonly id: string;
}
interface Target {
  readonly x: number;
  readonly extent: number | null;
}
interface PreparedData {
  readonly extent: number;
  readonly cacheKey: string;
}
type Options = WorkbenchPaletteDragOptions<Source, Target, PreparedData>;
type Result = WorkbenchPaletteDragResult<Source, Target, PreparedData>;
const source: Source = Object.freeze({ id: 'choice' });
const mimeType = 'application/x-example-palette';

class Transfer {
  private values = new Map<string, string>();
  protectedMode = false;
  effectAllowed = 'none';
  dropEffect = 'none';
  get types() {
    return [...this.values.keys()];
  }
  setData(type: string, value: string) {
    this.values.set(type, value);
  }
  getData(type: string) {
    return this.protectedMode ? '' : (this.values.get(type) ?? '');
  }
}

const cleanups: Array<() => Promise<void>> = [];
beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function dispatch(
  element: Element,
  type: string,
  transfer = new Transfer(),
  x = 10,
  relatedTarget: EventTarget | null = null,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: 20,
    relatedTarget,
  });
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  await act(async () => {
    element.dispatchEvent(event);
  });
  return event;
}

async function settle() {
  await act(async () => {
    vi.runOnlyPendingTimers();
  });
}

async function mount(overrides: Partial<Options> = {}, consume?: (drag: Result) => void) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const feedback = vi.fn<Options['getDropFeedback']>(() => ({ accepted: true, message: 'Ready' }));
  const commit = vi.fn<Options['onDrop']>(() => ({ accepted: true, message: 'Inserted' }));
  const click = vi.fn();
  let options: Options = {
    enabled: true,
    revisionKey: 1,
    mimeType,
    getSourceKey: (item) => item.id,
    canDrag: () => true,
    getDropFeedback: feedback,
    onDrop: commit,
    pendingMessage: 'Destination not ready. Pause briefly and try again.',
    unavailableMessage: 'Destination unavailable.',
    ...overrides,
  };
  let resolver: WorkbenchPaletteDragTargetResolver<Source, Target> = (_source, point) => ({
    key: String(point.clientX),
    target: Object.freeze({ x: point.clientX, extent: null }),
  });
  let latest: Result | null = null;
  let showSource = true;
  let unmounted = false;
  let ownerRenders = 0;
  let updateChildResolver:
    ((next: WorkbenchPaletteDragTargetResolver<Source, Target>) => void) | null = null;
  let updateChildVisible: ((visible: boolean) => void) | null = null;
  let targetProps: WorkbenchPaletteDragTargetProps | null = null;
  function Canvas({ drag }: { readonly drag: Result }) {
    const [childResolver, setChildResolver] = useState<WorkbenchPaletteDragTargetResolver<
      Source,
      Target
    > | null>(null);
    const [visible, setVisible] = useState(true);
    updateChildResolver = (next) => setChildResolver(() => next);
    updateChildVisible = setVisible;
    targetProps = drag.getTargetProps(childResolver ?? resolver);
    return visible ? (
      <div data-canvas {...targetProps}>
        <span>Child</span>
      </div>
    ) : null;
  }
  function Harness() {
    ownerRenders += 1;
    const drag = useWorkbenchPaletteDrag(options);
    latest = drag;
    // Mimics a host that records a consumed generation before requesting refresh.
    const consumed = useRef(0);
    useEffect(() => {
      const preview = drag.preview;
      if (
        consume &&
        drag.active &&
        preview &&
        !preview.pending &&
        preview.data &&
        preview.revisionKey === options.revisionKey &&
        preview.preparationGeneration !== consumed.current &&
        drag.isCurrentPreview(preview)
      ) {
        consumed.current = preview.preparationGeneration;
        consume(drag);
      }
    }, [drag]);
    return (
      <>
        {showSource ? (
          <button {...drag.getSourceProps(source)} onClick={click}>
            Choice
          </button>
        ) : null}
        <input aria-label="Outside" />
        <Canvas drag={drag} />
        <div role="status">{drag.message}</div>
      </>
    );
  }
  const render = async () => {
    await act(async () => root.render(<Harness />));
  };
  await render();
  const button = container.querySelector('button')!;
  const unmount = async () => {
    if (unmounted) return;
    unmounted = true;
    await act(async () => root.unmount());
    container.remove();
  };
  cleanups.push(unmount);
  return {
    container,
    button,
    get canvas() {
      return container.querySelector('[data-canvas]')!;
    },
    get ownerRenders() {
      return ownerRenders;
    },
    get targetProps() {
      return targetProps!;
    },
    async setChildResolver(next: WorkbenchPaletteDragTargetResolver<Source, Target>) {
      await act(async () => updateChildResolver?.(next));
    },
    async setChildVisible(visible: boolean) {
      await act(async () => updateChildVisible?.(visible));
    },
    feedback,
    commit,
    click,
    get result() {
      return latest!;
    },
    updateNow(next: Partial<Options>) {
      options = { ...options, ...next };
      flushSync(() => root.render(<Harness />));
    },
    async update(next: Partial<Options>) {
      options = { ...options, ...next };
      await render();
    },
    async setResolver(next: WorkbenchPaletteDragTargetResolver<Source, Target>) {
      resolver = next;
      await render();
    },
    async removeSource() {
      showSource = false;
      await render();
    },
    unmount,
  };
}

describe('useWorkbenchPaletteDrag', () => {
  it('writes only an opaque custom marker and preserves normal button activation', async () => {
    const start = vi.fn();
    const view = await mount({ onDragStart: start });
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    expect(transfer.types).toEqual([mimeType]);
    expect(transfer.getData(mimeType)).not.toContain(source.id);
    expect(transfer.effectAllowed).toBe('copy');
    expect(start).toHaveBeenCalledExactlyOnceWith(source);
    expect(view.result.active).toBe(true);
    expect(view.result.getSourceProps(source)).not.toHaveProperty('onClick');
    expect(view.result.getSourceProps(source)).not.toHaveProperty('onKeyDown');
    await dispatch(view.button, 'click');
    expect(view.click).toHaveBeenCalledTimes(1);
  });

  it('defers preparation, supports protected mode, and commits a matching drop only once', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    transfer.protectedMode = true;
    const over = await dispatch(view.canvas, 'dragover', transfer);
    expect(over.defaultPrevented).toBe(true);
    expect(view.feedback).not.toHaveBeenCalled();
    expect(view.result.preview?.pending).toBe(true);
    expect(view.result.preview?.feedback.accepted).toBe(false);
    expect(transfer.dropEffect).toBe('copy');
    await settle();
    expect(view.feedback).toHaveBeenCalledTimes(1);
    expect(view.result.preview?.pending).toBe(false);
    await dispatch(view.canvas, 'dragover', transfer);
    expect(transfer.dropEffect).toBe('copy');
    expect(view.feedback).toHaveBeenCalledTimes(1);
    transfer.protectedMode = false;
    await dispatch(view.canvas, 'drop', transfer);
    await dispatch(view.canvas, 'drop', transfer);
    await dispatch(view.button, 'dragend', transfer);
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(source, { x: 10, extent: null });
    expect(view.result.active).toBe(false);
    expect(view.result.preview).toBeNull();
    expect(view.result.message).toBe('Inserted');
  });

  it('does not accept external, plaintext-only or another hook instance markers', async () => {
    const view = await mount();
    const other = await mount();
    const own = new Transfer();
    await dispatch(view.button, 'dragstart', own);
    const external = new Transfer();
    external.setData('text/plain', own.getData(mimeType));
    await dispatch(view.canvas, 'dragover', external);
    expect(view.result.preview).toBeNull();
    await dispatch(other.canvas, 'dragover', own);
    await dispatch(other.canvas, 'drop', own);
    expect(other.commit).not.toHaveBeenCalled();
    await dispatch(view.canvas, 'dragover', own);
    await settle();
    external.setData(mimeType, 'foreign-token');
    await dispatch(view.canvas, 'drop', external);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.active).toBe(false);
  });

  it('keeps at most one deferred preparation and accepts the latest stable pointer pause', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    for (const x of [10, 20, 30, 40, 50]) {
      await dispatch(view.canvas, 'dragover', transfer, x);
      expect(vi.getTimerCount()).toBe(1);
    }
    expect(view.feedback).not.toHaveBeenCalled();
    await settle();
    expect(view.feedback).toHaveBeenCalledExactlyOnceWith(source, { x: 50, extent: null });
    expect(view.result.preview?.key).toBe('50');
    expect(view.result.preview?.feedback.accepted).toBe(true);
    await dispatch(view.canvas, 'drop', transfer, 50);
    expect(view.commit).toHaveBeenCalledTimes(1);
  });

  it('admits immediate release and remeasures a moved final target without a hover delay', async () => {
    const view = await mount();
    const first = new Transfer();
    await dispatch(view.button, 'dragstart', first);
    await dispatch(view.canvas, 'dragover', first);
    await dispatch(view.canvas, 'drop', first);
    await settle();
    expect(view.feedback).toHaveBeenCalledTimes(1);
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(source, { x: 10, extent: null });
    await settle();
    expect(vi.getTimerCount()).toBe(0);
    const second = new Transfer();
    await dispatch(view.button, 'dragstart', second);
    await dispatch(view.canvas, 'dragover', second);
    await settle();
    await dispatch(view.canvas, 'drop', second, 11);
    expect(view.commit).toHaveBeenCalledTimes(2);
    expect(view.commit).toHaveBeenLastCalledWith(source, { x: 11, extent: null });
  });

  it('resolves drop-only geometry without consuming pending hover metadata', async () => {
    const consume = vi.fn();
    const view = await mount(
      {
        getDropFeedback: (_source, target) =>
          target.extent === 60
            ? { accepted: true, message: 'Ready' }
            : {
                accepted: false,
                reason: 'extent',
                message: 'Measuring',
                data: { extent: 60, cacheKey: 'target' },
              },
      },
      consume,
    );
    await view.setResolver((_source, point) => ({
      key: `${point.clientX}:${point.phase ?? 'hover'}`,
      target: { x: point.clientX, extent: point.phase === 'drop' ? 60 : null },
    }));
    const timers = vi.spyOn(window, 'setTimeout');
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    const oldCallback = timers.mock.calls[timers.mock.calls.length - 1]?.[0];
    await dispatch(view.canvas, 'drop', transfer, 25);
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(source, { x: 25, extent: 60 });
    await act(async () => {
      if (typeof oldCallback === 'function') oldCallback();
    });
    await settle();
    expect(consume).not.toHaveBeenCalled();
    expect(view.commit).toHaveBeenCalledTimes(1);
    expect(view.result.preview).toBeNull();
  });

  it.each([false, true])(
    'completed host preparation remains droppable but requires final readiness=%s',
    async (readyAtDrop) => {
      const view = await mount({
        getDropFeedback: (_source, target) =>
          target.extent === 60
            ? { accepted: true, message: 'Ready' }
            : { accepted: false, pending: true, reason: 'measuring', message: 'Measuring' },
      });
      await view.setResolver((_source, point) => ({
        key: point.phase === 'drop' ? 'final' : 'hover',
        target: { x: point.clientX, extent: point.phase === 'drop' && readyAtDrop ? 60 : null },
      }));
      const transfer = new Transfer();
      await dispatch(view.button, 'dragstart', transfer);
      await dispatch(view.canvas, 'dragover', transfer);
      await settle();
      expect(view.result.preview?.pending).toBe(false);
      expect(view.result.preview?.feedback).toMatchObject({ accepted: false, pending: true });
      await dispatch(view.canvas, 'dragover', transfer);
      expect(transfer.dropEffect).toBe('copy');
      await dispatch(view.canvas, 'drop', transfer);
      await dispatch(view.canvas, 'drop', transfer);
      expect(view.commit).toHaveBeenCalledTimes(readyAtDrop ? 1 : 0);
      expect(view.result.active).toBe(false);
      expect(view.result.preview).toBeNull();
      await settle();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(['unsupported', 'pending'])(
    'unmarked rejected feedback %s never advertises a valid drop',
    async (reason) => {
      const view = await mount({
        getDropFeedback: () => ({ accepted: false, reason, message: 'Unavailable' }),
      });
      const transfer = new Transfer();
      await dispatch(view.button, 'dragstart', transfer);
      await dispatch(view.canvas, 'dragover', transfer);
      await settle();
      await dispatch(view.canvas, 'dragover', transfer);
      expect(transfer.dropEffect).toBe('none');
      await dispatch(view.canvas, 'drop', transfer);
      expect(view.commit).not.toHaveBeenCalled();
      expect(view.result.active).toBe(false);
    },
  );

  it('retires registration replaced by the second final resolution without stranding the gesture', async () => {
    let resolutions = 0;
    const view = await mount();
    await view.setResolver((_source, point) => {
      if (point.phase === 'drop' && ++resolutions === 2)
        view.targetProps.ref(view.canvas as HTMLElement);
      return { key: 'stable', target: { x: point.clientX, extent: 60 } };
    });
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await dispatch(view.canvas, 'drop', transfer);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.active).toBe(false);
    expect(view.result.preview).toBeNull();
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves a new gesture started reentrantly during final resolution', async () => {
    const view = await mount();
    const replacement = new Transfer();
    let replace = true;
    await view.setResolver((_source, point) => {
      if (point.phase === 'drop' && replace) {
        replace = false;
        const event = new MouseEvent('dragstart', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'dataTransfer', { value: replacement });
        view.button.dispatchEvent(event);
      }
      return { key: 'stable', target: { x: point.clientX, extent: 60 } };
    });
    const original = new Transfer();
    await dispatch(view.button, 'dragstart', original);
    await dispatch(view.canvas, 'drop', original);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.active).toBe(true);
    await dispatch(view.canvas, 'drop', replacement);
    expect(view.commit).toHaveBeenCalledTimes(1);
    expect(view.result.active).toBe(false);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['resolver', 'feedback'] as const)(
    'rechecks source, revision and target invalidation after final %s',
    async (phase) => {
      for (const kind of [
        'cancel',
        'disabled',
        'revision',
        'source',
        'target',
        'registration',
      ] as const) {
        let invalidate = () => {};
        const view = await mount({
          getDropFeedback: () => {
            if (phase === 'feedback') invalidate();
            return { accepted: true, message: 'Ready' };
          },
        });
        await view.setResolver((_source, point) => {
          if (point.phase === 'drop' && phase === 'resolver') invalidate();
          return { key: 'target', target: { x: point.clientX, extent: 60 } };
        });
        invalidate = () => {
          if (kind === 'cancel') view.result.cancel();
          if (kind === 'disabled') view.button.disabled = true;
          if (kind === 'revision') view.updateNow({ revisionKey: 2 });
          if (kind === 'source') view.updateNow({ getSourceKey: () => 'replaced' });
          if (kind === 'target') view.targetProps.ref(null);
          if (kind === 'registration') view.targetProps.ref(view.canvas as HTMLElement);
        };
        const transfer = new Transfer();
        await dispatch(view.button, 'dragstart', transfer);
        await dispatch(view.canvas, 'dragover', transfer);
        await dispatch(view.canvas, 'drop', transfer);
        await settle();
        expect(view.commit).not.toHaveBeenCalled();
        expect(view.result.active).toBe(false);
        expect(view.result.preview).toBeNull();
        await settle();
        expect(vi.getTimerCount()).toBe(0);
      }
    },
  );

  it('rechecks formerly accepted feedback and rejects invalid or genuinely pending final targets', async () => {
    let ready = true;
    const view = await mount({
      getDropFeedback: () =>
        ready
          ? { accepted: true, message: 'Ready' }
          : { accepted: false, reason: 'pending', message: 'Still measuring' },
    });
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(true);
    ready = false;
    await dispatch(view.canvas, 'drop', transfer);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.message).toBe('Still measuring');
    const retry = new Transfer();
    await dispatch(view.button, 'dragstart', retry);
    await dispatch(view.canvas, 'dragover', retry);
    await view.setResolver(() => null);
    await dispatch(view.canvas, 'drop', retry);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.message).toBe('Destination unavailable.');
  });

  it('rejects geometry changed during final feedback and retires before a reentrant commit', async () => {
    let geometry = 0;
    const view = await mount({
      getDropFeedback: () => {
        geometry += 1;
        return { accepted: true, message: 'Ready' };
      },
    });
    await view.setResolver((_source, point) => ({
      key: String(geometry),
      target: { x: point.clientX, extent: geometry },
    }));
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await dispatch(view.canvas, 'drop', transfer);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.active).toBe(false);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
    await view.update({ getDropFeedback: () => ({ accepted: true, message: 'Ready' }) });
    const reentrant = vi.fn<Options['onDrop']>(() => {
      view.targetProps.onDrop({
        preventDefault() {},
        stopPropagation() {},
        dataTransfer: transfer,
      } as never);
      return { accepted: true, message: 'Inserted' };
    });
    await view.update({ onDrop: reentrant });
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await dispatch(view.canvas, 'drop', transfer);
    expect(reentrant).toHaveBeenCalledTimes(1);
  });
  it('drops with freshly resolved target data rather than an earlier prepared object', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    await view.setResolver((_source, point) => ({
      key: String(point.clientX),
      target: { x: 10, extent: 80 },
    }));
    await dispatch(view.canvas, 'drop', transfer);
    expect(view.commit).toHaveBeenCalledExactlyOnceWith(source, { x: 10, extent: 80 });
  });

  it('leaves and re-enters without retaining prepared feedback or ending the source gesture', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    await dispatch(view.canvas, 'dragleave', transfer, 10, view.canvas.querySelector('span'));
    expect(view.result.preview).not.toBeNull();
    await dispatch(view.canvas, 'dragleave', transfer);
    expect(view.result.active).toBe(true);
    expect(view.result.preview).toBeNull();
    await dispatch(view.canvas, 'dragover', transfer);
    expect(view.result.preview?.pending).toBe(true);
    await settle();
    expect(view.feedback).toHaveBeenCalledTimes(2);
  });

  it('keeps in-bounds null-relatedTarget child transitions but clears a real wrapper leave', async () => {
    const view = await mount();
    vi.spyOn(view.canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await dispatch(view.canvas, 'dragleave', transfer);
    expect(view.result.preview?.pending).toBe(true);
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(true);
    await dispatch(view.canvas, 'dragleave', transfer, 101);
    expect(view.result.preview).toBeNull();
    expect(view.result.active).toBe(true);
  });

  it('refreshes a pending geometry target after committed readiness without pointer movement', async () => {
    const view = await mount();
    await view.setResolver(() => null);
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    expect(view.result.preview).toBeNull();
    await view.setResolver((_source, point) => ({
      key: 'ready',
      target: { x: point.clientX, extent: 20 },
    }));
    await act(async () => view.result.refreshTarget());
    expect(view.result.preview?.pending).toBe(true);
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(true);
    expect(view.result.preview?.target.x).toBe(10);
  });

  it('preserves preparation and completed receipts across ordinary callback-ref replacement', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    const pending = view.result.preview;
    await view.update({});
    expect(view.result.preview).toBe(pending);
    expect(vi.getTimerCount()).toBe(1);
    await settle();
    const prepared = view.result.preview!;
    await view.update({});
    expect(view.result.preview).toBe(prepared);
    expect(view.result.isCurrentPreview(prepared)).toBe(true);
    expect(view.feedback).toHaveBeenCalledTimes(1);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('refreshes the resolver committed by a target-only child render', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    const ownerRenders = view.ownerRenders;
    const oldTargetProps = view.targetProps;
    const prepared = view.result.preview;
    await view.setChildResolver((_source, point) => ({
      key: 'child-geometry',
      target: { x: point.clientX, extent: 90 },
    }));
    expect(view.ownerRenders).toBe(ownerRenders);
    expect(view.result.preview).toBe(prepared);
    expect(view.result.isCurrentPreview(prepared!)).toBe(false);
    // A late cleanup from the earlier callback must not clear the new resolver.
    await act(async () => oldTargetProps.ref(null));
    await act(async () => view.result.refreshTarget());
    expect(view.result.preview?.key).toBe('child-geometry');
    expect(view.result.preview?.pending).toBe(true);
    await settle();
    expect(view.result.preview?.target.extent).toBe(90);
    expect(view.result.preview?.feedback.accepted).toBe(true);
  });

  it('retires a real target detach while preserving the source for canvas re-entry', async () => {
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    const prepared = view.result.preview!;
    expect(view.result.isCurrentPreview(prepared)).toBe(true);
    await view.setChildVisible(false);
    expect(view.result.preview).toBeNull();
    expect(view.result.active).toBe(true);
    expect(view.result.isCurrentPreview(prepared)).toBe(false);
    await view.setChildVisible(true);
    await act(async () => view.result.refreshTarget());
    expect(view.result.preview).toBeNull();
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(true);
  });

  it('rejects stale metadata receipts after a newer proposal, gesture or revision', async () => {
    const view = await mount({
      getDropFeedback: (_source, target) => ({
        accepted: true,
        message: 'Ready',
        data: { extent: target.x, cacheKey: String(target.x) },
      }),
    });
    const first = new Transfer();
    await dispatch(view.button, 'dragstart', first);
    await dispatch(view.canvas, 'dragover', first);
    expect(view.result.isCurrentPreview(view.result.preview!)).toBe(false);
    await settle();
    const oldReceipt = view.result.preview!;
    const liveCheck = view.result.isCurrentPreview;
    expect(liveCheck(oldReceipt)).toBe(true);
    expect(liveCheck({ ...oldReceipt })).toBe(false);
    await dispatch(view.canvas, 'dragover', first, 20);
    expect(liveCheck(oldReceipt)).toBe(false);
    await settle();
    const nextReceipt = view.result.preview!;
    expect(liveCheck(nextReceipt)).toBe(true);
    const second = new Transfer();
    await dispatch(view.button, 'dragstart', second);
    expect(liveCheck(nextReceipt)).toBe(false);
    await dispatch(view.canvas, 'dragover', second, 20);
    await settle();
    const nextGestureReceipt = view.result.preview!;
    expect(liveCheck(nextGestureReceipt)).toBe(true);
    expect(liveCheck(nextReceipt)).toBe(false);
    await view.update({ revisionKey: 2 });
    expect(liveCheck(nextGestureReceipt)).toBe(false);
    await view.unmount();
    expect(liveCheck(nextGestureReceipt)).toBe(false);
  });

  it('publishes only current-generation typed metadata and supports idempotent host refresh', async () => {
    let cache: number | null = null;
    const consume = vi.fn((drag: Result) => {
      const data = drag.preview?.data;
      if (!data || cache === data.extent) return;
      cache = data.extent;
      drag.refreshTarget();
    });
    const prepare = vi.fn<Options['getDropFeedback']>((item, target) => {
      expect(Object.isFrozen(item)).toBe(true);
      expect(Object.isFrozen(target)).toBe(true);
      return target.extent === 60
        ? { accepted: true, message: 'Ready', data: { extent: 60, cacheKey: 'target' } }
        : {
            accepted: false,
            reason: 'pending-extent',
            message: 'Measuring',
            data: { extent: 60, cacheKey: 'target' },
          };
    });
    const view = await mount({ getDropFeedback: prepare }, consume);
    await view.setResolver((_source, point) => ({
      key: `${point.clientX}:${cache}`,
      target: Object.freeze({ x: point.clientX, extent: cache }),
    }));
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer, 1);
    const firstGeneration = view.result.preview!.preparationGeneration;
    await dispatch(view.canvas, 'dragover', transfer, 2);
    expect(view.result.preview?.data).toBeUndefined();
    await settle();
    // The completed first pass was consumed, then immediately retired by refresh.
    expect(cache).toBe(60);
    expect(view.result.preview?.pending).toBe(true);
    expect(view.result.preview?.data).toBeUndefined();
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(true);
    expect(view.result.preview?.data).toEqual({ extent: 60, cacheKey: 'target' });
    expect(view.result.preview!.preparationGeneration).toBeGreaterThan(firstGeneration);
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenCalledTimes(2);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
    expect(prepare.mock.calls.every(([, target]) => target.x === 2)).toBe(true);
  });

  it('recovers a target-dependent extent mismatch through another exact pending key', async () => {
    let cache = 20;
    const view = await mount(
      {
        getDropFeedback: (_item, target) =>
          target.extent === target.x
            ? { accepted: true, message: 'Ready' }
            : {
                accepted: false,
                reason: 'extent',
                message: 'Measuring',
                data: { extent: target.x, cacheKey: String(target.x) },
              },
      },
      (drag) => {
        const extent = drag.preview?.data?.extent;
        if (extent === undefined || extent === cache) return;
        cache = extent;
        drag.refreshTarget();
      },
    );
    await view.setResolver((_source, point) => ({
      key: `${point.clientX}:${cache}`,
      target: { x: point.clientX, extent: cache },
    }));
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer, 70);
    await settle();
    expect(view.result.preview?.pending).toBe(true);
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(true);
    expect(cache).toBe(70);
  });

  it('captures Escape before enclosing editor handlers and restores source focus', async () => {
    const view = await mount();
    const bubble = vi.fn();
    view.container.addEventListener('keydown', bubble);
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => {
      view.canvas.dispatchEvent(escape);
    });
    await settle();
    expect(escape.defaultPrevented).toBe(true);
    expect(bubble).not.toHaveBeenCalled();
    expect(view.result.active).toBe(false);
    expect(view.feedback).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(view.button);
  });

  it.each(['disabled', 'aria-disabled', 'draggable'] as const)(
    'cancels when the source DOM changes %s without an owner-driven rerender',
    async (attribute) => {
      const view = await mount();
      const transfer = new Transfer();
      await dispatch(view.button, 'dragstart', transfer);
      await dispatch(view.canvas, 'dragover', transfer);
      const outside = view.container.querySelector('input')!;
      outside.focus();
      const ownerRenders = view.ownerRenders;
      await act(async () => {
        view.button.setAttribute(attribute, attribute === 'draggable' ? 'false' : 'true');
        // Mutation is local DOM state, before the observer notifies the owner.
        expect(view.ownerRenders).toBe(ownerRenders);
      });
      expect(view.result.active).toBe(false);
      expect(view.result.preview).toBeNull();
      expect(document.activeElement).toBe(outside);
      await settle();
      await dispatch(view.canvas, 'drop', transfer);
      expect(view.feedback).not.toHaveBeenCalled();
      expect(view.commit).not.toHaveBeenCalled();
    },
  );

  it.each(['disabled', 'revision', 'source', 'blur', 'cancel', 'dragend', 'unmount'] as const)(
    'retires delayed work on %s without any later preview or commit',
    async (kind) => {
      const view = await mount();
      const transfer = new Transfer();
      await dispatch(view.button, 'dragstart', transfer);
      await dispatch(view.canvas, 'dragover', transfer);
      const outside = view.container.querySelector('input')!;
      outside.focus();
      if (kind === 'disabled') await view.update({ enabled: false });
      if (kind === 'revision') await view.update({ revisionKey: {} });
      if (kind === 'source') await view.removeSource();
      if (kind === 'blur') {
        await act(async () => {
          window.dispatchEvent(new Event('blur'));
        });
      }
      if (kind === 'cancel') await act(async () => view.result.cancel());
      if (kind === 'dragend') await dispatch(view.button, 'dragend', transfer);
      if (kind === 'unmount') await view.unmount();
      await settle();
      expect(view.feedback).not.toHaveBeenCalled();
      expect(view.commit).not.toHaveBeenCalled();
      if (kind !== 'unmount') {
        expect(view.result.active).toBe(false);
        expect(view.result.preview).toBeNull();
      }
      if (kind === 'disabled' || kind === 'revision' || kind === 'blur') {
        expect(document.activeElement).toBe(outside);
      }
    },
  );

  it('does not revive feedback even if an already-retired timer callback runs', async () => {
    const timers = vi.spyOn(window, 'setTimeout');
    const view = await mount();
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    const retiredCallback = timers.mock.calls[timers.mock.calls.length - 1]?.[0];
    expect(typeof retiredCallback).toBe('function');
    await act(async () => view.result.cancel());
    await act(async () => {
      if (typeof retiredCallback === 'function') retiredCallback();
    });
    expect(view.feedback).not.toHaveBeenCalled();
    expect(view.result.preview).toBeNull();
    expect(view.result.active).toBe(false);
  });

  it('cannot publish a completion if preparation invalidates its own generation', async () => {
    let cancel = () => {};
    const view = await mount({
      getDropFeedback: () => {
        cancel();
        return { accepted: true, message: 'Stale', data: { extent: 12, cacheKey: 'stale' } };
      },
    });
    cancel = view.result.cancel;
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    expect(view.result.active).toBe(false);
    expect(view.result.preview).toBeNull();
    expect(view.result.message).not.toBe('Stale');
  });

  it('rejects feedback exceptions and never calls onDrop for a rejected preview', async () => {
    const view = await mount({
      getDropFeedback: () => {
        throw new Error('Unavailable');
      },
    });
    const transfer = new Transfer();
    await dispatch(view.button, 'dragstart', transfer);
    await dispatch(view.canvas, 'dragover', transfer);
    await settle();
    expect(view.result.preview?.feedback.accepted).toBe(false);
    await dispatch(view.canvas, 'drop', transfer);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.message).toBe('Destination unavailable.');
  });

  it('rechecks disabled sources and rejects a stale marker from a rapid second drag', async () => {
    const view = await mount({ enabled: false });
    const first = new Transfer();
    expect(view.result.getSourceProps(source).draggable).toBe(false);
    expect((await dispatch(view.button, 'dragstart', first)).defaultPrevented).toBe(true);
    expect(first.types).toEqual([]);
    await view.update({ enabled: true });
    await dispatch(view.button, 'dragstart', first);
    await dispatch(view.canvas, 'dragover', first);
    const second = new Transfer();
    await dispatch(view.button, 'dragstart', second);
    await dispatch(view.canvas, 'dragover', second);
    await settle();
    expect(view.feedback).toHaveBeenCalledTimes(1);
    await dispatch(view.canvas, 'drop', first);
    expect(view.commit).not.toHaveBeenCalled();
    expect(view.result.active).toBe(false);
  });
});
