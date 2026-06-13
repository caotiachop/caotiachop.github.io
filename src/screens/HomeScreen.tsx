import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, Rocket } from "lucide-react";
import { PageWrapper } from "../components/PageWrapper";
import { FoxCharacter } from "../components/FoxCharacter";
import { AppleCount } from "../components/AppleCount";
import { SettingsButton } from "../components/Settings";
import { useApp } from "../lib/store";
import { audio } from "../lib/audio";

export function HomeScreen() {
  const navigate = useNavigate();
  const { currentUser, user } = useApp();

  const handleStart = () => {
    audio.play("button-click");
    if (currentUser) navigate("/menu");
    else navigate("/login");
  };

  return (
    <PageWrapper>
      <div
        style={{
          height: "100%",
          backgroundImage: "url(/assets/background.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 20px 36px",
        }}
      >
        {/* Top bar */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ width: 38 }} />
          {currentUser && user && <AppleCount count={user.apples} size="sm" />}
          <SettingsButton />
        </motion.div>

        {/* Logo with ring-ring animation */}
        <motion.img
          src="/assets/logo.webp"
          alt="logo"
          initial={{ y: -20, opacity: 0, scale: 0.8 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            rotate: [0, -6, 6, -4, 4, -2, 2, 0],
          }}
          transition={{
            y: { type: "spring", stiffness: 200, damping: 18, delay: 0.15 },
            opacity: { delay: 0.15, duration: 0.4 },
            scale: { type: "spring", stiffness: 200, damping: 18, delay: 0.15 },
            rotate: {
              delay: 1.2,
              duration: 0.7,
              repeat: Infinity,
              repeatDelay: 3.5,
              ease: "easeInOut",
            },
          }}
          style={{
            height: "30vh",
            maxHeight: 320,
            objectFit: "contain",
            marginBottom: 8,
          }}
        />

        {/* Fox */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 18,
            delay: 0.25,
          }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {currentUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                background: "#FFD600",
                border: "3px solid #F5A800",
                borderRadius: 20,
                padding: "4px 18px",
                fontWeight: 700,
                fontSize: 15,
                color: "#3E2000",
                boxShadow: "0 3px 0 #C17F00",
              }}
            >
              Xin chào, {currentUser}!
            </motion.div>
          )}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          >
            <FoxCharacter
              outfit={currentUser && user ? user.currentOutfit : "default"}
              emotion="normal"
              width={120}
            />
          </motion.div>
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ width: "100%" }}
        >
          <motion.div
            animate={{ x: [0, -4, 4, -4, 4, 0] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 4,
              delay: 2,
            }}
            style={{ maxWidth: 460, margin: "0 auto", width: "100%" }}
          >
            <motion.button
              onPointerDown={handleStart}
              whileTap={{ y: 6, boxShadow: "none" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                width: "100%",
                padding: "18px 0",
                background: "#FFD600",
                border: "3px solid #F5A800",
                boxShadow: "0 6px 0 #C17F00",
                borderRadius: 20,
                fontSize: 20,
                fontWeight: 800,
                color: "#3E2000",
                fontFamily: "'Baloo 2', cursive",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {currentUser ? (
                <>
                  <Gamepad2 size={22} /> Chơi tiếp!
                </>
              ) : (
                <>
                  <Rocket size={22} /> Bắt đầu!
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
