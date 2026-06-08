import type { PlaygroundWidgetTemplateId } from '../json-widget/playground/demo-registry.js';

export const AUTHORING_DROP_MIME = 'application/x-workbench-authoring+json';

export type AuthoringDropPayload =
  | { kind: 'template'; templateId: PlaygroundWidgetTemplateId }
  | { kind: 'asset'; assetId: string; assetType: 'image' | 'icon' };

export function serializeAuthoringDropPayload(payload: AuthoringDropPayload): string {
  return JSON.stringify(payload);
}

export function parseAuthoringDropPayload(data: string): AuthoringDropPayload | null {
  try {
    const parsed = JSON.parse(data) as AuthoringDropPayload;
    if (parsed?.kind === 'template' && typeof parsed.templateId === 'string') {
      return parsed;
    }
    if (
      parsed?.kind === 'asset' &&
      typeof parsed.assetId === 'string' &&
      (parsed.assetType === 'image' || parsed.assetType === 'icon')
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setAuthoringDragData(
  dataTransfer: DataTransfer,
  payload: AuthoringDropPayload,
): void {
  dataTransfer.setData(AUTHORING_DROP_MIME, serializeAuthoringDropPayload(payload));
  dataTransfer.effectAllowed = 'copy';
}

export function readAuthoringDropPayload(dataTransfer: DataTransfer): AuthoringDropPayload | null {
  const raw = dataTransfer.getData(AUTHORING_DROP_MIME);
  if (!raw) return null;
  return parseAuthoringDropPayload(raw);
}
