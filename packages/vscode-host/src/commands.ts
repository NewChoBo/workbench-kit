import type { CommandRegistry } from '@workbench-kit/core';
import { canExecuteCommand, executeCommand } from '@workbench-kit/core';
import type { HostCommandMessage, HostCommandResultMessage } from './bridge';

export interface HostCommandResolverOptions<TContext> {
  commandRegistry: CommandRegistry<TContext>;
  getContext: () => TContext;
}

export interface HostCommandResult {
  commandId: string;
  executed: boolean;
  requestId?: string;
}

export type HostCommandResultListener = (result: HostCommandResultMessage) => void;

export function resolveHostCommandFromBridgeMessage<TContext>({
  message,
  commandRegistry,
  getContext,
  resultListener,
}: HostCommandResolverOptions<TContext> & {
  message: HostCommandMessage;
  resultListener: HostCommandResultListener;
}): HostCommandResult {
  const requestId = message.requestId;
  const commandId = message.payload?.commandId;
  if (!commandId) {
    resultListener({
      type: 'workbench/command-result',
      payload: { commandId: '', executed: false },
      requestId,
    });
    return { commandId: '', executed: false, requestId };
  }

  const context = getContext();
  const executable = canExecuteCommand(commandRegistry, commandId, context);
  if (!executable) {
    resultListener({
      type: 'workbench/command-result',
      payload: { commandId, executed: false },
      requestId,
    });
    return { commandId, executed: false, requestId };
  }

  const executed = executeCommand(commandRegistry, commandId, context);
  resultListener({
    type: 'workbench/command-result',
    payload: { commandId, executed },
    requestId,
  });

  return { commandId, executed, requestId };
}
