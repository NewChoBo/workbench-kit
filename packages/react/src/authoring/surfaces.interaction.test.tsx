/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { UiResponsiveEditingTarget } from '@workbench-kit/jdw';
import type { WorkbenchAuthoringProjectionV3 } from './types.js';
import { describe, expect, it, vi } from 'vitest';

import { WorkbenchAuthoringCanvas } from './WorkbenchAuthoringCanvas.js';
import { WorkbenchAuthoringInspector } from './WorkbenchAuthoringInspector.js';
import type { UiAuthoringSurfaceActionV3, WorkbenchAuthoringControllerV3 } from './types.js';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const DESIGN_SYSTEM = {
  pack: { id: 'neutral', version: '1.0.0' },
  theme: { pack: { id: 'neutral', version: '1.0.0' }, themeId: 'night' },
} as const;

function projection(editingTarget: UiResponsiveEditingTarget): WorkbenchAuthoringProjectionV3 {
  const component = { id: 'neutral:card', version: '1.0.0' } as const;
  return {
    resolution: {
      documentId: 'story-document',
      documentRevision: 4,
      registryRevision: 2,
      hostWidth: 360,
      activeResponsiveVariantId: 'narrow',
      nodes: [
        {
          nodeId: 'hero',
          component,
          componentCompatibility: { kind: 'direct', source: component, target: component },
          componentProvenance: { source: 'builtin', sourceId: 'neutral', sourceVersion: '1.0.0' },
          effectiveTheme: DESIGN_SYSTEM.theme,
          scopeChain: [],
          properties: {
            title: {
              value: {
                valueType: 'string',
                source: { kind: 'literal', value: 'Compact workspace' },
                provenance: [{ kind: 'theme', sourceId: 'night', tokenId: 'title' }],
              },
              diagnostics: [
                {
                  code: 'token-not-found',
                  message: 'Property diagnostic is visible.',
                  path: 'document.nodes.hero.properties.title',
                },
              ],
            },
          },
          diagnostics: [
            {
              code: 'component-not-found',
              message: 'Node diagnostic is visible.',
              path: 'document.nodes.hero.component',
            },
          ],
        },
      ],
      diagnostics: [],
    },
    document: {
      documentId: 'story-document',
      documentRevision: 4,
      designSystem: DESIGN_SYSTEM,
      responsiveVariants: [
        { id: 'narrow', hostWidth: { maxExclusive: 520 } },
        { id: 'base', hostWidth: { minInclusive: 520, maxExclusive: 900 } },
        { id: 'wide', hostWidth: { minInclusive: 900 } },
      ],
      previewHostWidth: 360,
      editingTarget,
      activeResponsiveVariantId: 'narrow',
      nodes: [
        {
          nodeId: 'hero',
          component,
          selected: true,
          bindings: [],
          baseProperties: {
            title: { kind: 'literal', value: 'Base workspace' },
          },
          baseLayout: {
            strategyId: 'canvas',
            values: { width: { kind: 'literal', value: 560 } },
          },
          properties: {
            title: {
              value: { kind: 'literal', value: 'Compact workspace' },
              provenance: { kind: 'responsive-override', variantId: 'narrow' },
            },
          },
          layout: {
            strategyId: 'canvas',
            values: {
              width: {
                value: { kind: 'literal', value: 320 },
                provenance: { kind: 'responsive-override', variantId: 'narrow' },
              },
            },
            provenance: { kind: 'responsive-override', variantId: 'narrow' },
          },
          responsiveOverrides: {
            narrow: {
              properties: { title: { kind: 'literal', value: 'Compact workspace' } },
              layout: {
                strategyId: 'canvas',
                values: { width: { kind: 'literal', value: 320 } },
              },
            },
          },
        },
      ],
      issues: [],
    },
    designSystemChoices: {
      registryRevision: 2,
      state: DESIGN_SYSTEM,
      packs: [
        {
          ref: DESIGN_SYSTEM.pack,
          displayName: 'Neutral Pack',
          themes: [{ ref: DESIGN_SYSTEM.theme, displayName: 'Night' }],
        },
      ],
      diagnostics: [],
    },
  };
}

function SurfaceHarness({
  dispatch,
  initialEditingTarget = { kind: 'base' },
  readOnly = false,
  setPreviewHostWidth,
}: {
  dispatch: (action: UiAuthoringSurfaceActionV3) => void;
  initialEditingTarget?: UiResponsiveEditingTarget;
  readOnly?: boolean;
  setPreviewHostWidth: (width: number) => void;
}) {
  const [editingTarget, setEditingTarget] =
    useState<UiResponsiveEditingTarget>(initialEditingTarget);
  const controller: WorkbenchAuthoringControllerV3 = {
    projection: projection(editingTarget),
    dispatch,
    setPreviewHostWidth,
    setEditingTarget,
  };
  return (
    <div>
      <WorkbenchAuthoringCanvas controller={controller} readOnly={readOnly} />
      <WorkbenchAuthoringInspector controller={controller} readOnly={readOnly} />
    </div>
  );
}

function buttonByText(container: ParentNode, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button: ${text}`);
  return button;
}

describe('Workbench V3 authoring surfaces', () => {
  it('locks Canvas mutation on mismatch and restores focus after Edit active', async () => {
    const dispatch = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<SurfaceHarness dispatch={dispatch} setPreviewHostWidth={() => undefined} />);
      });
      const canvas = container.querySelector('[aria-label="Authoring Canvas"]')!;
      const mutation = buttonByText(canvas, 'Override layout with effective');
      expect(mutation.disabled).toBe(true);
      expect(canvas.textContent).toContain('Active: Variant narrow · Editing: Base');

      await act(async () => buttonByText(canvas, 'Edit active').click());

      const enabledMutation = buttonByText(canvas, 'Override layout with effective');
      expect(enabledMutation.disabled).toBe(false);
      expect(document.activeElement).toBe(enabledMutation);
      await act(async () => enabledMutation.click());
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch.mock.calls[0]?.[0]).toMatchObject({
        kind: 'document-command-v3',
        command: { type: 'set-responsive-layout', variantId: 'narrow' },
      });
      await act(async () => buttonByText(container, 'Clear override').click());
      expect(dispatch.mock.calls[1]?.[0]).toMatchObject({
        kind: 'document-command-v3',
        command: {
          type: 'clear-responsive-property',
          variantId: 'narrow',
          propertyId: 'title',
        },
      });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('keeps preview and target callbacks outside canonical dispatch', async () => {
    const dispatch = vi.fn();
    const setPreviewHostWidth = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <SurfaceHarness dispatch={dispatch} setPreviewHostWidth={setPreviewHostWidth} />,
        );
      });
      const input = container.querySelector<HTMLInputElement>('input[aria-label="Preview width"]')!;
      await act(async () => {
        input.value = '480';
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      });
      expect(setPreviewHostWidth).toHaveBeenCalledWith(480);
      expect(dispatch).not.toHaveBeenCalled();

      const inspectorTarget = container.querySelector('[aria-label="Inspector editing target"]')!;
      await act(async () => buttonByText(inspectorTarget, 'Variant narrow').click());
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('keeps Base and a variant named base distinct while Inspector reads its explicit target', async () => {
    const dispatch = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <SurfaceHarness
            dispatch={dispatch}
            initialEditingTarget={{ kind: 'variant', variantId: 'wide' }}
            setPreviewHostWidth={() => undefined}
          />,
        );
      });
      const targetControl = container.querySelector('[aria-label="Inspector editing target"]')!;
      expect(buttonByText(targetControl, 'Base')).not.toBe(
        buttonByText(targetControl, 'Variant base'),
      );
      const inspector = container.querySelector('[aria-label="Authoring Inspector"]')!;
      expect(inspector.textContent).toContain('Editing target valueBase workspace');
      expect(inspector.textContent).toContain('Preview effective targetVariant narrow');
      expect(inspector.textContent).toContain('Node diagnostic is visible.');
      expect(inspector.textContent).toContain('Property diagnostic is visible.');

      await act(async () => buttonByText(inspector, 'Override with effective').click());
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'document-command-v3',
          command: expect.objectContaining({
            type: 'set-responsive-property',
            variantId: 'wide',
            value: { kind: 'literal', value: 'Base workspace' },
          }),
        }),
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('suppresses mutations in read-only mode while keeping view controls semantic', async () => {
    const dispatch = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <SurfaceHarness dispatch={dispatch} readOnly setPreviewHostWidth={() => undefined} />,
        );
      });
      const mutationButtons = Array.from(container.querySelectorAll('button')).filter((button) =>
        /Override|Clear/.test(button.textContent ?? ''),
      );
      expect(mutationButtons.length).toBeGreaterThan(0);
      expect(mutationButtons.every((button) => button.disabled)).toBe(true);
      expect(
        container.querySelector<HTMLInputElement>('input[aria-label="Preview width"]')?.disabled,
      ).toBe(false);
      expect(
        container.querySelector<HTMLSelectElement>('select[aria-label="Design System Pack"]')
          ?.disabled,
      ).toBe(true);
      expect(
        container.querySelector<HTMLSelectElement>('select[aria-label="Design System Theme"]')
          ?.disabled,
      ).toBe(true);
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
