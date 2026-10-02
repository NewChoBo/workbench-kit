/** @vitest-environment jsdom */
import { act, createRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../../modal/Modal';
import { ContextMenu } from '../../overlay/ContextMenu';
import { Select } from '../../primitives/select/Select';
import { SearchableMultiSelect } from '../../primitives/searchable-multi-select/SearchableMultiSelect';
import { useAnchoredOverlayPanel } from '../../overlay/useAnchoredOverlayPanel';
import { useFixedOverlayDismiss } from '../../overlay/useFixedOverlayDismiss';
import { isWorkbenchPresentationInactive } from '../../overlay/presentationScope';
import { WorkbenchModalPortal } from '../chrome/WorkbenchModalPortal';
import { WorkbenchShell, type WorkbenchShellProps } from './WorkbenchShell';
import { SplitView } from './SplitView';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
let left = 25;
const baseProps: WorkbenchShellProps = {
  activityBar: { items: [{ id: 'files', label: 'Files', icon: 'F' }] },
  secondaryArea: <button>Editor</button>,
  statusSections: [{ id: 'status', items: [{ id: 'ready', label: 'Ready' }] }],
};
async function render(props: Partial<WorkbenchShellProps> = {}) {
  await act(async () => root.render(<WorkbenchShell {...baseProps} {...props} />));
}
const region = (mode: string) =>
  container.querySelector<HTMLElement>(`[data-workbench-presentation="${mode}"]`)!;
const button = (text: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (node) => node.textContent === text,
  )!;
async function click(node: HTMLElement) {
  await act(async () => node.click());
}

beforeEach(() => {
  left = 25;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.matches('[data-workbench-presentation], .ui-workbench-split-view')) {
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 1024,
        bottom: 768,
        width: 1024,
        height: 768,
        toJSON: () => ({}),
      };
    }
    return {
      x: left,
      y: 30,
      left,
      top: 30,
      right: left + 160,
      bottom: 62,
      width: 160,
      height: 32,
      toJSON: () => ({}),
    };
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.removeAttribute('hidden');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('retained workbench presentations', () => {
  it('keeps omitted props byte-for-byte equivalent to explicit docked legacy markup', () => {
    const legacy = renderToStaticMarkup(<WorkbenchShell {...baseProps} />);
    expect(renderToStaticMarkup(<WorkbenchShell {...baseProps} presentation="docked" />)).toBe(
      legacy,
    );
    expect(legacy).not.toContain('data-workbench-presentation');
    expect(legacy).not.toContain('ui-workbench-frame');
  });

  it('requires explicit canvas content, allows null, and rejects invalid runtime modes', () => {
    expect(() =>
      renderToStaticMarkup(<WorkbenchShell {...baseProps} presentation="canvas" />),
    ).toThrow('requires canvasArea');
    expect(
      renderToStaticMarkup(
        <WorkbenchShell {...baseProps} canvasArea={null} presentation="canvas" />,
      ),
    ).toContain('aria-label="Canvas"');
    expect(() =>
      renderToStaticMarkup(<WorkbenchShell {...baseProps} presentation={'invalid' as 'canvas'} />),
    ).toThrow('Unknown workbench frame presentation');
  });

  it('retains content, controller identity, titlebar, widths, and all pane instances through repeated switches', async () => {
    const mounts = vi.fn();
    const unmounts = vi.fn();
    const identities = new Map<string, object>();
    function Content({ name }: { name: string }) {
      const identity = useRef({});
      const [count, setCount] = useState(0);
      useEffect(() => {
        identities.set(name, identity.current);
        mounts(name);
        return () => {
          unmounts(name);
        };
      }, [name]);
      return (
        <button onClick={() => setCount(count + 1)}>
          {name}:{count}
        </button>
      );
    }
    const widthChanged = vi.fn();
    const panelChanged = vi.fn();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: <Content name="Canvas" />,
      secondaryArea: <Content name="Editor" />,
      primarySidebar: {
        isVisible: true,
        node: <Content name="Sidebar" />,
        primarySizePx: 315,
        onSizePxChange: widthChanged,
      },
      auxiliarySidebar: { isVisible: true, node: <Content name="Auxiliary" /> },
      bottomPanel: {
        isVisible: true,
        node: <Content name="Panel" />,
        sizePercent: 36,
        onSizePercentChange: panelChanged,
      },
      titleBar: <Content name="Title" />,
    };
    await render(props);
    const before = new Map(identities);
    const editor = button('Editor:0');
    const title = button('Title:0');
    const splits = Array.from(container.querySelectorAll<HTMLElement>('.ui-workbench-split-view'));
    const styles = splits.map((element) => element.getAttribute('style'));
    await click(editor);
    for (let index = 0; index < 3; index++) {
      await render({ ...props, presentation: 'canvas' });
      expect(region('docked').hidden).toBe(true);
      expect(region('docked').hasAttribute('inert')).toBe(true);
      expect(region('canvas').hidden).toBe(false);
      await render({ ...props, presentation: 'docked' });
    }
    expect(button('Editor:1')).toBe(editor);
    expect(button('Title:0')).toBe(title);
    expect(identities).toEqual(before);
    expect(mounts).toHaveBeenCalledTimes(6);
    expect(unmounts).not.toHaveBeenCalled();
    expect(splits.map((element) => element.getAttribute('style'))).toEqual(styles);
    expect(widthChanged).not.toHaveBeenCalled();
    expect(panelChanged).not.toHaveBeenCalled();
    expect(container.querySelectorAll('.ui-workbench-titlebar')).toHaveLength(1);
    await act(async () => root.unmount());
    expect(unmounts).toHaveBeenCalledTimes(6);
    root = createRoot(container);
  });

  it('cancels an interrupted resize without committing or leaving pointer capture/hidden keyboard handlers', async () => {
    const resized = vi.fn();
    const release = vi.fn();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: <button>Canvas</button>,
      primarySidebar: {
        isVisible: true,
        node: <button>Sidebar</button>,
        primarySizePx: 280,
        onSizePxChange: resized,
      },
    };
    await render(props);
    const separator = container.querySelector<HTMLElement>('[role="separator"]')!;
    const originalSize = separator.getAttribute('aria-valuenow');
    Object.defineProperties(separator, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: () => true },
      releasePointerCapture: { value: release },
    });
    const pointer = (type: string) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 300 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      return event;
    };
    await act(async () => separator.dispatchEvent(pointer('pointerdown')));
    await act(async () => separator.dispatchEvent(pointer('pointermove')));
    expect(document.documentElement.classList.contains('ui-workbench-split-view-resizing')).toBe(
      true,
    );
    await render({ ...props, presentation: 'canvas' });
    expect(release).toHaveBeenCalledWith(1);
    expect(document.documentElement.classList.contains('ui-workbench-split-view-resizing')).toBe(
      false,
    );
    expect(separator.hidden).toBe(true);
    const key = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowRight',
    });
    await act(async () => {
      separator.dispatchEvent(pointer('pointerup'));
      separator.dispatchEvent(key);
    });
    expect(key.defaultPrevented).toBe(false);
    expect(resized).not.toHaveBeenCalled();
    await render(props);
    expect(separator.getAttribute('aria-valuenow')).toBe(originalSize);
  });

  it('remembers focus, rejects hidden/disabled/disconnected targets, and uses localizable fallback regions', async () => {
    const fallback = createRef<HTMLButtonElement>();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: (
        <>
          <button ref={fallback}>Canvas fallback</button>
          <button>Canvas remembered</button>
        </>
      ),
      canvasAriaLabel: '작성 영역',
      dockedAriaLabel: '작업 공간',
      presentationFocusTargets: { canvas: fallback },
    };
    await render(props);
    button('Editor').focus();
    await render({ ...props, presentation: 'canvas' });
    expect(document.activeElement).toBe(fallback.current);
    button('Canvas remembered').focus();
    await render(props);
    expect(document.activeElement).toBe(button('Editor'));
    await render({ ...props, presentation: 'canvas' });
    expect(document.activeElement).toBe(button('Canvas remembered'));
    await render(props);
    button('Canvas remembered').disabled = true;
    fallback.current!.hidden = true;
    await render({ ...props, presentation: 'canvas' });
    expect(document.activeElement).toBe(region('canvas'));
    expect(region('canvas').getAttribute('aria-label')).toBe('작성 영역');
    expect(region('docked').getAttribute('aria-label')).toBe('작업 공간');
  });

  it('tries the fallback when remembered or supplied targets are visible but no longer focusable', async () => {
    const fallback = createRef<HTMLDivElement>();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: (
        <>
          <a href="#draft">Remembered link</a>
          <div ref={fallback}>Unfocusable fallback</div>
        </>
      ),
      presentationFocusTargets: { canvas: fallback },
    };
    await render({ ...props, presentation: 'canvas' });
    const link = container.querySelector<HTMLAnchorElement>('a')!;
    link.focus();
    await render(props);
    link.removeAttribute('href');
    await render({ ...props, presentation: 'canvas' });
    expect(document.activeElement).toBe(region('canvas'));
    link.setAttribute('href', '#draft');
    link.focus();
    await render(props);
    link.remove();
    await render({ ...props, presentation: 'canvas' });
    expect(document.activeElement).toBe(region('canvas'));
  });

  it('retains and scopes an open chooser, suspends hidden handlers, and remeasures on return', async () => {
    const changed = vi.fn();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: (
        <Select aria-label="Property" onChange={changed}>
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
        </Select>
      ),
      presentation: 'canvas',
    };
    await render(props);
    await click(container.querySelector('[role="combobox"]')!);
    const listbox = container.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(region('canvas').contains(listbox)).toBe(true);
    expect(listbox.style.left).toBe('25px');
    await render({ ...props, presentation: 'docked' });
    expect(listbox.closest('[hidden]')).toBe(region('canvas'));
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => {
      window.dispatchEvent(event);
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(event.defaultPrevented).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    expect(container.querySelector('[role="listbox"]')).toBe(listbox);
    left = 180;
    await render(props);
    expect(container.querySelector('[role="listbox"]')).toBe(listbox);
    expect(listbox.style.left).toBe('180px');
  });

  it.each(['primarySidebar', 'auxiliarySidebar', 'bottomPanel'] as const)(
    'owns open portals from a collapsed %s without losing local draft state',
    async (pane) => {
      const toggle = vi.fn();
      const control = (
        <SearchableMultiSelect
          aria-label="Options"
          options={[{ label: 'Alpha', value: 'a' }]}
          selectedValues={[]}
          onValueToggle={toggle}
        />
      );
      const props: Partial<WorkbenchShellProps> = {
        canvasArea: null,
        [pane]: { isVisible: true, node: control },
      };
      await render(props);
      const input = container.querySelector<HTMLInputElement>('[role="combobox"]')!;
      await act(async () => {
        input.focus();
        input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });
      const listbox = container.querySelector<HTMLElement>('[role="listbox"]')!;
      expect(listbox).not.toBeNull();
      expect(listbox.closest('.ui-workbench-split-view')).toBeNull();
      await render({ ...props, [pane]: { isVisible: false, node: control } });
      expect(listbox.closest('[hidden][inert]')).not.toBeNull();
      expect(isWorkbenchPresentationInactive(listbox)).toBe(true);
      await act(async () => {
        window.dispatchEvent(new Event('pointerdown'));
        window.dispatchEvent(new Event('resize'));
      });
      await render(props);
      expect(container.querySelector('[role="listbox"]')).toBe(listbox);
      expect(listbox.closest('[hidden]')).toBeNull();
      expect(toggle).not.toHaveBeenCalled();
    },
  );

  it('preserves retained draft/model state and a global modal during mid-session pane-scope adoption', async () => {
    const committed = vi.fn();
    const closeGlobal = vi.fn();
    const mounts = vi.fn();
    function DraftController() {
      const [draft, setDraft] = useState('Initial draft');
      useEffect(() => {
        mounts();
      }, []);
      return (
        <>
          <input aria-label="Authored draft" value={draft} readOnly />
          <button onClick={() => setDraft('Uncommitted draft')}>Edit draft</button>
          <Select aria-label="Scoped chooser" defaultValue="b" onChange={committed}>
            <option value="a">Alpha</option>
            <option value="b">Beta</option>
          </Select>
        </>
      );
    }
    const area = (primaryHidden?: boolean) => (
      <SplitView
        primaryHidden={primaryHidden}
        primary={<DraftController />}
        secondary={<section>Other content</section>}
      />
    );
    await render({ canvasArea: area(), presentation: 'canvas' });
    await click(button('Edit draft'));
    const input = container.querySelector<HTMLInputElement>('[aria-label="Authored draft"]')!;
    await click(container.querySelector('[role="combobox"]')!);
    const global = (
      <WorkbenchModalPortal>
        <Modal title="Global owner" onClose={closeGlobal}>
          <button>Global action</button>
        </Modal>
      </WorkbenchModalPortal>
    );
    await render({ canvasArea: area(), presentation: 'canvas', overlays: global });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const globalButton = button('Global action');
    globalButton.focus();
    await render({ canvasArea: area(true), presentation: 'canvas', overlays: global });
    expect(container.querySelector('[role="listbox"]')?.closest('[hidden][inert]')).not.toBeNull();
    expect(document.activeElement).toBe(globalButton);
    await render({ canvasArea: area(), presentation: 'canvas', overlays: global });
    expect(document.activeElement).toBe(globalButton);
    expect(container.querySelector('[aria-label="Authored draft"]')).toBe(input);
    expect(input.value).toBe('Uncommitted draft');
    expect(container.querySelector('[role="combobox"]')!.textContent).toContain('Beta');
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(committed).not.toHaveBeenCalled();
    expect(closeGlobal).not.toHaveBeenCalled();
  });

  it('retains anchored drafts while both dismissal helpers are inactive', async () => {
    const dismiss = vi.fn();
    function LocalPopup() {
      const trigger = useRef<HTMLButtonElement>(null);
      const panel = useRef<HTMLDivElement>(null);
      const [open, setOpen] = useState(false);
      const onOpenChange = (value: boolean) => {
        dismiss(value);
        setOpen(value);
      };
      const anchored = useAnchoredOverlayPanel({
        open,
        onOpenChange,
        triggerRef: trigger,
        panelRef: panel,
      });
      return (
        <>
          <button ref={trigger} onClick={() => setOpen(true)}>
            Chooser
          </button>
          {open
            ? createPortal(
                <div
                  {...anchored.panelProps}
                  style={anchored.panelProps.style ?? undefined}
                  ref={anchored.panelProps.ref}
                  data-popup="true"
                >
                  <input defaultValue="Unsaved draft" />
                  <FixedDismiss onClose={() => onOpenChange(false)} panel={panel} />
                </div>,
                anchored.portalRoot,
              )
            : null}
        </>
      );
    }
    function FixedDismiss({
      onClose,
      panel,
    }: {
      onClose: () => void;
      panel: React.RefObject<HTMLDivElement | null>;
    }) {
      useFixedOverlayDismiss({ containerRef: panel, onClose });
      return null;
    }
    const props = { canvasArea: <LocalPopup />, presentation: 'canvas' as const };
    await render(props);
    await click(button('Chooser'));
    const draft = container.querySelector<HTMLInputElement>('input')!;
    draft.value = 'Uncommitted';
    await render({
      ...props,
      overlays: (
        <WorkbenchModalPortal>
          <Modal title="Global owner" closeOnEscape={false} onClose={() => undefined}>
            <button>Global action</button>
          </Modal>
        </WorkbenchModalPortal>
      ),
    });
    const globalEscape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    await act(async () => {
      button('Global action').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      window.dispatchEvent(globalEscape);
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(globalEscape.defaultPrevented).toBe(false);
    expect(dismiss).not.toHaveBeenCalled();
    expect(container.querySelector('input')).toBe(draft);
    await render({ ...props, presentation: 'docked' });
    const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    await act(async () => {
      window.dispatchEvent(escape);
      window.dispatchEvent(new Event('pointerdown'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(escape.defaultPrevented).toBe(false);
    expect(dismiss).not.toHaveBeenCalled();
    left = 95;
    await render(props);
    expect(container.querySelector('input')).toBe(draft);
    expect(draft.value).toBe('Uncommitted');
    expect(container.querySelector<HTMLElement>('[data-popup]')!.style.left).toBe('261px');
  });

  it.each(['select', 'multi-select'] as const)(
    'preserves an active local %s while a non-Escape-closing global modal owns interaction',
    async (kind) => {
      const changed = vi.fn();
      const chooser =
        kind === 'select' ? (
          <Select aria-label="Local chooser" onChange={changed}>
            <option>Alpha</option>
            <option>Beta</option>
          </Select>
        ) : (
          <SearchableMultiSelect
            aria-label="Local chooser"
            options={[{ label: 'Alpha', value: 'a' }]}
            selectedValues={[]}
            onValueToggle={changed}
          />
        );
      const props: Partial<WorkbenchShellProps> = { canvasArea: chooser, presentation: 'canvas' };
      await render(props);
      const trigger = container.querySelector<HTMLElement>('[role="combobox"]')!;
      if (kind === 'select') await click(trigger);
      else
        await act(async () => {
          trigger.focus();
          trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });
      const listbox = container.querySelector('[role="listbox"]')!;
      expect(listbox).not.toBeNull();
      await render({
        ...props,
        overlays: (
          <WorkbenchModalPortal>
            <Modal title="Global owner" closeOnEscape={false} onClose={() => undefined}>
              <button>Global action</button>
            </Modal>
          </WorkbenchModalPortal>
        ),
      });
      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      await act(async () => {
        button('Global action').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        window.dispatchEvent(escape);
      });
      expect(escape.defaultPrevented).toBe(false);
      expect(container.querySelector('[role="listbox"]')).toBe(listbox);
      expect(changed).not.toHaveBeenCalled();
      await render(props);
      expect(container.querySelector('[role="listbox"]')).toBe(listbox);
    },
  );

  it('preserves a global modal focus trap across modes and restores the active presentation on close', async () => {
    const fallback = createRef<HTMLButtonElement>();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: <button ref={fallback}>Canvas fallback</button>,
      presentationFocusTargets: { canvas: fallback },
    };
    await render(props);
    button('Editor').focus();
    const modal: ReactNode = (
      <WorkbenchModalPortal>
        <Modal title="Global confirmation" onClose={() => undefined}>
          <button>Stay</button>
        </Modal>
      </WorkbenchModalPortal>
    );
    await render({ ...props, overlays: modal });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const stay = button('Stay');
    stay.focus();
    await render({ ...props, overlays: modal, presentation: 'canvas' });
    expect(document.activeElement).toBe(stay);
    expect(stay.closest('[data-workbench-presentation]')).toBeNull();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => window.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(true);
    expect(container.querySelector('[aria-modal="true"]')!.contains(document.activeElement)).toBe(
      true,
    );
    await render({ ...props, presentation: 'canvas' });
    expect(document.activeElement).toBe(fallback.current);
  });

  it('keeps scoped menus open for their own scroll while external scroll still dismisses', async () => {
    const close = vi.fn();
    const select = vi.fn();
    await render({
      presentation: 'canvas',
      canvasArea: (
        <WorkbenchModalPortal>
          <ContextMenu
            x={0}
            y={0}
            items={Array.from({ length: 30 }, (_, index) => ({
              label: `Action ${index}`,
              onSelect: select,
            }))}
            onClose={close}
          />
        </WorkbenchModalPortal>
      ),
    });
    const menu = container.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu.style.overflowY).toBe('auto');
    await act(async () => {
      menu.dispatchEvent(new Event('scroll', { bubbles: false }));
      button('Action 29').dispatchEvent(new Event('scroll', { bubbles: false }));
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(document.activeElement).toBe(button('Action 29'));
    expect(close).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    await act(async () => region('canvas').dispatchEvent(new Event('scroll')));
    expect(close).toHaveBeenCalledTimes(1);
    await act(async () => window.dispatchEvent(new Event('scroll')));
    expect(close).toHaveBeenCalledTimes(2);
    await act(async () => window.dispatchEvent(new Event('resize')));
    expect(close).toHaveBeenCalledTimes(3);
    await act(async () => root.unmount());
    window.dispatchEvent(new Event('scroll'));
    expect(close).toHaveBeenCalledTimes(3);
    root = createRoot(container);
  });

  it('keeps legacy unowned menu scroll dismissal unchanged', async () => {
    const close = vi.fn();
    await render({
      secondaryArea: (
        <ContextMenu
          x={0}
          y={0}
          items={[{ label: 'Legacy action', onSelect: vi.fn() }]}
          onClose={close}
        />
      ),
    });
    const menu = container.querySelector<HTMLElement>('[role="menu"]')!;
    await act(async () => menu.dispatchEvent(new Event('scroll', { bubbles: false })));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('suspends local menu right-click/key/focus work behind global ownership and inactive scopes', async () => {
    const close = vi.fn();
    const select = vi.fn();
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.hasAttribute('data-workbench-presentation'))
        return {
          x: 40,
          y: 120,
          left: 40,
          top: 120,
          right: 340,
          bottom: 320,
          width: 300,
          height: 200,
          toJSON: () => ({}),
        };
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 500,
        bottom: 500,
        width: 500,
        height: 500,
        toJSON: () => ({}),
      };
    });
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: (
        <ContextMenu
          x={0}
          y={0}
          items={[{ label: 'Local action', onSelect: select }]}
          onClose={close}
        />
      ),
      presentation: 'canvas',
    };
    await render(props);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const menu = container.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu.style.left).toBe('44px');
    expect(menu.style.top).toBe('124px');
    expect(menu.style.maxHeight).toBe('192px');
    expect(menu.style.maxWidth).toBe('292px');
    const global = (
      <WorkbenchModalPortal>
        <Modal title="Global owner" closeOnEscape={false} onClose={() => undefined}>
          <button>Global action</button>
        </Modal>
      </WorkbenchModalPortal>
    );
    await render({ ...props, overlays: global });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const globalButton = button('Global action');
    globalButton.focus();
    await act(async () => {
      globalButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 }));
      globalButton.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ContextMenu' }),
      );
      globalButton.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'F10', shiftKey: true }),
      );
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    });
    expect(close).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    await render({ ...props, presentation: 'docked', overlays: global });
    await render({ ...props, overlays: global });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(document.activeElement).toBe(globalButton);
    expect(container.querySelector('[role="menu"]')).toBe(menu);
    await render({ ...props, presentation: 'docked' });
    const hiddenKey = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    });
    await act(async () => {
      menu.dispatchEvent(hiddenKey);
      window.dispatchEvent(new MouseEvent('contextmenu', { button: 2 }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true }));
    });
    expect(hiddenKey.defaultPrevented).toBe(false);
    expect(close).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    window.dispatchEvent(new MouseEvent('contextmenu'));
    expect(close).not.toHaveBeenCalled();
    root = createRoot(container);
  });

  it('suspends retained local modal traps and gives an active global modal precedence on return', async () => {
    const closeLocal = vi.fn();
    const closeGlobal = vi.fn();
    const props: Partial<WorkbenchShellProps> = {
      canvasArea: (
        <WorkbenchModalPortal>
          <Modal title="Local dialog" onClose={closeLocal}>
            <input aria-label="Local draft" defaultValue="Uncommitted" />
          </Modal>
        </WorkbenchModalPortal>
      ),
    };
    await render(props);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const localDraft = container.querySelector<HTMLInputElement>('[aria-label="Local draft"]')!;
    expect(localDraft.closest('[hidden][inert]')).toBe(region('canvas'));
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(closeLocal).not.toHaveBeenCalled();
    await render({ ...props, presentation: 'canvas' });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    localDraft.focus();
    const global = (
      <WorkbenchModalPortal>
        <Modal title="Global dialog" onClose={closeGlobal}>
          <input aria-label="Global draft" />
        </Modal>
      </WorkbenchModalPortal>
    );
    await render({ ...props, presentation: 'canvas', overlays: global });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const globalDraft = container.querySelector<HTMLInputElement>('[aria-label="Global draft"]')!;
    globalDraft.focus();
    await render({ ...props, presentation: 'docked', overlays: global });
    await render({ ...props, presentation: 'canvas', overlays: global });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(document.activeElement).toBe(globalDraft);
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(closeGlobal).toHaveBeenCalledTimes(1);
    expect(closeLocal).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Local draft"]')).toBe(localDraft);
    expect(localDraft.value).toBe('Uncommitted');
    await act(async () => root.unmount());
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(closeGlobal).toHaveBeenCalledTimes(1);
    expect(closeLocal).not.toHaveBeenCalled();
    root = createRoot(container);
  });

  it('combines nested retained scope ownership and ignores unrelated body attributes', async () => {
    await render({
      canvasArea: (
        <WorkbenchShell
          {...baseProps}
          canvasArea={
            <Select aria-label="Nested">
              <option>Alpha</option>
            </Select>
          }
          presentation="canvas"
        />
      ),
      presentation: 'canvas',
    });
    const combo = container.querySelector<HTMLElement>('[role="combobox"]')!;
    document.body.hidden = true;
    expect(isWorkbenchPresentationInactive(combo)).toBe(false);
    document.body.hidden = false;
    await click(combo);
    const listbox = container.querySelector('[role="listbox"]')!;
    await render({
      canvasArea: (
        <WorkbenchShell
          {...baseProps}
          canvasArea={
            <Select aria-label="Nested">
              <option>Alpha</option>
            </Select>
          }
          presentation="canvas"
        />
      ),
    });
    expect(isWorkbenchPresentationInactive(listbox as HTMLElement)).toBe(true);
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(container.querySelector('[role="listbox"]')).toBe(listbox);
  });
});
