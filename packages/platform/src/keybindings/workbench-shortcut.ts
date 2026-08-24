export type WorkbenchShortcutPlatform = 'linux' | 'mac' | 'unknown' | 'windows';

export interface WorkbenchShortcutEventLike {
  readonly altKey?: boolean | undefined;
  readonly ctrlKey?: boolean | undefined;
  readonly key: string;
  readonly metaKey?: boolean | undefined;
  readonly preventDefault?: (() => void) | undefined;
  readonly shiftKey?: boolean | undefined;
  readonly stopPropagation?: (() => void) | undefined;
}

const WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER = 'legacy-primary-or-control' as const;

type WorkbenchShortcutModifier =
  'alt' | 'ctrl' | 'meta' | 'shift' | typeof WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER;

interface ParsedWorkbenchShortcut {
  readonly key: string;
  readonly modifiers: ReadonlySet<WorkbenchShortcutModifier>;
}

const MODIFIER_ORDER: readonly WorkbenchShortcutModifier[] = [
  WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER,
  'ctrl',
  'meta',
  'alt',
  'shift',
];

const BARE_MODIFIER_KEYS = new Set(['alt', 'altgraph', 'control', 'ctrl', 'meta', 'os', 'shift']);

export function resolveWorkbenchShortcutPlatform(input?: {
  readonly navigatorPlatform?: string | undefined;
}): WorkbenchShortcutPlatform {
  const navigatorPlatform =
    input === undefined
      ? typeof globalThis.navigator === 'undefined'
        ? undefined
        : globalThis.navigator.platform
      : input.navigatorPlatform;
  const normalized = navigatorPlatform?.trim().toLowerCase();

  if (!normalized) return 'unknown';
  if (
    normalized.includes('mac') ||
    normalized.includes('darwin') ||
    normalized.includes('iphone') ||
    normalized.includes('ipad')
  ) {
    return 'mac';
  }
  if (normalized.includes('win')) return 'windows';
  if (normalized.includes('linux') || normalized.includes('x11')) return 'linux';
  return 'unknown';
}

export function normalizeWorkbenchShortcutCandidates(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
): readonly string[] {
  return Object.freeze(
    splitShortcutCandidates(shortcut).flatMap((candidate) => {
      const parsed = parseWorkbenchShortcut(candidate, platform);
      return parsed ? [formatParsedShortcut(parsed)] : [];
    }),
  );
}

export function normalizeWorkbenchShortcutFromEvent(
  event: WorkbenchShortcutEventLike,
  platform: WorkbenchShortcutPlatform,
): string | undefined {
  const normalizedKey = normalizeKeyToken(event.key);
  if (!normalizedKey || BARE_MODIFIER_KEYS.has(normalizedKey)) {
    return undefined;
  }

  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(normalizedKey);

  return normalizeWorkbenchShortcutCandidates(parts.join('+'), platform)[0];
}

export function matchesWorkbenchShortcut({
  event,
  platform,
  shortcut,
}: {
  readonly event: WorkbenchShortcutEventLike;
  readonly platform: WorkbenchShortcutPlatform;
  readonly shortcut: string;
}): boolean {
  const eventShortcut = normalizeWorkbenchShortcutFromEvent(event, platform);
  if (!eventShortcut) return false;

  return normalizeWorkbenchShortcutCandidates(shortcut, platform).some((candidate) =>
    canonicalShortcutsOverlap(eventShortcut, candidate, platform),
  );
}

export function workbenchShortcutsOverlap(
  left: string,
  right: string,
  platform: WorkbenchShortcutPlatform,
): boolean {
  const leftCandidates = normalizeWorkbenchShortcutCandidates(left, platform);
  const rightCandidates = normalizeWorkbenchShortcutCandidates(right, platform);

  return leftCandidates.some((leftCandidate) =>
    rightCandidates.some((rightCandidate) =>
      canonicalShortcutsOverlap(leftCandidate, rightCandidate, platform),
    ),
  );
}

function canonicalShortcutsOverlap(
  left: string,
  right: string,
  platform: WorkbenchShortcutPlatform,
): boolean {
  const leftParsed = parseWorkbenchShortcut(left, platform);
  const rightParsed = parseWorkbenchShortcut(right, platform);
  if (!leftParsed || !rightParsed || leftParsed.key !== rightParsed.key) {
    return false;
  }

  const leftModifiers = expandLegacyModifier(leftParsed.modifiers);
  const rightModifiers = expandLegacyModifier(rightParsed.modifiers);
  return leftModifiers.some((leftSignature) => rightModifiers.includes(leftSignature));
}

function expandLegacyModifier(
  modifiers: ReadonlySet<WorkbenchShortcutModifier>,
): readonly string[] {
  if (!modifiers.has(WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER)) {
    return [modifierSignature(modifiers)];
  }

  const common = new Set(modifiers);
  common.delete(WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER);
  return [
    modifierSignature(new Set([...common, 'ctrl'])),
    modifierSignature(new Set([...common, 'meta'])),
  ];
}

export function getWorkbenchShortcutConflictSignatures(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
): readonly string[] {
  return normalizeWorkbenchShortcutCandidates(shortcut, platform).flatMap((candidate) => {
    const parsed = parseWorkbenchShortcut(candidate, platform);
    if (!parsed) return [];
    return expandLegacyModifier(parsed.modifiers).map(
      (modifierSignature) => `${modifierSignature}|${parsed.key}`,
    );
  });
}

function modifierSignature(modifiers: ReadonlySet<WorkbenchShortcutModifier>): string {
  return MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)).join('+');
}

function splitShortcutCandidates(shortcut: string): readonly string[] {
  const candidates: string[] = [];
  let candidate = '';

  for (const character of shortcut) {
    if (character !== ',') {
      candidate += character;
      continue;
    }

    const trimmed = candidate.trimEnd();
    if (!trimmed || trimmed.endsWith('+')) {
      candidate += character;
      continue;
    }

    candidates.push(candidate);
    candidate = '';
  }

  candidates.push(candidate);
  return candidates;
}

function parseWorkbenchShortcut(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
): ParsedWorkbenchShortcut | undefined {
  const tokens = shortcut
    .trim()
    .replace(/\s*\/\s*/gu, '/')
    .split(/[+\s]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;

  const modifiers = new Set<WorkbenchShortcutModifier>();
  let key: string | undefined;

  for (const token of tokens) {
    const modifier = normalizeModifierToken(token, platform);
    if (modifier) {
      if (modifiers.has(modifier)) return undefined;
      modifiers.add(modifier);
      continue;
    }

    const normalizedKey = normalizeKeyToken(token);
    if (!normalizedKey || BARE_MODIFIER_KEYS.has(normalizedKey) || key !== undefined) {
      return undefined;
    }
    key = normalizedKey;
  }

  if (!key) return undefined;
  if (
    modifiers.has(WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER) &&
    (modifiers.has('ctrl') || modifiers.has('meta'))
  ) {
    return undefined;
  }

  return { key, modifiers };
}

function normalizeModifierToken(
  token: string,
  platform: WorkbenchShortcutPlatform,
): WorkbenchShortcutModifier | undefined {
  const normalized = token.toLowerCase();
  if (normalized === 'ctrl' || normalized === 'control') return 'ctrl';
  if (normalized === 'cmd' || normalized === 'command' || normalized === 'meta') return 'meta';
  if (normalized === 'alt' || normalized === 'option') return 'alt';
  if (normalized === 'shift') return 'shift';
  if (normalized === WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER) {
    return WORKBENCH_LEGACY_PRIMARY_OR_CONTROL_MODIFIER;
  }
  if (
    normalized === 'ctrl/cmd' ||
    normalized === 'cmd/ctrl' ||
    normalized === 'ctrlcmd' ||
    normalized === 'cmdorctrl' ||
    normalized === 'mod' ||
    normalized === 'primary'
  ) {
    return platform === 'mac' ? 'meta' : 'ctrl';
  }
  return undefined;
}

function normalizeKeyToken(token: string): string {
  if (token === ' ') return 'space';
  const key = token.trim().toLowerCase();
  if (key === 'del') return 'delete';
  if (key === 'esc') return 'escape';
  if (key === 'return') return 'enter';
  if (key === 'spacebar' || key === 'space') return 'space';
  if (key === 'up') return 'arrowup';
  if (key === 'down') return 'arrowdown';
  if (key === 'left') return 'arrowleft';
  if (key === 'right') return 'arrowright';
  return key;
}

function formatParsedShortcut(shortcut: ParsedWorkbenchShortcut): string {
  return [
    ...MODIFIER_ORDER.filter((modifier) => shortcut.modifiers.has(modifier)),
    shortcut.key,
  ].join('+');
}
