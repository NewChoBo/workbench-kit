export const BUILTIN_CHAT_VIEW_RENDER_KIND = 'workbench-kit.builtin.chat.view' as const;

export type BuiltinChatViewMode = 'aiChat' | 'chatting';

export interface BuiltinChatViewRenderData {
  readonly kind: typeof BUILTIN_CHAT_VIEW_RENDER_KIND;
  readonly mode: BuiltinChatViewMode;
}

export function isBuiltinChatViewRenderData(value: unknown): value is BuiltinChatViewRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<BuiltinChatViewRenderData>;
  return (
    candidate.kind === BUILTIN_CHAT_VIEW_RENDER_KIND &&
    (candidate.mode === 'chatting' || candidate.mode === 'aiChat')
  );
}
