import { useEffect, useMemo, useRef } from 'react';

import { WorkbenchPreviewCanvas } from '../layout/WorkbenchCanvas.js';
import {
  WorkbenchAuthoringShell,
  WorkbenchSurfaceMeta,
  WorkbenchSurfaceToolbar,
} from '../layout/panel/WorkbenchAuthoringShell.js';
import { Button } from '../primitives/button/index.js';
import { NumberInput } from '../primitives/number-input/index.js';
import { SegmentedControl } from '../primitives/workbench-editor/WorkbenchEditor.js';
import {
  createWorkbenchAuthoringCommandId,
  createWorkbenchAuthoringLayoutActionV3,
} from './actions.js';
import type { WorkbenchAuthoringSurfacePropsV3 } from './types.js';
import {
  activeEditingTarget,
  editingTargetControlValue,
  editingTargetFromControlValue,
  formatEditingTarget,
  formatResolvedProvenance,
  formatResolvedValue,
  formatUiValueSource,
  isSameEditingTarget,
  selectedAuthoringNode,
} from './view.js';

import './authoring.css';

export function WorkbenchAuthoringCanvas({
  controller,
  readOnly = false,
}: WorkbenchAuthoringSurfacePropsV3) {
  const { designSystemChoices, document, resolution } = controller.projection;
  const selectedNode = selectedAuthoringNode(document);
  const resolutionNode = selectedNode
    ? resolution.nodes.find((node) => node.nodeId === selectedNode.nodeId)
    : undefined;
  const activeTarget = activeEditingTarget(document);
  const mismatchedTarget = !isSameEditingTarget(activeTarget, document.editingTarget);
  const focusAfterTargetChange = useRef(false);
  const mutationButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedNodeRef = useRef<HTMLDivElement | null>(null);
  const variantOptions = useMemo(
    () => [
      { label: 'Base', value: editingTargetControlValue({ kind: 'base' }) },
      ...document.responsiveVariants.map((variant) => ({
        label: `Variant ${variant.id}`,
        value: editingTargetControlValue({ kind: 'variant', variantId: variant.id }),
      })),
    ],
    [document.responsiveVariants],
  );

  useEffect(() => {
    if (!focusAfterTargetChange.current || mismatchedTarget) return;
    focusAfterTargetChange.current = false;
    const mutationButton = mutationButtonRef.current;
    if (mutationButton && !mutationButton.disabled) {
      mutationButton.focus();
    } else {
      selectedNodeRef.current?.focus();
    }
  }, [mismatchedTarget]);

  const applyEffectiveLayout = () => {
    if (readOnly || mismatchedTarget || selectedNode?.layout === undefined) return;
    controller.dispatch(
      createWorkbenchAuthoringLayoutActionV3({
        commandId: createWorkbenchAuthoringCommandId({
          documentId: document.documentId,
          documentRevision: document.documentRevision,
          editingTarget: document.editingTarget,
          nodeId: selectedNode.nodeId,
          operation: 'layout:set-effective',
        }),
        editingTarget: document.editingTarget,
        nodeId: selectedNode.nodeId,
        layout: {
          strategyId: selectedNode.layout.strategyId,
          values: Object.fromEntries(
            Object.entries(selectedNode.layout.values).map(([key, projection]) => [
              key,
              projection.value,
            ]),
          ),
        },
      }),
    );
  };

  const diagnostics = [
    ...document.issues.map((issue) => issue.message),
    ...resolution.diagnostics.map((diagnostic) => diagnostic.message),
    ...resolution.nodes.flatMap((node) => [
      ...node.diagnostics.map((diagnostic) => diagnostic.message),
      ...Object.values(node.properties).flatMap((property) =>
        property.diagnostics.map((diagnostic) => diagnostic.message),
      ),
    ]),
    ...(designSystemChoices?.diagnostics ?? []).map((diagnostic) => diagnostic.message),
  ];

  return (
    <WorkbenchAuthoringShell
      aria-label="Authoring Canvas"
      className="ui-workbench-authoring-canvas"
      data-active-variant={document.activeResponsiveVariantId ?? 'base'}
      data-editing-target={editingTargetControlValue(document.editingTarget)}
      data-preview-host-width={document.previewHostWidth}
      role="region"
      toolbar={
        <>
          <label className="ui-workbench-authoring-field">
            <span>Preview width</span>
            <NumberInput
              aria-label="Preview width"
              min={0}
              step={1}
              value={document.previewHostWidth}
              onValueChange={(width) => {
                if (Number.isFinite(width) && width >= 0) controller.setPreviewHostWidth(width);
              }}
            />
          </label>
          <SegmentedControl
            ariaLabel="Editing target"
            compact
            options={variantOptions}
            value={editingTargetControlValue(document.editingTarget)}
            onChange={(value) => controller.setEditingTarget(editingTargetFromControlValue(value))}
          />
          <WorkbenchSurfaceMeta aria-live="polite" data-testid="authoring-target-status">
            Active: {formatEditingTarget(activeTarget)} · Editing:{' '}
            {formatEditingTarget(document.editingTarget)}
          </WorkbenchSurfaceMeta>
        </>
      }
    >
      {mismatchedTarget ? (
        <WorkbenchSurfaceToolbar
          aria-label="Preview and editing target mismatch"
          className="ui-workbench-authoring-mismatch"
        >
          <span role="status">
            Canvas editing is locked because the preview and editing target differ.
          </span>
          <Button
            compact
            onClick={() => {
              focusAfterTargetChange.current = true;
              controller.setEditingTarget(activeTarget);
            }}
          >
            Edit active
          </Button>
        </WorkbenchSurfaceToolbar>
      ) : null}

      {diagnostics.length > 0 ? (
        <div
          aria-label="Canvas authoring diagnostics"
          className="ui-workbench-authoring-diagnostics"
          role="region"
        >
          <strong>Authoring diagnostics</strong>
          <ul>
            {diagnostics.map((message, index) => (
              <li key={`${index}:${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <WorkbenchPreviewCanvas
        frameHeight={360}
        frameTitle={`${document.previewHostWidth}px preview`}
        frameWidth={document.previewHostWidth}
        help="Use Tab to reach every authoring action"
        showViewportGrid
      >
        {selectedNode ? (
          <div
            aria-label={`Selected node ${selectedNode.nodeId}`}
            className="ui-workbench-authoring-node"
            ref={selectedNodeRef}
            tabIndex={0}
          >
            <span className="ui-workbench-authoring-node__eyebrow">Selected component</span>
            <strong>{selectedNode.component.id}</strong>
            <span>{selectedNode.component.version}</span>
            {Object.entries(selectedNode.properties).map(([propertyId, property]) => (
              <span className="ui-workbench-authoring-node__value" key={propertyId}>
                {propertyId}: {formatUiValueSource(property.value)} ·{' '}
                {property.provenance.kind === 'base'
                  ? 'Base'
                  : `Variant ${property.provenance.variantId}`}
                <small>
                  Resolved: {formatResolvedValue(resolutionNode?.properties[propertyId])} ·{' '}
                  {formatResolvedProvenance(resolutionNode?.properties[propertyId])}
                </small>
              </span>
            ))}
            {selectedNode.layout ? (
              <span className="ui-workbench-authoring-node__value">
                Layout: {selectedNode.layout.strategyId} ·{' '}
                {selectedNode.layout.provenance.kind === 'base'
                  ? 'Base'
                  : `Variant ${selectedNode.layout.provenance.variantId}`}
              </span>
            ) : null}
            <Button
              aria-describedby={mismatchedTarget ? 'authoring-canvas-lock-reason' : undefined}
              disabled={readOnly || mismatchedTarget || selectedNode.layout === undefined}
              ref={mutationButtonRef}
              onClick={applyEffectiveLayout}
            >
              Override layout with effective
            </Button>
            {mismatchedTarget ? (
              <span className="ui-visually-hidden" id="authoring-canvas-lock-reason">
                Choose Edit active before changing Canvas layout.
              </span>
            ) : null}
          </div>
        ) : (
          <p className="ui-workbench-authoring-empty">Select a node to author it.</p>
        )}
      </WorkbenchPreviewCanvas>
    </WorkbenchAuthoringShell>
  );
}
