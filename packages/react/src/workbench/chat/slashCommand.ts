export type SlashCommandParseResult =
  | { type: 'none' }
  | { type: 'run'; commandId: string }
  | { type: 'unknown'; token: string };

export function isSlashCommandInput(value: string): boolean {
  return value.trimStart().startsWith('/');
}

export function getSlashCommandQuery(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('/')) return '';
  return trimmed.slice(1);
}

export function parseSlashCommand(
  input: string,
  isValidCommandId: (id: string) => boolean,
): SlashCommandParseResult {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return { type: 'none' };

  const [rawToken] = trimmed.slice(1).split(/\s+/, 1);
  if (!rawToken) return { type: 'unknown', token: '' };

  if (isValidCommandId(rawToken)) return { type: 'run', commandId: rawToken };
  return { type: 'unknown', token: rawToken };
}
