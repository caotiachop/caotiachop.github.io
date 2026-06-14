import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Swords, Users, Trophy, Timer, Copy, CheckCircle } from 'lucide-react';
import { PageWrapper } from '../components/PageWrapper';
import { FoxCharacter } from '../components/FoxCharacter';
import { VirtualKeypad } from '../components/VirtualKeypad';
import { Confetti } from '../components/Confetti';
import { AppleCount } from '../components/AppleCount';
import { useApp } from '../lib/store';
import { auth } from '../lib/firebase';
import { audio } from '../lib/audio';
import { battleApi } from '../lib/battleApi';
import { generateQuestion } from '../lib/gameLogic';
import type { Battle, FoxEmotion } from '../types';

const REVEAL_MS = 2800;
const QUESTION_COUNT = 10;

type PrePhase = 'select' | 'join';

export function BattleScreen() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const { currentUser, user, loading: authLoading } = useApp();

  const [prePhase, setPrePhase] = useState<PrePhase>('select');

  const [roomCode, setRoomCode] = useState('');
  const [battle, setBattle] = useState<Battle | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  const [gamePhase, setGamePhase] = useState<'countdown' | 'question' | 'reveal'>('countdown');
  const [timeLeft, setTimeLeft] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [foxEmotion, setFoxEmotion] = useState<FoxEmotion>('thinking');
  const hasAdvancedRef = useRef(false);
  const battleRef = useRef<Battle | null>(null);

  const [copied, setCopied] = useState(false);

  const uid = auth.currentUser?.uid ?? '';
  const isHost = battle?.hostUid === uid;
  const q = battle ? battle.questions[battle.currentQuestionIdx] : null;
  battleRef.current = battle;

  useEffect(() => {
    if (!authLoading && !currentUser) navigate('/', { replace: true });
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    if (urlCode) { setJoinInput(urlCode); setPrePhase('join'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { unsubRef.current?.(); }, []);

  useEffect(() => {
    hasAdvancedRef.current = false;
    setMyAnswer(null);
    setCurrentAnswer('');
    setFoxEmotion('thinking');
  }, [battle?.currentQuestionIdx]);

  // Game timer — synced to questionStartedAt from Firestore
  useEffect(() => {
    const qAt = battle?.questionStartedAt;
    if (battle?.status !== 'playing' || !qAt) return;

    const startMs = new Date(qAt).getTime();
    const totalMs = (battle?.timePerQuestion ?? 15) * 1000;

    const tick = () => {
      const elapsed = Date.now() - startMs;
      if (elapsed < 0) {
        setGamePhase('countdown');
        setCountdownNum(Math.ceil(Math.abs(elapsed) / 1000));
      } else if (elapsed < totalMs) {
        setGamePhase('question');
        setTimeLeft(Math.ceil((totalMs - elapsed) / 1000));
      } else {
        setGamePhase('reveal');
        setTimeLeft(0);
        const b = battleRef.current;
        if (isHost && !hasAdvancedRef.current && b && elapsed >= totalMs + REVEAL_MS) {
          hasAdvancedRef.current = true;
          const next = b.currentQuestionIdx + 1;
          void battleApi.nextQuestion(roomCode, next, b.questions.length, Object.keys(b.players));
        }
      }
    };

    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.questionStartedAt, battle?.status, battle?.currentQuestionIdx, isHost, roomCode]);

  function listenRoom(code: string) {
    unsubRef.current?.();
    unsubRef.current = battleApi.listen(code, setBattle);
  }

  async function handleCreateRoom() {
    if (!user || !uid || creating) return;
    setCreating(true);
    try {
      // Sinh câu toán tăng dần độ khó: 2 câu mỗi level
      const questions = Array.from({ length: QUESTION_COUNT }, (_, i) =>
        generateQuestion(Math.max(1, Math.ceil((i + 1) / 2))),
      );
      const code = await battleApi.createRoom(uid, user.username, user.grade, questions);
      setRoomCode(code);
      listenRoom(code);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (joining || joinInput.length !== 4 || !uid || !user) return;
    setJoining(true);
    setJoinError('');
    try {
      const result = await battleApi.joinRoom(joinInput, uid, user.username, user.grade);
      if (!result) { setJoinError('Không tìm thấy phòng hoặc phòng đã bắt đầu!'); return; }
      setRoomCode(joinInput);
      listenRoom(joinInput);
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    if (!isHost || !roomCode) return;
    audio.play('game-start');
    await battleApi.startGame(roomCode);
  }

  function handleAnswerChange(val: string) {
    if (myAnswer !== null || gamePhase !== 'question' || !q) return;
    setCurrentAnswer(val);
    if (val !== String(q.answer)) return;
    setTimeout(() => {
      setMyAnswer(val);
      setCurrentAnswer('');
      setFoxEmotion('happy');
      audio.play('success');
      void battleApi.submitAnswer(roomCode, uid, val, true);
    }, 150);
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!currentUser || !user) return null;

  // ===== RESULTS =====
  if (battle?.status === 'finished') {
    const sorted = Object.entries(battle.players).sort((a, b) => b[1].score - a[1].score);
    const myRank = sorted.findIndex(([id]) => id === uid) + 1;
    const isWinner = sorted[0]?.[0] === uid;
    const medalColor = ['#FFD700', '#C0C0C0', '#CD7F32'];

    return (
      <PageWrapper scroll>
        <div style={{ minHeight: '100%', background: 'linear-gradient(160deg, #FFFBEA 0%, #FFF3A3 100%)', display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 14 }}>
          {isWinner && <Confetti count={80} />}

          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#3E2000' }}>
              {isWinner ? 'Bạn thắng!' : `Hạng ${myRank}!`}
            </div>
            <div style={{ fontSize: 14, color: '#7D5A2C', marginTop: 4 }}>
              {sorted[0][1].username} — {sorted[0][1].score}/{battle.questions.length} câu đúng
            </div>
          </motion.div>

          <FoxCharacter outfit={user.currentOutfit} emotion={isWinner ? 'happy' : 'sad'} width={100} style={{ alignSelf: 'center' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(([id, p], i) => (
              <motion.div key={id} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: id === uid ? '#FFF3A3' : '#fff', border: `2px solid ${id === uid ? '#FFD600' : '#F5F5F5'}`, borderRadius: 16, padding: '12px 14px', boxShadow: id === uid ? '0 3px 0 #F5A800' : '0 2px 0 #F5F5F5' }}>
                <div style={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                  {i < 3 ? <Trophy size={i === 0 ? 26 : 22} color={medalColor[i]} />
                    : <span style={{ fontSize: 16, fontWeight: 800, color: '#7D5A2C' }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#3E2000' }}>
                    {p.username}{id === uid && <span style={{ fontSize: 11, color: '#F5A800' }}> (Bạn)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#7D5A2C' }}>Lớp {p.grade}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#3E2000' }}>
                  {p.score}<span style={{ fontSize: 12, color: '#9E9E9E' }}>/{battle.questions.length}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button whileTap={{ scale: 0.97, y: 4, boxShadow: 'none' }}
            onPointerDown={() => { audio.play('button-back'); navigate('/menu'); }}
            style={{ marginTop: 'auto', padding: '16px 0', background: '#FFD600', border: '3px solid #F5A800', boxShadow: '0 5px 0 #C17F00', borderRadius: 18, fontSize: 17, fontWeight: 800, color: '#3E2000', fontFamily: "'Baloo 2', cursive" }}>
            Về menu
          </motion.button>
        </div>
      </PageWrapper>
    );
  }

  // ===== GAME (playing) =====
  if (battle?.status === 'playing' && q) {
    const timerPct = timeLeft / battle.timePerQuestion * 100;
    const timerColor = timerPct > 50 ? '#4CAF50' : timerPct > 25 ? '#FF8800' : '#FF5722';
    const answered = myAnswer !== null;

    return (
      <PageWrapper>
        <div style={{ height: '100%', background: 'linear-gradient(160deg, #FFFBEA 0%, #FFF3A3 100%)', display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: 10, position: 'relative', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#7D5A2C' }}>
              Câu {battle.currentQuestionIdx + 1}/{battle.questions.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Timer size={14} color={timerColor} />
              <motion.span key={timeLeft} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                style={{ fontSize: 24, fontWeight: 800, color: timerColor, minWidth: 28, textAlign: 'right', lineHeight: 1 }}>
                {timeLeft}
              </motion.span>
            </div>
          </div>

          {/* Timer bar */}
          <div style={{ background: '#E0E0E0', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${timerPct}%`, backgroundColor: timerColor }} transition={{ duration: 0.3 }}
              style={{ height: '100%', borderRadius: 8 }} />
          </div>

          {/* Fox + question bubble (style giống Cáo Tia Chớp) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FoxCharacter outfit={user.currentOutfit} emotion={foxEmotion} width={76} />
            <motion.div key={battle.currentQuestionIdx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="fox-bubble" style={{ flex: 1, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: timerColor, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                <Timer size={12} /> {timeLeft}s
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#3E2000' }}>
                {q.expression} = ?
              </div>
            </motion.div>
          </div>

          {/* Answer display */}
          <div style={{ background: answered ? '#E8F5E9' : '#FFFFFF', border: `3px solid ${answered ? '#4CAF50' : '#FFD600'}`, borderRadius: 16, padding: '12px 16px', textAlign: 'center', boxShadow: `0 4px 0 ${answered ? '#388E3C' : '#F5A800'}`, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: answered ? '#2E7D32' : currentAnswer ? '#3E2000' : '#BDBDBD' }}>
              {answered ? myAnswer : (currentAnswer || '—')}
            </span>
          </div>

          {/* Player chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(battle.players).map(([id, p]) => (
              <motion.div key={id} layout
                style={{ background: id === uid ? '#FFF3A3' : '#fff', border: `2px solid ${id === uid ? '#FFD600' : '#E0E0E0'}`, borderRadius: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#3E2000' }}>{p.username}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#3E2000' }}>{p.score}</span>
                {p.answerThisQ !== null && <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 700 }}>✓</span>}
              </motion.div>
            ))}
          </div>

          {/* Keypad */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <VirtualKeypad value={currentAnswer} onChange={handleAnswerChange} disabled={answered || gamePhase !== 'question'} />
          </div>

          {/* Countdown overlay */}
          <AnimatePresence>
            {gamePhase === 'countdown' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: '#FFFBEA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <FoxCharacter outfit={user.currentOutfit} emotion="thinking" width={120} />
                <div style={{ fontSize: 20, fontWeight: 700, color: '#7D5A2C' }}>Chuẩn bị!</div>
                <motion.div key={countdownNum}
                  initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }}
                  style={{ fontSize: 96, fontWeight: 800, color: '#FFD600', textShadow: '0 5px 0 #C17F00', lineHeight: 1 }}>
                  {countdownNum > 0 ? countdownNum : 'GO!'}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reveal overlay */}
          <AnimatePresence>
            {gamePhase === 'reveal' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(62,32,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <motion.div initial={{ scale: 0.8, y: 24 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{ width: '100%', background: '#FFFBEA', border: '3px solid #4CAF50', borderRadius: 24, padding: '20px 18px', boxShadow: '0 6px 0 #2E7D32', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7D5A2C' }}>Đáp án</div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: '#2E7D32', marginTop: 4 }}>
                      {q.expression} = <span style={{ color: '#1B5E20' }}>{q.answer}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(battle.players)
                      .sort((a, b) => b[1].score - a[1].score)
                      .map(([id, p]) => {
                        const got = p.answerThisQ !== null;
                        return (
                          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: id === uid ? '#FFF3A3' : 'transparent', borderRadius: 10, padding: '4px 8px' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#3E2000' }}>
                              {p.username}{id === uid ? ' (Bạn)' : ''}
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 800, color: got ? '#4CAF50' : '#FF5722' }}>
                              {got ? `+1 ✓  (${p.score})` : `✗  (${p.score})`}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageWrapper>
    );
  }

  // ===== LOBBY (waiting) =====
  if (battle?.status === 'waiting') {
    const players = Object.entries(battle.players);
    const qrUrl = `${window.location.origin}${window.location.pathname}#/battle/join/${roomCode}`;

    return (
      <PageWrapper scroll>
        <div style={{ minHeight: '100%', background: 'linear-gradient(160deg, #FFFBEA 0%, #FFF3A3 100%)', display: 'flex', flexDirection: 'column', padding: '16px 16px 24px', gap: 14 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button onPointerDown={() => { audio.play('button-back'); navigate('/menu'); }} whileTap={{ scale: 0.9 }}
              style={{ width: 40, height: 40, borderRadius: 12, background: '#FFD600', border: '2px solid #F5A800', boxShadow: '0 3px 0 #C17F00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E2000', flexShrink: 0 }}>
              <ArrowLeft size={20} />
            </motion.button>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#3E2000' }}>Phòng chờ</div>
          </div>

          {/* QR + code (host) */}
          {isHost && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ background: '#fff', border: '3px solid #FFD600', borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, boxShadow: '0 4px 0 #F5A800' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7D5A2C' }}>Quét QR hoặc nhập mã để tham gia</div>
              <QRCodeSVG value={qrUrl} size={164} bgColor="#FFFFFF" fgColor="#3E2000" level="M" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {roomCode.split('').map((d, i) => (
                  <div key={i} style={{ width: 46, height: 54, background: '#FFD600', border: '3px solid #F5A800', borderRadius: 12, boxShadow: '0 4px 0 #C17F00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#3E2000' }}>
                    {d}
                  </div>
                ))}
                <motion.button onPointerDown={handleCopyCode} whileTap={{ scale: 0.9 }}
                  style={{ width: 46, height: 54, background: copied ? '#E8F5E9' : '#E3F2FD', border: `2px solid ${copied ? '#4CAF50' : '#29B6F6'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied ? '#4CAF50' : '#01579B', flexShrink: 0 }}>
                  {copied ? <CheckCircle size={20} /> : <Copy size={18} />}
                </motion.button>
              </div>
              <div style={{ fontSize: 12, color: '#7D5A2C' }}>{QUESTION_COUNT} câu toán • 15 giây/câu</div>
            </motion.div>
          )}

          {/* Guest: room info */}
          {!isHost && (
            <div style={{ background: '#fff', border: '2px solid #FFD600', borderRadius: 16, padding: '14px 16px', textAlign: 'center', boxShadow: '0 3px 0 #F5A800' }}>
              <div style={{ fontSize: 13, color: '#7D5A2C', fontWeight: 600 }}>Đã vào phòng</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#3E2000', letterSpacing: 8, margin: '4px 0' }}>{roomCode}</div>
              <div style={{ fontSize: 12, color: '#7D5A2C' }}>{QUESTION_COUNT} câu toán • Đang chờ host bắt đầu...</div>
            </div>
          )}

          {/* Player list */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#7D5A2C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> {players.length} người trong phòng
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {players.map(([id, p], i) => (
                <motion.div key={id} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.07 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: id === uid ? '#FFF3A3' : '#fff', border: `2px solid ${id === uid ? '#FFD600' : '#F5F5F5'}`, borderRadius: 14, padding: '10px 14px' }}>
                  <FoxCharacter outfit={user.currentOutfit} emotion="normal" width={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#3E2000' }}>
                      {p.username}{id === uid ? ' (Bạn)' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#7D5A2C' }}>Lớp {p.grade}</div>
                  </div>
                  {id === battle.hostUid && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#F5A800', background: '#FFF3A3', border: '1px solid #FFD600', borderRadius: 8, padding: '2px 8px' }}>Host</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {isHost && (
            <motion.button whileTap={{ scale: 0.97, y: 4, boxShadow: 'none' }}
              onPointerDown={() => { void handleStart(); }}
              style={{ padding: '16px 0', background: '#FFD600', border: '3px solid #F5A800', boxShadow: '0 5px 0 #C17F00', borderRadius: 18, fontSize: 18, fontWeight: 800, color: '#3E2000', fontFamily: "'Baloo 2', cursive", marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Swords size={22} /> Bắt đầu thách đấu!
            </motion.button>
          )}

          {!isHost && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <FoxCharacter outfit={user.currentOutfit} emotion="thinking" width={80} />
            </div>
          )}
        </div>
      </PageWrapper>
    );
  }

  // ===== PRE-GAME: JOIN =====
  if (prePhase === 'join') {
    return (
      <PageWrapper>
        <div style={{ height: '100%', background: 'linear-gradient(160deg, #FFFBEA 0%, #FFF3A3 100%)', display: 'flex', flexDirection: 'column', padding: 20, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button onPointerDown={() => { audio.play('button-back'); setPrePhase('select'); setJoinInput(''); setJoinError(''); }} whileTap={{ scale: 0.9 }}
              style={{ width: 40, height: 40, borderRadius: 12, background: '#FFD600', border: '2px solid #F5A800', boxShadow: '0 3px 0 #C17F00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E2000' }}>
              <ArrowLeft size={20} />
            </motion.button>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#3E2000' }}>Nhập mã phòng</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
            <FoxCharacter outfit={user.currentOutfit} emotion={joinError ? 'sad' : 'thinking'} width={100} />
            <div style={{ display: 'flex', gap: 10 }}>
              {[0, 1, 2, 3].map(i => (
                <motion.div key={i} animate={{ scale: joinInput.length === i ? 1.08 : 1 }}
                  style={{ width: 56, height: 64, background: joinInput[i] ? '#FFD600' : '#fff', border: `3px solid ${joinInput[i] ? '#F5A800' : '#E0E0E0'}`, borderRadius: 14, boxShadow: `0 4px 0 ${joinInput[i] ? '#C17F00' : '#BDBDBD'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#3E2000' }}>
                  {joinInput[i] ?? ''}
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {joinError && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ fontSize: 13, color: '#FF5722', fontWeight: 700, textAlign: 'center' }}>
                  {joinError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <VirtualKeypad value={joinInput} onChange={v => { setJoinInput(v.slice(0, 4)); setJoinError(''); }} maxLength={4} disabled={joining} />

          <motion.button
            onPointerDown={() => { void handleJoin(); }}
            whileTap={joinInput.length === 4 ? { scale: 0.97, y: 4, boxShadow: 'none' } : {}}
            disabled={joinInput.length !== 4 || joining}
            style={{ padding: '16px 0', background: joinInput.length === 4 ? '#FFD600' : '#F5F5F5', border: `3px solid ${joinInput.length === 4 ? '#F5A800' : '#E0E0E0'}`, boxShadow: `0 5px 0 ${joinInput.length === 4 ? '#C17F00' : '#BDBDBD'}`, borderRadius: 18, fontSize: 18, fontWeight: 800, color: joinInput.length === 4 ? '#3E2000' : '#9E9E9E', fontFamily: "'Baloo 2', cursive", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: joining ? 0.7 : 1 }}>
            <Users size={20} />
            {joining ? 'Đang vào...' : 'Tham gia'}
          </motion.button>
        </div>
      </PageWrapper>
    );
  }

  // ===== PRE-GAME: SELECT =====
  return (
    <PageWrapper>
      <div style={{ height: '100%', background: 'linear-gradient(160deg, #FFFBEA 0%, #FFF3A3 100%)', display: 'flex', flexDirection: 'column', padding: 20, gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.button onPointerDown={() => { audio.play('button-back'); navigate('/menu'); }} whileTap={{ scale: 0.9 }}
            style={{ width: 40, height: 40, borderRadius: 12, background: '#FFD600', border: '2px solid #F5A800', boxShadow: '0 3px 0 #C17F00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E2000' }}>
            <ArrowLeft size={20} />
          </motion.button>
          {user && <AppleCount count={user.apples} size="sm" />}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            <FoxCharacter outfit={user.currentOutfit} emotion="happy" width={140} />
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#3E2000' }}>Cáo Thách Đấu</div>
            <div style={{ fontSize: 14, color: '#7D5A2C', marginTop: 4 }}>
              {QUESTION_COUNT} câu toán tốc độ • thi đấu real-time
            </div>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <motion.button
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.22, type: 'spring', stiffness: 260, damping: 22 }}
              onPointerDown={() => { audio.play('button-click'); void handleCreateRoom(); }}
              whileTap={{ scale: 0.97, y: 4, boxShadow: 'none' }}
              disabled={creating}
              style={{ padding: '18px 24px', background: 'linear-gradient(90deg, #D4960A, #FFD600)', border: '3px solid #F5A800', boxShadow: '0 5px 0 #C17F00', borderRadius: 20, fontSize: 19, fontWeight: 800, color: '#3E2000', fontFamily: "'Baloo 2', cursive", display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', opacity: creating ? 0.7 : 1 }}>
              <Swords size={24} /> {creating ? 'Đang tạo...' : 'Tạo phòng'}
            </motion.button>

            <motion.button
              initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 22 }}
              onPointerDown={() => { audio.play('button-click'); setPrePhase('join'); }}
              whileTap={{ scale: 0.97, y: 4, boxShadow: 'none' }}
              style={{ padding: '18px 24px', background: '#E3F2FD', border: '3px solid #29B6F6', boxShadow: '0 5px 0 #0288D1', borderRadius: 20, fontSize: 19, fontWeight: 800, color: '#01579B', fontFamily: "'Baloo 2', cursive", display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
              <Users size={24} /> Tham gia phòng
            </motion.button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
