import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User, Score, UserProgress } from '../types';
import { auth } from './firebase';
import { api } from './api';
import { audio } from './audio';

// PIN là 4 số, Firebase Auth yêu cầu tối thiểu 6 ký tự
const padPin = (pin: string) => pin.padEnd(6, '0');
const slugUsername = (name: string) => name.toLowerCase().replace(/\s+/g, '_');
// Legacy: tài khoản cũ dùng email deterministic theo username
const legacyEmail = (name: string) => `${slugUsername(name)}@caotiachop.local`;
// Tài khoản mới dùng email kèm random suffix để re-register sau xoá vẫn được
const newAuthEmail = (name: string) => {
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return `${slugUsername(name)}_${rand}@caotiachop.local`;
};
// Resolve auth email: nếu /usernames có authEmail thì dùng, không thì fallback legacy
async function resolveAuthEmail(name: string): Promise<string> {
  const mapping = await api.findUsernameMapping(name);
  return mapping?.authEmail ?? legacyEmail(name);
}

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
  updatePin: (currentPin: string, newPin: string) => Promise<'ok' | 'wrong_pin'>;
  addApples: (amount: number) => Promise<void>;
  updateOutfit: (outfit: string) => Promise<void>;
  purchaseOutfit: (outfit: string, price: number) => Promise<boolean>;
  updateSpeedScore: (level: number, timeMs: number) => Promise<void>;
  completeKnowledgeSet: (setId: string, questionCount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    setLoading(true);
    try {
      const [u, s, p] = await Promise.all([
        api.getUser(fbUser.uid),
        api.getScore(fbUser.uid),
        api.getUserProgress(fbUser.uid),
      ]);
      setUser(u);
      setScore(s);
      setUserProgress(p);
      if (u) {
        setCurrentUser(u.username);
        audio.applyVolumes(u.settings.musicVol ?? 0.4, u.settings.soundVol ?? 0.7);
        audio.applySettings(u.settings.music, u.settings.sound);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Firebase tự persist session — lắng nghe auth state thay vì dùng localStorage
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUid(fbUser.uid);
        await refreshUser();
      } else {
        setUid(null);
        setCurrentUser(null);
        setUser(null);
        setScore(null);
        setUserProgress(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [refreshUser]);

  const checkUser = async (name: string): Promise<boolean> => {
    const foundUid = await api.findUidByUsername(name);
    return foundUid !== null;
  };

  const loginUser = async (name: string, pin: string): Promise<'ok' | 'wrong_pin'> => {
    try {
      const email = await resolveAuthEmail(name);
      const cred = await signInWithEmailAndPassword(auth, email, padPin(pin));
      const [u, s, p] = await Promise.all([
        api.getUser(cred.user.uid),
        api.getScore(cred.user.uid),
        api.getUserProgress(cred.user.uid),
      ]);
      if (!u) return 'wrong_pin';
      setUid(cred.user.uid);
      setCurrentUser(u.username);
      setUser(u);
      setScore(s);
      setUserProgress(p);
      audio.applyVolumes(u.settings.musicVol ?? 0.4, u.settings.soundVol ?? 0.7);
      audio.applySettings(u.settings.music, u.settings.sound);
      return 'ok';
    } catch {
      return 'wrong_pin';
    }
  };

  const registerUser = async (name: string, pin: string, grade: number): Promise<void> => {
    const authEmail = newAuthEmail(name);
    const cred = await createUserWithEmailAndPassword(auth, authEmail, padPin(pin));
    const now = new Date().toISOString();
    const newUser: User = {
      username: name,
      grade, role: 'student', apples: 0,
      currentOutfit: 'default', purchasedOutfits: { default: true },
      settings: { music: true, sound: true, musicVol: 0.4, soundVol: 0.7 }, createdAt: now,
    };
    const newScore: Score = {
      maxApples: 0,
      speedGame: { maxLevel: 0, bestTimeMs: 0 },
      fashionCompletedAt: null,
    };
    const newProgress: UserProgress = { completedSetIds: {} };
    await api.createUserDocs(cred.user.uid, newUser, newScore, newProgress);
    await api.registerUsername(name, cred.user.uid, authEmail);
    setUid(cred.user.uid);
    setCurrentUser(name);
    setUser(newUser);
    setScore(newScore);
    setUserProgress(newProgress);
    audio.applySettings(true, true);
  };

  const logout = () => {
    void signOut(auth);
    setUid(null);
    setCurrentUser(null);
    setUser(null);
    setScore(null);
    setUserProgress(null);
    audio.pauseMusic();
  };

  const updatePin = async (currentPin: string, newPin: string): Promise<'ok' | 'wrong_pin'> => {
    const fbUser = auth.currentUser;
    if (!fbUser || !currentUser) return 'wrong_pin';
    try {
      const email = await resolveAuthEmail(currentUser);
      const credential = EmailAuthProvider.credential(email, padPin(currentPin));
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, padPin(newPin));
      return 'ok';
    } catch {
      return 'wrong_pin';
    }
  };

  const updateSettings = async (s: Partial<User['settings']>) => {
    if (!uid || !user) return;
    const next = { ...user.settings, ...s };
    setUser({ ...user, settings: next });
    audio.applySettings(next.music, next.sound);
    await api.updateUser(uid, { settings: next });
  };

  const addApples = async (amount: number) => {
    if (!uid || !user || !score) return;
    const newApples = user.apples + amount;
    const newMax = Math.max(score.maxApples, newApples);
    setUser({ ...user, apples: newApples });
    setScore({ ...score, maxApples: newMax });
    await Promise.all([
      api.updateUser(uid, { apples: newApples }),
      api.updateScore(uid, { maxApples: newMax }),
    ]);
  };

  const updateOutfit = async (outfit: string) => {
    if (!uid || !user) return;
    setUser({ ...user, currentOutfit: outfit });
    await api.updateUser(uid, { currentOutfit: outfit });
  };

  const purchaseOutfit = async (outfit: string, price: number): Promise<boolean> => {
    if (!uid || !user) return false;
    if (user.apples < price) return false;
    const newApples = user.apples - price;
    const newOutfits = { ...user.purchasedOutfits, [outfit]: true };
    const allOwned = Object.keys(newOutfits).length >= 11;
    setUser({ ...user, apples: newApples, purchasedOutfits: newOutfits });
    await api.updateUser(uid, { apples: newApples, purchasedOutfits: newOutfits });
    if (allOwned && score) {
      const now = new Date().toISOString();
      setScore({ ...score, fashionCompletedAt: now });
      await api.updateScore(uid, { fashionCompletedAt: now });
    }
    return true;
  };

  const updateSpeedScore = async (level: number, timeMs: number) => {
    if (!uid || !score) return;
    const better = level > score.speedGame.maxLevel ||
      (level === score.speedGame.maxLevel && timeMs < score.speedGame.bestTimeMs);
    if (!better) return;
    const speedGame = { maxLevel: level, bestTimeMs: timeMs };
    setScore({ ...score, speedGame });
    await api.updateScore(uid, { speedGame });
  };

  const completeKnowledgeSet = async (setId: string, questionCount: number) => {
    if (!uid || !user || !userProgress) return;
    const already = userProgress.completedSetIds?.[setId];
    if (!already) {
      const earned = questionCount * 2;
      const newApples = user.apples + earned;
      const newMax = Math.max(score?.maxApples ?? 0, newApples);
      setUser({ ...user, apples: newApples });
      setScore(prev => prev ? { ...prev, maxApples: newMax } : prev);
      await Promise.all([
        api.updateUser(uid, { apples: newApples }),
        api.updateScore(uid, { maxApples: newMax }),
      ]);
    }
    const completedSetIds = { ...userProgress.completedSetIds, [setId]: true };
    setUserProgress({ ...userProgress, completedSetIds });
    await api.updateUserProgress(uid, { completedSetIds });
  };

  return (
    <AppContext.Provider value={{
      currentUser, user, score, userProgress, loading,
      checkUser, loginUser, registerUser, logout,
      updateSettings, updatePin, addApples, updateOutfit, purchaseOutfit,
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
