export {
  DesignSystemPackRegistry,
  type DesignSystemPackLookupResult,
  type DesignSystemPackRegistrySnapshot,
} from './registry.js';
export {
  DesignSystemResolver,
  type DesignSystemResolutionRequest,
  type DesignSystemResolutionResult,
  type ResolvedDesignSystemScope,
  type ResolvedDesignSystemSelection,
} from './resolver.js';
export {
  DesignTokenResolver,
  type DesignComponentPropertyResolutionRequest,
  type DesignTokenResolutionRequest,
  type DesignValueProvenanceEntry,
  type DesignValueProvenanceKind,
  type DesignValueResolutionResult,
  type ResolvedDesignResource,
  type ResolvedDesignValue,
  type ResolvedDesignValueSource,
} from './token-resolver.js';
export {
  ComponentResolver,
  type ComponentCompatibility,
  type ComponentCompatibilityRequest,
  type ComponentCompatibilityResolution,
  type ExplicitComponentReplacement,
} from './component-resolver.js';
export {
  projectUiAuthoringResolution,
  type UiAuthoringResolutionNodeProjection,
  type UiAuthoringResolutionProjection,
} from './authoring-projection.js';
export {
  DesignSystemPackChangePlanner,
  type DesignSystemComponentChoice,
  type DesignSystemDependencyChoice,
  type DesignSystemDependencyCompatibility,
  type DesignSystemDependencyOccurrence,
  type DesignSystemDependencyReplacement,
  type DesignSystemNodeCompatibility,
  type DesignSystemPackChangeChoices,
  type DesignSystemPackChangeFinalizeResult,
  type DesignSystemPackChangePlan,
  type DesignSystemPackChangePlanResult,
  type DesignSystemPackChangeRequest,
  type DesignSystemThemeChoice,
  type DesignSystemThemeChoiceRequirement,
} from './pack-change-planner.js';
