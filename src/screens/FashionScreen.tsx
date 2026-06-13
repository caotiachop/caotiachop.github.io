import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shirt,
  ChevronLeft,
  ChevronRight,
  Check,
  Coins,
  ShoppingBag,
  Gift,
  Sparkles,
  Star,
} from "lucide-react";
import { SettingsButton } from "../components/Settings";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "../components/PageWrapper";
import { FoxCharacter } from "../components/FoxCharacter";
import { AppleCount } from "../components/AppleCount";
import { Confetti } from "../components/Confetti";
import { useApp } from "../lib/store";
import { audio } from "../lib/audio";

const OUTFITS = [
  { key: "default", name: "Mặc định", price: 0 },
  { key: "short", name: "Quần Short", price: 50 },
  { key: "white-shirt", name: "Áo Trắng", price: 80 },
  { key: "white-t-shirt", name: "Áo Thun Trắng", price: 80 },
  { key: "hoodie", name: "Hoodie", price: 150 },
  { key: "black-vest", name: "Áo Vest Đen", price: 200 },
  { key: "west", name: "Áo West", price: 250 },
  { key: "white-black", name: "Trắng Đen", price: 350 },
  { key: "wear-yellow", name: "Vàng Nổi Bật", price: 450 },
  { key: "red-sportswear", name: "Thể Thao Đỏ", price: 700 },
  { key: "pink-heart", name: "Tim Hồng", price: 1200 },
];

export function FashionScreen() {
  const navigate = useNavigate();
  const { currentUser, user, purchaseOutfit, updateOutfit } = useApp();
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (!user) return 0;
    const i = OUTFITS.findIndex((o) => o.key === user.currentOutfit);
    return i >= 0 ? i : 0;
  });
  const [buying, setBuying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  if (!currentUser || !user) {
    navigate("/", { replace: true });
    return null;
  }

  const outfit = OUTFITS[currentIdx];
  const owned = Boolean(user.purchasedOutfits?.[outfit.key]);
  const wearing = user.currentOutfit === outfit.key;
  const canBuy = user.apples >= outfit.price;

  const prev = () => {
    audio.play("button-click");
    setCurrentIdx((i) => (i - 1 + OUTFITS.length) % OUTFITS.length);
  };
  const next = () => {
    audio.play("button-click");
    setCurrentIdx((i) => (i + 1) % OUTFITS.length);
  };

  const handleBuy = async () => {
    if (buying || owned || !canBuy) return;
    setBuying(true);
    audio.play("cute");
    const ok = await purchaseOutfit(outfit.key, outfit.price);
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1800);
    }
    setBuying(false);
  };

  const handleWear = async () => {
    if (!owned || wearing) return;
    audio.play("button-click");
    await updateOutfit(outfit.key);
  };

  return (
    <PageWrapper>
      <div
        style={{
          height: "100%",
          backgroundImage: "url(/assets/background-2.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 16px 12px",
            background: "rgba(255,214,0,0.9)",
            backdropFilter: "blur(8px)",
            borderBottom: "3px solid #F5A800",
            gap: "1rem",
          }}
        >
          <motion.button
            onPointerDown={() => {
              audio.play("button-back");
              navigate("/menu");
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
            <Shirt size={20} /> Cáo Thời Trang
          </div>
          <div style={{ flex: 1 }}></div>
          <AppleCount count={user.apples} size="sm" />
          <SettingsButton />
        </div>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 5,
            padding: "10px 0 0",
          }}
        >
          {OUTFITS.map((o, i) => (
            <motion.div
              key={o.key}
              animate={{ scale: i === currentIdx ? 1.4 : 1 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: user.purchasedOutfits?.[o.key]
                  ? i === currentIdx
                    ? "#FFD600"
                    : "#4CAF50"
                  : i === currentIdx
                    ? "#FFD600"
                    : "rgba(255,255,255,0.5)",
                border: i === currentIdx ? "2px solid #F5A800" : "none",
              }}
            />
          ))}
        </div>

        {/* Fox preview */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            background: owned
              ? wearing
                ? "radial-gradient(ellipse at center, rgba(76,175,80,0.18) 0%, transparent 70%)"
                : "radial-gradient(ellipse at center, rgba(255,214,0,0.22) 0%, transparent 70%)"
              : undefined,
            transition: "background 0.4s",
          }}
        >
          <motion.button
            onPointerDown={prev}
            whileTap={{ scale: 0.85 }}
            style={{
              position: "absolute",
              left: 12,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "3px solid #FFD600",
              boxShadow: "0 4px 0 #F5A800",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={24} />
          </motion.button>

          <AnimatePresence mode="wait">
            <motion.div
              key={outfit.key}
              initial={{ opacity: 0, scale: 0.8, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -30 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
              onTouchStart={()=>setIsTouch(true)}
              onMouseDown={() => setIsTouch(true)}
              onTouchEnd={()=>setIsTouch(false)}
              onMouseUp={() => setIsTouch(false)}
            >
              <FoxCharacter
                outfit={outfit.key}
                emotion={isTouch ? "happy" : "normal"}
                width={180}
              />

              {/* Badge đã mua / đang mặc */}
              {owned && (
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
                  style={{
                    position: "absolute",
                    top: 0,
                    right: -8,
                    background: wearing ? "#4CAF50" : "#FFD600",
                    border: `3px solid ${wearing ? "#2E7D32" : "#F5A800"}`,
                    boxShadow: `0 3px 0 ${wearing ? "#1B5E20" : "#C17F00"}`,
                    borderRadius: 20,
                    padding: "5px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 800,
                    color: wearing ? "#fff" : "#3E2000",
                    fontFamily: "'Baloo 2', cursive",
                    whiteSpace: "nowrap",
                  }}
                >
                  {wearing ? (
                    <><Check size={13} /> Đang mặc</>
                  ) : (
                    <><Sparkles size={13} /> Đã mua</>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          <motion.button
            onPointerDown={next}
            whileTap={{ scale: 0.85 }}
            style={{
              position: "absolute",
              right: 12,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "3px solid #FFD600",
              boxShadow: "0 4px 0 #F5A800",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={24} />
          </motion.button>
        </div>

        {/* Info card */}
        <motion.div
          layout
          style={{
            background: owned
              ? wearing
                ? "rgba(232,245,233,0.98)"
                : "rgba(255,251,234,0.98)"
              : "rgba(255,251,234,0.96)",
            borderTop: `3px solid ${owned ? (wearing ? "#4CAF50" : "#FFD600") : "#FFD600"}`,
            borderRadius: "24px 24px 0 0",
            padding: "20px 20px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            transition: "background 0.3s, border-color 0.3s",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#3E2000" }}>
                {outfit.name}
              </div>
              <div style={{ fontSize: 13, color: "#7D5A2C", marginTop: 4 }}>
                {owned ? (
                  wearing ? (
                    <motion.span
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "#E8F5E9", border: "2px solid #4CAF50",
                        borderRadius: 20, padding: "3px 10px",
                        fontWeight: 700, color: "#2E7D32", fontSize: 13,
                      }}
                    >
                      <Check size={13} color="#4CAF50" /> Đang mặc
                    </motion.span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(255,214,0,0.25)", border: "2px solid #F5A800",
                        borderRadius: 20, padding: "3px 10px",
                        fontWeight: 700, color: "#7D5A2C", fontSize: 13,
                      }}
                    >
                      <Sparkles size={13} color="#F5A800" /> Đã mua
                    </span>
                  )
                ) : (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Coins size={14} />
                    {outfit.price === 0 ? "Miễn phí" : `${outfit.price} Táo`}
                  </span>
                )}
              </div>
            </div>
            {outfit.price > 0 && !owned && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img src="/assets/apple.png" width={22} alt="táo" />
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: canBuy ? "#3E2000" : "#FF5722",
                  }}
                >
                  {outfit.price}
                </span>
              </div>
            )}
          </div>

          {!owned && outfit.price > 0 && !canBuy && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "#FBE9E7",
                border: "2px solid #FF5722",
                borderRadius: 12,
                padding: "8px 14px",
                fontSize: 13,
                color: "#BF360C",
                fontWeight: 600,
              }}
            >
              Còn thiếu {outfit.price - user.apples} táo nữa thôi! 😅
            </motion.div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            {!owned ? (
              <motion.button
                onPointerDown={handleBuy}
                whileTap={{ y: 4, boxShadow: "none" }}
                disabled={!canBuy || buying}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: canBuy ? "#FFD600" : "#F5F5F5",
                  border: `3px solid ${canBuy ? "#F5A800" : "#BDBDBD"}`,
                  boxShadow: canBuy ? "0 5px 0 #C17F00" : "none",
                  borderRadius: 16,
                  fontSize: 17,
                  fontWeight: 800,
                  color: canBuy ? "#3E2000" : "#9E9E9E",
                  fontFamily: "'Baloo 2', cursive",
                  opacity: buying ? 0.7 : 1,
                }}
              >
                {buying ? (
                  "Đang mua..."
                ) : outfit.price === 0 ? (
                  <>
                    <Gift size={18} /> Lấy miễn phí
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} /> Mua ngay
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                onPointerDown={handleWear}
                whileTap={{ y: 4, boxShadow: "none" }}
                disabled={wearing}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  background: wearing ? "#E8F5E9" : "#FFD600",
                  border: `3px solid ${wearing ? "#4CAF50" : "#F5A800"}`,
                  boxShadow: wearing ? "none" : "0 5px 0 #C17F00",
                  borderRadius: 16,
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#3E2000",
                  fontFamily: "'Baloo 2', cursive",
                }}
              >
                {wearing ? (
                  <>
                    <Check size={18} color="#4CAF50" /> Đang mặc
                  </>
                ) : (
                  <>
                    <Shirt size={18} /> Mặc trang phục này
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Owned count */}
          <div style={{ textAlign: "center", fontSize: 12, color: "#7D5A2C" }}>
            Đã sở hữu {Object.keys(user.purchasedOutfits ?? {}).length} /{" "}
            {OUTFITS.length} trang phục
          </div>
        </motion.div>

        {/* Buy success overlay */}
        <AnimatePresence>
          {showSuccess && (
            <>
              <Confetti count={55} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(62,32,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                  zIndex: 10,
                }}
              >
                <motion.div
                  initial={{ scale: 0.6, y: 40, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.8, y: -20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  style={{
                    background: "#FFFBEA",
                    border: "4px solid #FFD600",
                    borderRadius: 28,
                    boxShadow: "0 8px 0 #C17F00",
                    padding: "32px 40px 28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 240,
                  }}
                >
                  {/* Star icon with bounce */}
                  <motion.div
                    animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.25, 1] }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                  >
                    <Star size={64} fill="#FFD600" color="#F5A800" />
                  </motion.div>

                  <div style={{ fontSize: 26, fontWeight: 800, color: "#3E2000", textAlign: "center" }}>
                    Mua thành công!
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{
                      background: "#FFD600",
                      border: "3px solid #F5A800",
                      borderRadius: 16,
                      padding: "8px 20px",
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#3E2000",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 4px 0 #C17F00",
                    }}
                  >
                    <Sparkles size={16} color="#F5A800" />
                    {outfit.name}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{ fontSize: 13, color: "#7D5A2C", fontWeight: 600 }}
                  >
                    <Check size={13} style={{ verticalAlign: "middle" }} /> Đã thêm vào tủ đồ của bạn
                  </motion.div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
