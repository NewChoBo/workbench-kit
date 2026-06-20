import type { ManagementCardIconTone } from './ManagementCard.js';

export function formatExtensionCategoryLabel(category: string) {
  switch (category) {
    case 'feature':
      return 'Features';
    case 'editor':
      return 'Editors';
    case 'theme':
      return 'Themes';
    case 'language':
      return 'Languages';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

export function extensionCategoryIcon(category: string) {
  switch (category) {
    case 'theme':
      return 'symbol-color';
    case 'language':
      return 'globe';
    case 'editor':
      return 'file-code';
    default:
      return 'extensions';
  }
}

export function extensionCategoryIconTone(category: string): ManagementCardIconTone {
  switch (category) {
    case 'editor':
      return 'editor';
    case 'theme':
      return 'theme';
    case 'language':
      return 'language';
    default:
      return 'feature';
  }
}
