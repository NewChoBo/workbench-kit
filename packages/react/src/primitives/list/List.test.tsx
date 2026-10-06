/** @vitest-environment jsdom */
import { act, StrictMode, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { List, ListItem } from './List';

let root: Root;
let container: HTMLDivElement;
function mount(children: React.ReactNode) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(children));
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});
const rows = () => Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
const key = (target: HTMLElement, key: string) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('List focus navigation', () => {
  it('starts at selection, clamps arrows and supports Home/End without activation or selection changes', () => {
    const activate = vi.fn();
    mount(
      <List onClick={activate}>
        <ListItem label="First" />
        <ListItem label="Selected" selected />
        <ListItem label="Last" />
      </List>,
    );
    const [first, selected, last] = rows();
    expect(rows().map((row) => row.tabIndex)).toEqual([-1, 0, -1]);
    selected!.focus();
    key(selected!, 'ArrowDown');
    expect(document.activeElement).toBe(last);
    key(last!, 'ArrowDown');
    expect(document.activeElement).toBe(last);
    key(last!, 'Home');
    expect(document.activeElement).toBe(first);
    key(first!, 'ArrowUp');
    expect(document.activeElement).toBe(first);
    key(first!, 'End');
    expect(document.activeElement).toBe(last);
    expect(rows().map((row) => row.tabIndex)).toEqual([-1, -1, 0]);
    expect(selected!.getAttribute('aria-selected')).toBe('true');
    expect(activate).not.toHaveBeenCalled();
  });
  it('skips disabled and hidden options', () => {
    mount(
      <List>
        <ListItem label="First" />
        <ListItem label="Disabled" aria-disabled="true" />
        <ListItem label="Hidden" hidden />
        <ListItem label="Last" />
      </List>,
    );
    rows()[0]!.focus();
    key(rows()[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(rows()[3]);
    expect(rows().map((row) => row.tabIndex)).toEqual([-1, -1, -1, 0]);
  });
  it('does not steal nested control keys or cancel a caller key handler', () => {
    mount(
      <List>
        <ListItem
          label="First"
          actions={
            <>
              <button>Action</button>
              <input aria-label="Edit" />
            </>
          }
          onKeyDown={(event) => {
            if (event.target === event.currentTarget) event.preventDefault();
          }}
        />
        <ListItem label="Last" />
      </List>,
    );
    for (const control of Array.from(container.querySelectorAll<HTMLElement>('button,input'))) {
      control.focus();
      key(control, 'Home');
      expect(document.activeElement).toBe(control);
    }
    rows()[0]!.focus();
    key(rows()[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(rows()[0]);
  });
  it('handles removal, disabling and insertion without moving focus outside the list', async () => {
    const view = (ids: string[], disabled?: string) => (
      <List>
        {ids.map((id) => (
          <ListItem key={id} label={id} aria-disabled={id === disabled} />
        ))}
      </List>
    );
    mount(view(['a', 'b', 'c']));
    rows()[1]!.focus();
    act(() => root.render(view(['a', 'c'])));
    await settle();
    expect(document.activeElement).toBe(rows()[1]);
    act(() => root.render(view(['a', 'c'], 'c')));
    await settle();
    expect(document.activeElement).toBe(rows()[0]);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    act(() => root.render(view(['x', 'a', 'c'])));
    await settle();
    expect(document.activeElement).toBe(outside);
    expect(rows().filter((row) => row.tabIndex === 0)).toHaveLength(1);
    outside.remove();
  });
  it('keeps an empty list reachable and restores focus when options return', async () => {
    mount(
      <List>
        <ListItem label="Only" />
      </List>,
    );
    rows()[0]!.focus();
    act(() => root.render(<List />));
    await settle();
    const list = container.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(document.activeElement).toBe(list);
    expect(list.tabIndex).toBe(0);
    act(() =>
      root.render(
        <List>
          <ListItem label="New" />
        </List>,
      ),
    );
    await settle();
    expect(document.activeElement).toBe(rows()[0]);
    expect(list.tabIndex).toBe(-1);
  });
  it('leaves non-listbox roles and standalone items unchanged', () => {
    mount(
      <>
        <List role="list">
          <ListItem label="A" />
          <ListItem label="B" />
        </List>
        <ListItem label="Standalone" />
      </>,
    );
    rows()[0]!.focus();
    key(rows()[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(rows()[0]);
    expect(rows().map((row) => row.tabIndex)).toEqual([0, 0, 0]);
  });
  it('isolates nested lists and follows horizontal orientation', () => {
    mount(
      <List aria-orientation="horizontal">
        <ListItem label="Outer" />
        <ListItem label="Last" />
        <List>
          <ListItem label="Nested" />
          <ListItem label="Nested last" />
        </List>
      </List>,
    );
    rows()[0]!.focus();
    key(rows()[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(rows()[1]);
    key(rows()[1]!, 'End');
    expect(document.activeElement).toBe(rows()[1]);
    rows()[2]!.focus();
    key(rows()[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(rows()[3]);
  });
});

it('returns the tab stop to selection on exit and keeps forwarded refs and StrictMode stable', async () => {
  const ref = createRef<HTMLDivElement>();
  mount(
    <StrictMode>
      <List ref={ref}>
        <ListItem label="Selected" selected />
        <ListItem label="Last" />
      </List>
    </StrictMode>,
  );
  expect(ref.current).toBe(container.querySelector('[role="listbox"]'));
  rows()[0]!.focus();
  key(rows()[0]!, 'End');
  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  await settle();
  expect(rows().map((row) => row.tabIndex)).toEqual([0, -1]);
  expect(document.activeElement).toBe(outside);
  outside.remove();
});

it('does not reclaim focus after an explicit blur during an unrelated update', async () => {
  mount(
    <List>
      <ListItem label="First" />
      <ListItem label="Last" />
    </List>,
  );
  rows()[0]!.focus();
  rows()[0]!.blur();
  await settle();
  act(() =>
    root.render(
      <List>
        <ListItem label="First" />
        <ListItem label="Last" selected />
      </List>,
    ),
  );
  await settle();
  expect(document.activeElement).toBe(document.body);
  expect(rows().map((row) => row.tabIndex)).toEqual([-1, 0]);
});

it('does not add a tab stop or intercept custom non-option content', () => {
  mount(
    <List>
      <button>First action</button>
      <button>Last action</button>
    </List>,
  );
  const list = container.querySelector<HTMLElement>('[role="listbox"]')!;
  const button = container.querySelector('button')!;
  button.focus();
  key(button, 'ArrowDown');
  expect(document.activeElement).toBe(button);
  expect(list.tabIndex).toBe(-1);
});

it.each(['empty', 'disabled'] as const)(
  'does not reclaim an explicitly blurred %s recovery root',
  async (state) => {
    mount(
      <List>
        <ListItem label="Only" />
      </List>,
    );
    rows()[0]!.focus();
    act(() =>
      root.render(
        <List>{state === 'disabled' ? <ListItem label="Only" aria-disabled /> : null}</List>,
      ),
    );
    await settle();
    const list = container.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(document.activeElement).toBe(list);
    list.blur();
    await settle();
    expect(document.activeElement).toBe(document.body);
    act(() =>
      root.render(
        <List>
          <ListItem label="New" />
        </List>,
      ),
    );
    await settle();
    expect(document.activeElement).toBe(document.body);
  },
);

it.each([undefined, 0, 3])(
  'restores a former option native button with original tabindex %s',
  async (tabIndex) => {
    const view = (role: string) => (
      <List>
        <button role="option">First</button>
        <button role={role} tabIndex={tabIndex}>
          Second
        </button>
      </List>
    );
    mount(view('option'));
    const second = container.querySelectorAll('button')[1]!;
    expect(second.tabIndex).toBe(-1);
    act(() => root.render(view('button')));
    await settle();
    expect(container.querySelectorAll('button')[1]).toBe(second);
    expect(second.tabIndex).toBe(tabIndex ?? 0);
    expect(second.getAttribute('tabindex')).toBe(tabIndex === undefined ? null : String(tabIndex));
  },
);

it.each([undefined, 0, 3])(
  'hands an option with original tabindex %s to a nested list without overwriting its new tab stop',
  async (tabIndex) => {
    mount(
      <List>
        <button role="option">First</button>
        <button role="option" tabIndex={tabIndex}>
          Moved
        </button>
        <List aria-label="Nested">
          <button role="option">Nested first</button>
        </List>
      </List>,
    );
    const lists = container.querySelectorAll<HTMLElement>('[role="listbox"]');
    const moved = container.querySelectorAll('button')[1]!;
    expect(moved.tabIndex).toBe(-1);
    lists[1]!.append(moved);
    await settle();
    expect(moved.tabIndex).toBe(-1);
    lists[1]!.querySelector('button')!.focus();
    key(lists[1]!.querySelector('button')!, 'End');
    expect(document.activeElement).toBe(moved);
    expect(moved.tabIndex).toBe(0);
    moved.setAttribute('role', 'button');
    await settle();
    expect(moved.tabIndex).toBe(tabIndex ?? 0);
    expect(moved.getAttribute('tabindex')).toBe(tabIndex === undefined ? null : String(tabIndex));
    // Restore the React-owned DOM location before unmount.
    lists[0]!.insertBefore(moved, lists[1]!);
    await settle();
  },
);

it('preserves a caller tabindex replacement when an option leaves ownership', async () => {
  const view = (role: string, tabIndex: number) => (
    <List>
      <button role="option">First</button>
      <button role={role} tabIndex={tabIndex}>
        Second
      </button>
    </List>
  );
  mount(view('option', 0));
  act(() => root.render(view('button', 4)));
  await settle();
  expect(container.querySelectorAll('button')[1]!.tabIndex).toBe(4);
});

it('releases ownership before a later-created nested list takes the option', async () => {
  const view = (nested: boolean) => (
    <List>
      <button role="option">First</button>
      <button role="option">Moved</button>
      {nested ? (
        <List aria-label="Nested">
          <button role="option">Nested first</button>
        </List>
      ) : null}
    </List>
  );
  mount(view(false));
  const moved = container.querySelectorAll('button')[1]!;
  act(() => root.render(view(true)));
  await settle();
  const lists = container.querySelectorAll<HTMLElement>('[role="listbox"]');
  lists[1]!.append(moved);
  await settle();
  expect(moved.tabIndex).toBe(-1);
  moved.setAttribute('role', 'button');
  await settle();
  expect(moved.getAttribute('tabindex')).toBeNull();
  expect(moved.tabIndex).toBe(0);
  lists[0]!.insertBefore(moved, lists[1]!);
  await settle();
});

it.each([
  [-1, 0],
  [0, -1],
] as const)(
  'preserves caller root tabindex %s→%s when releasing listbox behavior',
  (before, after) => {
    const view = (role: string, tabIndex: number) => (
      <List role={role} tabIndex={tabIndex}>
        <ListItem label="First" />
      </List>
    );
    mount(view('listbox', before));
    const list = container.firstElementChild as HTMLElement;
    act(() => root.render(view('list', after)));
    expect(container.firstElementChild).toBe(list);
    expect(list.tabIndex).toBe(after);
    expect(rows()[0]!.tabIndex).toBe(0);
    act(() => root.render(view('listbox', after)));
    expect(list.tabIndex).toBe(-1);
    act(() => root.render(view('list', after)));
    expect(list.tabIndex).toBe(after);
  },
);

it('restores the latest unchanged caller root tabindex after listbox updates and cleanup', () => {
  const view = (role: string, tabIndex: number) => (
    <List role={role} tabIndex={tabIndex}>
      <ListItem label="First" />
    </List>
  );
  mount(view('listbox', 0));
  const list = container.firstElementChild as HTMLElement;
  act(() => root.render(view('listbox', 3)));
  act(() => root.render(view('list', 3)));
  expect(list.tabIndex).toBe(3);
  act(() => root.render(view('listbox', 3)));
  act(() => root.render(null));
  expect(list.tabIndex).toBe(3);
});

it('keeps removal recovery after a caller tabindex update while an option has focus', async () => {
  const view = (tabIndex: number, first: boolean) => (
    <List tabIndex={tabIndex}>
      {first ? <ListItem key="first" label="First" /> : null}
      <ListItem key="last" label="Last" />
    </List>
  );
  mount(view(0, true));
  rows()[0]!.focus();
  act(() => root.render(view(3, true)));
  await settle();
  expect(document.activeElement).toBe(rows()[0]);
  act(() => root.render(view(3, false)));
  await settle();
  expect(document.activeElement).toBe(rows()[0]);
  expect(rows()[0]!.textContent).toBe('Last');
});

it('removes a removed caller tabindex on release and restores absence on unmount', () => {
  const view = (role: string, tabIndex?: number) => (
    <List role={role} tabIndex={tabIndex}>
      <ListItem label="First" />
    </List>
  );
  mount(view('listbox', 0));
  const list = container.firstElementChild as HTMLElement;
  act(() => root.render(view('list')));
  expect(list.hasAttribute('tabindex')).toBe(false);
  act(() => root.render(view('listbox')));
  act(() => root.render(null));
  expect(list.hasAttribute('tabindex')).toBe(false);
});

it('recovers focus when caller tabindex and focused option removal change in the same render', async () => {
  const view = (tabIndex: number, first: boolean) => (
    <List tabIndex={tabIndex}>
      {first ? <ListItem key="first" label="First" /> : null}
      <ListItem key="last" label="Last" />
    </List>
  );
  mount(view(0, true));
  rows()[0]!.focus();
  act(() => root.render(view(3, false)));
  await settle();
  expect(document.activeElement).toBe(rows()[0]);
  expect(rows()[0]!.textContent).toBe('Last');
  expect((container.firstElementChild as HTMLElement).tabIndex).toBe(-1);
});

it('recovers to an enabled option when caller tabindex and eligibility change together', async () => {
  const view = (tabIndex: number, disabled: boolean) => (
    <List tabIndex={tabIndex}>
      <ListItem label="First" aria-disabled={disabled} />
      <ListItem label="Last" />
    </List>
  );
  mount(view(0, false));
  rows()[0]!.focus();
  act(() => root.render(view(3, true)));
  await settle();
  expect(document.activeElement).toBe(rows()[1]);
  expect(rows().map((row) => row.tabIndex)).toEqual([-1, 0]);
  expect((container.firstElementChild as HTMLElement).tabIndex).toBe(-1);
});

it('recovers to an empty root across a property update and respects its later explicit blur', async () => {
  const view = (tabIndex: number, first: boolean) => (
    <List tabIndex={tabIndex}>{first ? <ListItem label="First" /> : null}</List>
  );
  mount(view(0, true));
  rows()[0]!.focus();
  act(() => root.render(view(3, false)));
  await settle();
  const list = container.firstElementChild as HTMLElement;
  expect(document.activeElement).toBe(list);
  expect(list.tabIndex).toBe(0);
  list.blur();
  await settle();
  expect(document.activeElement).toBe(document.body);
  act(() => root.render(view(4, true)));
  await settle();
  expect(document.activeElement).toBe(document.body);
  expect(list.tabIndex).toBe(-1);
  expect(rows()[0]!.tabIndex).toBe(0);
});

it('does not steal outside focus when caller tabindex and options change together', async () => {
  const view = (tabIndex: number, first: boolean) => (
    <>
      <button>Outside</button>
      <List tabIndex={tabIndex}>
        {first ? <ListItem key="first" label="First" /> : null}
        <ListItem key="last" label="Last" />
      </List>
    </>
  );
  mount(view(0, true));
  rows()[0]!.focus();
  const outside = container.querySelector('button')!;
  outside.focus();
  act(() => root.render(view(3, false)));
  await settle();
  expect(document.activeElement).toBe(outside);
  expect(rows()[0]!.tabIndex).toBe(0);
});

it('releases recovery when root role, tabindex and focused option removal change together', async () => {
  const view = (role: string, tabIndex: number, first: boolean) => (
    <List role={role} tabIndex={tabIndex}>
      {first ? <ListItem key="first" label="First" /> : null}
      <ListItem key="last" label="Last" />
    </List>
  );
  mount(view('listbox', 0, true));
  rows()[0]!.focus();
  act(() => root.render(view('list', 3, false)));
  await settle();
  const list = container.firstElementChild as HTMLElement;
  expect(document.activeElement).toBe(document.body);
  expect(list.tabIndex).toBe(3);
  expect(rows()[0]!.tabIndex).toBe(0);
  act(() => root.render(view('listbox', 3, false)));
  await settle();
  expect(document.activeElement).toBe(document.body);
  expect(list.tabIndex).toBe(-1);
});

it('releases a former option while applying a simultaneous root property update', async () => {
  const view = (tabIndex: number, role: string) => (
    <List tabIndex={tabIndex}>
      <button role="option">First</button>
      <button role={role}>Second</button>
    </List>
  );
  mount(view(0, 'option'));
  const second = container.querySelectorAll('button')[1]!;
  expect(second.tabIndex).toBe(-1);
  act(() => root.render(view(3, 'button')));
  await settle();
  expect(second.getAttribute('tabindex')).toBeNull();
  expect(second.tabIndex).toBe(0);
  expect((container.firstElementChild as HTMLElement).tabIndex).toBe(-1);
});

it('does not reclaim an explicitly blurred empty root during a same-stack property update', async () => {
  const view = (tabIndex: number, first: boolean) => (
    <List tabIndex={tabIndex}>{first ? <ListItem label="First" /> : null}</List>
  );
  mount(view(0, true));
  rows()[0]!.focus();
  act(() => root.render(view(0, false)));
  await settle();
  const list = container.firstElementChild as HTMLElement;
  expect(document.activeElement).toBe(list);
  list.blur();
  act(() => root.render(view(3, true)));
  await settle();
  expect(document.activeElement).toBe(document.body);
  expect(rows()[0]!.tabIndex).toBe(0);
  expect(list.tabIndex).toBe(-1);
});
