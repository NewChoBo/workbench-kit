export type SlashCommandParseResult =
  | { type: 'none' }
  | { type: 'run'; commandId: string }
  | { type: 'unknown'; token: string };

const slashCommandInputPattern = /(?:^|\s)\/([^\s]*)$/;

export function isSlashCommandInput(value: string): boolean {
  return slashCommandInputPattern.test(value);
}

export function getSlashCommandQuery(value: string): string {
  return slashCommandInputPattern.exec(value)?.[1] ?? '';
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
