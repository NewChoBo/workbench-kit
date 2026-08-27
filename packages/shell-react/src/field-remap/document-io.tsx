import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import { Modal } from '@workbench-kit/react/modal';
import { Button, TextArea } from '@workbench-kit/react/primitives';
import { WorkbenchModalPortal } from '@workbench-kit/react/workbench/modal-portal';
import type { FieldRemapImportFailureCode } from '@workbench-kit/field-remap';

import {
  resolveFieldRemapChromeLabels,
  type FieldRemapChromeLabels,
  type FieldRemapTranslate,
} from './chrome-labels.js';

export type FieldRemapDocumentImportActionResult =
  | { readonly status: 'accepted' }
  | {
      readonly status: 'rejected';
      readonly code: FieldRemapImportFailureCode;
    };

interface FieldRemapDocumentIoProps {
  readonly getDocumentJson: () => string;
  readonly importAvailable: boolean;
  readonly labels?: Partial<FieldRemapChromeLabels> | undefined;
  readonly t?: FieldRemapTranslate | undefined;
  readonly onImportText: (text: string) => FieldRemapDocumentImportActionResult;
}

type DocumentIoStatus =
  | { readonly kind: 'success'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

function importFailureMessage(
  code: FieldRemapImportFailureCode,
  labels: FieldRemapChromeLabels,
): string {
  switch (code) {
    case 'invalid-json':
      return labels.documentImportInvalidJson ?? '';
    case 'unsupported-version':
      return labels.documentImportUnsupportedVersion ?? '';
    case 'duplicate-id':
      return labels.documentImportDuplicateId ?? '';
    case 'incompatible-source':
      return labels.documentImportIncompatibleSource ?? '';
    case 'incompatible-target':
      return labels.documentImportIncompatibleTarget ?? '';
    case 'unavailable-transform':
      return labels.documentImportUnavailableTransform ?? '';
    case 'invalid-document':
      return labels.documentImportInvalidDocument ?? '';
  }
}

export function FieldRemapDocumentIo({
  getDocumentJson,
  importAvailable,
  labels: labelOverrides,
  t,
  onImportText,
}: FieldRemapDocumentIoProps): JSX.Element {
  const labels = useMemo(
    () => resolveFieldRemapChromeLabels(labelOverrides, t),
    [labelOverrides, t],
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [status, setStatus] = useState<DocumentIoStatus | null>(null);
  const instanceId = useId();
  const exportTextId = `field-remap-document-export-text-${instanceId}`;
  const importTextId = `field-remap-document-import-text-${instanceId}`;
  const importErrorId = `field-remap-document-import-error-${instanceId}`;
  const exportTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!importAvailable && importOpen) {
      setImportOpen(false);
      setDraft('');
      setImportError(null);
    }
  }, [importAvailable, importOpen]);

  const closeImport = () => {
    setImportOpen(false);
    setDraft('');
    setImportError(null);
  };

  const closeExport = () => {
    setExportOpen(false);
    setExportText('');
    setStatus(null);
  };

  const openExport = () => {
    try {
      setExportText(getDocumentJson());
      setStatus(null);
      setExportOpen(true);
    } catch {
      setStatus({ kind: 'error', message: labels.documentCopyFailed ?? '' });
    }
  };

  const copyDocument = async () => {
    try {
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        throw new Error('Clipboard write is unavailable.');
      }
      await clipboard.writeText(exportText);
      setStatus({ kind: 'success', message: labels.documentCopied ?? '' });
    } catch {
      setStatus({ kind: 'error', message: labels.documentCopyFailed ?? '' });
    }
  };

  const openImport = () => {
    if (!importAvailable) {
      return;
    }
    setDraft('');
    setImportError(null);
    setStatus(null);
    setImportOpen(true);
  };

  const applyImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = onImportText(draft);
    if (result.status === 'rejected') {
      setImportError(importFailureMessage(result.code, labels));
      queueMicrotask(() => textareaRef.current?.focus());
      return;
    }
    closeImport();
  };

  return (
    <div className="workbench-field-remap-document-io" data-testid="field-remap-document-io">
      <div className="workbench-field-remap-document-io__actions">
        <Button
          compact
          type="button"
          data-testid="field-remap-export-document"
          onClick={openExport}
        >
          {labels.exportDocumentJson}
        </Button>
        <Button
          compact
          type="button"
          data-testid="field-remap-import-document"
          disabled={!importAvailable}
          onClick={openImport}
        >
          {labels.importDocumentJson}
        </Button>
      </div>
      {!importAvailable ? (
        <span className="workbench-field-remap-document-io__availability">
          {labels.documentImportUnavailable}
        </span>
      ) : null}
      {status && !exportOpen ? (
        <span
          className="workbench-field-remap-document-io__status"
          data-status={status.kind}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </span>
      ) : null}

      {exportOpen ? (
        <WorkbenchModalPortal>
          <Modal
            bodyClassName="workbench-field-remap-document-export__body"
            bodyLayout="stack"
            bodyPadding="lg"
            bodyScroll="auto"
            className="workbench-field-remap-document-export"
            closeLabel={labels.closeDocumentExport}
            footer={
              <>
                <Button
                  type="button"
                  data-testid="field-remap-copy-document"
                  onClick={() => void copyDocument()}
                >
                  {labels.copyDocumentJson}
                </Button>
                <Button type="button" onClick={closeExport}>
                  {labels.closeDocumentExport}
                </Button>
              </>
            }
            initialFocusRef={exportTextareaRef}
            title={labels.exportDocumentTitle}
            onClose={closeExport}
          >
            <p className="workbench-field-remap-document-export__description">
              {labels.exportDocumentDescription}
            </p>
            <label className="workbench-field-remap-document-export__label" htmlFor={exportTextId}>
              {labels.exportDocumentLabel}
            </label>
            <TextArea
              ref={exportTextareaRef}
              id={exportTextId}
              controlWidth="full"
              data-testid="field-remap-document-export-text"
              monospace
              readOnly
              rows={12}
              value={exportText}
              onFocus={(event) => event.currentTarget.select()}
            />
            {status ? (
              <p
                className="workbench-field-remap-document-io__status"
                data-status={status.kind}
                role={status.kind === 'error' ? 'alert' : 'status'}
              >
                {status.message}
              </p>
            ) : null}
          </Modal>
        </WorkbenchModalPortal>
      ) : null}

      {importOpen ? (
        <WorkbenchModalPortal>
          <Modal
            bodyClassName="workbench-field-remap-document-import__body"
            bodyLayout="stack"
            bodyPadding="lg"
            bodyScroll="auto"
            className="workbench-field-remap-document-import"
            closeLabel={labels.closeDocumentImport}
            footer={
              <>
                <Button type="button" onClick={closeImport}>
                  {labels.cancelDocumentImport}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  data-testid="field-remap-apply-document-import"
                >
                  {labels.applyDocumentImport}
                </Button>
              </>
            }
            initialFocusRef={textareaRef}
            title={labels.importDocumentTitle}
            onClose={closeImport}
            onSubmit={applyImport}
          >
            <p className="workbench-field-remap-document-import__description">
              {labels.importDocumentDescription}
            </p>
            <label className="workbench-field-remap-document-import__label" htmlFor={importTextId}>
              {labels.importDocumentLabel}
            </label>
            <TextArea
              ref={textareaRef}
              id={importTextId}
              aria-describedby={importError ? importErrorId : undefined}
              aria-invalid={importError ? true : undefined}
              controlWidth="full"
              data-testid="field-remap-document-import-text"
              monospace
              placeholder={labels.importDocumentPlaceholder}
              rows={12}
              value={draft}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                setImportError(null);
              }}
            />
            {importError ? (
              <p
                id={importErrorId}
                className="workbench-field-remap-document-import__error"
                role="alert"
              >
                {importError}
              </p>
            ) : null}
          </Modal>
        </WorkbenchModalPortal>
      ) : null}
    </div>
  );
}
