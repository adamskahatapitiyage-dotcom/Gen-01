import type { Chat } from '@google/genai';

export interface RuleInputs {
  category: string;
  attributeName: string;
  values: string;
}

export interface RefineRuleInputs {
  existingRule: string;
  feedback: string;
}

export interface CategoryInputs { // New interface
  categoryName: string;
  categoryDescription: string;
}

export type GenerationPayload = {
  type: 'text';
  inputs: RuleInputs;
} | {
  type: 'image';
  images: File[];
} | {
  type: 'text-and-image';
  inputs: RuleInputs;
  images: File[];
} | {
  type: 'refine';
  inputs: RefineRuleInputs;
} | {
  type: 'category'; // New payload type
  categoryInputs: CategoryInputs; // New interface for category-specific inputs
};

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface HistoryItem {
  id: string;
  inputs: RuleInputs;
  rule: string;
  compactRule?: string;
  // chatSession is no longer directly stored here as it's not serializable.
  // The relevant history for refinement is passed explicitly.
  // Keeping it as null for backwards compatibility with local storage.
  chatSession: Chat | null; 
  createdAt: string;
}

export interface TestResult {
  sample: string;
  result: 'pass' | 'fail';
  reason: string;
}

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}