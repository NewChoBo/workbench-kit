import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { Checkbox } from '../../primitives/Checkbox';
import { Field } from '../../primitives/Field';
import { Select } from '../../primitives/Select';
import { TextInput } from '../../primitives/TextInput';
import { WorkbenchSettingsSection } from '../settings';
import type { WorkspaceEditorTheme } from '../workspace';

function clampStoryPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(90, Math.max(10, value));
}

export function renderIntegratedShellSettingsCategory({
  categoryId,
  colorTheme,
  compactRows,
  fileCount,
  searchQuery,
  searchResultCount,
  settingsSearchValue,
  sideBarSizePercent,
  onClearSearch,
  onColorThemeChange,
  onCompactRowsChange,
  onSearchQueryChange,
  onSettingsSearchValueChange,
  onSideBarSizePercentChange,
}: {
  categoryId: string;
  colorTheme: WorkspaceEditorTheme;
  compactRows: boolean;
  fileCount: number;
  searchQuery: string;
  searchResultCount: number;
  settingsSearchValue: string;
  sideBarSizePercent: number;
  onClearSearch: () => void;
  onColorThemeChange: (theme: WorkspaceEditorTheme) => void;
  onCompactRowsChange: (compactRows: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onSettingsSearchValueChange: (query: string) => void;
  onSideBarSizePercentChange: (sizePercent: number) => void;
}) {
  if (categoryId === 'workbench') {
    return (
      <WorkbenchSettingsSection
        id="integrated-settings-workbench"
        title="Workbench"
        description="Tune layout density and pane sizes for the integrated shell."
      >
        <Field label="Workbench density" description="Controls compact shell surfaces.">
          <Select
            controlWidth="full"
            value={compactRows ? 'compact' : 'comfortable'}
            onChange={(event) => onCompactRowsChange(event.currentTarget.value === 'compact')}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
          </Select>
        </Field>
        <Field inline label="Compact rows">
          <Checkbox
            checked={compactRows}
            label="Use compact explorer, search, and chat rows"
            onChange={(event) => onCompactRowsChange(event.currentTarget.checked)}
          />
        </Field>
        <Field
          label="Primary sidebar width"
          description="Sets the current sidebar split percentage."
        >
          <TextInput
            controlWidth="full"
            type="number"
            value={Math.round(sideBarSizePercent)}
            onChange={(event) =>
              onSideBarSizePercentChange(
                clampStoryPercent(event.currentTarget.valueAsNumber, sideBarSizePercent),
              )
            }
          />
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  if (categoryId === 'workspace') {
    return (
      <WorkbenchSettingsSection
        id="integrated-settings-workspace"
        title="Workspace"
        description="Preview workspace-facing settings without binding to a runtime or storage layer."
      >
        <Field label="Search seed" description="Updates the shared search query used by the story.">
          <TextInput
            controlWidth="full"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          />
        </Field>
        <Field label="Settings search">
          <TextInput
            controlWidth="full"
            value={settingsSearchValue}
            onChange={(event) => onSettingsSearchValueChange(event.currentTarget.value)}
          />
        </Field>
        <Field label="Workspace summary">
          <div className="workbench-settings-badge-list">
            <Badge>{fileCount} files</Badge>
            <Badge variant="muted">{searchResultCount} search results</Badge>
          </div>
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  if (categoryId === 'maintenance') {
    return (
      <WorkbenchSettingsSection
        id="integrated-settings-maintenance"
        title="Maintenance"
        description="Keep destructive or app-specific operations injected by the host application."
      >
        <Field
          inline
          label="Search state"
          description="Clears the current public mock search query."
        >
          <Button variant="danger" onClick={onClearSearch}>
            Clear
          </Button>
        </Field>
      </WorkbenchSettingsSection>
    );
  }

  return (
    <WorkbenchSettingsSection
      id="integrated-settings-appearance"
      title="Appearance"
      description="Choose visual preferences for the workbench shell."
    >
      <Field
        description="This story stores the setting locally to demonstrate the reusable UI surface."
        htmlFor="integrated-settings-theme"
        label="Color theme"
      >
        <Select
          id="integrated-settings-theme"
          controlWidth="full"
          value={colorTheme}
          onChange={(event) => onColorThemeChange(event.currentTarget.value as WorkspaceEditorTheme)}
        >
          <option value="dark">Dark Modern</option>
          <option value="light">Light Modern</option>
        </Select>
      </Field>
    </WorkbenchSettingsSection>
  );
}
