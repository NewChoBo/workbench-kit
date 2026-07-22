import { expect, userEvent, waitFor, within } from 'storybook/test';

type StoryCanvas = ReturnType<typeof within>;

/**
 * Primary + secondary activity labels for the tester Owner role.
 * Includes Field Remap (samples.field-remap, order 36) after JDW Lab.
 */
export const TESTER_ACTIVITY_LABELS = [
  'Explorer',
  'Search',
  'JDW Lab',
  'Commands',
  'Chat',
  'AI Chat',
  'Extensions',
  'Field Remap',
  'Profile',
  'Settings',
] as const;

export async function waitForLoginGate(canvas: StoryCanvas): Promise<void> {
  await canvas.findByLabelText('Username', {}, { timeout: 60_000 });
  await canvas.findByLabelText('Password', {}, { timeout: 30_000 });
  await waitFor(() => {
    expect(canvas.queryByText('Checking sample session...')).toBeNull();
  });
}

export async function waitForWorkbenchReady(canvas: StoryCanvas): Promise<void> {
  await canvas.findByRole('navigation', { name: 'Activity bar' }, { timeout: 60_000 });
  await canvas.findByLabelText('Workspace Explorer', {}, { timeout: 30_000 });
  await waitFor(() => {
    expect(canvas.queryByText(/Checking sample session|Preparing workbench/)).toBeNull();
  });
}

export async function expectEditorTabVisible(canvas: StoryCanvas, fileName: string): Promise<void> {
  await expect(
    await canvas.findByRole('tab', { name: new RegExp(escapeRegExp(fileName)) }),
  ).toBeVisible();
}

export async function expectSampleFileVisible(
  canvas: StoryCanvas,
  fileName: string,
): Promise<void> {
  await waitFor(() => {
    const fileLabels = canvas.getAllByText(fileName);
    expect(fileLabels.length).toBeGreaterThanOrEqual(1);
    for (const fileLabel of fileLabels) {
      expect(fileLabel).toBeVisible();
    }
  });
}

export function getActivityLabels(canvas: StoryCanvas): string[] {
  const activityBar = canvas.getByRole('navigation', { name: 'Activity bar' });
  return within(activityBar)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))
    .filter((label): label is string => Boolean(label));
}

export function expectTesterActivityLabels(canvas: StoryCanvas): void {
  const labels = getActivityLabels(canvas);
  expect(labels, `activity labels: ${JSON.stringify(labels)}`).toEqual([...TESTER_ACTIVITY_LABELS]);
}

export async function selectPermissionRole(scope: HTMLElement, optionName: string): Promise<void> {
  const roleSelect = within(scope).getByRole('combobox', { name: 'Permission role (demo)' });

  await userEvent.click(roleSelect);
  await userEvent.click(await within(document.body).findByRole('option', { name: optionName }));
  await expect(roleSelect).toHaveTextContent(optionName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
