import type { WorkbenchDocumentNode, WorkbenchNodeLayout } from './schema';

export interface WorkbenchCanvasLayoutInput {
  readonly height?: string | undefined;
  readonly width?: string | undefined;
  readonly x?: string | undefined;
  readonly y?: string | undefined;
}

export function getWorkbenchCanvasNodeChildren(node: WorkbenchDocumentNode): readonly string[] {
  return 'children' in node ? ((node as { children?: readonly string[] }).children ?? []) : [];
}

export function getWorkbenchCanvasRootNodeIds(nodes: readonly WorkbenchDocumentNode[]): string[] {
  const childIdSet = new Set(nodes.flatMap((node) => getWorkbenchCanvasNodeChildren(node)));

  return nodes.filter((node) => !node.parentId && !childIdSet.has(node.id)).map((node) => node.id);
}

export function parseWorkbenchCanvasLayoutNumber(value: string | undefined): number | undefined {
  const trimmed = value?.trim() ?? '';
  const numberValue = Number(trimmed);
  if (trimmed === '' || !Number.isFinite(numberValue)) {
    return undefined;
  }

  return numberValue;
}

export function createWorkbenchCanvasLayoutUpdate(
  currentLayout: WorkbenchNodeLayout | undefined,
  input: WorkbenchCanvasLayoutInput,
): Record<string, unknown> {
  const x = parseWorkbenchCanvasLayoutNumber(input.x);
  const y = parseWorkbenchCanvasLayoutNumber(input.y);
  const width = parseWorkbenchCanvasLayoutNumber(input.width);
  const height = parseWorkbenchCanvasLayoutNumber(input.height);

  return {
    ...(currentLayout ?? {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
}
