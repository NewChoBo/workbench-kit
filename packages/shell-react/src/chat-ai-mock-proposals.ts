import type { WorkbenchChatCommandProposalInput } from './use-workbench-chat-command-proposals.js';

const MOCK_AI_COMMAND_PROPOSALS: readonly WorkbenchChatCommandProposalInput[] = [
  {
    commandId: 'workbench.showActivity.explorer',
    description: 'Focus the Explorer activity in the primary sidebar.',
    id: 'mock-proposal-show-explorer',
    label: 'Show Explorer',
  },
  {
    commandId: 'workbench.togglePrimarySidebar',
    description: 'Toggle the primary sidebar visibility.',
    id: 'mock-proposal-toggle-sidebar',
    label: 'Toggle Primary Sidebar',
  },
];

export function createMockAiChatCommandProposals(
  userMessage: string,
): readonly WorkbenchChatCommandProposalInput[] {
  const normalized = userMessage.trim().toLocaleLowerCase();
  if (!normalized || normalized === 'help') {
    return [];
  }

  return MOCK_AI_COMMAND_PROPOSALS;
}

export function createMockAiChatResponseContent(userMessage: string) {
  const proposals = createMockAiChatCommandProposals(userMessage);
  if (!proposals.length) {
    return `Received: ${userMessage}`;
  }

  return [
    `I can help with "${userMessage.trim()}".`,
    'Review the suggested commands below. Safe commands run automatically; workspace changes require approval.',
  ].join('\n\n');
}
