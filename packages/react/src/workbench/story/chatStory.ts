import { expect, type within } from 'storybook/test';

import type { ChatMessage } from '../chat/types';

type StoryCanvas = ReturnType<typeof within>;

/** Mirrors `BuiltinChattingView` intro in workbench-sample. */
export const samplePeerChatIntroMessage: ChatMessage = {
  content: 'Share updates here while working in the workspace.',
  createdAt: '2026-06-18T14:29:00.000Z',
  id: 'workbench-chatting-intro',
  label: 'Alex',
  source: 'assistant',
};

/** Pre-loaded peer chat thread used by Storybook example stories. */
export const samplePeerChatThread: ChatMessage[] = [
  {
    content: 'Kickoff sync for the workspace chat.',
    createdAt: new Date(2026, 5, 17, 16, 0, 0).toISOString(),
    id: 'chatting-user-prev-day',
    source: 'user',
  },
  {
    ...samplePeerChatIntroMessage,
    createdAt: new Date(2026, 5, 18, 14, 29, 0).toISOString(),
  },
  {
    content: 'Pushed the layout fix to the branch.',
    createdAt: new Date(2026, 5, 18, 14, 30, 10).toISOString(),
    id: 'chatting-user-1',
    source: 'user',
  },
  {
    content: 'Reviewing the explorer focus changes now.',
    createdAt: new Date(2026, 5, 18, 14, 30, 45).toISOString(),
    id: 'chatting-user-2',
    source: 'user',
  },
  {
    content: 'Looks good from my side.',
    createdAt: new Date(2026, 5, 18, 14, 31, 20).toISOString(),
    id: 'chatting-user-3',
    source: 'user',
  },
];

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
