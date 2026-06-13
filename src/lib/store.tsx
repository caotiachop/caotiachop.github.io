import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, Score, UserProgress } from '../types';
import { api } from './api';
import { audio } from './audio';

interface AppContextType {
  currentUser: string | null;
  user: User | null;
  score: Score | null;
  userProgress: UserProgress | null;
  loading: boolean;
  checkUser: (name: string) => Promise<boolean>;
  loginUser: (name: string, pin: string) => Promise<'ok' | 'wrong_pin'>;
  registerUser: (name: string, pin: string, grade: number) => Promise<void>;
  logout: () => void;
  updateSettings: (s: Partial<User['settings']>) => Promise<void>;
  addApples: (amount: number) => Promise<void>;
  updateOutfit: (outfit: string) => Promise<void>;
  purchaseOutfit: (outfit: string, price: number) => Promise<boolean>;
  updateSpeedScore: (level: number, timeMs: number) => Promise<void>;
  completeKnowledgeSet: (setId: string, questionCount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem('currentUser')
  );
  const [user, setUser] = useState<User | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await api.getData();
      const u = data.users?.[currentUser] ?? null;
      setUser(u);
      setScore(data.scores?.[currentUser] ?? null);
      setUserProgress(data.userProgress?.[currentUser] ?? null);
      if (u) audio.applySettings(u.settings.music, u.settings.sound);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) refreshUser();
  }, [currentUser, refreshUser]);

  const checkUser = async (name: string): Promise<boolean> => {
    const data = await api.getData();
    return Boolean(data.users?.[name]);
  };

  const loginUser = async (name: string, pin: string): Promise<'ok' | 'wrong_pin'> => {
    const data = await api.getData();
    const u = data.users?.[name];
    if (!u || u.pin !== pin) return 'wrong_pin';
    localStorage.setItem('currentUser', name);
    setCurrentUser(name);
    setUser(u);
    setScore(data.scores?.[name] ?? null);
    setUserProgress(data.userProgress?.[name] ?? null);
    audio.applySettings(u.settings.music, u.settings.sound);
    return 'ok';
  };

  const registerUser = async (name: string, pin: string, grade: number): Promise<void> => {
    const now = new Date().toISOString();
    const newUser: User = {
      pin, grade, role: 'student', apples: 0,
      currentOutfit: 'default', purchasedOutfits: { default: true },
      settings: { music: true, sound: true }, createdAt: now,
    };
    const newScore: Score = {
      maxApples: 0,
      speedGame: { maxLevel: 0, bestTimeMs: 0 },
      fashionCompletedAt: null,
    };
    const newProgress: UserProgress = { completedSetIds: {} };
    await api.put({
      users: { [name]: newUser },
      scores: { [name]: newScore },
      userProgress: { [name]: newProgress },
    });
    localStorage.setItem('currentUser', name);
    setCurrentUser(name);
    setUser(newUser);
    setScore(newScore);
    setUserProgress(newProgress);
    audio.applySettings(true, true);
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setUser(null);
    setScore(null);
    setUserProgress(null);
    audio.pauseMusic();
  };

  const updateSettings = async (s: Partial<User['settings']>) => {
    if (!currentUser || !user) return;
    const next = { ...user.settings, ...s };
    setUser({ ...user, settings: next });
    audio.applySettings(next.music, next.sound);
    await api.put({ users: { [currentUser]: { settings: next } } });
  };

  const addApples = async (amount: number) => {
    if (!currentUser || !user || !score) return;
    const newApples = user.apples + amount;
    const newMax = Math.max(score.maxApples, newApples);
    setUser({ ...user, apples: newApples });
    setScore({ ...score, maxApples: newMax });
    await api.put({
      users: { [currentUser]: { apples: newApples } },
      scores: { [currentUser]: { maxApples: newMax } },
    });
  };

  const updateOutfit = async (outfit: string) => {
    if (!currentUser || !user) return;
    setUser({ ...user, currentOutfit: outfit });
    await api.put({ users: { [currentUser]: { currentOutfit: outfit } } });
  };

  const purchaseOutfit = async (outfit: string, price: number): Promise<boolean> => {
    if (!currentUser || !user) return false;
    if (user.apples < price) return false;
    const newApples = user.apples - price;
    const newOutfits = { ...user.purchasedOutfits, [outfit]: true };
    const allOwned = Object.keys(newOutfits).length >= 11;
    setUser({ ...user, apples: newApples, purchasedOutfits: newOutfits });
    const updates: Record<string, unknown> = {
      users: { [currentUser]: { apples: newApples, purchasedOutfits: newOutfits } },
    };
    if (allOwned && score) {
      const now = new Date().toISOString();
      setScore({ ...score, fashionCompletedAt: now });
      updates.scores = { [currentUser]: { fashionCompletedAt: now } };
    }
    await api.put(updates);
    return true;
  };

  const updateSpeedScore = async (level: number, timeMs: number) => {
    if (!currentUser || !score) return;
    const better = level > score.speedGame.maxLevel ||
      (level === score.speedGame.maxLevel && timeMs < score.speedGame.bestTimeMs);
    if (!better) return;
    const speedGame = { maxLevel: level, bestTimeMs: timeMs };
    setScore({ ...score, speedGame });
    await api.put({ scores: { [currentUser]: { speedGame } } });
  };

  const completeKnowledgeSet = async (setId: string, questionCount: number) => {
    if (!currentUser || !user || !userProgress) return;
    const already = userProgress.completedSetIds?.[setId];
    if (!already) {
      const earned = questionCount * 2;
      const newApples = user.apples + earned;
      const newMax = Math.max(score?.maxApples ?? 0, newApples);
      setUser({ ...user, apples: newApples });
      setScore(prev => prev ? { ...prev, maxApples: newMax } : prev);
      await api.put({
        users: { [currentUser]: { apples: newApples } },
        scores: { [currentUser]: { maxApples: newMax } },
      });
    }
    const completedSetIds = { ...userProgress.completedSetIds, [setId]: true };
    setUserProgress({ ...userProgress, completedSetIds });
    await api.put({ userProgress: { [currentUser]: { completedSetIds } } });
  };

  return (
    <AppContext.Provider value={{
      currentUser, user, score, userProgress, loading,
      checkUser, loginUser, registerUser, logout,
      updateSettings, addApples, updateOutfit, purchaseOutfit,
      updateSpeedScore, completeKnowledgeSet, refreshUser,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
