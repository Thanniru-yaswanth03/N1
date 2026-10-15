export type ToolCategory = 'developer' | 'text' | 'calculator' | 'image';

export interface ToolDefinition {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: ToolCategory;
  tags: string[];
  badge?: 'Popular' | 'New' | 'Client-Side';
  icon: string; // SVG icon identifier or symbol
}

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}
