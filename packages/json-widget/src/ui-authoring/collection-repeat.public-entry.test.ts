import { expect, it } from 'vitest';

import { projectUiCollectionInstances } from './collection-repeat.js';
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
