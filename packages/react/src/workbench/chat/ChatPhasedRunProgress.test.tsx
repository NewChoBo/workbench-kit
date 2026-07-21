/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatPhasedRunProgress, type ChatRunPhase } from './ChatPhasedRunProgress';

function mount(ui: ReactNode): { container: HTMLDivElement; root: Root } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

const samplePhases: readonly ChatRunPhase[] = [
  { id: 'plan', label: 'Plan', status: 'completed', detail: '3 steps' },
  { id: 'apply', label: 'Apply', status: 'running' },
  { id: 'verify', label: 'Verify', status: 'pending' },
];

describe('ChatPhasedRunProgress', () => {
  it('renders collapsed summary and expands phase details', () => {
    const { container, root } = mount(
      <ChatPhasedRunProgress title="Pipeline" phases={samplePhases} />,
    );

    expect(container.textContent).toContain('Pipeline');
    expect(container.textContent).toContain('Running');
    expect(container.textContent).toContain('1/3 phases complete');
    expect(container.querySelector('[data-phase-id="plan"]')).toBeNull();

    const toggle = container.querySelector('button[aria-expanded="false"]') as HTMLButtonElement;
    act(() => {
      toggle.click();
    });

    expect(container.querySelector('[data-phase-id="plan"]')?.textContent).toContain('Plan');
    expect(container.querySelector('[data-phase-id="plan"]')?.textContent).toContain('3 steps');
    expect(container.querySelector('[data-phase-id="apply"]')?.getAttribute('data-status')).toBe(
      'running',
    );

    act(() => {
      root.unmount();
    });
  });

  it('invokes optional actions', () => {
    const onCancel = vi.fn();
    const { container, root } = mount(
      <ChatPhasedRunProgress
        phases={samplePhases}
        actions={[{ id: 'cancel', label: 'Cancel', onClick: onCancel, variant: 'danger' as const }]}
      />,
    );

    const cancel = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Cancel',
    ) as HTMLButtonElement;
    act(() => {
      cancel.click();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('supports controlled expanded state', () => {
    const onExpandedChange = vi.fn();
    const { container, root } = mount(
      <ChatPhasedRunProgress
        phases={samplePhases}
        expanded={false}
        onExpandedChange={onExpandedChange}
      />,
    );

    const toggle = container.querySelector('button[aria-expanded="false"]') as HTMLButtonElement;
    act(() => {
      toggle.click();
    });
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(container.querySelector('[data-phase-id="plan"]')).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
