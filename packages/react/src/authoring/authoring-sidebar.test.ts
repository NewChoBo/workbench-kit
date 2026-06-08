import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AUTHORING_SIDEBAR_PLACEMENT,
  movePanelToSide,
  parseAuthoringSidebarPlacement,
  resolveAuthoringSidebarPlacement,
} from './authoring-sidebar.js';

describe('authoring-sidebar', () => {
  it('moves a panel from left to right', () => {
    const next = movePanelToSide(DEFAULT_AUTHORING_SIDEBAR_PLACEMENT, 'properties', 'left');
    expect(next.left).toContain('properties');
    expect(next.right).not.toContain('properties');
  });

  it('moves a panel from right to left', () => {
    const next = movePanelToSide(DEFAULT_AUTHORING_SIDEBAR_PLACEMENT, 'chat', 'left');
    expect(next.left).toContain('chat');
    expect(next.right).not.toContain('chat');
  });

  it('resolves missing panels using defaults', () => {
    const resolved = resolveAuthoringSidebarPlacement({ left: ['components'], right: [] }, [
      'components',
      'properties',
      'chat',
    ]);

    expect(resolved.left).toEqual(['components']);
    expect(resolved.right).toEqual(['properties', 'chat']);
  });

  it('parses persisted placement objects', () => {
    const parsed = parseAuthoringSidebarPlacement({
      left: ['tree', 'assets'],
      right: ['properties'],
    });

    expect(parsed).toEqual({
      left: ['tree', 'assets'],
      right: ['properties'],
    });
  });
});
