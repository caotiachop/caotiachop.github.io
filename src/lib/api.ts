import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, Score, UserProgress, KnowledgeSet, Question, MenuItemConfig } from '../types';

// --- Users ---

export const api = {
  async getUser(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  async getAllUsers(): Promise<Record<string, User>> {
    const snap = await getDocs(collection(db, 'users'));
    const result: Record<string, User> = {};
    snap.forEach(d => { result[d.id] = d.data() as User; });
    return result;
  },

  // /usernames/{username} là collection public (không cần auth) dùng để lookup uid
  async findUidByUsername(username: string): Promise<string | null> {
    const snap = await getDoc(doc(db, 'usernames', username));
    if (!snap.exists()) return null;
    return (snap.data() as { uid: string }).uid;
  },

  async registerUsername(username: string, uid: string): Promise<void> {
    await setDoc(doc(db, 'usernames', username), { uid });
  },

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', uid), data as Record<string, unknown>);
  },

  // --- Scores ---

  async getScore(uid: string): Promise<Score | null> {
    const snap = await getDoc(doc(db, 'scores', uid));
    return snap.exists() ? (snap.data() as Score) : null;
  },

  async getAllScores(): Promise<Record<string, Score>> {
    const snap = await getDocs(collection(db, 'scores'));
    const result: Record<string, Score> = {};
    snap.forEach(d => { result[d.id] = d.data() as Score; });
    return result;
  },

  async updateScore(uid: string, data: Partial<Score>): Promise<void> {
    await updateDoc(doc(db, 'scores', uid), data as Record<string, unknown>);
  },

  // --- UserProgress ---

  async getUserProgress(uid: string): Promise<UserProgress | null> {
    const snap = await getDoc(doc(db, 'userProgress', uid));
    return snap.exists() ? (snap.data() as UserProgress) : null;
  },

  async updateUserProgress(uid: string, data: Partial<UserProgress>): Promise<void> {
    await updateDoc(doc(db, 'userProgress', uid), data as Record<string, unknown>);
  },

  // --- Create all 3 docs for new user ---

  async createUserDocs(
    uid: string,
    user: User,
    score: Score,
    progress: UserProgress,
  ): Promise<void> {
    await Promise.all([
      setDoc(doc(db, 'users', uid), user),
      setDoc(doc(db, 'scores', uid), score),
      setDoc(doc(db, 'userProgress', uid), progress),
    ]);
  },

  // --- KnowledgeSets ---

  async getKnowledgeSets(): Promise<Record<string, KnowledgeSet>> {
    const snap = await getDocs(collection(db, 'knowledgeSets'));
    const result: Record<string, KnowledgeSet> = {};
    snap.forEach(d => { result[d.id] = d.data() as KnowledgeSet; });
    return result;
  },

  async setKnowledgeSet(setId: string, data: KnowledgeSet): Promise<void> {
    await setDoc(doc(db, 'knowledgeSets', setId), data);
  },

  async updateKnowledgeSet(setId: string, data: Partial<KnowledgeSet>): Promise<void> {
    await updateDoc(doc(db, 'knowledgeSets', setId), data as Record<string, unknown>);
  },

  async deleteKnowledgeSet(setId: string): Promise<void> {
    await deleteDoc(doc(db, 'knowledgeSets', setId));
  },

  async setQuestion(setId: string, qId: string, q: Question): Promise<void> {
    await updateDoc(doc(db, 'knowledgeSets', setId), {
      [`questions.${qId}`]: q,
    });
  },

  async deleteQuestion(setId: string, qId: string): Promise<void> {
    await updateDoc(doc(db, 'knowledgeSets', setId), {
      [`questions.${qId}`]: deleteField(),
    });
  },

  // --- MenuConfig ---

  async getMenuConfig(): Promise<Record<string, MenuItemConfig>> {
    const snap = await getDoc(doc(db, 'config', 'menu'));
    return snap.exists() ? (snap.data() as Record<string, MenuItemConfig>) : {};
  },

  async updateMenuConfig(data: Record<string, MenuItemConfig>): Promise<void> {
    await setDoc(doc(db, 'config', 'menu'), data);
  },
};
