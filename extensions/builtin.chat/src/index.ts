import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.builtin.chat' as const;

export const CHATTING_VIEW_ID = 'workbench-kit.builtin.chat.chatting' as const;
export const AI_CHAT_VIEW_ID = 'workbench-kit.builtin.chat.aiChat' as const;
export const CHAT_VIEW_RENDER_KIND = 'workbench-kit.builtin.chat.view' as const;

export type BuiltinChatViewMode = 'aiChat' | 'chatting';

export interface BuiltinChatViewRenderData {
  readonly kind: typeof CHAT_VIEW_RENDER_KIND;
  readonly mode: BuiltinChatViewMode;
}

export function activate(context: ExtensionContext): void {
  context.views.registerViewProvider({
    viewId: CHATTING_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): BuiltinChatViewRenderData => ({
        kind: CHAT_VIEW_RENDER_KIND,
        mode: 'chatting',
      }),
      title: 'Chat',
    }),
  });

  context.views.registerViewProvider({
    viewId: AI_CHAT_VIEW_ID,
    resolveViewHost: () => ({
      dispose() {},
      render: (): BuiltinChatViewRenderData => ({
        kind: CHAT_VIEW_RENDER_KIND,
        mode: 'aiChat',
      }),
      title: 'AI Chat',
    }),
  });
}
