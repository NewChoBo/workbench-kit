import { describe, expect, it } from 'vitest';

import {
  isWorkbenchChatScrollContainerAtBottom,
  WORKBENCH_CHAT_SCROLL_BOTTOM_THRESHOLD,
} from './chatScroll';

describe('chatScroll', () => {
  it('detects when the chat scroll container is near the bottom', () => {
    expect(
      isWorkbenchChatScrollContainerAtBottom({
        clientHeight: 400,
        scrollHeight: 1000,
        scrollTop: 600 - WORKBENCH_CHAT_SCROLL_BOTTOM_THRESHOLD,
      }),
    ).toBe(true);

    expect(
      isWorkbenchChatScrollContainerAtBottom({
        clientHeight: 400,
        scrollHeight: 1000,
        scrollTop: 0,
      }),
    ).toBe(false);
  });
});
