export type WorkbenchChatCommandInputParseResult =
  | { type: 'none' }
  | { type: 'unknown'; token: string }
  | { commandId: string; message: string; type: 'invalid-arguments' }
  | { args: readonly unknown[]; commandId: string; type: 'run' };

export function parseWorkbenchChatCommandInput(
  input: string,
  isValidCommandId: (id: string) => boolean,
): WorkbenchChatCommandInputParseResult {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { type: 'none' };
  }

  const [rawToken] = trimmed.slice(1).split(/\s+/, 1);
  if (!rawToken) {
    return { token: '', type: 'unknown' };
  }

  if (!isValidCommandId(rawToken)) {
    return { token: rawToken, type: 'unknown' };
  }

  const argumentText = getSlashCommandArgumentText(trimmed, rawToken);
  if (!argumentText) {
    return {
      args: [],
      commandId: rawToken,
      type: 'run',
    };
  }

  try {
    return {
      args: [JSON.parse(argumentText) as unknown],
      commandId: rawToken,
      type: 'run',
    };
  } catch {
    return {
      commandId: rawToken,
      message:
        'Command arguments must be valid JSON. Use /command.id {"key":"value"} or /command.id "value".',
      type: 'invalid-arguments',
    };
  }
}

function getSlashCommandArgumentText(trimmedInput: string, commandId: string) {
  return trimmedInput.slice(1 + commandId.length).trim();
}
