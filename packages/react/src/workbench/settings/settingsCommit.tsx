import { createContext, useContext, type ReactNode } from 'react';

/**
 * How settings edits are committed from {@link WorkbenchSettingsModal}.
 *
 * - `explicit` (default): host footer Apply/Cancel (or form actions) remain; commit on submit.
 * - `immediate`: hide the modal footer; emit {@link WorkbenchSettingsPreferenceChange} on each edit
 *   (VS Code–style apply-on-change). Category content should persist via `onPreferenceChange`
 *   or {@link useWorkbenchSettingsCommit}.
 */
export type WorkbenchSettingsCommitMode = 'explicit' | 'immediate';

export interface WorkbenchSettingsPreferenceChange {
  /** Active settings category id when the change was emitted. */
  categoryId: string;
  /** Preference or field key. */
  key: string;
  /** New value for the key. */
  value: unknown;
  /** Active scope id when the modal exposes scopes. */
  scopeId?: string;
}

export interface WorkbenchSettingsCommitContextValue {
  categoryId: string;
  commitMode: WorkbenchSettingsCommitMode;
  onPreferenceChange?: ((change: WorkbenchSettingsPreferenceChange) => void) | undefined;
  scopeId: string;
}

const WorkbenchSettingsCommitContext = createContext<WorkbenchSettingsCommitContextValue | null>(
  null,
);

export function WorkbenchSettingsCommitProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WorkbenchSettingsCommitContextValue;
}) {
  return (
    <WorkbenchSettingsCommitContext.Provider value={value}>
      {children}
    </WorkbenchSettingsCommitContext.Provider>
  );
}

/**
 * Reads the active settings commit contract from {@link WorkbenchSettingsModal}.
 * Returns `null` when rendered outside the modal.
 */
export function useWorkbenchSettingsCommit(): WorkbenchSettingsCommitContextValue | null {
  return useContext(WorkbenchSettingsCommitContext);
}
