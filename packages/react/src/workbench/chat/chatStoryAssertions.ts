import { expect, type within } from 'storybook/test';

type StoryCanvas = ReturnType<typeof within>;

export function expectChatDateDividers(root: HTMLElement, expectedCount: number) {
  const dividers = root.querySelectorAll('.message-date-divider');
  expect(dividers).toHaveLength(expectedCount);

  for (const divider of Array.from(dividers)) {
    expect(divider.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(divider.querySelector('time')).not.toBeNull();
  }
}

export async function expectVisibleChatBubbleText(
  canvas: StoryCanvas,
  text: string,
  options: { minWidth?: number; minHeight?: number } = {},
) {
  const minWidth = options.minWidth ?? 48;
  const minHeight = options.minHeight ?? 16;
  const messageText = await canvas.findByText(text, {}, { timeout: 10_000 });

  await expect(messageText).toBeVisible();

  const bubble = messageText.closest('.message__bubble');
  expect(bubble).not.toBeNull();

  const rect = (bubble as HTMLElement).getBoundingClientRect();
  expect(rect.width).toBeGreaterThan(minWidth);
  expect(rect.height).toBeGreaterThan(minHeight);
}

export async function expectPeerChatExampleThread(canvas: StoryCanvas, canvasElement: HTMLElement) {
  expectChatDateDividers(canvasElement, 2);

  await expectVisibleChatBubbleText(canvas, 'Share updates here while working in the workspace.');
  await expectVisibleChatBubbleText(canvas, 'Kickoff sync for the workspace chat.');
  await expectVisibleChatBubbleText(canvas, 'Pushed the layout fix to the branch.');
  await expectVisibleChatBubbleText(canvas, 'Reviewing the explorer focus changes now.');
  await expectVisibleChatBubbleText(canvas, 'Looks good from my side.');
}
