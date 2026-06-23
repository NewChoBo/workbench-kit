import type { ChatMessage } from '../chat/types';

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
