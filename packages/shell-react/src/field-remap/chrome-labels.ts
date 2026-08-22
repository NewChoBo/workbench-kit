/**
 * Host-overridable chrome strings for Field Remap Flow / palette surfaces.
 * Domain vocabulary (`MappingEdge`, binding runtime) stays unchanged.
 *
 * Resolution order per string: `labels[key]` → `t(capabilityId, default)` → English default.
 */

export type FieldRemapTranslate = (
  key: string,
  fallback: string,
  params?: Readonly<Record<string, string | number>>,
) => string;

export interface FieldRemapChromeLabels {
  /** Edge-list heading under the Flow canvas (product noun; default “Bindings”). */
  readonly bindingsTitle: string;
  readonly convertPaletteTitle: string;
  readonly convertPaletteDescription: string;
  readonly convertPaletteAriaLabel: string;
  readonly convertsListAriaLabel: string;
  /** Additive filter copy. Omitted legacy label objects use the English defaults. */
  readonly convertFilterLabel?: string;
  readonly convertFilterPlaceholder?: string;
  readonly clearConvertFilter?: string;
  readonly noMatchingConverts?: string;
  readonly placeConvert: string;
  readonly addCombine: string;
  readonly addSplit: string;
  readonly operatorsTitle: string;
  readonly operatorsDescription: string;
  readonly addTransform: string;
  readonly editItems: string;
  readonly removeBinding: string;
  readonly showMinimap: string;
  readonly hideMinimap: string;
  readonly showHiddenFields: string;
  readonly hideHiddenFields: string;
  readonly emptyDetailTitle: string;
  readonly emptyDetailDescription: string;
  /** Additive Flow preview copy. Omitted legacy label objects use English defaults. */
  readonly previewTitle?: string;
  readonly previewLoading?: string;
  readonly previewError?: string;
  readonly previewDocumentResult?: string;
  readonly previewBindingResult?: string;
  readonly previewStepIntermediateUnavailable?: string;
  readonly previewOperatorIntermediateUnavailable?: string;
  readonly previewDraftUnavailable?: string;
  readonly previewSelectionUnavailable?: string;
}

export const defaultFieldRemapChromeLabels = {
  bindingsTitle: 'Bindings',
  convertPaletteTitle: 'Convert palette',
  convertPaletteDescription:
    'Place a convert first, then wire source → draft → target. Drafts stay off the document until both ports bind.',
  convertPaletteAriaLabel: 'Convert palette',
  convertsListAriaLabel: 'Converts',
  convertFilterLabel: 'Filter converts',
  convertFilterPlaceholder: 'Filter by label or id',
  clearConvertFilter: 'Clear convert filter',
  noMatchingConverts: 'No matching converts.',
  placeConvert: 'Place convert',
  addCombine: 'Add combine',
  addSplit: 'Add split',
  operatorsTitle: 'n→m operators',
  operatorsDescription:
    'Create combine (n→1) or split (1→n), then wire ports or edit in the side rail.',
  addTransform: 'Add convert',
  editItems: 'Edit items',
  removeBinding: 'Remove binding',
  showMinimap: 'Show minimap',
  hideMinimap: 'Hide minimap',
  showHiddenFields: 'Show hidden fields',
  hideHiddenFields: 'Hide hidden fields',
  emptyDetailTitle: 'Start with a convert',
  emptyDetailDescription:
    'Use the Convert palette to place a convert, then wire source → draft → target. Or select an existing binding / convert note on the canvas.',
  previewTitle: 'Sample preview',
  previewLoading: 'Updating preview…',
  previewError: 'Preview failed',
  previewDocumentResult: 'Final document output',
  previewBindingResult: 'Final binding value',
  previewStepIntermediateUnavailable:
    'Per-step intermediate values are unavailable; this is the final binding value.',
  previewOperatorIntermediateUnavailable:
    'Selected-operator intermediate values are unavailable; this is the final document output.',
  previewDraftUnavailable: 'Draft converts are not executable until they become a binding.',
  previewSelectionUnavailable: 'The selected binding or operator is no longer available.',
} as const satisfies Required<FieldRemapChromeLabels>;

/** Stable capability ids for optional `t()` injection (not free prose). */
export const fieldRemapChromeLabelKeys = {
  bindingsTitle: 'fieldRemap.bindingsTitle',
  convertPaletteTitle: 'fieldRemap.convertPaletteTitle',
  convertPaletteDescription: 'fieldRemap.convertPaletteDescription',
  convertPaletteAriaLabel: 'fieldRemap.convertPaletteAriaLabel',
  convertsListAriaLabel: 'fieldRemap.convertsListAriaLabel',
  convertFilterLabel: 'fieldRemap.convertFilterLabel',
  convertFilterPlaceholder: 'fieldRemap.convertFilterPlaceholder',
  clearConvertFilter: 'fieldRemap.clearConvertFilter',
  noMatchingConverts: 'fieldRemap.noMatchingConverts',
  placeConvert: 'fieldRemap.placeConvert',
  addCombine: 'fieldRemap.addCombine',
  addSplit: 'fieldRemap.addSplit',
  operatorsTitle: 'fieldRemap.operatorsTitle',
  operatorsDescription: 'fieldRemap.operatorsDescription',
  addTransform: 'fieldRemap.addTransform',
  editItems: 'fieldRemap.editItems',
  removeBinding: 'fieldRemap.removeBinding',
  showMinimap: 'fieldRemap.showMinimap',
  hideMinimap: 'fieldRemap.hideMinimap',
  showHiddenFields: 'fieldRemap.showHiddenFields',
  hideHiddenFields: 'fieldRemap.hideHiddenFields',
  emptyDetailTitle: 'fieldRemap.emptyDetailTitle',
  emptyDetailDescription: 'fieldRemap.emptyDetailDescription',
  previewTitle: 'fieldRemap.previewTitle',
  previewLoading: 'fieldRemap.previewLoading',
  previewError: 'fieldRemap.previewError',
  previewDocumentResult: 'fieldRemap.previewDocumentResult',
  previewBindingResult: 'fieldRemap.previewBindingResult',
  previewStepIntermediateUnavailable: 'fieldRemap.previewStepIntermediateUnavailable',
  previewOperatorIntermediateUnavailable: 'fieldRemap.previewOperatorIntermediateUnavailable',
  previewDraftUnavailable: 'fieldRemap.previewDraftUnavailable',
  previewSelectionUnavailable: 'fieldRemap.previewSelectionUnavailable',
} as const satisfies Record<keyof FieldRemapChromeLabels, string>;

export function resolveFieldRemapChromeLabels(
  labels?: Partial<FieldRemapChromeLabels> | undefined,
  t?: FieldRemapTranslate | undefined,
): FieldRemapChromeLabels {
  const resolve = <K extends keyof FieldRemapChromeLabels>(key: K): string => {
    const override = labels?.[key];
    if (override !== undefined) {
      return override;
    }
    const fallback = defaultFieldRemapChromeLabels[key];
    return t?.(fieldRemapChromeLabelKeys[key], fallback) ?? fallback;
  };

  return {
    bindingsTitle: resolve('bindingsTitle'),
    convertPaletteTitle: resolve('convertPaletteTitle'),
    convertPaletteDescription: resolve('convertPaletteDescription'),
    convertPaletteAriaLabel: resolve('convertPaletteAriaLabel'),
    convertsListAriaLabel: resolve('convertsListAriaLabel'),
    convertFilterLabel: resolve('convertFilterLabel'),
    convertFilterPlaceholder: resolve('convertFilterPlaceholder'),
    clearConvertFilter: resolve('clearConvertFilter'),
    noMatchingConverts: resolve('noMatchingConverts'),
    placeConvert: resolve('placeConvert'),
    addCombine: resolve('addCombine'),
    addSplit: resolve('addSplit'),
    operatorsTitle: resolve('operatorsTitle'),
    operatorsDescription: resolve('operatorsDescription'),
    addTransform: resolve('addTransform'),
    editItems: resolve('editItems'),
    removeBinding: resolve('removeBinding'),
    showMinimap: resolve('showMinimap'),
    hideMinimap: resolve('hideMinimap'),
    showHiddenFields: resolve('showHiddenFields'),
    hideHiddenFields: resolve('hideHiddenFields'),
    emptyDetailTitle: resolve('emptyDetailTitle'),
    emptyDetailDescription: resolve('emptyDetailDescription'),
    previewTitle: resolve('previewTitle'),
    previewLoading: resolve('previewLoading'),
    previewError: resolve('previewError'),
    previewDocumentResult: resolve('previewDocumentResult'),
    previewBindingResult: resolve('previewBindingResult'),
    previewStepIntermediateUnavailable: resolve('previewStepIntermediateUnavailable'),
    previewOperatorIntermediateUnavailable: resolve('previewOperatorIntermediateUnavailable'),
    previewDraftUnavailable: resolve('previewDraftUnavailable'),
    previewSelectionUnavailable: resolve('previewSelectionUnavailable'),
  };
}
