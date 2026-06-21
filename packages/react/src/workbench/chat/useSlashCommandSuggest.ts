import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  isWorkbenchCommandRunnable,
  type WorkbenchCommandDescriptor,
} from '../CommandPalette';
import { getSlashCommandQuery, isSlashCommandInput } from './slashCommand';

type SlashCommandSuggestKeyboardEvent = Pick<
  KeyboardEvent,
  'key' | 'preventDefault' | 'shiftKey' | 'stopPropagation'
>;

export interface UseSlashCommandSuggestOptions {
  commands: readonly WorkbenchCommandDescriptor[];
  limit?: number;
  value: string;
}

export interface UseSlashCommandSuggestResult {
  activeCommand: WorkbenchCommandDescriptor | undefined;
  activeCommandId: string | undefined;
  activeCommandIndex: number;
  commandQuery: string;
  isOpen: boolean;
  suggestedCommands: readonly WorkbenchCommandDescriptor[];
  handleKeyDown: (
    event: SlashCommandSuggestKeyboardEvent,
    onSelect: (commandId: string) => void,
  ) => void;
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
    () => (isOpen ? filterWorkbenchCommands({ commands, limit, query: commandQuery }) : []),
    [commands, commandQuery, isOpen, limit],
  );

  const resolvedActiveIndex =
    suggestedCommands.length > 0 ? Math.min(activeCommandIndex, suggestedCommands.length - 1) : -1;
  const activeCommand =
    resolvedActiveIndex >= 0 ? suggestedCommands[resolvedActiveIndex] : undefined;
  const activeCommandId = activeCommand?.id;

  useEffect(() => {
    setActiveCommandIndex(0);
  }, [commandQuery, isOpen]);

  const handleKeyDown = useCallback(
    (event: SlashCommandSuggestKeyboardEvent, onSelect: (commandId: string) => void) => {
      if (!isOpen) return;

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp'
      ) {
        const direction =
          event.key === 'ArrowUp' || event.key === 'End' || event.key === 'PageUp'
            ? 'previous'
            : 'next';
        const stepCount = event.key === 'PageDown' || event.key === 'PageUp' ? 5 : 1;

        event.preventDefault();
        event.stopPropagation();
        setActiveCommandIndex((current) => {
          let nextIndex =
            event.key === 'Home'
              ? getNextWorkbenchCommandIndex({
                  commands: suggestedCommands,
                  currentIndex: -1,
                  direction: 'next',
                })
              : event.key === 'End'
                ? getNextWorkbenchCommandIndex({
                    commands: suggestedCommands,
                    currentIndex: 0,
                    direction: 'previous',
                  })
                : current;

          if (nextIndex < 0) {
            nextIndex = suggestedCommands.findIndex((command) =>
              isWorkbenchCommandRunnable(command),
            );
          }

          if (event.key !== 'Home' && event.key !== 'End') {
            for (let step = 0; step < stepCount; step += 1) {
              const steppedIndex = getNextWorkbenchCommandIndex({
                commands: suggestedCommands,
                currentIndex: nextIndex,
                direction,
              });

              if (steppedIndex < 0 || steppedIndex === nextIndex) break;
              nextIndex = steppedIndex;
            }
          }

          return nextIndex < 0 ? current : nextIndex;
        });
        return;
      }

      if (
        (event.key === 'Enter' && !event.shiftKey && activeCommand) ||
        (event.key === 'Tab' && activeCommand)
      ) {
        event.preventDefault();
        event.stopPropagation();
        onSelect(activeCommand.id);
        return;
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
    activeCommandId,
    activeCommandIndex: resolvedActiveIndex,
    commandQuery,
    handleKeyDown,
    isOpen,
    setActiveCommandByKey,
    setActiveCommandIndex,
    suggestedCommands,
  };
}
