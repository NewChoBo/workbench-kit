import { expect, it } from 'vitest';

import { projectUiCollectionInstances } from './collection-repeat.js';
import {
  admitUiCollectionRegionFilter,
  filterUiCollectionRegionRecords,
  parseUiCollectionRegionFilterConfig,
  reconcileUiCollectionRegionSelection,
} from './collection-region-filter.js';
import * as authoring from './v3.js';
import type {
  UiCollectionRepeatDiagnostic,
  UiCollectionRepeatIdentity,
  UiCollectionRepeatInput,
  UiCollectionRepeatMapping,
  UiCollectionRepeatOverride,
  UiCollectionRepeatRecord,
  UiCollectionRepeatResource,
  UiCollectionRepeatResourceTarget,
  UiCollectionRepeatResult,
  UiCollectionRepeatSourceNamespace,
  UiCollectionRepeatSourceSchema,
  UiCollectionRepeatTarget,
  UiCollectionResourceTargetPolicyInput,
  UiCollectionRegionScalar,
  UiCollectionRegionChoice,
  UiCollectionRegionFilterConfig,
  UiCollectionRegionFilterField,
  UiCollectionRegionValueProvider,
  UiCollectionRegionOption,
  UiCollectionRegionFilterBinding,
  UiCollectionRegionFilterScope,
  UiCollectionRegionFilterDiagnostic,
  UiCollectionRegionFilterParseResult,
  UiCollectionRegionFilterAdmissionInput,
  UiCollectionRegionFilterAdmission,
  UiCollectionRegionFilterAdmissionResult,
  UiCollectionRegionOptionsSnapshot,
  UiCollectionRegionSelectionEvent,
  UiCollectionRegionSelection,
  UiCollectionRegionReconcileInput,
  UiCollectionRegionSelectionResult,
  UiCollectionRegionFilterRow,
  UiCollectionRegionFilterCapture,
  UiCollectionRegionFilterInput,
  UiCollectionRegionFilterResult,
} from './v3.js';

type PublicContract = [
  UiCollectionRepeatDiagnostic,
  UiCollectionRepeatIdentity,
  UiCollectionRepeatInput,
  UiCollectionRepeatMapping,
  UiCollectionRepeatOverride,
  UiCollectionRepeatRecord,
  UiCollectionRepeatResource,
  UiCollectionRepeatResourceTarget,
  UiCollectionRepeatResult,
  UiCollectionRepeatSourceNamespace,
  UiCollectionRepeatSourceSchema,
  UiCollectionRepeatTarget,
  UiCollectionResourceTargetPolicyInput,
];

type RegionPublicContract = [
  UiCollectionRegionScalar,
  UiCollectionRegionChoice,
  UiCollectionRegionFilterConfig,
  UiCollectionRegionFilterField,
  UiCollectionRegionValueProvider,
  UiCollectionRegionOption,
  UiCollectionRegionFilterBinding,
  UiCollectionRegionFilterScope,
  UiCollectionRegionFilterDiagnostic,
  UiCollectionRegionFilterParseResult,
  UiCollectionRegionFilterAdmissionInput,
  UiCollectionRegionFilterAdmission,
  UiCollectionRegionFilterAdmissionResult,
  UiCollectionRegionOptionsSnapshot,
  UiCollectionRegionSelectionEvent,
  UiCollectionRegionSelection,
  UiCollectionRegionReconcileInput,
  UiCollectionRegionSelectionResult,
  UiCollectionRegionFilterRow,
  UiCollectionRegionFilterCapture,
  UiCollectionRegionFilterInput,
  UiCollectionRegionFilterResult,
];

it('exports the one canonical batch projector and its complete type contract', () => {
  const assertContract = (value: PublicContract | null) => value;
  expect(assertContract(null)).toBeNull();
  const emptyBaseline: UiCollectionRepeatResult['baseParameterValues'] = {};
  expect(emptyBaseline).toEqual({});
  expect(authoring.projectUiCollectionInstances).toBe(projectUiCollectionInstances);
  expect(typeof authoring.projectUiCollectionInstances).toBe('function');
  expect('instanceId' in authoring).toBe(false);
  expect('capture' in authoring).toBe(false);
});

it('exports the complete pure region-filter contract through the v3 public entry', () => {
  const assertContract = (value: RegionPublicContract | null) => value;
  expect(assertContract(null)).toBeNull();
  expect(authoring.parseUiCollectionRegionFilterConfig).toBe(parseUiCollectionRegionFilterConfig);
  expect(authoring.admitUiCollectionRegionFilter).toBe(admitUiCollectionRegionFilter);
  expect(authoring.reconcileUiCollectionRegionSelection).toBe(reconcileUiCollectionRegionSelection);
  expect(authoring.filterUiCollectionRegionRecords).toBe(filterUiCollectionRegionRecords);
});
