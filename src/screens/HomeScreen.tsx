import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Rocket, Info } from "lucide-react";
import { PageWrapper } from "../components/PageWrapper";
import { FoxCharacter } from "../components/FoxCharacter";
import { AppleCount } from "../components/AppleCount";
import { SettingsButton } from "../components/Settings";
import { useApp } from "../lib/store";
import { audio } from "../lib/audio";

const INFO_TEXT = `🦊 Chào mừng đến với Cáo Tia Chớp!

Đây là ứng dụng học toán vui dành riêng cho học sinh tiểu học — nơi mỗi bài học đều trở thành một cuộc phiêu lưu cùng chú cáo thông minh!

⚡ Cáo Tia Chớp
Thử thách phản xạ tính toán! Trả lời các phép tính nhanh nhất có thể trước khi hết giờ. Lên cấp càng cao, bài càng khó — bạn có thể chinh phục được không?

📚 Cáo Giáo Sư
Ôn luyện kiến thức theo từng bộ câu hỏi do thầy cô tạo ra. Trả lời đúng để nhận táo vàng và cải thiện điểm số của bạn.

👗 Cáo Thời Trang
Dùng táo vàng kiếm được để mua trang phục đặc biệt cho chú cáo. Sưu tập đủ bộ để mở khóa danh hiệu!

🏆 Cáo Thành Tích
Xem thứ hạng của bạn so với các bạn trong lớp. Ai sẽ là người dẫn đầu bảng vàng?

🎯 Mục tiêu
Mỗi ngày học một chút, kiên trì luyện tập — bạn sẽ trở thành thiên tài toán học mà không hề nhận ra!

Chúc bạn học vui và đạt nhiều táo vàng nhé! 🍎✨`;

export function HomeScreen() {
  const navigate = useNavigate();
  const { currentUser, user } = useApp();
  const [showInfo, setShowInfo] = useState(false);

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
          <motion.button
            onPointerDown={() => { audio.play('button-click'); setShowInfo(true); }}
            whileTap={{ scale: 0.88 }}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)', border: '2px solid #F5A800',
              boxShadow: '0 3px 0 #C17F00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7D5A2C', fontWeight: 900, fontSize: 18,
            }}
          ><Info size={18} /></motion.button>
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

      {/* Info overlay */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              backgroundImage: 'url(/assets/background.webp)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Scrolling content: fox + text together */}
            <motion.div
              initial={{ y: '100vh' }}
              animate={{ y: '-100%' }}
              transition={{ duration: 22, ease: 'linear' }}
              onAnimationComplete={() => setShowInfo(false)}
              style={{
                width: '100%', maxWidth: 480,
                padding: '60px 28px 80px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 24,
              }}
            >
              {/* Fox rotating while scrolling */}
              <motion.div
                animate={{ rotate: [0, -12, 12, -8, 8, -4, 4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FoxCharacter outfit={currentUser && user ? user.currentOutfit : 'default'} emotion="happy" width={130} />
              </motion.div>

              {/* Info text */}
              <div style={{
                textAlign: 'center',
                fontFamily: "'Baloo 2', cursive",
                whiteSpace: 'pre-line',
                lineHeight: 2,
                fontSize: 16,
                fontWeight: 600,
                color: '#3E2000',
                background: 'rgba(255,251,234,0.88)',
                border: '3px solid #FFD600',
                borderRadius: 24,
                padding: '24px 20px',
                boxShadow: '0 6px 0 #F5A800',
              }}>
                {INFO_TEXT}
              </div>

              {/* Bottom fox (waving goodbye) */}
              <motion.div
                animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <FoxCharacter outfit={currentUser && user ? user.currentOutfit : 'default'} emotion="normal" width={100} />
              </motion.div>
            </motion.div>

            {/* Tap to skip */}
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              onPointerDown={() => setShowInfo(false)}
              style={{
                position: 'absolute', bottom: 36,
                background: 'rgba(255,214,0,0.92)',
                border: '3px solid #F5A800',
                boxShadow: '0 4px 0 #C17F00',
                borderRadius: 20, padding: '10px 28px',
                color: '#3E2000', fontSize: 15, fontWeight: 800,
                fontFamily: "'Baloo 2', cursive",
              }}
            >Bấm để bỏ qua</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
