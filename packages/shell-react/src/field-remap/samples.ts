import type {
  MappingEdge,
  MappingOperator,
  SourceField,
  TargetSlot,
} from '@workbench-kit/field-remap';

/**
 * Field-remap demo scenarios (table / JSON shaped).
 * Runtime stays MappingEdge + convertToShape; UI binds via FieldRemapPanel.
 */
export type FieldRemapSampleId =
  | 'nested-ab'
  | 't-user-contact'
  | 't-event-time'
  | 't-emp-dept'
  | 't-product-catalog'
  | 'nm-combine-split';

export interface FieldRemapSampleDefinition {
  readonly id: FieldRemapSampleId;
  readonly title: string;
  readonly description: string;
  readonly sourceLabel: string;
  readonly targetLabel: string;
  readonly source: Record<string, unknown>;
  readonly targetShape: Record<string, unknown>;
  readonly sourceIdPrefix: string;
  readonly targetIdPrefix: string;
  readonly edges: readonly MappingEdge[];
  readonly operators?: readonly MappingOperator[];
}

/** Alias kept so older URIs still open a known sample. */
export const FIELD_REMAP_LEGACY_SAMPLE_ALIASES: Readonly<Record<string, FieldRemapSampleId>> = {
  'interactive-bindings': 'nested-ab',
  't-order-invoice': 't-event-time',
};

export const FIELD_REMAP_SAMPLES: readonly FieldRemapSampleDefinition[] = [
  {
    id: 'nested-ab',
    title: 'A → B',
    description:
      'Schema columns A/B with port wires: trim/upper convert chain, leaf location map, array reduce, and itemEdges',
    sourceLabel: 'A',
    targetLabel: 'B',
    sourceIdPrefix: 'a',
    targetIdPrefix: 'b',
    source: {
      user_name: '  Ada Lovelace  ',
      profile: {
        city: '  London  ',
        country: 'UK',
      },
      tags: [
        { name: 'math', rank: 1 },
        { name: 'computing', rank: 2 },
      ],
    },
    targetShape: {
      name: '',
      title: '',
      location: {
        city: '',
        country: '',
      },
      labels: [{ title: '', order: 0 }],
      firstTag: '',
      tagLine: '',
    },
    edges: [
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['string:trim'],
      },
      {
        id: 'e-title',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.title',
        transformIds: ['string:trim', 'string:upper'],
      },
      {
        // Leaf convert chain (source → trim → upper → target), as in the BINDINGS topology.
        id: 'e-city',
        sourceFieldId: 'a.profile.city',
        targetSlotId: 'b.location.city',
        transformIds: ['string:trim', 'string:upper'],
      },
      {
        id: 'e-country',
        sourceFieldId: 'a.profile.country',
        targetSlotId: 'b.location.country',
      },
      {
        id: 'e-tags',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.labels',
        itemEdges: [
          {
            id: 'e-tag-title',
            sourceFieldId: 'a.tags.item.name',
            targetSlotId: 'b.labels.item.title',
          },
          {
            id: 'e-tag-order',
            sourceFieldId: 'a.tags.item.rank',
            targetSlotId: 'b.labels.item.order',
          },
        ],
      },
      {
        id: 'e-first-tag',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.firstTag',
        itemSourcePath: 'name',
        transformIds: ['array:first'],
      },
      {
        id: 'e-tag-line',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.tagLine',
        itemSourcePath: 'name',
        transformIds: ['array:join'],
        transformOptionSteps: [{ separator: ' · ' }],
      },
    ],
  },
  {
    id: 't-user-contact',
    title: 'T_USER → T_CONTACT',
    description: 'Column map plus NAME object → fullName via string:template',
    sourceLabel: 'T_USER',
    targetLabel: 'T_CONTACT',
    sourceIdPrefix: 't_user',
    targetIdPrefix: 't_contact',
    source: {
      USER_ID: 1001,
      NAME: {
        FIRST_NM: 'Ada',
        LAST_NM: 'Lovelace',
      },
      EMAIL_ADDR: 'ada@example.com',
      PHONE_NO: '555-0100',
    },
    targetShape: {
      id: 0,
      fullName: '',
      email: '',
      phone: '',
    },
    edges: [
      {
        id: 'map-id',
        sourceFieldId: 't_user.USER_ID',
        targetSlotId: 't_contact.id',
      },
      {
        id: 'map-full-name',
        sourceFieldId: 't_user.NAME',
        targetSlotId: 't_contact.fullName',
        transformIds: ['string:template'],
        transformOptionSteps: [{ template: '{FIRST_NM} {LAST_NM}' }],
      },
      {
        id: 'map-email',
        sourceFieldId: 't_user.EMAIL_ADDR',
        targetSlotId: 't_contact.email',
        transformIds: ['string:lower'],
      },
      {
        id: 'map-phone',
        sourceFieldId: 't_user.PHONE_NO',
        targetSlotId: 't_contact.phone',
      },
    ],
  },
  {
    id: 't-event-time',
    title: 'T_EVENT → T_SLOT',
    description: 'Date reformat, date+time combine, and datetime split (fan-out)',
    sourceLabel: 'T_EVENT',
    targetLabel: 'T_SLOT',
    sourceIdPrefix: 't_event',
    targetIdPrefix: 't_slot',
    source: {
      EVENT_ID: 'EV-7',
      YMD_RAW: '20260720',
      WHEN: {
        date: '2026-07-20',
        time: '14:30:00',
      },
      OCCURS_AT: '2026-07-21T09:15:00',
    },
    targetShape: {
      eventId: '',
      displayDate: '',
      startsAt: '',
      occurDate: '',
      occurTime: '',
    },
    edges: [
      {
        id: 'ev-id',
        sourceFieldId: 't_event.EVENT_ID',
        targetSlotId: 't_slot.eventId',
      },
      {
        id: 'ev-display-date',
        sourceFieldId: 't_event.YMD_RAW',
        targetSlotId: 't_slot.displayDate',
        transformIds: ['date:reformat'],
        transformOptionSteps: [{ inputFormat: 'YYYYMMDD', outputFormat: 'YYYY.MM.DD' }],
      },
      {
        id: 'ev-starts',
        sourceFieldId: 't_event.WHEN',
        targetSlotId: 't_slot.startsAt',
        transformIds: ['datetime:combine'],
      },
      {
        id: 'ev-occur-date',
        sourceFieldId: 't_event.OCCURS_AT',
        targetSlotId: 't_slot.occurDate',
        transformIds: ['datetime:date'],
      },
      {
        id: 'ev-occur-time',
        sourceFieldId: 't_event.OCCURS_AT',
        targetSlotId: 't_slot.occurTime',
        transformIds: ['datetime:time'],
      },
    ],
  },
  {
    id: 't-emp-dept',
    title: 'T_EMP → T_EMP_ROW',
    description: 'Join-style flatten: nested DEPT object into flat row columns',
    sourceLabel: 'T_EMP',
    targetLabel: 'T_EMP_ROW',
    sourceIdPrefix: 't_emp',
    targetIdPrefix: 't_emp_row',
    source: {
      EMP_NO: 'E-42',
      EMP_NM: 'Grace Hopper',
      DEPT: {
        DEPT_CD: 'RND',
        DEPT_NM: 'Research',
      },
    },
    targetShape: {
      empNo: '',
      empName: '',
      deptCode: '',
      deptName: '',
    },
    edges: [
      {
        id: 'emp-no',
        sourceFieldId: 't_emp.EMP_NO',
        targetSlotId: 't_emp_row.empNo',
      },
      {
        id: 'emp-nm',
        sourceFieldId: 't_emp.EMP_NM',
        targetSlotId: 't_emp_row.empName',
      },
      {
        id: 'emp-dept-cd',
        sourceFieldId: 't_emp.DEPT.DEPT_CD',
        targetSlotId: 't_emp_row.deptCode',
      },
      {
        id: 'emp-dept-nm',
        sourceFieldId: 't_emp.DEPT.DEPT_NM',
        targetSlotId: 't_emp_row.deptName',
        transformIds: ['string:upper'],
      },
    ],
  },
  {
    id: 't-product-catalog',
    title: 'T_PRODUCT → T_CATALOG_ITEM',
    description: 'Parent row plus TAGS[] itemEdges into catalog labels',
    sourceLabel: 'T_PRODUCT',
    targetLabel: 'T_CATALOG_ITEM',
    sourceIdPrefix: 't_product',
    targetIdPrefix: 't_catalog',
    source: {
      PROD_ID: 'P-9',
      PROD_NM: '  Analytical Engine  ',
      TAGS: [
        { TAG_CD: 'hist', TAG_NM: 'history' },
        { TAG_CD: 'comp', TAG_NM: 'computing' },
      ],
    },
    targetShape: {
      productId: '',
      name: '',
      labels: [{ code: '', title: '' }],
      tagLine: '',
    },
    edges: [
      {
        id: 'prod-id',
        sourceFieldId: 't_product.PROD_ID',
        targetSlotId: 't_catalog.productId',
      },
      {
        id: 'prod-nm',
        sourceFieldId: 't_product.PROD_NM',
        targetSlotId: 't_catalog.name',
        transformIds: ['string:trim'],
      },
      {
        id: 'prod-tags',
        sourceFieldId: 't_product.TAGS',
        targetSlotId: 't_catalog.labels',
        itemEdges: [
          {
            id: 'tag-code',
            sourceFieldId: 't_product.TAGS.item.TAG_CD',
            targetSlotId: 't_catalog.labels.item.code',
            transformIds: ['string:upper'],
          },
          {
            id: 'tag-title',
            sourceFieldId: 't_product.TAGS.item.TAG_NM',
            targetSlotId: 't_catalog.labels.item.title',
          },
        ],
      },
      {
        id: 'prod-tag-line',
        sourceFieldId: 't_product.TAGS',
        targetSlotId: 't_catalog.tagLine',
        itemSourcePath: 'TAG_NM',
        transformIds: ['array:join'],
        transformOptionSteps: [{ separator: ' / ' }],
      },
    ],
  },
  {
    id: 'nm-combine-split',
    title: 'n→m combine / split',
    description:
      'Document v2 operators: fan-in combine (first+last → nameBag) and fan-out split (address → city/zip)',
    sourceLabel: 'A',
    targetLabel: 'B',
    sourceIdPrefix: 'a',
    targetIdPrefix: 'b',
    source: {
      first: 'Ada',
      last: 'Lovelace',
      address: { city: 'London', zip: 'E1' },
    },
    targetShape: {
      nameBag: { first: '', last: '' },
      city: '',
      zip: '',
    },
    edges: [],
    operators: [
      {
        kind: 'combine',
        id: 'op-name',
        inputFieldIds: ['a.first', 'a.last'],
        outputSlotId: 'b.nameBag',
      },
      {
        kind: 'split',
        id: 'op-address',
        inputFieldId: 'a.address',
        outputSlotIds: ['b.city', 'b.zip'],
      },
    ],
  },
];

const SAMPLE_BY_ID = new Map(FIELD_REMAP_SAMPLES.map((sample) => [sample.id, sample]));

export function isFieldRemapSampleId(value: string): value is FieldRemapSampleId {
  return SAMPLE_BY_ID.has(value as FieldRemapSampleId);
}

export function resolveFieldRemapSampleId(value: string | undefined): FieldRemapSampleId {
  if (!value) {
    return 'nested-ab';
  }
  const aliased = FIELD_REMAP_LEGACY_SAMPLE_ALIASES[value];
  if (aliased) {
    return aliased;
  }
  if (isFieldRemapSampleId(value)) {
    return value;
  }
  return 'nested-ab';
}

export function getFieldRemapSample(sampleId: string | undefined): FieldRemapSampleDefinition {
  const id = resolveFieldRemapSampleId(sampleId);
  return SAMPLE_BY_ID.get(id) ?? FIELD_REMAP_SAMPLES[0]!;
}

/**
 * Controlled shapes for browse-chrome demos: nested `classRef` + one `hidden` leaf.
 * Pair with {@link getFieldRemapSample}(`nested-ab`) edges / sample JSON.
 */
export function getFieldRemapBrowseDemoShapes(): {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
} {
  return {
    sources: [
      {
        id: 'a',
        label: 'A',
        path: '',
        dataType: 'object',
        children: [
          {
            id: 'a.user_name',
            label: 'user_name',
            path: 'user_name',
            dataType: 'string',
            sampleValue: '  Ada Lovelace  ',
          },
          {
            id: 'a.profile',
            label: 'profile',
            path: 'profile',
            dataType: 'object',
            classRef: { id: 'PersonProfile', version: 1 },
            children: [
              {
                id: 'a.profile.city',
                label: 'city',
                path: 'profile.city',
                dataType: 'string',
                sampleValue: '  London  ',
              },
              {
                id: 'a.profile.country',
                label: 'country',
                path: 'profile.country',
                dataType: 'string',
                sampleValue: 'UK',
              },
              {
                id: 'a.profile.internal_id',
                label: 'internal_id',
                path: 'profile.internal_id',
                dataType: 'string',
                hidden: true,
                sampleValue: 'secret-row',
              },
            ],
          },
          {
            id: 'a.tags',
            label: 'tags',
            path: 'tags',
            dataType: 'array',
          },
        ],
      },
    ],
    targets: [
      {
        id: 'b',
        label: 'B',
        path: '',
        dataType: 'object',
        children: [
          { id: 'b.name', label: 'name', path: 'name', dataType: 'string' },
          { id: 'b.title', label: 'title', path: 'title', dataType: 'string' },
          {
            id: 'b.location',
            label: 'location',
            path: 'location',
            dataType: 'object',
            classRef: { id: 'GeoLocation', version: 2 },
            children: [
              { id: 'b.location.city', label: 'city', path: 'location.city', dataType: 'string' },
              {
                id: 'b.location.country',
                label: 'country',
                path: 'location.country',
                dataType: 'string',
              },
            ],
          },
          {
            id: 'b.labels',
            label: 'labels',
            path: 'labels',
            dataType: 'array',
          },
          { id: 'b.firstTag', label: 'firstTag', path: 'firstTag', dataType: 'string' },
          { id: 'b.tagLine', label: 'tagLine', path: 'tagLine', dataType: 'string' },
        ],
      },
    ],
  };
}
