
export enum MemoryType {
  NOTE = 'NOTE',
  SCREENSHOT = 'SCREENSHOT',
  LINK = 'LINK',
  IMAGE = 'IMAGE',
  CLIPBOARD = 'CLIPBOARD'
}

export interface MemoryMetadata {
  extractedText?: string;
  dates?: string[];
  locations?: string[];
  tasks?: string[];
  summary?: string;
  tags?: string[];
  keyPeople?: string[];
  tone?: string;
  suggestedCalendarEvents?: Array<{
    title: string;
    date: string;
    description?: string;
  }>;
}

export interface Memory {
  id: string;
  type: MemoryType;
  content: string; // Text content or Base64 image
  title?: string;
  timestamp: number;
  metadata: MemoryMetadata;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export type CategoryFilter = 'All' | 'Screenshots' | 'Notes' | 'Links' | 'Tasks';
