import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  PartyPopper,
  ShieldCheck,
  Key,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { PageWrapper } from "../components/PageWrapper";
import { FoxCharacter } from "../components/FoxCharacter";
import { VirtualKeypad } from "../components/VirtualKeypad";
import { VirtualTextKeypad } from "../components/VirtualTextKeypad";
import { useApp } from "../lib/store";
import { audio } from "../lib/audio";

type Step = "name" | "welcome" | "pin" | "confirm" | "grade";

export function LoginScreen() {
  const navigate = useNavigate();
  const { checkUser, loginUser, registerUser } = useApp();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [grade, setGrade] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = (msg: string) => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setError(msg);
  };

  const handleNameSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const exists = await checkUser(trimmed);
      setName(trimmed);
      setIsNew(!exists);
      if (exists) {
        setStep("pin");
      } else {
        setStep("welcome");
      }
    } catch {
      setError("Lỗi kết nối, thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };

  // Existing user: enter PIN to login
  const handleLoginPin = async (val: string) => {
    setPin(val);
    setError("");
    if (val.length !== 4) return;
    setLoading(true);
    try {
      const result = await loginUser(name, val);
      if (result === "ok") {
        audio.play("win");
        navigate("/menu", { replace: true });
      } else {
        setPin("");
        triggerShake("PIN không đúng, thử lại nhé!");
      }
    } finally {
      setLoading(false);
    }
  };

  // New user step 1: create PIN
  const handleCreatePin = (val: string) => {
    setPin(val);
    setError("");
    if (val.length === 4) {
      setConfirmPin("");
      setStep("confirm");
    }
  };

  // New user step 2: confirm PIN
  const handleConfirmPin = (val: string) => {
    setConfirmPin(val);
    setError("");
    if (val.length !== 4) return;
    if (val === pin) {
      setStep("grade");
    } else {
      setConfirmPin("");
      triggerShake("PIN không khớp, nhập lại nhé!");
    }
  };

  const handleGradeSelect = async (g: number) => {
    audio.play("button-click");
    setGrade(g);
    setLoading(true);
    try {
      await registerUser(name, pin, g);
      audio.play("win");
      navigate("/menu", { replace: true });
    } catch {
      setError("Lỗi kết nối, thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    audio.play("button-back");
    setError("");
    if (step === "name") navigate("/");
    else if (step === "welcome") {
      setStep("name");
      setNameInput(name);
    } else if (step === "pin") {
      setPin("");
      if (isNew) setStep("welcome");
      else setStep("name");
    } else if (step === "confirm") {
      setPin("");
      setConfirmPin("");
      setStep("pin");
    } else if (step === "grade") {
      setConfirmPin("");
      setStep("confirm");
    }
  };

  const pinDots = (val: string) => (
    <motion.div
      animate={shake ? { x: [0, -10, 10, -8, 8, 0] } : {}}
      transition={{ duration: 0.35 }}
      style={{ display: "flex", gap: 16, justifyContent: "center" }}
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: val.length > i ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 400 }}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: val.length > i ? "#FFD600" : "transparent",
            border: `3px solid ${val.length > i ? "#F5A800" : "#BDBDBD"}`,
            boxShadow: val.length > i ? "0 2px 0 #C17F00" : "none",
          }}
        />
      ))}
    </motion.div>
  );

  return (
    <PageWrapper>
      <div
        style={{
          height: "100%",
          background: "linear-gradient(160deg, #FFF9D6 0%, #FFFBEA 60%)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 16px 0",
          overflow: "hidden",
        }}
      >
        {/* Back */}
        <motion.button
          onPointerDown={handleBack}
          whileTap={{ scale: 0.9 }}
          style={{
            alignSelf: "flex-start",
            background: "none",
            border: "none",
            color: "#7D5A2C",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 8,
            fontFamily: "'Baloo 2', cursive",
          }}
        >
          <ArrowLeft size={20} /> Quay lại
        </motion.button>

        <AnimatePresence mode="wait">
          {/* ─── STEP: NAME ─── */}
          {step === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                overflow: "hidden",
              }}
            >
              {/* Fox */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                  }}
                >
                  <FoxCharacter outfit="default" emotion="normal" width={100} />
                </motion.div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{ fontSize: 24, fontWeight: 800, color: "#3E2000" }}
                  >
                    Em tên gì?
                  </div>
                  <div style={{ fontSize: 13, color: "#7D5A2C" }}>
                    Nhập tên để bắt đầu chơi
                  </div>
                </div>
              </div>

              {/* Name display box */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: "3px solid #FFD600",
                  borderRadius: 16,
                  boxShadow: "0 4px 0 #F5A800",
                  padding: "14px 18px",
                  textAlign: "center",
                  minHeight: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: nameInput ? "#3E2000" : "#BDBDBD",
                    letterSpacing: 1,
                  }}
                >
                  {nameInput || "Tên của em..."}
                </span>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "#FBE9E7",
                    border: "2px solid #FF5722",
                    borderRadius: 12,
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "#BF360C",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {error}
                </motion.div>
              )}

              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#7D5A2C",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Đang kiểm tra...
                </div>
              )}

              {/* Virtual text keyboard */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  paddingBottom: 16,
                }}
              >
                <VirtualTextKeypad
                  value={nameInput}
                  onChange={setNameInput}
                  onSubmit={handleNameSubmit}
                  disabled={loading}
                />
              </div>
            </motion.div>
          )}

          {/* ─── STEP: WELCOME (new user) ─── */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                padding: "0 8px 40px",
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -6, 6, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <PartyPopper size={72} color="#AB47BC" />
              </motion.div>

              <div style={{ textAlign: "center" }}>
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  style={{
                    fontSize: 15,
                    color: "#7D5A2C",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Bạn là người chơi mới!{"\n"}
                  Tiếp theo bạn cần tạo{" "}
                  <span style={{ fontWeight: 800, color: "#F5A800" }}>
                    mã PIN 4 số
                  </span>{" "}
                  để bảo vệ tài khoản.
                </motion.div>
              </div>

              {/* Steps preview */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                {(
                  [
                    { label: "Tạo PIN", Icon: Key },
                    { label: "Xác nhận", Icon: CheckCircle2 },
                    { label: "Chọn lớp", Icon: BookOpen },
                  ] as const
                ).map((s, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        background: "#FFD600",
                        border: "2px solid #F5A800",
                        borderRadius: 12,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#3E2000",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <s.Icon size={14} /> {s.label}
                    </div>
                    {i < 2 && <ChevronRight size={14} color="#F5A800" />}
                  </div>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                onPointerDown={() => {
                  audio.play("button-click");
                  setPin("");
                  setStep("pin");
                }}
                whileTap={{ y: 5, boxShadow: "none" }}
                style={{
                  width: "100%",
                  maxWidth: 460,
                  padding: "18px 0",
                  background: "#FFD600",
                  border: "3px solid #F5A800",
                  boxShadow: "0 6px 0 #C17F00",
                  borderRadius: 20,
                  fontSize: 19,
                  fontWeight: 800,
                  color: "#3E2000",
                  fontFamily: "'Baloo 2', cursive",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <ShieldCheck size={22} /> Tạo mã PIN
              </motion.button>
            </motion.div>
          )}

          {/* ─── STEP: PIN (create or login) ─── */}
          {step === "pin" && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                paddingTop: 8,
              }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.5,
                  ease: "easeInOut",
                }}
              >
                <FoxCharacter outfit="default" emotion="normal" width={90} />
              </motion.div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 22, fontWeight: 800, color: "#3E2000" }}
                >
                  {isNew ? `Tạo PIN cho ${name}` : `Chào lại, ${name}!`}
                </div>
                <div style={{ fontSize: 14, color: "#7D5A2C", marginTop: 4 }}>
                  {isNew
                    ? "Chọn 4 số bí mật của em"
                    : "Nhập mã PIN 4 số của em"}
                </div>
              </div>

              {pinDots(pin)}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "#FBE9E7",
                    border: "2px solid #FF5722",
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontSize: 14,
                    color: "#BF360C",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {error}
                </motion.div>
              )}

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  width: "100%",
                  paddingBottom: 20,
                }}
              >
                <VirtualKeypad
                  value={isNew ? pin : pin}
                  onChange={isNew ? handleCreatePin : handleLoginPin}
                  maxLength={4}
                  disabled={loading}
                />
              </div>
            </motion.div>
          )}

          {/* ─── STEP: CONFIRM PIN (new user) ─── */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                paddingTop: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <ShieldCheck size={64} color="#4CAF50" />
                </motion.div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{ fontSize: 22, fontWeight: 800, color: "#3E2000" }}
                  >
                    Xác nhận PIN
                  </div>
                  <div style={{ fontSize: 14, color: "#7D5A2C", marginTop: 4 }}>
                    Nhập lại mã PIN vừa tạo để xác nhận
                  </div>
                </div>
              </div>

              {/* Show the created PIN as masked dots for reference */}
              <div
                style={{
                  background: "#E8F5E9",
                  border: "2px solid #4CAF50",
                  borderRadius: 12,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "#2E7D32",
                  fontWeight: 600,
                }}
              >
                PIN đã tạo: {"●".repeat(pin.length)}
              </div>

              {pinDots(confirmPin)}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "#FBE9E7",
                    border: "2px solid #FF5722",
                    borderRadius: 12,
                    padding: "8px 16px",
                    fontSize: 14,
                    color: "#BF360C",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {error}
                </motion.div>
              )}

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  width: "100%",
                  paddingBottom: 20,
                }}
              >
                <VirtualKeypad
                  value={confirmPin}
                  onChange={handleConfirmPin}
                  maxLength={4}
                />
              </div>
            </motion.div>
          )}

          {/* ─── STEP: GRADE ─── */}
          {step === "grade" && (
            <motion.div
              key="grade"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.22 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                paddingTop: 8,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#3E2000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <BookOpen size={24} color="#F5A800" /> Em học lớp mấy?
                </div>
                <div style={{ fontSize: 14, color: "#7D5A2C", marginTop: 4 }}>
                  Chọn lớp của em
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  width: "100%",
                }}
              >
                {[1, 2, 3, 4, 5].map((g, idx) => (
                  <motion.button
                    key={g}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    onPointerDown={() => handleGradeSelect(g)}
                    whileTap={{ y: 4, boxShadow: "none" }}
                    style={{
                      padding: "18px 0",
                      background: grade === g ? "#FFD600" : "#FFFFFF",
                      border: `3px solid ${grade === g ? "#F5A800" : "#FFD600"}`,
                      boxShadow: `0 4px 0 ${grade === g ? "#C17F00" : "#F5A800"}`,
                      borderRadius: 16,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#3E2000",
                      fontFamily: "'Baloo 2', cursive",
                    }}
                  >
                    Lớp {g}
                  </motion.button>
                ))}
              </div>
              {loading && (
                <div
                  style={{ color: "#7D5A2C", fontWeight: 600, fontSize: 15 }}
                >
                  Đang tạo tài khoản...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
