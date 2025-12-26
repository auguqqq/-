
export enum ViewMode {
  Editor = 'editor',
  Statistics = 'statistics',
  Outline = 'outline',
  Inspiration = 'inspiration',
  Search = 'search',
  Bookshelf = 'bookshelf',
  History = 'history',
  Settings = 'settings'
}

export interface AIConfig {
  provider: 'gemini' | 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AppSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'cream' | 'white' | 'dark' | 'green' | 'system';
  fontFamily: 'serif' | 'sans';
  autoSaveInterval: number; // seconds
  autoFormatOnSave: boolean;
  ai: AIConfig;
}

export interface ChapterVersion {
  id: string;
  timestamp: number;
  content: string;
  title: string;
  wordCount: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  synopsis?: string; // 章节梗概/大纲
  lastModified: number;
  versions?: ChapterVersion[];
}

export interface Book {
  id: string;
  title: string;
  coverColor: string;
  coverImage?: string; // Base64 or URL
  chapters: Chapter[];
  currentChapterId: string;
  isFinished?: boolean;
  createdAt: number;
  totalWritingTime?: number; // In minutes (simulated)
}

export interface WritingStats {
  dailyCount: number;
  weeklyCount: number[]; // Deprecated in favor of writingHistory for new implementation
  speed: number; // chars per minute
  startTime: number;
  writingHistory: Record<string, number>; // Date string (YYYY-MM-DD) -> count
}

export interface Inspiration {
  id: string;
  text: string;
  timestamp: number;
}

export interface BlackHouseConfig {
  active: boolean;
  type: 'word' | 'time';
  target: number;
  currentProgress: number; // 累计新增字数 (只加不减)
  lastTotalCount: number; // 上一次统计时的文档总字数
  startTime?: number;
}
