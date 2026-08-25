import { WorkbenchPropertyOverrideLabel } from '../layout/WorkbenchPropertyOverrideLabel.js';
import {
  WorkbenchPropertyKeyValue,
  WorkbenchPropertyPanel,
  WorkbenchPropertySection,
} from '../layout/WorkbenchPropertyPanel.js';
import { Button } from '../primitives/button/index.js';
import { SegmentedControl } from '../primitives/workbench-editor/WorkbenchEditor.js';
import {
  createWorkbenchAuthoringCommandId,
  createWorkbenchAuthoringLayoutActionV3,
  createWorkbenchAuthoringPropertyActionV3,
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
  hasLayoutOverride,
  hasPropertyOverride,
  layoutForEditingTarget,
  propertiesForEditingTarget,
  selectedAuthoringNode,
} from './view.js';

import './authoring.css';

export function WorkbenchAuthoringInspector({
  controller,
  readOnly = false,
}: WorkbenchAuthoringSurfacePropsV3) {
  const { designSystemChoices, document, resolution } = controller.projection;
  const selectedNode = selectedAuthoringNode(document);
  const resolutionNode = selectedNode
    ? resolution.nodes.find((node) => node.nodeId === selectedNode.nodeId)
    : undefined;
  const targetKey = editingTargetControlValue(document.editingTarget);
  const variantOptions = [
    { label: 'Base', value: editingTargetControlValue({ kind: 'base' }) },
    ...document.responsiveVariants.map((variant) => ({
      label: `Variant ${variant.id}`,
      value: editingTargetControlValue({ kind: 'variant', variantId: variant.id }),
    })),
  ];
  const currentPackKey = designSystemChoices
    ? `${designSystemChoices.state.pack.id}@${designSystemChoices.state.pack.version}`
    : 'unconfigured';
  const currentPack = designSystemChoices?.packs.find(
    (pack) =>
      pack.ref.id === designSystemChoices.state.pack.id &&
      pack.ref.version === designSystemChoices.state.pack.version,
  );
  const diagnosticMessages = [
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
  const targetProperties =
    selectedNode === undefined
      ? {}
      : propertiesForEditingTarget(selectedNode, document.editingTarget);
  const targetLayout =
    selectedNode === undefined
      ? undefined
      : layoutForEditingTarget(selectedNode, document.editingTarget);

  const commandId = (nodeId: string, operation: string) =>
    createWorkbenchAuthoringCommandId({
      documentId: document.documentId,
      documentRevision: document.documentRevision,
      editingTarget: document.editingTarget,
      nodeId,
      operation,
    });

  return (
    <WorkbenchPropertyPanel
      aria-label="Authoring Inspector"
      className="ui-workbench-authoring-inspector"
      data-editing-target={targetKey}
      role="region"
    >
      <WorkbenchPropertySection level="category" title="Editing target">
        <SegmentedControl
          ariaLabel="Inspector editing target"
          options={variantOptions}
          value={targetKey}
          onChange={(value) => controller.setEditingTarget(editingTargetFromControlValue(value))}
        />
        <WorkbenchPropertyKeyValue
          name="Current target"
          value={formatEditingTarget(document.editingTarget)}
        />
        <WorkbenchPropertyKeyValue
          name="Preview effective target"
          value={formatEditingTarget(activeEditingTarget(document))}
        />
      </WorkbenchPropertySection>

      {selectedNode ? (
        <>
          <WorkbenchPropertySection level="category" title="Properties">
            {Object.entries(targetProperties).map(([propertyId, property]) => {
              const overridden = hasPropertyOverride(
                selectedNode,
                document.editingTarget,
                propertyId,
              );
              return (
                <div className="ui-workbench-authoring-inspector__field" key={propertyId}>
                  <WorkbenchPropertyOverrideLabel
                    customBadgeLabel={
                      document.editingTarget.kind === 'base'
                        ? 'Base'
                        : `Variant ${document.editingTarget.variantId}`
                    }
                    defaultBadgeLabel={
                      property.provenance.kind === 'base'
                        ? 'From Base'
                        : `From ${property.provenance.variantId}`
                    }
                    label={propertyId}
                    overridden={overridden}
                  />
                  <WorkbenchPropertyKeyValue
                    name="Editing target value"
                    value={formatUiValueSource(property.value)}
                  />
                  <WorkbenchPropertyKeyValue
                    name="Resolved value"
                    value={formatResolvedValue(resolutionNode?.properties[propertyId])}
                  />
                  <WorkbenchPropertyKeyValue
                    name="Design System provenance"
                    value={formatResolvedProvenance(resolutionNode?.properties[propertyId])}
                  />
                  <div className="ui-workbench-authoring-actions">
                    <Button
                      compact
                      disabled={readOnly}
                      onClick={() =>
                        controller.dispatch(
                          createWorkbenchAuthoringPropertyActionV3({
                            commandId: commandId(
                              selectedNode.nodeId,
                              `property:${propertyId}:set-effective`,
                            ),
                            editingTarget: document.editingTarget,
                            nodeId: selectedNode.nodeId,
                            propertyId,
                            value: property.value,
                          }),
                        )
                      }
                    >
                      Override with effective
                    </Button>
                    <Button
                      compact
                      disabled={readOnly || !overridden}
                      onClick={() =>
                        controller.dispatch(
                          createWorkbenchAuthoringPropertyActionV3({
                            commandId: commandId(
                              selectedNode.nodeId,
                              `property:${propertyId}:clear`,
                            ),
                            editingTarget: document.editingTarget,
                            nodeId: selectedNode.nodeId,
                            propertyId,
                          }),
                        )
                      }
                    >
                      Clear override
                    </Button>
                  </div>
                </div>
              );
            })}
          </WorkbenchPropertySection>

          <WorkbenchPropertySection level="category" title="Layout">
            {targetLayout ? (
              <>
                <WorkbenchPropertyKeyValue name="Strategy" value={targetLayout.strategyId} />
                <WorkbenchPropertyKeyValue
                  name="Provenance"
                  value={
                    targetLayout.provenance.kind === 'base'
                      ? 'Base'
                      : `Variant ${targetLayout.provenance.variantId}`
                  }
                />
                {Object.entries(targetLayout.values).map(([propertyId, property]) => (
                  <WorkbenchPropertyKeyValue
                    key={propertyId}
                    name={propertyId}
                    value={formatUiValueSource(property.value)}
                  />
                ))}
                <div className="ui-workbench-authoring-actions">
                  <Button
                    compact
                    disabled={readOnly}
                    onClick={() =>
                      controller.dispatch(
                        createWorkbenchAuthoringLayoutActionV3({
                          commandId: commandId(selectedNode.nodeId, 'layout:set-effective'),
                          editingTarget: document.editingTarget,
                          nodeId: selectedNode.nodeId,
                          layout: {
                            strategyId: targetLayout.strategyId,
                            values: Object.fromEntries(
                              Object.entries(targetLayout.values).map(([key, projection]) => [
                                key,
                                projection.value,
                              ]),
                            ),
                          },
                        }),
                      )
                    }
                  >
                    Override layout with effective
                  </Button>
                  <Button
                    compact
                    disabled={
                      readOnly ||
                      document.editingTarget.kind === 'base' ||
                      !hasLayoutOverride(selectedNode, document.editingTarget)
                    }
                    onClick={() =>
                      controller.dispatch(
                        createWorkbenchAuthoringLayoutActionV3({
                          commandId: commandId(selectedNode.nodeId, 'layout:clear'),
                          editingTarget: document.editingTarget,
                          nodeId: selectedNode.nodeId,
                        }),
                      )
                    }
                  >
                    Clear layout override
                  </Button>
                </div>
              </>
            ) : (
              <p>No effective layout.</p>
            )}
          </WorkbenchPropertySection>
        </>
      ) : (
        <p className="ui-workbench-authoring-empty">Select a node to inspect it.</p>
      )}

      <WorkbenchPropertySection level="category" title="Design System">
        <label className="ui-workbench-authoring-choice">
          <span>Pack (read-only)</span>
          <select aria-label="Design System Pack" disabled value={currentPackKey}>
            {designSystemChoices === undefined ? (
              <option value="unconfigured">No Design System configured</option>
            ) : null}
            {designSystemChoices?.packs.map((pack) => {
              const key = `${pack.ref.id}@${pack.ref.version}`;
              return (
                <option key={key} value={key}>
                  {pack.displayName}
                </option>
              );
            })}
          </select>
        </label>
        <label className="ui-workbench-authoring-choice">
          <span>Theme (read-only)</span>
          <select
            aria-label="Design System Theme"
            disabled
            value={designSystemChoices?.state.theme.themeId ?? 'unconfigured'}
          >
            {designSystemChoices === undefined ? (
              <option value="unconfigured">No Theme configured</option>
            ) : null}
            {(currentPack?.themes ?? []).map((theme) => (
              <option key={theme.ref.themeId} value={theme.ref.themeId}>
                {theme.displayName}
              </option>
            ))}
          </select>
        </label>
        {designSystemChoices !== undefined ? (
          <ul
            aria-label="Available Design System choices"
            className="ui-workbench-authoring-choice-list"
          >
            {designSystemChoices.packs.map((pack) => {
              const key = `${pack.ref.id}@${pack.ref.version}`;
              return (
                <li key={key}>
                  <strong>
                    {pack.displayName} ({key})
                  </strong>
                  <ul>
                    {pack.themes.map((theme) => (
                      <li key={theme.ref.themeId}>{theme.displayName}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : null}
      </WorkbenchPropertySection>

      {diagnosticMessages.length > 0 ? (
        <div className="ui-workbench-authoring-diagnostics" role="alert">
          <strong>Authoring diagnostics</strong>
          <ul>
            {diagnosticMessages.map((message, index) => (
              <li key={`${index}:${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </WorkbenchPropertyPanel>
  );
}
