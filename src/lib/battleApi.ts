import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { db } from './firebase';
import type { Battle, BattlePlayer, BattleQuestion } from '../types';

function randCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const battleApi = {
  async createRoom(
    hostUid: string,
    username: string,
    grade: number,
    questions: BattleQuestion[],
    timePerQuestion = 15,
  ): Promise<string> {
    let code = randCode();
    for (let i = 0; i < 8; i++) {
      if (!(await getDoc(doc(db, 'battles', code))).exists()) break;
      code = randCode();
    }
    const now = new Date().toISOString();
    const hostPlayer: BattlePlayer = { username, grade, score: 0, answerThisQ: null, joinedAt: now };
    const battle: Battle = {
      hostUid, status: 'waiting', questions, timePerQuestion,
      currentQuestionIdx: 0, questionStartedAt: null,
      players: { [hostUid]: hostPlayer }, createdAt: now,
    };
    await setDoc(doc(db, 'battles', code), battle);
    return code;
  },

  async joinRoom(code: string, uid: string, username: string, grade: number): Promise<Battle | null> {
    const ref = doc(db, 'battles', code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const b = snap.data() as Battle;
    if (b.status !== 'waiting') return null;
    if (b.players[uid]) return b;
    const player: BattlePlayer = { username, grade, score: 0, answerThisQ: null, joinedAt: new Date().toISOString() };
    await updateDoc(ref, { [`players.${uid}`]: player });
    return { ...b, players: { ...b.players, [uid]: player } };
  },

  async startGame(code: string): Promise<void> {
    await updateDoc(doc(db, 'battles', code), {
      status: 'playing',
      currentQuestionIdx: 0,
      questionStartedAt: new Date(Date.now() + 3200).toISOString(),
    });
  },

  async submitAnswer(code: string, uid: string, key: string, correct: boolean): Promise<void> {
    const up: Record<string, unknown> = { [`players.${uid}.answerThisQ`]: key };
    if (correct) up[`players.${uid}.score`] = increment(1);
    await updateDoc(doc(db, 'battles', code), up);
  },

  // Advance to next question, appending a new generated question and updating timePerQuestion
  async nextQuestion(
    code: string,
    nextIdx: number,
    playerUids: string[],
    appendQ?: BattleQuestion,
    newTimePerQ?: number,
  ): Promise<void> {
    const ref = doc(db, 'battles', code);
    let questions: BattleQuestion[] | undefined;
    if (appendQ) {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      questions = [...(snap.data() as Battle).questions, appendQ];
    }
    const up: Record<string, unknown> = {
      currentQuestionIdx: nextIdx,
      questionStartedAt: new Date().toISOString(),
    };
    if (questions) up['questions'] = questions;
    if (newTimePerQ !== undefined) up['timePerQuestion'] = newTimePerQ;
    playerUids.forEach(uid => { up[`players.${uid}.answerThisQ`] = null; });
    await updateDoc(ref, up);
  },

  async finishGame(code: string): Promise<void> {
    await updateDoc(doc(db, 'battles', code), { status: 'finished' });
  },

  listen(code: string, cb: (b: Battle | null) => void): () => void {
    return onSnapshot(doc(db, 'battles', code), snap =>
      cb(snap.exists() ? (snap.data() as Battle) : null),
    );
  },
};
