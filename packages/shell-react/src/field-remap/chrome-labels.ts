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
}

export const defaultFieldRemapChromeLabels: FieldRemapChromeLabels = {
  bindingsTitle: 'Bindings',
  convertPaletteTitle: 'Convert palette',
  convertPaletteDescription:
    'Place a convert first, then wire source → draft → target. Drafts stay off the document until both ports bind.',
  convertPaletteAriaLabel: 'Convert palette',
  convertsListAriaLabel: 'Converts',
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
};

/** Stable capability ids for optional `t()` injection (not free prose). */
export const fieldRemapChromeLabelKeys = {
  bindingsTitle: 'fieldRemap.bindingsTitle',
  convertPaletteTitle: 'fieldRemap.convertPaletteTitle',
  convertPaletteDescription: 'fieldRemap.convertPaletteDescription',
  convertPaletteAriaLabel: 'fieldRemap.convertPaletteAriaLabel',
  convertsListAriaLabel: 'fieldRemap.convertsListAriaLabel',
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
  };
}
