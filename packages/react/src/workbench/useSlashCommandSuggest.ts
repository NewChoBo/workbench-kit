import { useCallback, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  getSlashCommandQuery,
  isSlashCommandInput,
  type WorkbenchCommandDescriptor,
} from './CommandPalette';

export interface UseSlashCommandSuggestOptions {
  commands: readonly WorkbenchCommandDescriptor[];
  limit?: number;
  value: string;
}

export interface UseSlashCommandSuggestResult {
  activeCommand: WorkbenchCommandDescriptor | undefined;
  activeCommandIndex: number;
  commandQuery: string;
  isOpen: boolean;
  suggestedCommands: readonly WorkbenchCommandDescriptor[];
  handleKeyDown: (event: KeyboardEvent, onSelect: (commandId: string) => void) => void;
  setActiveCommandByKey: (commandId: string) => void;
  setActiveCommandIndex: (index: number) => void;
}

export function useSlashCommandSuggest({
  commands,
  limit = 8,
  value,
}: UseSlashCommandSuggestOptions): UseSlashCommandSuggestResult {
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);

  const isOpen = isSlashCommandInput(value);
  const commandQuery = getSlashCommandQuery(value);

  const suggestedCommands = useMemo(
    () =>
      isOpen ? filterWorkbenchCommands({ commands, limit, query: commandQuery }) : [],
    [commands, commandQuery, isOpen, limit],
  );

  const resolvedActiveIndex =
    suggestedCommands.length > 0
      ? Math.min(activeCommandIndex, suggestedCommands.length - 1)
      : -1;
  const activeCommand =
    resolvedActiveIndex >= 0 ? suggestedCommands[resolvedActiveIndex] : undefined;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, onSelect: (commandId: string) => void) => {
      if (!isOpen) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveCommandIndex((current) =>
          getNextWorkbenchCommandIndex({
            commands: suggestedCommands,
            currentIndex: current,
            direction: 'next',
          }),
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveCommandIndex((current) =>
          getNextWorkbenchCommandIndex({
            commands: suggestedCommands,
            currentIndex: current,
            direction: 'previous',
          }),
        );
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey && activeCommand) {
        event.preventDefault();
        onSelect(activeCommand.id);
      }
    },
    [activeCommand, isOpen, suggestedCommands],
  );

  const setActiveCommandByKey = useCallback(
    (commandId: string) => {
      const index = suggestedCommands.findIndex((cmd) => cmd.id === commandId);
      setActiveCommandIndex(Math.max(0, index));
    },
    [suggestedCommands],
  );

  return {
    activeCommand,
    activeCommandIndex: resolvedActiveIndex,
    commandQuery,
    handleKeyDown,
    isOpen,
    setActiveCommandByKey,
    setActiveCommandIndex,
    suggestedCommands,
  };
}
