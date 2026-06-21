import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import {
  WorkbenchCommandSuggest,
  isWorkbenchCommandRunnable,
  useSlashCommandSuggest,
  type WorkbenchCommandDescriptor,
} from '@workbench-kit/react/workbench';

import { parseWorkbenchChatCommandInput } from './chat-command-input.js';
import { useWorkbench } from './provider.js';
import { useWorkbenchCommandDescriptors } from './use-workbench-command-descriptors.js';

export interface WorkbenchChatCommandRunResult {
  commandId: string;
  label?: string | undefined;
  message?: string | undefined;
  status: 'error' | 'success';
}

export interface WorkbenchChatCommandSurfaceOptions {
  additionalCommands?: readonly WorkbenchCommandDescriptor[] | undefined;
  onCommandResult?: ((result: WorkbenchChatCommandRunResult) => void) | undefined;
  onValueChange: (value: string) => void;
  value: string;
}

export function useWorkbenchChatCommandSurface({
  additionalCommands,
  onCommandResult,
  onValueChange,
  value,
}: WorkbenchChatCommandSurfaceOptions) {
  const { executeCommand } = useWorkbench();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const commands = useWorkbenchCommandDescriptors(additionalCommands);
  const commandIds = useMemo(() => new Set(commands.map((command) => command.id)), [commands]);
  const suggest = useSlashCommandSuggest({ commands, value });

  const runCommand = useCallback(
    async (commandId: string, args: readonly unknown[] = []) => {
      const command = commands.find((candidate) => candidate.id === commandId);
      if (command && !isWorkbenchCommandRunnable(command)) {
        onCommandResult?.({
          commandId,
          label: command.label,
          message: command.disabledReason ?? 'Command is currently unavailable.',
          status: 'error',
        });
        return;
      }

      onValueChange('');

      try {
        await executeCommand(commandId, ...args);
        onCommandResult?.({
          commandId,
          label: command?.label,
          status: 'success',
        });
      } catch (error) {
        onCommandResult?.({
          commandId,
          label: command?.label,
          message: getCommandErrorMessage(error),
          status: 'error',
        });
      }
    },
    [commands, executeCommand, onCommandResult, onValueChange],
  );

  const runInputAsCommand = useCallback(
    (message: string) => {
      const parsed = parseWorkbenchChatCommandInput(message, (commandId) =>
        commandIds.has(commandId),
      );
      if (parsed.type === 'none') {
        return false;
      }

      if (parsed.type === 'unknown') {
        onValueChange('');
        onCommandResult?.({
          commandId: parsed.token || '/',
          message: parsed.token ? `Unknown command: ${parsed.token}` : 'Type a command after /.',
          status: 'error',
        });
        return true;
      }

      if (parsed.type === 'invalid-arguments') {
        onValueChange('');
        onCommandResult?.({
          commandId: parsed.commandId,
          message: parsed.message,
          status: 'error',
        });
        return true;
      }

      void runCommand(parsed.commandId, parsed.args);
      return true;
    },
    [commandIds, onCommandResult, onValueChange, runCommand],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      suggest.handleKeyDown(event, (commandId) => {
        void runCommand(commandId);
      });
    },
    [runCommand, suggest],
  );

  const openCommandSuggest = useCallback(() => {
    if (!value.trimStart().startsWith('/')) {
      onValueChange('/');
    }

    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, [onValueChange, value]);

  const commandSuggestPopover = (
    <WorkbenchCommandSuggest
      activeCommandId={suggest.activeCommandId}
      commands={suggest.suggestedCommands}
      query={suggest.commandQuery}
      visible={suggest.isOpen}
      onActiveCommandChange={suggest.setActiveCommandByKey}
      onRunCommand={(command) => {
        void runCommand(command.id);
      }}
    />
  );

  return {
    commandSuggestPopover,
    composerRef,
    onCommandClick: openCommandSuggest,
    onKeyDown: handleKeyDown,
    runInputAsCommand,
  };
}

function getCommandErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
