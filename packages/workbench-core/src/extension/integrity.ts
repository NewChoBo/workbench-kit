import type { WorkbenchExtensionsLock } from '@workbench-kit/workbench-config';

import { stableStringify } from './canonical-json.js';
import type { WorkbenchExtensionDescription } from './registry.js';
import { sha256Hex } from './sha256.js';

export type ExtensionIntegrityMode = 'off' | 'warn' | 'fail-closed';

export type ExtensionIntegrityDiagnosticCode =
  | 'extension_lock_entry_missing'
  | 'extension_lock_version_mismatch'
  | 'extension_lock_integrity_mismatch';

export interface ExtensionIntegrityDiagnostic {
  readonly code: ExtensionIntegrityDiagnosticCode;
  readonly extensionId: string;
  readonly message: string;
}

export interface VerifyWorkbenchExtensionsAgainstLockResult {
  readonly accepted: readonly WorkbenchExtensionDescription[];
  readonly diagnostics: readonly ExtensionIntegrityDiagnostic[];
  readonly rejected: readonly WorkbenchExtensionDescription[];
}

export function computeWorkbenchExtensionManifestIntegrity(
  manifest: WorkbenchExtensionDescription['manifest'],
): string {
  return `sha256:${sha256Hex(stableStringify(manifest))}`;
}

/**
 * Verify enabled (or candidate) extensions against a lockfile.
 *
 * - `off`: return all extensions; no diagnostics.
 * - `warn`: return all extensions; emit diagnostics for mismatches.
 * - `fail-closed`: drop mismatched / missing-lock entries; emit diagnostics.
 */
export function verifyWorkbenchExtensionsAgainstLock(
  extensions: readonly WorkbenchExtensionDescription[],
  lock: WorkbenchExtensionsLock | undefined,
  mode: ExtensionIntegrityMode = 'off',
): VerifyWorkbenchExtensionsAgainstLockResult {
  if (mode === 'off' || !lock) {
    return {
      accepted: [...extensions],
      diagnostics: [],
      rejected: [],
    };
  }

  const accepted: WorkbenchExtensionDescription[] = [];
  const rejected: WorkbenchExtensionDescription[] = [];
  const diagnostics: ExtensionIntegrityDiagnostic[] = [];

  for (const extension of extensions) {
    const extensionId = extension.manifest.id;
    const entry = lock.extensions[extensionId];
    if (!entry) {
      const diagnostic: ExtensionIntegrityDiagnostic = {
        code: 'extension_lock_entry_missing',
        extensionId,
        message: `Extension "${extensionId}" is not present in the extensions lockfile.`,
      };
      diagnostics.push(diagnostic);
      if (mode === 'fail-closed') {
        rejected.push(extension);
      } else {
        accepted.push(extension);
      }
      continue;
    }

    if (entry.version !== extension.manifest.version) {
      const diagnostic: ExtensionIntegrityDiagnostic = {
        code: 'extension_lock_version_mismatch',
        extensionId,
        message: `Extension "${extensionId}" version mismatch (lock ${entry.version}, manifest ${extension.manifest.version}).`,
      };
      diagnostics.push(diagnostic);
      if (mode === 'fail-closed') {
        rejected.push(extension);
      } else {
        accepted.push(extension);
      }
      continue;
    }

    if (entry.integrity) {
      const actual = computeWorkbenchExtensionManifestIntegrity(extension.manifest);
      if (actual !== entry.integrity) {
        const diagnostic: ExtensionIntegrityDiagnostic = {
          code: 'extension_lock_integrity_mismatch',
          extensionId,
          message: `Extension "${extensionId}" integrity mismatch against the extensions lockfile.`,
        };
        diagnostics.push(diagnostic);
        if (mode === 'fail-closed') {
          rejected.push(extension);
        } else {
          accepted.push(extension);
        }
        continue;
      }
    }

    accepted.push(extension);
  }

  return { accepted, diagnostics, rejected };
}
