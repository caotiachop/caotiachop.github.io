export interface User {
  pin: string;
  grade: number;
  role: 'student' | 'teacher';
  apples: number;
  currentOutfit: string;
  purchasedOutfits: Record<string, boolean>;
  settings: { music: boolean; sound: boolean };
  createdAt: string;
}

export interface Score {
  maxApples: number;
  speedGame: { maxLevel: number; bestTimeMs: number };
  fashionCompletedAt: string | null;
}

export interface Question {
  question: string;
  answers: Record<string, string>;
  correctKey: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface KnowledgeSet {
  grade: number;
  topic: string;
  createdBy: string;
  questions: Record<string, Question>;
}

export interface UserProgress {
  completedSetIds: Record<string, boolean>;
}

export interface AppData {
  users: Record<string, User>;
  scores: Record<string, Score>;
  knowledgeSets: Record<string, KnowledgeSet>;
  userProgress: Record<string, UserProgress>;
}

export type FoxEmotion = 'normal' | 'happy' | 'thinking' | 'angry' | 'sad';
