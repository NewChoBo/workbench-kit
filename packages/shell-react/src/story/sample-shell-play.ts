import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

export type SampleShellCanvas = ReturnType<typeof within>;

export async function waitForSampleShellReady(canvas: SampleShellCanvas) {
  await waitFor(
    () => {
      expect(canvas.getByRole('navigation', { name: 'Activity bar' })).toBeVisible();
    },
    { timeout: 60_000 },
  );
  await canvas.findByLabelText('Workspace Explorer', {}, { timeout: 30_000 });
  await waitFor(() => {
    expect(canvas.queryByText('Preparing workbench')).toBeNull();
  });
}

export function getPrimaryActivityLabels(canvas: SampleShellCanvas): string[] {
  const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
  return within(activityBar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
    .filter((label): label is string => Boolean(label));
}

export async function openSettingsModal(canvas: SampleShellCanvas) {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Settings' }, { timeout: 30_000 }),
  );
  await waitFor(
    async () => {
      expect(screen.getByRole('dialog')).toBeVisible();
    },
    { timeout: 30_000 },
  );
}

export function createSampleShellCanvas(canvasElement: HTMLElement): SampleShellCanvas {
  return within(canvasElement);
}
