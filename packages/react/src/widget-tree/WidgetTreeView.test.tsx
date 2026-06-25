/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  collectWidgetNodes,
  selectWidgetPath,
  widgetPathKey,
  type GenericWidget,
} from '@workbench-kit/jdw';

import {
  filterVisibleWidgetNodes,
  hasCollapsibleWidgetChildren,
  isRootWidgetPath,
  isWidgetTreeActivateKey,
  resolveWidgetTreeAssetDropOperation,
  resolveWidgetTreeDropOperation,
  resolveWidgetTreeDropPlacement,
  resolveWidgetTreeHorizontalNavigationAction,
  resolveWidgetTreeMoveOperation,
  resolveWidgetTreeNavigationPath,
  WidgetTreeView,
} from './WidgetTreeView.js';

const outlineRoot: GenericWidget = {
  type: 'column',
  children: [
    { type: 'text', text: 'Title' },
    {
      type: 'row',
      children: [
        { type: 'text', text: 'Left' },
        { type: 'text', text: 'Right' },
      ],
    },
  ],
};

const textAsset: WidgetPlacementAsset<GenericWidget> = {
  id: 'content.dragged-text',
  label: 'Dragged text',
  category: 'content',
  kind: 'leaf',
  content: { type: 'text', text: 'Dragged' },
};

describe('WidgetTreeView', () => {
  it('treats Enter as the outline activate key', () => {
    expect(isWidgetTreeActivateKey('Enter')).toBe(true);
    expect(isWidgetTreeActivateKey(' ')).toBe(false);
  });

  it('resolves keyboard navigation against the flattened outline order', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const rowPath = nodes[2]!.path;
    const selection = selectWidgetPath({ pathKeys: new Set() }, rowPath);

    expect(widgetPathKey(resolveWidgetTreeNavigationPath(nodes, selection, 'ArrowDown')!)).toBe(
      '$.children[1].children[0]',
    );
    expect(widgetPathKey(resolveWidgetTreeNavigationPath(nodes, selection, 'ArrowUp')!)).toBe(
      '$.children[0]',
    );
    expect(widgetPathKey(resolveWidgetTreeNavigationPath(nodes, selection, 'Home')!)).toBe('$');
    expect(widgetPathKey(resolveWidgetTreeNavigationPath(nodes, selection, 'End')!)).toBe(
      '$.children[1].children[1]',
    );
  });

  it('identifies the root as non-removable', () => {
    expect(isRootWidgetPath([])).toBe(true);
    expect(isRootWidgetPath([{ kind: 'children', index: 0 }])).toBe(false);
  });

  it('filters descendants of collapsed outline nodes', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const visible = filterVisibleWidgetNodes(nodes, new Set(['$.children[1]']));

    expect(visible.map((node) => widgetPathKey(node.path))).toEqual([
      '$',
      '$.children[0]',
      '$.children[1]',
    ]);
    expect(
      resolveWidgetTreeNavigationPath(
        visible,
        selectWidgetPath({ pathKeys: new Set() }, nodes[2]!.path),
        'End',
      ),
    ).toEqual(nodes[2]!.path);
  });

  it('resolves VS Code style horizontal outline navigation actions', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const rowPath = nodes[2]!.path;
    const rowSelection = selectWidgetPath({ pathKeys: new Set() }, rowPath);

    expect(
      resolveWidgetTreeHorizontalNavigationAction(nodes, rowSelection, new Set(), 'ArrowLeft'),
    ).toEqual({
      type: 'collapse',
      path: rowPath,
    });
    expect(
      resolveWidgetTreeHorizontalNavigationAction(
        filterVisibleWidgetNodes(nodes, new Set(['$.children[1]'])),
        rowSelection,
        new Set(['$.children[1]']),
        'ArrowRight',
      ),
    ).toEqual({
      type: 'expand',
      path: rowPath,
    });
    expect(
      resolveWidgetTreeHorizontalNavigationAction(nodes, rowSelection, new Set(), 'ArrowRight'),
    ).toEqual({
      type: 'select',
      path: nodes[3]!.path,
    });
  });

  it('resolves ArrowLeft to parent selection for leaf outline nodes', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const nestedLeftPath = nodes[3]!.path;
    const selection = selectWidgetPath({ pathKeys: new Set() }, nestedLeftPath);

    expect(
      resolveWidgetTreeHorizontalNavigationAction(nodes, selection, new Set(), 'ArrowLeft'),
    ).toEqual({
      type: 'select',
      path: nodes[2]!.path,
    });
    expect(
      resolveWidgetTreeHorizontalNavigationAction(
        nodes,
        selectWidgetPath({ pathKeys: new Set() }, []),
        new Set(),
        'ArrowLeft',
      ),
    ).toEqual({
      type: 'collapse',
      path: [],
    });
    expect(
      resolveWidgetTreeHorizontalNavigationAction(
        filterVisibleWidgetNodes(nodes, new Set(['$'])),
        selectWidgetPath({ pathKeys: new Set() }, []),
        new Set(['$']),
        'ArrowLeft',
      ),
    ).toBeNull();
  });

  it('moves DOM focus with vertical keyboard selection', async () => {
    const selectedPaths: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WidgetTreeView
          parseError={null}
          root={outlineRoot}
          selection={selectWidgetPath({ pathKeys: new Set() }, [])}
          onSelectPath={(path) => selectedPaths.push(widgetPathKey(path))}
        />,
      );
    });

    const buttons = outlineButtons(container);
    buttons[0]!.focus();
    await pressOutlineKey(buttons[0]!, 'ArrowDown');

    expect(selectedPaths).toEqual(['$.children[0]']);
    expect(document.activeElement).toBe(buttons[1]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('moves DOM focus with horizontal child selection', async () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const rowPath = nodes[2]!.path;
    const selectedPaths: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WidgetTreeView
          parseError={null}
          root={outlineRoot}
          selection={selectWidgetPath({ pathKeys: new Set() }, rowPath)}
          onSelectPath={(path) => selectedPaths.push(widgetPathKey(path))}
        />,
      );
    });

    const buttons = outlineButtons(container);
    buttons[2]!.focus();
    await pressOutlineKey(buttons[2]!, 'ArrowRight');

    expect(selectedPaths).toEqual(['$.children[1].children[0]']);
    expect(document.activeElement).toBe(buttons[3]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('detects array and single-child nodes as collapsible', () => {
    expect(hasCollapsibleWidgetChildren(outlineRoot)).toBe(true);
    expect(hasCollapsibleWidgetChildren({ type: 'padding', child: { type: 'text' } })).toBe(true);
    expect(hasCollapsibleWidgetChildren({ type: 'text', text: 'Leaf' })).toBe(false);
  });

  it('resolves same-parent keyboard reorder operations', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const rowPath = nodes[2]!.path;
    const selection = selectWidgetPath({ pathKeys: new Set() }, rowPath);

    const operation = resolveWidgetTreeMoveOperation(nodes, selection, 'up');
    expect(operation).toMatchObject({
      kind: 'reorder',
      fromIndex: 1,
      toIndex: 0,
    });
    expect(operation?.kind).toBe('reorder');
    if (operation?.kind !== 'reorder') throw new Error('Expected a reorder operation');
    expect(widgetPathKey(operation.parentPath)).toBe('$');
    expect(widgetPathKey(operation.nextPath)).toBe('$.children[0]');

    expect(resolveWidgetTreeMoveOperation(nodes, selection, 'down')).toBeNull();
  });

  it('resolves drag-drop before and after operations for sibling targets', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const titlePath = nodes[1]!.path;
    const rowPath = nodes[2]!.path;

    const beforeOperation = resolveWidgetTreeDropOperation(nodes, rowPath, titlePath, 'before');
    expect(beforeOperation).toMatchObject({
      kind: 'reparent',
      insertIndex: 0,
    });
    expect(widgetPathKey(beforeOperation!.nextPath)).toBe('$.children[0]');

    expect(resolveWidgetTreeDropOperation(nodes, titlePath, rowPath, 'before')).toBeNull();

    const afterOperation = resolveWidgetTreeDropOperation(nodes, titlePath, rowPath, 'after');
    expect(afterOperation).toMatchObject({
      kind: 'reparent',
      insertIndex: 2,
    });
    expect(widgetPathKey(afterOperation!.nextPath)).toBe('$.children[1]');
  });

  it('resolves root outline drops as inside because root has no sibling slot', () => {
    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: [],
        targetWidget: outlineRoot,
        offsetY: 0,
        height: 30,
      }),
    ).toBe('inside');
    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: [],
        targetWidget: outlineRoot,
        offsetY: 29,
        height: 30,
      }),
    ).toBe('inside');
  });

  it('resolves outline drop placement zones for non-root containers and leaves', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const titleNode = nodes[1]!;
    const rowNode = nodes[2]!;

    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: rowNode.path,
        targetWidget: rowNode.widget,
        offsetY: 4,
        height: 30,
      }),
    ).toBe('before');
    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: rowNode.path,
        targetWidget: rowNode.widget,
        offsetY: 15,
        height: 30,
      }),
    ).toBe('inside');
    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: rowNode.path,
        targetWidget: rowNode.widget,
        offsetY: 26,
        height: 30,
      }),
    ).toBe('after');

    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: titleNode.path,
        targetWidget: titleNode.widget,
        offsetY: 12,
        height: 30,
      }),
    ).toBe('before');
    expect(
      resolveWidgetTreeDropPlacement({
        targetPath: titleNode.path,
        targetWidget: titleNode.widget,
        offsetY: 18,
        height: 30,
      }),
    ).toBe('after');
  });

  it('resolves drop-on-container operations as reparent commits', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const titlePath = nodes[1]!.path;
    const rowPath = nodes[2]!.path;

    const operation = resolveWidgetTreeDropOperation(nodes, titlePath, rowPath, 'inside');
    expect(operation).toMatchObject({
      kind: 'reparent',
      insertIndex: 2,
    });
    expect(operation?.kind === 'reparent' ? widgetPathKey(operation.toParentPath) : null).toBe(
      '$.children[1]',
    );
    expect(widgetPathKey(operation!.nextPath)).toBe('$.children[0].children[2]');
  });

  it('resolves palette asset drops against outline placements', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const titlePath = nodes[1]!.path;
    const rowPath = nodes[2]!.path;

    const insideOperation = resolveWidgetTreeAssetDropOperation(
      nodes,
      textAsset,
      rowPath,
      'inside',
    );
    expect(insideOperation).toMatchObject({
      asset: textAsset,
      insertIndex: 2,
    });
    expect(widgetPathKey(insideOperation!.parentPath)).toBe('$.children[1]');
    expect(widgetPathKey(insideOperation!.nextPath)).toBe('$.children[1].children[2]');

    const beforeOperation = resolveWidgetTreeAssetDropOperation(
      nodes,
      textAsset,
      titlePath,
      'before',
    );
    expect(beforeOperation).toMatchObject({
      asset: textAsset,
      insertIndex: 0,
    });
    expect(widgetPathKey(beforeOperation!.parentPath)).toBe('$');
    expect(widgetPathKey(beforeOperation!.nextPath)).toBe('$.children[0]');

    expect(resolveWidgetTreeAssetDropOperation(nodes, textAsset, titlePath, 'inside')).toBeNull();
  });

  it('resolves drag-drop before and after operations across parents', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const titlePath = nodes[1]!.path;
    const nestedLeftPath = nodes[3]!.path;
    const nestedRightPath = nodes[4]!.path;

    const beforeOperation = resolveWidgetTreeDropOperation(
      nodes,
      titlePath,
      nestedLeftPath,
      'before',
    );
    expect(beforeOperation).toMatchObject({
      kind: 'reparent',
      insertIndex: 0,
    });
    expect(
      beforeOperation?.kind === 'reparent' ? widgetPathKey(beforeOperation.toParentPath) : null,
    ).toBe('$.children[1]');
    expect(widgetPathKey(beforeOperation!.nextPath)).toBe('$.children[0].children[0]');

    const afterOperation = resolveWidgetTreeDropOperation(
      nodes,
      titlePath,
      nestedRightPath,
      'after',
    );
    expect(afterOperation).toMatchObject({
      kind: 'reparent',
      insertIndex: 2,
    });
    expect(widgetPathKey(afterOperation!.nextPath)).toBe('$.children[0].children[2]');
  });

  it('rejects reparenting a node into its own descendant', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const rowPath = nodes[2]!.path;
    const nestedLeftPath = nodes[3]!.path;

    expect(resolveWidgetTreeDropOperation(nodes, rowPath, nestedLeftPath, 'inside')).toBeNull();
    expect(resolveWidgetTreeDropOperation(nodes, rowPath, nestedLeftPath, 'before')).toBeNull();
  });

  it('rejects impossible explicit drop placements', () => {
    const nodes = collectWidgetNodes(outlineRoot);
    const titlePath = nodes[1]!.path;

    expect(resolveWidgetTreeDropOperation(nodes, titlePath, titlePath, 'inside')).toBeNull();
    expect(resolveWidgetTreeDropOperation(nodes, titlePath, titlePath, 'after')).toBeNull();
    expect(resolveWidgetTreeDropOperation(nodes, titlePath, [], 'before')).toBeNull();
  });

  it('allows single-child wrapper slots as reparent sources but not reorder targets', () => {
    const nodes = collectWidgetNodes({
      type: 'column',
      children: [
        {
          type: 'padding',
          child: { type: 'text', text: 'Wrapped' },
        },
        { type: 'row', children: [] },
      ],
    });
    const childPath = nodes[2]!.path;
    const rowPath = nodes[3]!.path;
    const selection = selectWidgetPath({ pathKeys: new Set() }, childPath);

    expect(resolveWidgetTreeMoveOperation(nodes, selection, 'up')).toBeNull();
    const operation = resolveWidgetTreeDropOperation(nodes, childPath, rowPath, 'inside');
    expect(operation).toMatchObject({
      kind: 'reparent',
      insertIndex: 0,
    });
    expect(widgetPathKey(operation!.nextPath)).toBe('$.children[1].children[0]');
  });

  it('renders selected outline rows as the roving tab stop', () => {
    const selection = selectWidgetPath({ pathKeys: new Set() }, [
      { kind: 'children', index: 1 },
      { kind: 'children', index: 0 },
    ]);

    const markup = renderToStaticMarkup(
      <WidgetTreeView
        parseError={null}
        root={outlineRoot}
        selection={selection}
        onSelectPath={() => undefined}
        onMovePath={() => undefined}
      />,
    );

    expect(markup).toContain('role="tree"');
    expect(markup).toContain(
      'aria-keyshortcuts="ArrowLeft ArrowRight Alt+ArrowUp Alt+ArrowDown Delete Backspace"',
    );
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('Collapse row');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('tabindex="-1"');
  });
});

function outlineButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('.widget-tree-outline__button'));
}

async function pressOutlineKey(target: HTMLElement, key: string): Promise<void> {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key,
      }),
    );
  });
}
