import { createScreenSpecPaletteAssetCatalog } from '@workbench-kit/jdw';
import { BUILTIN_JDW_REGISTRY } from '@workbench-kit/react/jdw';
import { WidgetTreeLab } from '@workbench-kit/react/widget-tree';
import type { EditorDocumentViewProvider } from '@workbench-kit/shell-react';

import { SAMPLE_SCREEN_TEMPLATE_JDW_PATH } from './bootstrap.js';

export const SAMPLE_SCREEN_TEMPLATE_PROVIDER_ID =
  'workbench-sample.editor.form.screen-template' as const;

const SCREEN_TEMPLATE_ASSET_CATALOG = createScreenSpecPaletteAssetCatalog();

export const sampleScreenTemplateDocumentViewProviders: readonly EditorDocumentViewProvider[] = [
  {
    id: SAMPLE_SCREEN_TEMPLATE_PROVIDER_ID,
    kind: 'form',
    label: 'Design',
    priority: 100,
    matches: (document) =>
      document.path === SAMPLE_SCREEN_TEMPLATE_JDW_PATH ||
      document.path.endsWith(`/${SAMPLE_SCREEN_TEMPLATE_JDW_PATH}`),
    render: ({ document, onContentChange }) => (
      <WidgetTreeLab
        assetCatalog={SCREEN_TEMPLATE_ASSET_CATALOG}
        path={document.path}
        registry={BUILTIN_JDW_REGISTRY}
        showDesignSource={false}
        value={document.content}
        viewMode="design"
        onChange={onContentChange}
      />
    ),
  },
];
