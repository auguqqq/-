
export enum ViewMode {
  Editor = 'editor',
  Statistics = 'statistics',
  Outline = 'outline',
  Inspiration = 'inspiration',
  Search = 'search',
  Bookshelf = 'bookshelf',
  History = 'history',
  Settings = 'settings',
  Ambience = 'ambience'
}

export interface AIConfig {
  provider: 'gemini' | 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  availableModels?: string[]; // Store fetched models list here
}

export interface CustomPrompts {
  critic?: string;
  partner?: string;
  polisher?: string;
}

export interface AppSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'cream' | 'white' | 'dark' | 'green' | 'system';
  previousTheme?: 'cream' | 'white' | 'green' | 'system'; // Store the last non-dark theme
  fontFamily: 'serif' | 'sans';
  autoSaveInterval: number; // seconds
  autoFormatOnSave: boolean;
  ai: AIConfig;
  isPro: boolean; // Membership status
  proTrialStartedAt?: number; // Timestamp for 15-min trial start
  customPrompts?: CustomPrompts; // User defined system prompts
}

export interface ChapterVersion {
  id: string;
  timestamp: number;
  content: string;
  title: string;
  wordCount: number;
}

export interface ProofreadItem {
    id: string;
    original: string;
    suggestion: string;
    reason: string;
    type: 'typo' | 'grammar' | 'punctuation';
}

export interface DeepCritiqueItem {
    id: string;
    quote: string;
    tag: string;
    advice: string;
    level: 'warning' | 'critical';
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  synopsis?: string; // 章节梗概/大纲
  lastModified: number;
  versions?: ChapterVersion[];
  proofreadData?: ProofreadItem[]; // Persisted proofreading results
  critiqueData?: DeepCritiqueItem[]; // Persisted deep critique results
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SearchState {
  query: string;
  responseText: string; // Changed from resultHTML to store raw markdown
  sources: any[];
  isSearching: boolean;
  timestamp: number;
}

export interface StyleProfile {
  ignoreWords: string[]; // Whitelist of words/phrases to ignore in proofreading
  ignoredCritiqueTags?: string[]; // Tags/types of critique to ignore
}

export interface Book {
  id: string;
  type: 'novel' | 'anthology'; // Novel (Long-form) vs Anthology (Short stories)
  subGenre?: string; // e.g. 'xuanhuan', 'romance', 'scifi', 'farming'
  title: string;
  coverColor: string;
  coverImage?: string; // Base64 or URL
  chapters: Chapter[];
  currentChapterId: string;
  isFinished?: boolean;
  createdAt: number;
  totalWritingTime?: number; 
  
  // New Persistence Fields
  aiChatLogs?: ChatMessage[]; // Max 80 items
  searchState?: SearchState; // Persist search result per book
  searchHistory?: string[]; // Store recent search queries
  bookSummary?: string; // 100-300 words summary
  styleProfile?: StyleProfile; // AI "Memory" for proofreading preferences
  
  // Persist Deep Analysis
  analysisReport?: {
    text: string; // Markdown content
    data?: any; // JSON data for charts
    timestamp: number;
  };
}

export interface WritingStats {
  dailyCount: number;
  weeklyCount: number[]; 
  speed: number; 
  startTime: number;
  writingHistory: Record<string, number>; 
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
  currentProgress: number; 
  lastTotalCount: number; 
  startTime?: number;
}
