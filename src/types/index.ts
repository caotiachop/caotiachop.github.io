export interface User {
  username: string;
  grade: number;
  role: 'student' | 'teacher';
  apples: number;
  currentOutfit: string;
  purchasedOutfits: Record<string, boolean>;
  settings: { music: boolean; sound: boolean; musicVol: number; soundVol: number };
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

export interface MenuItemConfig {
  label?: string;
  sub?: string;
}

export interface AppData {
  users: Record<string, User>;
  scores: Record<string, Score>;
  knowledgeSets: Record<string, KnowledgeSet>;
  userProgress: Record<string, UserProgress>;
  menuConfig?: Record<string, MenuItemConfig>;
}

export type FoxEmotion = 'normal' | 'happy' | 'thinking' | 'angry' | 'sad';

export interface BattlePlayer {
  username: string;
  grade: number;
  score: number;
  answerThisQ: string | null;
  joinedAt: string;
  eliminated?: boolean;
}

export interface BattleQuestion {
  expression: string;
  answer: number;
}

export interface Battle {
  hostUid: string;
  status: 'waiting' | 'playing' | 'finished';
  questions: BattleQuestion[];
  timePerQuestion: number;
  currentQuestionIdx: number;
  questionStartedAt: string | null;
  players: Record<string, BattlePlayer>;
  createdAt: string;
}
