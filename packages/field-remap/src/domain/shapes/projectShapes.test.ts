import { describe, expect, it } from 'vitest';
import type { MappingEdge, SourceField, TargetSlot } from '../types.js';
import { projectShapes, projectSourceFields, projectTargetSlots } from './projectShapes.js';

describe('projectShapes', () => {
  const sources: SourceField[] = [
    {
      id: 'a.user',
      label: 'user',
      dataType: 'object',
      classRef: { id: 'User', version: 1 },
      children: [
        { id: 'a.user.name', label: 'name', path: 'user.name', dataType: 'string' },
        {
          id: 'a.user.secret',
          label: 'secret',
          path: 'user.secret',
          dataType: 'string',
          hidden: true,
        },
      ],
    },
    { id: 'a.internal', label: 'internal', path: 'internal', dataType: 'string', hidden: true },
  ];

  const targets: TargetSlot[] = [
    {
      id: 'b.profile',
      label: 'profile',
      path: 'profile',
      dataType: 'object',
      classRef: { id: 'Profile', version: 2 },
      children: [
        { id: 'b.profile.name', label: 'name', path: 'profile.name', dataType: 'string' },
        {
          id: 'b.profile.hiddenNote',
          label: 'hiddenNote',
          path: 'profile.hiddenNote',
          dataType: 'string',
          hidden: true,
        },
      ],
    },
  ];

  it('omits hidden fields by default and preserves classRef', () => {
    const next = projectSourceFields(sources);
    expect(next).toEqual([
      {
        id: 'a.user',
        label: 'user',
        dataType: 'object',
        classRef: { id: 'User', version: 1 },
        children: [{ id: 'a.user.name', label: 'name', path: 'user.name', dataType: 'string' }],
      },
    ]);
    expect(projectTargetSlots(targets)[0]?.classRef).toEqual({ id: 'Profile', version: 2 });
    expect(projectTargetSlots(targets)[0]?.children).toEqual([
      { id: 'b.profile.name', label: 'name', path: 'profile.name', dataType: 'string' },
    ]);
  });

  it('keeps hidden nodes when includeHidden is true', () => {
    expect(projectSourceFields(sources, { includeHidden: true })).toBe(sources);
    expect(projectTargetSlots(targets, { includeHidden: true })).toBe(targets);
  });

  it('prunes edges whose endpoints disappear after hidden projection', () => {
    const edges: MappingEdge[] = [
      { id: 'e1', sourceFieldId: 'a.user.name', targetSlotId: 'b.profile.name' },
      { id: 'e2', sourceFieldId: 'a.user.secret', targetSlotId: 'b.profile.name' },
      { id: 'e3', sourceFieldId: 'a.user.name', targetSlotId: 'b.profile.hiddenNote' },
      { id: 'e4', sourceFieldId: 'a.internal', targetSlotId: 'b.profile.name' },
    ];

    expect(projectShapes({ sources, targets, edges })).toEqual({
      sources: projectSourceFields(sources),
      targets: projectTargetSlots(targets),
      edges: [{ id: 'e1', sourceFieldId: 'a.user.name', targetSlotId: 'b.profile.name' }],
    });
  });
});
