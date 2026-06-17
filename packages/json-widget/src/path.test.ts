import { describe, expect, it } from 'vitest';

import { findLineAndColumnForPath, findPathForLineAndColumn, type WidgetPath } from './path.js';

describe('widget path scanner', () => {
  const sampleJson = `{
  "type": "grid",
  "columns": 4,
  "children": [
    {
      "type": "tile",
      "col": 0,
      "row": 0,
      "layers": []
    },
    {
      "type": "box",
      "col": 2,
      "row": 0,
      "child": {
        "type": "text",
        "text": "Hello World"
      }
    }
  ]
}`;

  describe('findLineAndColumnForPath', () => {
    it('finds root path position', () => {
      const pos = findLineAndColumnForPath(sampleJson, []);
      expect(pos).toEqual({ line: 1, column: 1 });
    });

    it('finds path to first child in children array', () => {
      const path: WidgetPath = [{ kind: 'children', index: 0 }];
      const pos = findLineAndColumnForPath(sampleJson, path);
      expect(pos.line).toBe(5);
    });

    it('finds path to second child in children array', () => {
      const path: WidgetPath = [{ kind: 'children', index: 1 }];
      const pos = findLineAndColumnForPath(sampleJson, path);
      expect(pos.line).toBe(11);
    });

    it('finds nested child path', () => {
      const path: WidgetPath = [{ kind: 'children', index: 1 }, { kind: 'child' }];
      const pos = findLineAndColumnForPath(sampleJson, path);
      expect(pos.line).toBe(15);
    });
  });

  describe('findPathForLineAndColumn', () => {
    it('maps cursor position on first child back to correct path', () => {
      const path = findPathForLineAndColumn(sampleJson, 6, 10);
      expect(path).toEqual([{ kind: 'children', index: 0 }]);
    });

    it('maps cursor position on nested child back to correct nested path', () => {
      const path = findPathForLineAndColumn(sampleJson, 16, 12);
      expect(path).toEqual([{ kind: 'children', index: 1 }, { kind: 'child' }]);
    });

    it('handles root path fallback', () => {
      const path = findPathForLineAndColumn(sampleJson, 2, 5);
      expect(path).toEqual([]);
    });
  });
});
