import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SettingsButton } from "../components/Settings";
import { Confetti } from "../components/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "../components/PageWrapper";
import { FoxCharacter } from "../components/FoxCharacter";
import { AnswerButton } from "../components/AnswerButton";
import { AppleCount } from "../components/AppleCount";
import { useApp } from "../lib/store";
import { api } from "../lib/api";
import { audio } from "../lib/audio";
import type { KnowledgeSet, Question, FoxEmotion } from "../types";

type KnowPhase = "select" | "playing" | "complete";

const DIFF_TIME: Record<string, number> = { easy: 300, medium: 420, hard: 600 };
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function KnowledgeScreen() {
  const navigate = useNavigate();
  const { currentUser, user, userProgress, completeKnowledgeSet, loading: authLoading } = useApp();

  const [phase, setPhase] = useState<KnowPhase>("select");
  const [sets, setSets] = useState<Record<string, KnowledgeSet>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<
    Array<[string, string]>
  >([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [totalTime, setTotalTime] = useState(300);
  const [foxEmotion, setFoxEmotion] = useState<FoxEmotion>("normal");
  const [answerStatus, setAnswerStatus] = useState<
    "idle" | "correct" | "wrong"
  >("idle");
  const [selectedKey, setSelectedKey] = useState("");
  const [earnedApples, setEarnedApples] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  // null=im lặng | 'question'=đọc câu hỏi | number=đọc đáp án thứ n (theo shuffledAnswers)
  const [speakingItem, setSpeakingItem] = useState<"question" | number | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopSpeech = useCallback(() => {
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeakingItem(null);
  }, [canSpeak]);

  const readSequence = useCallback(
    (question: string, answers: Array<[string, string]>) => {
      if (!canSpeak) return;
      window.speechSynthesis.cancel();

      const mkUtter = (text: string) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "vi-VN"; u.rate = 0.82; u.pitch = 1.05;
        return u;
      };

      const readAns = (idx: number) => {
        if (idx >= answers.length) { setSpeakingItem(null); return; }
        setSpeakingItem(idx);
        const u = mkUtter(answers[idx][1]);
        u.onend = () => readAns(idx + 1);
        u.onerror = () => setSpeakingItem(null);
        window.speechSynthesis.speak(u);
      };

      setSpeakingItem("question");
      const uQ = mkUtter(question);
      uQ.onend = () => readAns(0);
      uQ.onerror = () => setSpeakingItem(null);
      window.speechSynthesis.speak(uQ);
    },
    [canSpeak],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      navigate("/", { replace: true });
      return;
    }
    api.getKnowledgeSets()
      .then(sets => { setSets(sets); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser, authLoading, navigate]);

  useEffect(() => () => stopTimer(), []);
  useEffect(() => () => stopSpeech(), [stopSpeech]);

  if (!currentUser) return null;

  const getQuestion = (setId: string, qId: string): Question | null =>
    sets[setId]?.questions?.[qId] ?? null;

  const startSet = (setId: string) => {
    const s = sets[setId];
    if (!s) return;
    audio.play("game-start");
    const ids = Object.keys(s.questions);
    const firstQ = s.questions[ids[0]];
    const t = DIFF_TIME[firstQ?.difficulty ?? "easy"];
    setQuestionIds(ids);
    setCurrentIdx(0);
    setTimeLeft(t);
    setTotalTime(t);
    setFoxEmotion("thinking");
    setAnswerStatus("idle");
    setSelectedKey("");
    const rawAns = Object.entries(s.questions[ids[0]]?.answers ?? {}).filter(([, v]) => v.trim());
    const shuffled = shuffle(rawAns);
    setShuffledAnswers(shuffled);
    setSelectedSetId(setId);
    setPhase("playing");
    setTimeout(() => readSequence(firstQ?.question ?? "", shuffled), 350);

    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          audio.play("not-true");
          setFoxEmotion("sad");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const nextQuestion = (idx: number) => {
    const s = sets[selectedSetId];
    if (!s) return;
    const qId = questionIds[idx];
    const q = s.questions[qId];
    if (!q) return;
    const t = DIFF_TIME[q.difficulty ?? "easy"];
    setTimeLeft(t);
    setTotalTime(t);
    setFoxEmotion("thinking");
    setAnswerStatus("idle");
    setSelectedKey("");
    const shuffled = shuffle(Object.entries(q.answers).filter(([, v]) => v.trim()));
    setShuffledAnswers(shuffled);
    setTimeout(() => readSequence(q.question, shuffled), 350);
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          audio.play("not-true");
          setFoxEmotion("sad");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswer = (key: string) => {
    const q = getQuestion(selectedSetId, questionIds[currentIdx]);
    if (!q || answerStatus !== "idle") return;
    audio.play("button-click");
    setSelectedKey(key);

    if (key === q.correctKey) {
      audio.play("success");
      stopSpeech();
      setFoxEmotion("happy");
      setAnswerStatus("correct");
      stopTimer();
      setTimeout(() => {
        const nextIdx = currentIdx + 1;
        if (nextIdx >= questionIds.length) {
          audio.play("win");
          const earned = questionIds.length * 2;
          setEarnedApples(earned);
          completeKnowledgeSet(selectedSetId, questionIds.length);
          setPhase("complete");
        } else {
          setCurrentIdx(nextIdx);
          nextQuestion(nextIdx);
        }
      }, 800);
    } else {
      audio.play("not-true");
      stopSpeech();
      setFoxEmotion("sad");
      setAnswerStatus("wrong");
      const penalty = Math.floor(timeLeft * 0.15);
      setTimeLeft((prev) => Math.max(prev - penalty, 1));
      setTimeout(() => {
        setAnswerStatus("idle");
        setSelectedKey("");
        setFoxEmotion("thinking");
        const q2 = getQuestion(selectedSetId, questionIds[currentIdx]);
        if (q2)
          setShuffledAnswers(
            shuffle(Object.entries(q2.answers).filter(([, v]) => v.trim())),
          );
      }, 700);
    }
  };

  const currentQ =
    phase === "playing"
      ? getQuestion(selectedSetId, questionIds[currentIdx])
      : null;
  const currentSet = sets[selectedSetId];
  const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const timerColor =
    timerPct > 50 ? "#4CAF50" : timerPct > 25 ? "#FF8800" : "#FF5722";
  const grades = [...new Set(Object.values(sets).map((s) => s.grade))].sort();
  const filteredSets = selectedGrade
    ? Object.entries(sets).filter(([, s]) => s.grade === selectedGrade)
    : Object.entries(sets);

  return (
    <PageWrapper>
      <div
        style={{
          minHeight: "100%",
          background: "#FFFBEA",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 16px 8px",
            gap: "1rem",
            background: "#FFD600",
            borderBottom: "3px solid #F5A800",
          }}
        >
          <motion.button
            onPointerDown={() => {
              audio.play("button-back");
              if (phase === "playing" || phase === "complete") {
                stopTimer();
                setPhase("select");
              } else navigate("/menu");
            }}
            whileTap={{ scale: 0.9 }}
            style={{
              fontSize: 22,
              background: "none",
              color: "#3E2000",
              fontWeight: 700,
            }}
          >
            <ArrowLeft size={22} />
          </motion.button>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#3E2000",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BookOpen size={20} /> Cáo Giáo Sư
          </div>
          <div style={{ flex: 1 }}></div>
          {user && <AppleCount count={user.apples} size="sm" />}
          <SettingsButton />
        </div>

        <AnimatePresence mode="wait">
          {/* SELECT PHASE */}
          {phase === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#7D5A2C",
                    fontWeight: 600,
                  }}
                >
                  Đang tải...
                </div>
              ) : (
                <>
                  {/* Grade filter */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <GradeChip
                      label="Tất cả"
                      active={selectedGrade === null}
                      onClick={() => setSelectedGrade(null)}
                    />
                    {grades.map((g) => (
                      <GradeChip
                        key={g}
                        label={`Lớp ${g}`}
                        active={selectedGrade === g}
                        onClick={() => setSelectedGrade(g)}
                      />
                    ))}
                  </div>

                  {/* Sets list */}
                  {filteredSets.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "#7D5A2C",
                      }}
                    >
                      Chưa có bộ kiến thức nào.
                    </div>
                  ) : (
                    filteredSets.map(([setId, s], i) => {
                      const qCount = Object.keys(s.questions).length;
                      const done = userProgress?.completedSetIds?.[setId];
                      return (
                        <motion.button
                          key={setId}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          onPointerDown={() => {
                            audio.play("button-click");
                            startSet(setId);
                          }}
                          whileTap={{ scale: 0.97, y: 3 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: done ? "#E8F5E9" : "#FFFFFF",
                            border: `3px solid ${done ? "#4CAF50" : "#FFD600"}`,
                            boxShadow: `0 4px 0 ${done ? "#4CAF50" : "#F5A800"}`,
                            borderRadius: 16,
                            padding: "14px 16px",
                            textAlign: "left",
                            fontFamily: "'Baloo 2', cursive",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 36,
                              color: done ? "#4CAF50" : "#F5A800",
                            }}
                          >
                            {done ? (
                              <CheckCircle2 size={28} />
                            ) : (
                              <BookOpen size={28} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: "#3E2000",
                              }}
                            >
                              {s.topic}
                            </div>
                            <div style={{ fontSize: 12, color: "#7D5A2C" }}>
                              Lớp {s.grade} • {qCount} câu
                              {done ? " • Đã hoàn thành" : ""}
                            </div>
                          </div>
                          {!done && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#7D5A2C",
                              }}
                            >
                              +{qCount * 2}{" "}
                              <img
                                src="/assets/apple.webp"
                                width={14}
                                alt="táo"
                              />
                            </div>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* PLAYING PHASE */}
          {phase === "playing" && currentQ && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 16px", gap: 12 }}
            >
              {/* Progress + speaker + timer — cùng 1 row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7D5A2C", flexShrink: 0 }}>
                  {currentIdx + 1} / {questionIds.length}
                </div>
                <div style={{ flex: 1, background: "#E0E0E0", borderRadius: 8, height: 8, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                    transition={{ duration: 0.5 }} style={{ height: "100%", borderRadius: 8 }} />
                </div>
                {canSpeak && (
                  <motion.button
                    onPointerDown={() => speakingItem !== null
                      ? stopSpeech()
                      : readSequence(currentQ.question, shuffledAnswers)}
                    whileTap={{ scale: 0.85 }}
                    animate={speakingItem !== null ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={speakingItem !== null ? { repeat: Infinity, duration: 0.65 } : {}}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: speakingItem !== null ? "#FFD600" : "rgba(255,214,0,0.25)",
                      border: `2px solid ${speakingItem !== null ? "#F5A800" : "#FFD600"}`,
                      boxShadow: speakingItem !== null ? "0 2px 0 #C17F00" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#3E2000",
                    }}
                  >
                    {speakingItem !== null ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </motion.button>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 4,
                  fontSize: 13, fontWeight: 700, color: timerColor, flexShrink: 0 }}>
                  <Timer size={14} /> {timeLeft}s
                </div>
              </div>

              {/* Fox + question bubble */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <FoxCharacter outfit={user?.currentOutfit ?? "default"} emotion={foxEmotion} width={70} />
                <motion.div key={questionIds[currentIdx]}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="fox-bubble"
                  style={{
                    flex: 1, padding: "12px 14px",
                    transition: "box-shadow 0.15s",
                    boxShadow: speakingItem === "question"
                      ? "0 0 0 3px #2196F3, 0 4px 0 #F5A800"
                      : undefined,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3E2000", lineHeight: 1.5 }}>
                    {currentQ.question}
                  </div>
                  <div style={{ fontSize: 11, color: "#7D5A2C", marginTop: 4 }}>
                    {currentSet?.topic} •{" "}
                    {currentQ.difficulty === "easy" ? "Dễ" : currentQ.difficulty === "medium" ? "Trung bình" : "Khó"}
                  </div>
                </motion.div>
              </div>

              {/* Answer buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {shuffledAnswers.map(([key, text], i) => {
                  const status =
                    answerStatus !== "idle" && selectedKey === key ? answerStatus
                    : answerStatus !== "idle" && key === currentQ.correctKey && answerStatus === "wrong" ? "correct"
                    : "idle";
                  return (
                    <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}>
                      <AnswerButton
                        letter={LETTERS[i]} text={text} status={status}
                        isSpeaking={speakingItem === i}
                        onClick={() => handleAnswer(key)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* COMPLETE PHASE */}
          {phase === "complete" && <Confetti />}
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                gap: 20,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#3E2000",
                  textAlign: "center",
                }}
              >
                Xuất sắc!
              </div>
              <div
                style={{ fontSize: 16, color: "#7D5A2C", textAlign: "center" }}
              >
                {currentSet?.topic}
              </div>
              {earnedApples > 0 ? (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    background: "#FFD600",
                    border: "3px solid #F5A800",
                    borderRadius: 20,
                    padding: "12px 28px",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#3E2000",
                    boxShadow: "0 4px 0 #C17F00",
                  }}
                >
                  +{earnedApples}{" "}
                  <img
                    src="/assets/apple.webp"
                    width={22}
                    alt="táo"
                    style={{ verticalAlign: "middle" }}
                  />{" "}
                  Táo!
                </motion.div>
              ) : (
                <div style={{ fontSize: 14, color: "#7D5A2C", fontStyle: "italic" }}>
                  Đã hoàn thành trước đó, không cộng táo lần 2
                </div>
              )}
              <img
                src="/assets/win.webp"
                alt="win"
                style={{ width: 140, objectFit: "contain" }}
              />
              <motion.button
                onPointerDown={() => {
                  audio.play("button-click");
                  setPhase("select");
                }}
                whileTap={{ y: 4, boxShadow: "none" }}
                style={{
                  width: "100%",
                  padding: "16px 0",
                  background: "#FFD600",
                  border: "3px solid #F5A800",
                  boxShadow: "0 5px 0 #C17F00",
                  borderRadius: 16,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#3E2000",
                  fontFamily: "'Baloo 2', cursive",
                }}
              >
                Chọn bộ khác
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

function GradeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onPointerDown={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: "6px 14px",
        borderRadius: 20,
        background: active ? "#FFD600" : "#FFFFFF",
        border: `2px solid ${active ? "#F5A800" : "#FFD600"}`,
        boxShadow: active ? "0 3px 0 #C17F00" : "none",
        fontSize: 13,
        fontWeight: 700,
        color: "#3E2000",
        fontFamily: "'Baloo 2', cursive",
      }}
    >
      {label}
    </motion.button>
  );
}

