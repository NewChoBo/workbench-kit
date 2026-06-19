import { describe, expect, it } from 'vitest';

import {
  BUILTIN_CHAT_VIEW_RENDER_KIND,
  isBuiltinChatViewRenderData,
} from './chat-view-data.js';

describe('chat-view', () => {
  it('recognizes builtin chat view render payloads', () => {
    expect(
      isBuiltinChatViewRenderData({
        kind: BUILTIN_CHAT_VIEW_RENDER_KIND,
        mode: 'chatting',
      }),
    ).toBe(true);
    expect(
      isBuiltinChatViewRenderData({
        kind: BUILTIN_CHAT_VIEW_RENDER_KIND,
        mode: 'aiChat',
      }),
    ).toBe(true);
    expect(isBuiltinChatViewRenderData({ kind: BUILTIN_CHAT_VIEW_RENDER_KIND })).toBe(false);
  });
});
