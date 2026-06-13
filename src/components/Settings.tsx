import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Music, Volume2, X, LogOut, TriangleAlert } from 'lucide-react';
import { useApp } from '../lib/store';
import { audio } from '../lib/audio';

interface SettingsCtxType { open: () => void }
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
        document.body
      )}
    </SettingsCtx.Provider>
  );
}

export function SettingsButton() {
  const ctx = useContext(SettingsCtx);
  return (
    <motion.button
      onPointerDown={() => { audio.play('button-click'); ctx?.open(); }}
      whileTap={{ scale: 0.88 }}
      style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'rgba(255,214,0,0.9)',
        border: '2px solid #F5A800',
        boxShadow: '0 3px 0 #C17F00',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#3E2000', flexShrink: 0,
      }}
    >
      <Settings size={17} />
    </motion.button>
  );
}

function SettingsOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { currentUser, user, updateSettings, logout } = useApp();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [musicVol, setMusicVol] = useState(() => audio.getMusicVolume());
  const [soundVol, setSoundVol] = useState(() => audio.getSoundVolume());

  // Reset confirm state whenever dialog closes
  useEffect(() => {
    if (!isOpen) setConfirmLogout(false);
  }, [isOpen]);

  const handleMusic = (v: number) => {
    setMusicVol(v);
    audio.setMusicVolume(v);
    if (user) updateSettings({ music: v > 0 });
  };

  const handleSound = (v: number) => {
    setSoundVol(v);
    audio.setSoundVolume(v);
    if (user) updateSettings({ sound: v > 0 });
  };

  const handleLogout = () => {
    audio.play('button-back');
    logout();
    setConfirmLogout(false);
    onClose();
    navigate('/');
  };

  const handleClose = () => { setConfirmLogout(false); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(62,32,0,0.48)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onPointerDown={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 640,
              background: '#FFFBEA',
              borderRadius: '24px 24px 0 0',
              border: '3px solid #FFD600', borderBottom: 'none',
              padding: '20px 20px 44px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <AnimatePresence mode="wait">
              {!confirmLogout ? (
                <motion.div key="main"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#3E2000', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Settings size={20} /> Cài đặt
                    </div>
                    <motion.button onPointerDown={handleClose} whileTap={{ scale: 0.9 }}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: '#FBE9E7', border: '2px solid #FF5722',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5722',
                      }}
                    ><X size={17} /></motion.button>
                  </div>

                  <VolSlider icon={Music} label="Nhạc nền" value={musicVol} onChange={handleMusic} />
                  <VolSlider icon={Volume2} label="Âm thanh" value={soundVol} onChange={handleSound} />

                  {currentUser && (
                    <motion.button
                      onPointerDown={() => { audio.play('button-click'); setConfirmLogout(true); }}
                      whileTap={{ scale: 0.97, y: 3 }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        padding: '14px 0', marginTop: 4, maxWidth: 440, width: '100%', alignSelf: 'center',
                        background: '#FBE9E7', border: '2px solid #FF5722',
                        borderRadius: 16, boxShadow: '0 3px 0 #FF5722',
                        fontSize: 16, fontWeight: 700, color: '#BF360C',
                        fontFamily: "'Baloo 2', cursive",
                      }}
                    >
                      <LogOut size={20} /> Đăng xuất
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="confirm"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}
                >
                  <TriangleAlert size={52} color="#FF8C00" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#3E2000' }}>
                      Bạn có chắc muốn đăng xuất?
                    </div>
                    <div style={{ fontSize: 13, color: '#7D5A2C', marginTop: 6 }}>
                      Tiến trình đã được lưu an toàn trên server.
                    </div>
                  </div>
                  <motion.button onPointerDown={handleLogout} whileTap={{ y: 4, boxShadow: 'none' }}
                    style={{
                      width: '100%', maxWidth: 440, alignSelf: 'center', padding: '14px 0',
                      background: '#FF5722', border: '3px solid #BF360C',
                      boxShadow: '0 4px 0 #BF360C', borderRadius: 16,
                      fontSize: 16, fontWeight: 800, color: '#FFFFFF',
                      fontFamily: "'Baloo 2', cursive",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  ><LogOut size={18} /> Có, đăng xuất</motion.button>
                  <motion.button onPointerDown={() => setConfirmLogout(false)} whileTap={{ y: 4, boxShadow: 'none' }}
                    style={{
                      width: '100%', maxWidth: 440, alignSelf: 'center', padding: '14px 0',
                      background: '#FFD600', border: '3px solid #F5A800',
                      boxShadow: '0 4px 0 #C17F00', borderRadius: 16,
                      fontSize: 16, fontWeight: 800, color: '#3E2000',
                      fontFamily: "'Baloo 2', cursive",
                    }}
                  >Không, ở lại</motion.button>
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
  icon: Icon, label, value, onChange,
}: {
  icon: typeof Music;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <div style={{
      background: '#FFFFFF', border: '2px solid #FFD600',
      borderRadius: 16, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={18} color={value > 0 ? '#3E2000' : '#BDBDBD'} />
          <span style={{ fontSize: 15, fontWeight: 700, color: value > 0 ? '#3E2000' : '#BDBDBD' }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: value > 0 ? '#F5A800' : '#BDBDBD', minWidth: 32, textAlign: 'right' }}>
          {value === 0 ? 'Tắt' : `${pct}%`}
        </span>
      </div>
      <input
        type="range" min="0" max="1" step="0.05" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="vol-slider"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
