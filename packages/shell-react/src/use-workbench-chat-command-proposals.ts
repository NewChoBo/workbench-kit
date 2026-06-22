import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  isWorkbenchCommandRunnable,
  resolveWorkbenchCommandExecutionPolicy,
  type ResolveWorkbenchCommandExecutionPolicyInput,
  type WorkbenchCommandDescriptor,
} from '@workbench-kit/react/workbench';
import type { ChatCommandProposal, ChatMessage } from '@workbench-kit/react/workbench/chat';

import { type WorkbenchChatCommandRunResult } from './chat-command-surface.js';
import { useWorkbench } from './provider.js';

export interface WorkbenchChatCommandProposalInput {
  args?: readonly unknown[] | undefined;
  commandId: string;
  description?: string | undefined;
  id?: string | undefined;
  label?: string | undefined;
}

export interface UseWorkbenchChatCommandProposalsOptions {
  commands: readonly WorkbenchCommandDescriptor[];
  onCommandResult?: ((result: WorkbenchChatCommandRunResult) => void) | undefined;
  policyInput?: ResolveWorkbenchCommandExecutionPolicyInput | undefined;
}

function getCommandErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function createProposalId(commandId: string) {
  return `proposal-${commandId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useWorkbenchChatCommandProposals({
  commands,
  onCommandResult,
  policyInput,
}: UseWorkbenchChatCommandProposalsOptions) {
  const { executeCommand } = useWorkbench();
  const runningProposalIds = useRef(new Set<string>());

  const resolveDescriptor = useCallback(
    (commandId: string, label?: string) =>
      commands.find((command) => command.id === commandId) ?? {
        id: commandId,
        label: label ?? commandId,
      },
    [commands],
  );

  const enrichProposal = useCallback(
    (proposal: WorkbenchChatCommandProposalInput): ChatCommandProposal => {
      const descriptor = resolveDescriptor(proposal.commandId, proposal.label);
      const policy = resolveWorkbenchCommandExecutionPolicy(descriptor, policyInput);

      return {
        args: proposal.args,
        commandId: proposal.commandId,
        description: proposal.description ?? descriptor.description,
        id: proposal.id ?? createProposalId(proposal.commandId),
        label: proposal.label ?? descriptor.label,
        policy,
        status: policy === 'auto-deny' ? 'blocked' : 'pending',
      };
    },
    [policyInput, resolveDescriptor],
  );

  const enrichMessageProposals = useCallback(
    (proposals: readonly WorkbenchChatCommandProposalInput[]) =>
      proposals.map((proposal) => enrichProposal(proposal)),
    [enrichProposal],
  );

  const updateProposalStatus = useCallback(
    (
      setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
      messageId: string,
      proposalId: string,
      status: ChatCommandProposal['status'],
    ) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) => {
          if (message.id !== messageId || !message.commandProposals) {
            return message;
          }

          return {
            ...message,
            commandProposals: message.commandProposals.map((proposal) =>
              proposal.id === proposalId ? { ...proposal, status } : proposal,
            ),
          };
        }),
      );
    },
    [],
  );

  const runProposal = useCallback(
    async (
      setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
      messageId: string,
      proposal: ChatCommandProposal,
    ) => {
      if (runningProposalIds.current.has(proposal.id)) {
        return;
      }

      const descriptor = resolveDescriptor(proposal.commandId, proposal.label);
      if (!isWorkbenchCommandRunnable(descriptor)) {
        updateProposalStatus(setMessages, messageId, proposal.id, 'failed');
        onCommandResult?.({
          commandId: proposal.commandId,
          label: proposal.label,
          message: descriptor.disabledReason ?? 'Command is currently unavailable.',
          status: 'error',
        });
        return;
      }

      runningProposalIds.current.add(proposal.id);
      updateProposalStatus(setMessages, messageId, proposal.id, 'running');

      try {
        await executeCommand(proposal.commandId, ...(proposal.args ?? []));
        updateProposalStatus(setMessages, messageId, proposal.id, 'executed');
        onCommandResult?.({
          commandId: proposal.commandId,
          label: proposal.label,
          status: 'success',
        });
      } catch (error) {
        updateProposalStatus(setMessages, messageId, proposal.id, 'failed');
        onCommandResult?.({
          commandId: proposal.commandId,
          label: proposal.label,
          message: getCommandErrorMessage(error),
          status: 'error',
        });
      } finally {
        runningProposalIds.current.delete(proposal.id);
      }
    },
    [executeCommand, onCommandResult, resolveDescriptor, updateProposalStatus],
  );

  const processAutoPolicies = useCallback(
    (
      setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
      messageId: string,
      proposals: readonly ChatCommandProposal[],
    ) => {
      proposals.forEach((proposal) => {
        if (proposal.policy === 'auto-allow' && proposal.status === 'pending') {
          void runProposal(setMessages, messageId, proposal);
        }
      });
    },
    [runProposal],
  );

  const createProposalHandlers = useCallback(
    (setMessages: Dispatch<SetStateAction<ChatMessage[]>>) => ({
      onProposalAllow: (messageId: string, proposal: ChatCommandProposal) => {
        if (proposal.status !== 'pending' || proposal.policy !== 'approval-required') {
          return;
        }

        updateProposalStatus(setMessages, messageId, proposal.id, 'allowed');
        void runProposal(setMessages, messageId, proposal);
      },
      onProposalDeny: (messageId: string, proposal: ChatCommandProposal) => {
        if (proposal.status !== 'pending') {
          return;
        }

        updateProposalStatus(setMessages, messageId, proposal.id, 'denied');
      },
    }),
    [runProposal, updateProposalStatus],
  );

  return {
    createProposalHandlers,
    enrichMessageProposals,
    processAutoPolicies,
  };
}
