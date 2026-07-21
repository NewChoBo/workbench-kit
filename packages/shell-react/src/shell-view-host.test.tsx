import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./chat-view.js', () => ({
  BuiltinChatView: () => null,
}));
vi.mock('./commands-view.js', () => ({
  BuiltinCommandsView: () => null,
}));
vi.mock('./explorer-view.js', () => ({
  BuiltinExplorerView: () => null,
}));
vi.mock('./extensions-view.js', () => ({
  BuiltinExtensionsView: () => null,
}));
vi.mock('./search-view.js', () => ({
  BuiltinSearchView: () => null,
}));

import { BuiltinChatView } from './chat-view.js';
import { BUILTIN_CHAT_VIEW_RENDER_KIND } from './chat-view-data.js';
import { BuiltinCommandsView } from './commands-view.js';
import { BUILTIN_COMMANDS_VIEW_RENDER_KIND } from './commands-view-data.js';
import { BuiltinExplorerView } from './explorer-view.js';
import { BUILTIN_EXPLORER_VIEW_RENDER_KIND } from './explorer-view-data.js';
import { BuiltinExtensionsView } from './extensions-view.js';
import { BUILTIN_EXTENSIONS_VIEW_RENDER_KIND } from './extensions-view-data.js';
import { BuiltinSearchView } from './search-view.js';
import { BUILTIN_SEARCH_VIEW_RENDER_KIND } from './search-view-data.js';
import { toReactNode, toWorkbenchViewHostReactNode } from './shell-view-host.js';

describe('shell view host rendering', () => {
  it('maps builtin render data to builtin views', () => {
    expect(resolveElementType({ kind: BUILTIN_EXPLORER_VIEW_RENDER_KIND })).toBe(
      BuiltinExplorerView,
    );
    expect(resolveElementType({ kind: BUILTIN_CHAT_VIEW_RENDER_KIND, mode: 'aiChat' })).toBe(
      BuiltinChatView,
    );
    expect(resolveElementType({ kind: BUILTIN_SEARCH_VIEW_RENDER_KIND })).toBe(BuiltinSearchView);
    expect(resolveElementType({ kind: BUILTIN_COMMANDS_VIEW_RENDER_KIND })).toBe(
      BuiltinCommandsView,
    );
    expect(
      resolveElementType(
        { kind: BUILTIN_EXTENSIONS_VIEW_RENDER_KIND },
        { catalogUrl: '/catalog.json' },
      ),
    ).toBe(BuiltinExtensionsView);
  });

  it('passes builtin render options through to the rendered view', () => {
    const node = toWorkbenchViewHostReactNode(
      { kind: BUILTIN_EXTENSIONS_VIEW_RENDER_KIND },
      'Fallback',
      { catalogUrl: '/catalog.json' },
    );

    expect(
      isValidElement(node)
        ? (node as ReactElement<{ catalogUrl?: string }>).props.catalogUrl
        : undefined,
    ).toBe('/catalog.json');
  });

  it('falls back for non-renderable view host values', () => {
    expect(toReactNode(undefined, 'Fallback')).toBe('Fallback');
    expect(toReactNode(false, 'Fallback')).toBe('Fallback');
    expect(toReactNode('Rendered', 'Fallback')).toBe('Rendered');
    expect(toWorkbenchViewHostReactNode({ unknown: true }, 'Fallback')).toBe('Fallback');
  });
});

function resolveElementType(
  value: unknown,
  options: { catalogUrl?: string | undefined } = {},
): ReactElement['type'] | undefined {
  const node = toWorkbenchViewHostReactNode(value, 'Fallback', options);
  return isValidElement(node) ? (node as ReactElement).type : undefined;
}
