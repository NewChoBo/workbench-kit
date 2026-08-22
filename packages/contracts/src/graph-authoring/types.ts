import type { UiPropertyDescriptor, UiValueSchema } from '../ui-authoring/types';

export interface NodeTypeRef {
  readonly id: string;
  readonly version: string;
}

export interface NodePortDescriptorBase {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

export type NodeInputPortDescriptor =
  | (NodePortDescriptorBase & {
      readonly value: UiValueSchema;
      readonly propertyId?: never;
      readonly required?: boolean;
    })
  | (NodePortDescriptorBase & {
      readonly propertyId: string;
      readonly value?: never;
      readonly required?: boolean;
    });

export interface NodeOutputPortDescriptor extends NodePortDescriptorBase {
  readonly value: UiValueSchema;
}

export interface NodeTypeDesignTimeMetadata {
  readonly label: string;
  readonly description?: string;
  readonly category?: string;
  readonly icon?: string;
  readonly tags?: readonly string[];
  readonly hiddenFromPalette?: boolean;
}

export interface NodeTypeDescriptor extends NodeTypeRef {
  readonly inputs: readonly NodeInputPortDescriptor[];
  readonly outputs: readonly NodeOutputPortDescriptor[];
  readonly properties?: readonly UiPropertyDescriptor[];
  readonly capabilities?: readonly string[];
  readonly designTime: NodeTypeDesignTimeMetadata;
}

export interface NodeTypeCatalogContribution {
  readonly contributorId: string;
  readonly nodeTypes: readonly NodeTypeDescriptor[];
}
