import { describe, expect, it } from 'vitest';

import {
  expandJsonWidgetDocumentRefsFromSource,
  jdwNodeToGenericWidget,
  layoutWidget,
  parseJsonWidgetData,
  validateJsonWidgetData,
} from '@workbench-kit/jdw';

import {
  initialWorkspace,
  SAMPLE_COMPOSED_HOME_JDW_PATH,
  SAMPLE_COMPOSED_HOME_REFS_JDW_PATH,
} from './bootstrap.js';

describe('sample jdw/ workspace documents', () => {
  const filesByPath = new Map(
    (initialWorkspace.files ?? []).map((file) => [file.path, file.content]),
  );
  const jdwFiles = (initialWorkspace.files ?? []).filter(
    (file) => file.path.startsWith('jdw/') && file.path.endsWith('.jdw.json'),
  );
  const drawableJdwFiles = jdwFiles.filter((file) => !file.path.endsWith('.refs.jdw.json'));

  it('seeds each fixture under its own jdw/<sample>/ folder', () => {
    expect(initialWorkspace.folders).toEqual(
      expect.arrayContaining([
        'jdw',
        'jdw/showcase',
        'jdw/parts',
        'jdw/parts/header',
        'jdw/parts/status-chip',
        'jdw/composed',
        'jdw/assets',
      ]),
    );
    expect(jdwFiles.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        'jdw/showcase/example.jdw.json',
        'jdw/parts/header/header.jdw.json',
        'jdw/parts/status-chip/status-chip.jdw.json',
        SAMPLE_COMPOSED_HOME_REFS_JDW_PATH,
        SAMPLE_COMPOSED_HOME_JDW_PATH,
      ]),
    );
  });

  it.each(drawableJdwFiles.map((file) => [file.path, file.content] as const))(
    'validates and lays out %s',
    (path, content) => {
      const validated = validateJsonWidgetData(content, { strictKnownTypes: true });
      expect(validated.valid, `${path}: ${validated.issues.map((i) => i.message).join('; ')}`).toBe(
        true,
      );

      const parsed = parseJsonWidgetData(content);
      expect(parsed.parseError).toBeNull();
      expect(parsed.value).not.toBeNull();

      const layout = layoutWidget(jdwNodeToGenericWidget(parsed.value!), {
        minWidth: 0,
        maxWidth: 360,
        minHeight: 0,
        maxHeight: 640,
      });
      expect(layout.rect.width).toBeGreaterThanOrEqual(0);
    },
  );

  it('expands composed home refs into a drawable document', () => {
    const refsSource = filesByPath.get(SAMPLE_COMPOSED_HOME_REFS_JDW_PATH);
    expect(refsSource).toBeDefined();

    const expanded = expandJsonWidgetDocumentRefsFromSource(refsSource!, {
      documentPath: SAMPLE_COMPOSED_HOME_REFS_JDW_PATH,
      loadDocument: (path) => filesByPath.get(path) ?? null,
    });

    expect(expanded.issues).toEqual([]);
    expect(expanded.source).not.toBeNull();
    expect(expanded.source).not.toContain('"type": "ref"');
    expect(filesByPath.get(SAMPLE_COMPOSED_HOME_JDW_PATH)).toContain('Composed home');
  });
});
