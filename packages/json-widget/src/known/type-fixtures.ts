import type { JsonWidgetNode } from '../jdw/node.js';
import type { WorkbenchJdwKnownType } from '../jdw/profile.js';

/** Minimal drawable fixtures for every profile-known type (JD-1 layout / JD-5 render). */
export const WORKBENCH_JDW_KNOWN_TYPE_FIXTURES: Record<WorkbenchJdwKnownType, JsonWidgetNode> = {
  text: { type: 'text', args: { text: 'Hello', fontSize: 14 } },
  image: {
    type: 'image',
    args: { src: 'https://example.com/a.png', width: 40, height: 40 },
  },
  icon: { type: 'icon', args: { name: 'symbol-method', size: 16 } },
  button: { type: 'button', args: { label: 'Go' } },
  row: {
    type: 'row',
    args: {
      gap: 4,
      children: [
        { type: 'text', args: { text: 'A' } },
        { type: 'text', args: { text: 'B' } },
      ],
    },
  },
  column: {
    type: 'column',
    args: {
      gap: 4,
      children: [
        { type: 'text', args: { text: 'A' } },
        { type: 'text', args: { text: 'B' } },
      ],
    },
  },
  expanded: {
    type: 'expanded',
    args: { flex: 1, child: { type: 'text', args: { text: 'Flex' } } },
  },
  flexible: {
    type: 'flexible',
    args: { flex: 1, fit: 'loose', child: { type: 'text', args: { text: 'Flex' } } },
  },
  stack: {
    type: 'stack',
    args: {
      children: [
        { type: 'text', args: { text: 'Base' } },
        { type: 'text', args: { text: 'Overlay', left: 4, top: 4 } },
      ],
    },
  },
  container: {
    type: 'container',
    args: {
      padding: 8,
      background: '#222',
      child: { type: 'text', args: { text: 'Inside' } },
    },
  },
  padding: {
    type: 'padding',
    args: { padding: 8, child: { type: 'text', args: { text: 'Padded' } } },
  },
  align: {
    type: 'align',
    args: { alignment: 'center', child: { type: 'text', args: { text: 'Aligned' } } },
  },
  center: {
    type: 'center',
    args: { child: { type: 'text', args: { text: 'Centered' } } },
  },
  sized_box: {
    type: 'sized_box',
    args: { width: 80, height: 40, child: { type: 'text', args: { text: 'Sized' } } },
  },
  grid: {
    type: 'grid',
    args: {
      columns: 2,
      children: [
        { type: 'text', args: { text: 'A', col: 0, row: 0 } },
        { type: 'text', args: { text: 'B', col: 1, row: 0 } },
      ],
    },
  },
  box: {
    type: 'box',
    args: {
      padding: 4,
      background: '#333',
      child: { type: 'text', args: { text: 'Box' } },
    },
  },
};

/** Wrap flex placement types so layout/render hosts see a linear parent. */
export function wrapWorkbenchJdwKnownTypeFixture(node: JsonWidgetNode): JsonWidgetNode {
  if (node.type === 'expanded' || node.type === 'flexible') {
    return {
      type: 'row',
      args: {
        children: [node],
      },
    };
  }

  return node;
}
