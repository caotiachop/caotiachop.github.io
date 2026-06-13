import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pause,
  Play,
  RotateCcw,
  Home,
  Timer,
  Star,
  Music,
  Volume2,
} from "lucide-react";
import { Confetti } from "../components/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "../components/PageWrapper";
import { FoxCharacter } from "../components/FoxCharacter";
import { VirtualKeypad } from "../components/VirtualKeypad";
import { AppleCount } from "../components/AppleCount";
import { useApp } from "../lib/store";
import { audio } from "../lib/audio";
import { generateQuestion, timeLimit, requiredCorrect } from "../lib/gameLogic";
import type { FoxEmotion } from "../types";

type Phase = "countdown" | "playing" | "paused" | "gameover";

export function SpeedGameScreen() {
  const navigate = useNavigate();
  const { currentUser, user, addApples, updateSpeedScore } = useApp();

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [level, setLevel] = useState(1);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [question, setQuestion] = useState(() => generateQuestion(1));
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(timeLimit(1));
  const [foxEmotion, setFoxEmotion] = useState<FoxEmotion>("normal");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [questionStartMs, setQuestionStartMs] = useState(Date.now());
  const [bestTimeMs, setBestTimeMs] = useState(0);
  const [musicVol, setMusicVol] = useState(() => audio.getMusicVolume());
  const [soundVol, setSoundVol] = useState(() => audio.getSoundVolume());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRef = useRef(level);
  const phaseRef = useRef(phase);
  levelRef.current = level;
  phaseRef.current = phase;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startQuestion = useCallback(
    (lvl: number) => {
      const q = generateQuestion(lvl);
      setQuestion(q);
      setAnswer("");
      setTimeLeft(timeLimit(lvl));
      setFoxEmotion("thinking");
      setQuestionStartMs(Date.now());
      stopTimer();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            if (phaseRef.current === "playing") {
              audio.play("not-true");
              setFoxEmotion("sad");
              setPhase("gameover");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  useEffect(() => {
    if (phase !== "countdown") return;
    audio.play("game-start");
    let c = 3;
    const iv = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        setPhase("playing");
        startQuestion(1);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, startQuestion]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    if (!currentUser) navigate("/", { replace: true });
  }, [currentUser, navigate]);

  const handleAnswerChange = useCallback(
    (val: string) => {
      setAnswer(val);
      if (val !== String(question.answer)) return;
      // Render the digit first, then process the correct answer
      setTimeout(() => {
        stopTimer();
        const elapsed = Date.now() - questionStartMs;
        const lvl = levelRef.current;
        setBestTimeMs((prev) => {
          const newBest = prev === 0 ? elapsed : Math.min(prev, elapsed);
          updateSpeedScore(lvl, newBest);
          return newBest;
        });
        audio.play("success");
        setFoxEmotion("happy");
        setCorrectStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak >= requiredCorrect(lvl)) {
            const newLevel = lvl + 1;
            setLevel(newLevel);
            setShowLevelUp(true);
            addApples(1);
            setTimeout(() => {
              setShowLevelUp(false);
              setCorrectStreak(0);
              startQuestion(newLevel);
            }, 1500);
          } else {
            setTimeout(() => startQuestion(lvl), 600);
          }
          return newStreak >= requiredCorrect(lvl) ? 0 : newStreak;
        });
        setAnswer("");
      }, 150);
    },
    [
      question,
      questionStartMs,
      stopTimer,
      startQuestion,
      addApples,
      updateSpeedScore,
    ],
  );

  const handleRestart = () => {
    stopTimer();
    setPhase("countdown");
    setCountdown(3);
    setLevel(1);
    setCorrectStreak(0);
    setFoxEmotion("normal");
    setBestTimeMs(0);
  };

  const handleContinue = async () => {
    if (!user) return;
    const cost = level * 2;
    if (user.apples < cost) return;
    await addApples(-cost);
    setPhase("playing");
    startQuestion(level);
  };

  if (!currentUser) return null;

  const timerPct = timeLeft > 0 ? (timeLeft / timeLimit(level)) * 100 : 0;
  const timerColor =
    timerPct > 50 ? "#4CAF50" : timerPct > 25 ? "#FF8800" : "#FF5722";
  const needed = requiredCorrect(level);
  const canContinue = user && user.apples >= level * 2;

  return (
    <PageWrapper>
      <div
        style={{
          height: "100%",
          background: "linear-gradient(160deg, #FFFBEA 0%, #FFF3A3 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "16px",
          gap: 12,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <motion.button
            onPointerDown={() => {
              audio.play("button-back");
              stopTimer();
              setPhase("paused");
            }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#FFD600",
              border: "2px solid #F5A800",
              boxShadow: "0 3px 0 #C17F00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3E2000",
            }}
          >
            <Pause size={20} />
          </motion.button>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#7D5A2C", fontWeight: 600 }}>
                LEVEL
              </div>
              <motion.div
                key={level}
                initial={{ scale: 1.5, color: "#AB47BC" }}
                animate={{ scale: 1, color: "#3E2000" }}
                style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}
              >
                {level}
              </motion.div>
            </div>
            {user && <AppleCount count={user.apples} size="sm" />}
          </div>
        </div>

        {/* Timer bar */}
        <div
          style={{
            background: "#E0E0E0",
            borderRadius: 8,
            height: 10,
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ width: `${timerPct}%`, backgroundColor: timerColor }}
            transition={{ duration: 0.5 }}
            style={{ height: "100%", borderRadius: 8 }}
          />
        </div>

        {/* Streak dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {Array.from({ length: needed }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i < correctStreak ? 1.2 : 1 }}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: i < correctStreak ? "#FFD600" : "#E0E0E0",
                border:
                  i < correctStreak ? "2px solid #F5A800" : "2px solid #BDBDBD",
              }}
            />
          ))}
        </div>

        {/* Fox + chat bubble question */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FoxCharacter
            outfit={user?.currentOutfit ?? "default"}
            emotion={foxEmotion}
            width={80}
          />
          <motion.div
            key={question.expression}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="fox-bubble"
            style={{ flex: 1, padding: "12px 16px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: timerColor,
                fontWeight: 700,
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              <Timer size={13} /> {timeLeft}s
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#3E2000" }}>
              {question.expression} = ?
            </div>
          </motion.div>
        </div>

        {/* Answer display */}
        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #FFD600",
            borderRadius: 16,
            padding: "12px 16px",
            textAlign: "center",
            boxShadow: "0 4px 0 #F5A800",
            minHeight: 56,
          }}
        >
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: answer ? "#3E2000" : "#BDBDBD",
            }}
          >
            {answer || "—"}
          </span>
        </div>

        {/* Keypad */}
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
          <VirtualKeypad
            value={answer}
            onChange={handleAnswerChange}
            disabled={phase !== "playing"}
          />
        </div>

        {/* Countdown overlay — fully opaque, nothing shown underneath */}
        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "#FFFBEA",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <FoxCharacter
                outfit={user?.currentOutfit ?? "default"}
                emotion="thinking"
                width={120}
              />
              <div style={{ fontSize: 22, fontWeight: 700, color: "#7D5A2C" }}>
                Chuẩn bị nào!
              </div>
              <motion.div
                key={countdown}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  color: "#FFD600",
                  textShadow: "0 5px 0 #C17F00",
                  lineHeight: 1,
                }}
              >
                {countdown || "🚀"}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level up overlay + Confetti */}
        <AnimatePresence>
          {showLevelUp && (
            <>
              <Confetti count={60} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(171,71,188,0.15)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backdropFilter: "blur(3px)",
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, -12, 12, -8, 8, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <Star size={72} fill="#FFD600" color="#F5A800" />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    color: "#AB47BC",
                    textShadow: "0 3px 0 #7B1FA2",
                  }}
                >
                  LEVEL {level}!
                </motion.div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#3E2000",
                  }}
                >
                  +1 <img src="/assets/apple.png" width={22} alt="táo" />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Pause modal — frosted glass overlay with settings */}
        <AnimatePresence>
          {phase === "paused" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,251,234,0.25)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.85, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 24 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                style={{
                  width: "100%",
                  background: "rgba(255,251,234,0.95)",
                  border: "3px solid #FFD600",
                  borderRadius: 24,
                  padding: "24px 20px",
                  boxShadow: "0 8px 0 #F5A800",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#3E2000",
                    textAlign: "center",
                  }}
                >
                  Tạm dừng
                </div>

                {/* Volume sliders */}
                <PauseVolRow
                  icon={Music}
                  label="Nhạc nền"
                  value={musicVol}
                  onChange={(v) => {
                    setMusicVol(v);
                    audio.setMusicVolume(v);
                  }}
                />
                <PauseVolRow
                  icon={Volume2}
                  label="Âm thanh"
                  value={soundVol}
                  onChange={(v) => {
                    setSoundVol(v);
                    audio.setSoundVolume(v);
                  }}
                />

                <ModalBtn
                  color="#FFD600"
                  shadow="#C17F00"
                  onClick={() => {
                    setPhase("playing");
                    startQuestion(level);
                  }}
                >
                  <Play size={18} /> Tiếp tục
                </ModalBtn>
                <ModalBtn
                  color="#FBE9E7"
                  shadow="#FF5722"
                  onClick={() => {
                    audio.play("button-back");
                    navigate("/menu");
                  }}
                >
                  <Home size={18} /> Về menu
                </ModalBtn>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over modal */}
        <AnimatePresence>
          {phase === "gameover" && (
            <GameModal title="Hết giờ!">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FoxCharacter
                  outfit={user?.currentOutfit ?? "default"}
                  emotion="sad"
                  width={100}
                />
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{ fontSize: 16, color: "#7D5A2C", fontWeight: 600 }}
                  >
                    Bạn đạt Level {level}
                  </div>
                  {bestTimeMs > 0 && (
                    <div style={{ fontSize: 13, color: "#7D5A2C" }}>
                      Phản xạ tốt nhất: {bestTimeMs}ms
                    </div>
                  )}
                </div>
              </div>
              <ModalBtn
                color="#FFD600"
                shadow="#C17F00"
                onClick={handleRestart}
              >
                <RotateCcw size={18} /> Chơi lại từ đầu
              </ModalBtn>
              <ModalBtn
                color={canContinue ? "#E8F5E9" : "#F5F5F5"}
                shadow={canContinue ? "#4CAF50" : "#BDBDBD"}
                onClick={canContinue ? handleContinue : undefined}
              >
                <Play size={18} /> Chơi tiếp ({level * 2}{" "}
                <img
                  src="/assets/apple.png"
                  width={16}
                  alt="táo"
                  style={{ verticalAlign: "middle" }}
                />
                )
              </ModalBtn>
              <ModalBtn
                color="#E3F2FD"
                shadow="#29B6F6"
                onClick={() => {
                  audio.play("button-back");
                  navigate("/menu");
                }}
              >
                <Home size={18} /> Về menu
              </ModalBtn>
            </GameModal>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

function GameModal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(62,32,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        style={{
          width: "100%",
          background: "#FFFBEA",
          border: "3px solid #FFD600",
          borderRadius: 24,
          padding: "24px 20px",
          boxShadow: "0 8px 0 #F5A800",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#3E2000",
            textAlign: "center",
          }}
        >
          {title}
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function PauseVolRow({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof Music;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "2px solid #FFD600",
        borderRadius: 14,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={17} color={value > 0 ? "#3E2000" : "#BDBDBD"} />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: value > 0 ? "#3E2000" : "#BDBDBD",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: value > 0 ? "#F5A800" : "#BDBDBD",
            minWidth: 32,
            textAlign: "right",
          }}
        >
          {value === 0 ? "Tắt" : `${pct}%`}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vol-slider"
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

function ModalBtn({
  children,
  color,
  shadow,
  onClick,
}: {
  children: ReactNode;
  color: string;
  shadow: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onPointerDown={onClick}
      whileTap={{ y: 4, boxShadow: "none" }}
      disabled={!onClick}
      style={{
        padding: "14px 0",
        background: color,
        width: "100%",
        maxWidth: 420,
        border: `3px solid ${shadow}`,
        boxShadow: `0 4px 0 ${shadow}`,
        borderRadius: 16,
        fontSize: 16,
        fontWeight: 700,
        color: "#3E2000",
        fontFamily: "'Baloo 2', cursive",
        opacity: onClick ? 1 : 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        alignSelf: "center",
      }}
    >
      {children}
    </motion.button>
  );
}
