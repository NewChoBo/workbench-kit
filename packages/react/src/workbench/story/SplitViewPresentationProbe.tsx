import { useEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SplitView, type SplitViewOrientation } from '../shell/SplitView';
import { Select } from '../../primitives/select/Select';

type HiddenSide = 'primary' | 'secondary';

export function DirectSplitHiddenDemo({
  hiddenSide,
  orientation,
}: {
  hiddenSide: HiddenSide;
  orientation: SplitViewOrientation;
}) {
  const [hidden, setHidden] = useState(false);
  return (
    <section data-direct-split-probe={hiddenSide}>
      <button onClick={() => setHidden((current) => !current)}>
        {hidden ? 'Restore pane' : 'Hide pane'}
      </button>
      <div style={{ display: 'flex', width: 800, maxWidth: '100%', height: 500 }}>
        <SplitView
          orientation={orientation}
          primary={<RetainedPane name="Primary" />}
          secondary={<RetainedPane name="Secondary" />}
          primaryHidden={hidden && hiddenSide === 'primary'}
          secondaryHidden={hidden && hiddenSide === 'secondary'}
          primarySizePercent={40}
        />
      </div>
    </section>
  );
}

function RetainedPane({ name }: { name: string }) {
  const [count, setCount] = useState(0);
  const root = useRef<HTMLButtonElement>(null);
  const mounts = useRef(0);
  useEffect(() => {
    mounts.current++;
    root.current?.setAttribute('data-mount-count', String(mounts.current));
  }, []);
  return (
    <section>
      <button ref={root} onClick={() => setCount((value) => value + 1)}>
        {name}:{count}
      </button>
      <Select aria-label={`${name} chooser`}>
        <option value="alpha">Alpha</option>
        <option value="beta">Beta</option>
      </Select>
    </section>
  );
}

export async function verifyDirectSplitHiddenGeometry({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}) {
  const canvas = within(canvasElement);
  const probe = canvasElement.querySelector<HTMLElement>('[data-direct-split-probe]')!;
  const hiddenSide = probe.dataset.directSplitProbe as HiddenSide;
  const split = probe.querySelector<HTMLElement>('.ui-workbench-split-view')!;
  const primary = split.querySelector<HTMLElement>('.ui-workbench-split-view__primary')!;
  const secondary = split.querySelector<HTMLElement>('.ui-workbench-split-view__secondary')!;
  const separator = split.querySelector<HTMLElement>('[role="separator"]')!;
  const inactive = hiddenSide === 'primary' ? primary : secondary;
  const remaining = hiddenSide === 'primary' ? secondary : primary;
  const remainingButton = remaining.querySelector<HTMLButtonElement>('button')!;
  const initialPrimary = primary.getBoundingClientRect();
  const initialSecondary = secondary.getBoundingClientRect();
  await waitFor(() => expect(remainingButton).toHaveAttribute('data-mount-count'));
  const mountCount = remainingButton.getAttribute('data-mount-count');
  await userEvent.click(remainingButton);
  const trigger = inactive.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  await userEvent.click(trigger);
  const popup = trigger.ownerDocument.getElementById(trigger.getAttribute('aria-controls')!)!;
  expect(popup).not.toBeNull();
  canvas.getByRole('button', { name: 'Hide pane' }).click();
  await waitFor(() => {
    const bounds = split.getBoundingClientRect();
    const visible = remaining.getBoundingClientRect();
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    expect(Math.abs(visible.left - bounds.left)).toBeLessThan(0.5);
    expect(Math.abs(visible.top - bounds.top)).toBeLessThan(0.5);
    expect(Math.abs(visible.width - bounds.width)).toBeLessThan(0.5);
    expect(Math.abs(visible.height - bounds.height)).toBeLessThan(0.5);
    expect(inactive.getBoundingClientRect().width).toBe(0);
    expect(inactive.getBoundingClientRect().height).toBe(0);
    expect(separator.getBoundingClientRect().width).toBe(0);
    expect(separator.getBoundingClientRect().height).toBe(0);
  });
  expect(canvas.queryByRole('separator')).toBeNull();
  expect(popup.getBoundingClientRect().height).toBe(0);
  const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
  popup.ownerDocument.defaultView!.dispatchEvent(escape);
  expect(escape.defaultPrevented).toBe(false);
  expect(remaining.querySelector('button')).toBe(remainingButton);
  expect(remainingButton).toHaveTextContent(':1');
  expect(remainingButton).toHaveAttribute('data-mount-count', mountCount!);
  canvas.getByRole('button', { name: 'Restore pane' }).click();
  await waitFor(() => {
    expect(Math.abs(primary.getBoundingClientRect().width - initialPrimary.width)).toBeLessThan(
      0.5,
    );
    expect(Math.abs(primary.getBoundingClientRect().height - initialPrimary.height)).toBeLessThan(
      0.5,
    );
    expect(Math.abs(secondary.getBoundingClientRect().width - initialSecondary.width)).toBeLessThan(
      0.5,
    );
    expect(
      Math.abs(secondary.getBoundingClientRect().height - initialSecondary.height),
    ).toBeLessThan(0.5);
  });
  expect(canvas.getByRole('separator')).toBe(separator);
  expect(trigger.ownerDocument.getElementById(trigger.getAttribute('aria-controls')!)).toBe(popup);
  expect(popup.getBoundingClientRect().height).toBeGreaterThan(0);
  await userEvent.click(within(popup).getByRole('option', { name: 'Beta' }));
  expect(trigger).toHaveTextContent('Beta');
  expect(remaining.querySelector('button')).toBe(remainingButton);
  expect(remainingButton).toHaveTextContent(':1');
  expect(remainingButton).toHaveAttribute('data-mount-count', mountCount!);
}
