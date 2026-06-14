import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Music,
  Volume2,
  X,
  LogOut,
  TriangleAlert,
  Key,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "../lib/store";
import { audio } from "../lib/audio";
import { VirtualKeypad } from "./VirtualKeypad";

interface SettingsCtxType {
  open: () => void;
}
const SettingsCtx = createContext<SettingsCtxType | null>(null);

export function useOpenSettings() {
  return useContext(SettingsCtx)!;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SettingsCtx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      {createPortal(
        <SettingsOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />,
        document.body,
      )}
    </SettingsCtx.Provider>
  );
}

export function SettingsButton() {
  const ctx = useContext(SettingsCtx);
  return (
    <motion.button
      onPointerDown={() => {
        audio.play("button-click");
        ctx?.open();
      }}
      whileTap={{ scale: 0.88 }}
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "rgba(255,214,0,0.9)",
        border: "2px solid #F5A800",
        boxShadow: "0 3px 0 #C17F00",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#3E2000",
        flexShrink: 0,
      }}
    >
      <Settings size={17} />
    </motion.button>
  );
}

type SettingsPanel =
  | "main"
  | "logout"
  | "pin-verify"
  | "pin-new"
  | "pin-confirm"
  | "pin-done";

function SettingsOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { currentUser, updateSettings, logout, updatePin } = useApp();
  const [panel, setPanel] = useState<SettingsPanel>("main");
  const [musicVol, setMusicVol] = useState(() => audio.getMusicVolume());
  const [soundVol, setSoundVol] = useState(() => audio.getSoundVolume());

  // PIN change state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinShake, setPinShake] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const triggerPinShake = (msg: string) => {
    setPinShake(true);
    setTimeout(() => setPinShake(false), 400);
    setPinError(msg);
  };

  // Reset all pin state
  const resetPin = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmNewPin("");
    setPinError("");
    setPinShake(false);
    setPinLoading(false);
  };

  // Reset whenever dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPanel("main");
      resetPin();
    }
  }, [isOpen]);

  const handleMusic = (v: number) => {
    setMusicVol(v);
    audio.setMusicVolume(v);
    updateSettings({ music: v > 0, musicVol: v });
  };

  const handleSound = (v: number) => {
    setSoundVol(v);
    audio.setSoundVolume(v);
    updateSettings({ sound: v > 0, soundVol: v });
  };

  const handleLogout = () => {
    audio.play("button-back");
    logout();
    setPanel("main");
    onClose();
    navigate("/");
  };

  const handleClose = () => {
    setPanel("main");
    resetPin();
    onClose();
  };

  // ── PIN change handlers ───────────────────────────────────────────────────
  const handleVerifyPin = async (val: string) => {
    setCurrentPin(val);
    setPinError("");
    if (val.length !== 4) return;
    setPinLoading(true);
    const result = await updatePin(val, val); // validate only – pass same pin to check
    setPinLoading(false);
    // We only use updatePin for verification here; actual change happens at pin-confirm
    // Instead, call getData to verify: reuse updatePin logic via a verify-only approach.
    // Since updatePin(current, current) would set pin to same value if correct:
    if (result === "ok") {
      setTimeout(() => {
        setNewPin("");
        setPanel("pin-new");
      }, 180);
    } else {
      setCurrentPin("");
      triggerPinShake("PIN hiện tại không đúng!");
    }
  };

  const handleNewPin = (val: string) => {
    setNewPin(val);
    setPinError("");
    if (val.length === 4)
      setTimeout(() => {
        setConfirmNewPin("");
        setPanel("pin-confirm");
      }, 180);
  };

  const handleConfirmNewPin = async (val: string) => {
    setConfirmNewPin(val);
    setPinError("");
    if (val.length !== 4) return;
    if (val !== newPin) {
      setTimeout(() => {
        setConfirmNewPin("");
        triggerPinShake("PIN không khớp, nhập lại!");
      }, 180);
      return;
    }
    setPinLoading(true);
    const result = await updatePin(currentPin, newPin);
    setPinLoading(false);
    if (result === "ok") {
      audio.play("success");
      setPanel("pin-done");
    } else {
      resetPin();
      setPanel("pin-verify");
      triggerPinShake("Lỗi xác thực, thử lại!");
    }
  };

  const pinDots = (val: string) => (
    <motion.div
      animate={pinShake ? { x: [0, -10, 10, -8, 8, 0] } : {}}
      transition={{ duration: 0.35 }}
      style={{ display: "flex", gap: 16, justifyContent: "center" }}
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: val.length > i ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 400 }}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: val.length > i ? "#FFD600" : "transparent",
            border: `3px solid ${val.length > i ? "#F5A800" : "#BDBDBD"}`,
            boxShadow: val.length > i ? "0 2px 0 #C17F00" : "none",
          }}
        />
      ))}
    </motion.div>
  );

  const isPinPanel = panel.startsWith("pin");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(62,32,0,0.48)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 640,
              background: "#FFFBEA",
              borderRadius: "24px 24px 0 0",
              border: "3px solid #FFD600",
              borderBottom: "none",
              padding: isPinPanel ? "20px 20px 0" : "20px 20px 44px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <AnimatePresence mode="wait">
              {/* ── Main panel ── */}
              {panel === "main" && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#3E2000",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Settings size={20} /> Cài đặt
                    </div>
                    <motion.button
                      onPointerDown={handleClose}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "#FBE9E7",
                        border: "2px solid #FF5722",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FF5722",
                      }}
                    >
                      <X size={17} />
                    </motion.button>
                  </div>

                  <VolSlider
                    icon={Music}
                    label="Nhạc nền"
                    value={musicVol}
                    onChange={handleMusic}
                  />
                  <VolSlider
                    icon={Volume2}
                    label="Âm thanh"
                    value={soundVol}
                    onChange={handleSound}
                  />

                  {currentUser && (
                    <>
                      <motion.button
                        onPointerDown={() => {
                          audio.play("button-click");
                          resetPin();
                          setPanel("pin-verify");
                        }}
                        whileTap={{ scale: 0.97, y: 3 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          padding: "14px 0",
                          maxWidth: 440,
                          width: "100%",
                          alignSelf: "center",
                          background: "#FFFFFF",
                          border: "2px solid #FFD600",
                          borderRadius: 16,
                          boxShadow: "0 3px 0 #F5A800",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#3E2000",
                          fontFamily: "'Baloo 2', cursive",
                        }}
                      >
                        <Key size={18} color="#F5A800" /> Đổi mã PIN
                      </motion.button>
                      <motion.button
                        onPointerDown={() => {
                          audio.play("button-click");
                          setPanel("logout");
                        }}
                        whileTap={{ scale: 0.97, y: 3 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          padding: "14px 0",
                          maxWidth: 440,
                          width: "100%",
                          alignSelf: "center",
                          background: "#FBE9E7",
                          border: "2px solid #FF5722",
                          borderRadius: 16,
                          boxShadow: "0 3px 0 #FF5722",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#BF360C",
                          fontFamily: "'Baloo 2', cursive",
                        }}
                      >
                        <LogOut size={20} /> Đăng xuất
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}

              {/* ── Logout confirm panel ── */}
              {panel === "logout" && (
                <motion.div
                  key="logout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <TriangleAlert size={52} color="#FF8C00" />
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#3E2000",
                      }}
                    >
                      Bạn có chắc muốn đăng xuất?
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#7D5A2C", marginTop: 6 }}
                    >
                      Tiến trình đã được lưu an toàn trên server.
                    </div>
                  </div>
                  <motion.button
                    onPointerDown={handleLogout}
                    whileTap={{ y: 4, boxShadow: "none" }}
                    style={{
                      width: "100%",
                      maxWidth: 440,
                      alignSelf: "center",
                      padding: "14px 0",
                      background: "#FF5722",
                      border: "3px solid #BF360C",
                      boxShadow: "0 4px 0 #BF360C",
                      borderRadius: 16,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#FFFFFF",
                      fontFamily: "'Baloo 2', cursive",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <LogOut size={18} /> Có, đăng xuất
                  </motion.button>
                  <motion.button
                    onPointerDown={() => setPanel("main")}
                    whileTap={{ y: 4, boxShadow: "none" }}
                    style={{
                      width: "100%",
                      maxWidth: 440,
                      alignSelf: "center",
                      padding: "14px 0",
                      background: "#FFD600",
                      border: "3px solid #F5A800",
                      boxShadow: "0 4px 0 #C17F00",
                      borderRadius: 16,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#3E2000",
                      fontFamily: "'Baloo 2', cursive",
                    }}
                  >
                    Không, ở lại
                  </motion.button>
                </motion.div>
              )}

              {/* ── PIN: Verify current ── */}
              {panel === "pin-verify" && (
                <motion.div
                  key="pin-verify"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    flex: 1,
                    marginBottom: '2rem'
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <motion.button
                      onPointerDown={() => {
                        resetPin();
                        setPanel("main");
                      }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#7D5A2C",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "'Baloo 2', cursive",
                      }}
                    >
                      <ArrowLeft size={18} /> Quay lại
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
                      <Key size={18} color="#F5A800" /> Đổi mã PIN
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#3E2000",
                      }}
                    >
                      Nhập PIN hiện tại
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#7D5A2C", marginTop: 2 }}
                    >
                      Xác nhận danh tính trước khi đổi
                    </div>
                  </div>
                  {pinDots(currentPin)}
                  {pinError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
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
                      {pinError}
                    </motion.div>
                  )}
                  {pinLoading && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#7D5A2C",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Đang kiểm tra...
                    </div>
                  )}
                  <VirtualKeypad
                    value={currentPin}
                    onChange={handleVerifyPin}
                    maxLength={4}
                    disabled={pinLoading}
                  />
                </motion.div>
              )}

              {/* ── PIN: Enter new ── */}
              {panel === "pin-new" && (
                <motion.div
                  key="pin-new"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    flex: 1,
                    marginBottom: '2rem'
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <motion.button
                      onPointerDown={() => {
                        setCurrentPin("");
                        setPanel("pin-verify");
                      }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#7D5A2C",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "'Baloo 2', cursive",
                      }}
                    >
                      <ArrowLeft size={18} /> Quay lại
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
                      <ShieldCheck size={18} color="#4CAF50" /> Tạo PIN mới
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#3E2000",
                      }}
                    >
                      Nhập PIN mới
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#7D5A2C", marginTop: 2 }}
                    >
                      Chọn 4 số bí mật mới
                    </div>
                  </div>
                  {pinDots(newPin)}
                  <VirtualKeypad
                    value={newPin}
                    onChange={handleNewPin}
                    maxLength={4}
                  />
                </motion.div>
              )}

              {/* ── PIN: Confirm new ── */}
              {panel === "pin-confirm" && (
                <motion.div
                  key="pin-confirm"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    flex: 1,
                    marginBottom: '2rem'
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <motion.button
                      onPointerDown={() => {
                        setNewPin("");
                        setPanel("pin-new");
                      }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#7D5A2C",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "'Baloo 2', cursive",
                      }}
                    >
                      <ArrowLeft size={18} /> Quay lại
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
                      <CheckCircle2 size={18} color="#4CAF50" /> Xác nhận PIN
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#3E2000",
                      }}
                    >
                      Nhập lại PIN mới
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#7D5A2C", marginTop: 2 }}
                    >
                      PIN đã nhập: {"●".repeat(newPin.length)}
                    </div>
                  </div>
                  {pinDots(confirmNewPin)}
                  {pinError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
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
                      {pinError}
                    </motion.div>
                  )}
                  {pinLoading && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#7D5A2C",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Đang lưu...
                    </div>
                  )}
                  <VirtualKeypad
                    value={confirmNewPin}
                    onChange={handleConfirmNewPin}
                    maxLength={4}
                    disabled={pinLoading}
                  />
                </motion.div>
              )}

              {/* ── PIN: Done ── */}
              {panel === "pin-done" && (
                <motion.div
                  key="pin-done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    alignItems: "center",
                    padding: "12px 0 28px",
                    marginBottom: '2rem'
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, -6, 6, 0],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <CheckCircle2 size={72} color="#4CAF50" />
                  </motion.div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#3E2000",
                      }}
                    >
                      Đổi PIN thành công!
                    </div>
                    <div
                      style={{ fontSize: 14, color: "#7D5A2C", marginTop: 6 }}
                    >
                      Mã PIN mới đã được lưu lại.
                    </div>
                  </div>
                  <motion.button
                    onPointerDown={() => {
                      resetPin();
                      setPanel("main");
                    }}
                    whileTap={{ y: 4, boxShadow: "none" }}
                    style={{
                      padding: "14px 48px",
                      background: "#FFD600",
                      border: "3px solid #F5A800",
                      boxShadow: "0 5px 0 #C17F00",
                      borderRadius: 18,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#3E2000",
                      fontFamily: "'Baloo 2', cursive",
                    }}
                  >
                    Xong!
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VolSlider({
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
        borderRadius: 16,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
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
          <Icon size={18} color={value > 0 ? "#3E2000" : "#BDBDBD"} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: value > 0 ? "#3E2000" : "#BDBDBD",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: 14,
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
