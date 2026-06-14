import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, ArrowRight, Hash, Type } from 'lucide-react';
import { audio } from '../lib/audio';

const ROWS_ALPHA = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

const ROWS_NUM = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['-','_','.','@'],
];

// Vietnamese diacritical variants (uppercase, matching keyboard)
const LONG_PRESS: Record<string, string[]> = {
  A: ['À','Á','Ả','Ã','Ạ','Â','Ầ','Ấ','Ẩ','Ẫ','Ậ','Ă','Ằ','Ắ','Ẳ','Ẵ','Ặ'],
  E: ['È','É','Ẻ','Ẽ','Ẹ','Ê','Ề','Ế','Ể','Ễ','Ệ'],
  I: ['Ì','Í','Ỉ','Ĩ','Ị'],
  O: ['Ò','Ó','Ỏ','Õ','Ọ','Ô','Ồ','Ố','Ổ','Ỗ','Ộ','Ơ','Ờ','Ớ','Ở','Ỡ','Ợ'],
  U: ['Ù','Ú','Ủ','Ũ','Ụ','Ư','Ừ','Ứ','Ử','Ữ','Ự'],
  Y: ['Ỳ','Ý','Ỷ','Ỹ','Ỵ'],
  D: ['Đ'],
};

interface PopupState {
  chars: string[];
  screenX: number;
  screenY: number;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  disabled?: boolean;
}

export function VirtualTextKeypad({ value, onChange, onSubmit, maxLength = 30, disabled = false }: Props) {
  const [numMode, setNumMode] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const valueRef = useRef(value);
  valueRef.current = value;

  // Stable ref so event listener never captures stale callbacks
  const cbRef = useRef({ onChange, onSubmit, disabled, maxLength });
  cbRef.current = { onChange, onSubmit, disabled, maxLength };

  const popupRef = useRef(popup);
  popupRef.current = popup;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const press = useCallback((char: string) => {
    if (cbRef.current.disabled) return;
    audio.play('button-click');
    const cur = valueRef.current;
    if (cur.length >= cbRef.current.maxLength) return;
    // Auto-capitalize: first char of each word is uppercase, rest lowercase
    const atWordStart = cur.length === 0 || cur[cur.length - 1] === ' ';
    const finalChar = /[a-zA-ZÀ-ỹ]/.test(char)
      ? (atWordStart ? char.toUpperCase() : char.toLowerCase())
      : char;
    const next = cur + finalChar;
    valueRef.current = next;
    cbRef.current.onChange(next);
  }, []);

  const del = useCallback(() => {
    if (cbRef.current.disabled) return;
    audio.play('button-click');
    const next = valueRef.current.slice(0, -1);
    valueRef.current = next;
    cbRef.current.onChange(next);
  }, []);

  // Physical keyboard support — mounts once, reads latest values via refs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (cbRef.current.disabled) return;
      if (popupRef.current) { setPopup(null); return; }
      if (e.key === 'Backspace') { e.preventDefault(); del(); return; }
      if (e.key === 'Enter') { e.preventDefault(); cbRef.current.onSubmit?.(); return; }
      if (e.key === ' ') { e.preventDefault(); press(' '); return; }
      if (e.key.length === 1) press(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [del, press]);

  // Long press for Vietnamese characters
  const startLongPress = (key: string, e: React.PointerEvent<HTMLButtonElement>) => {
    if (!LONG_PRESS[key]) return;
    longPressTriggered.current = false;
    const el = e.currentTarget;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      const r = el.getBoundingClientRect();
      setPopup({ chars: LONG_PRESS[key], screenX: r.left + r.width / 2, screenY: r.top - 8 });
    }, 380);
  };

  const endLongPress = (key: string) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (!longPressTriggered.current) press(key);
    longPressTriggered.current = false;
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const keyStyle = (bg: string, border: string, color = '#3E2000') => ({
    height: 44, borderRadius: 10,
    fontSize: 15, fontWeight: 700, fontFamily: "'Baloo 2', cursive",
    background: bg, border: `2px solid ${border}`, boxShadow: `0 3px 0 ${border}`,
    color, cursor: 'pointer' as const, userSelect: 'none' as const,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    opacity: disabled ? 0.5 : 1, flex: 1,
  });

  const renderAlphaKey = (ch: string) => {
    const hasLp = Boolean(LONG_PRESS[ch]);
    return (
      <motion.button key={ch}
        onPointerDown={(e) => hasLp ? startLongPress(ch, e) : press(ch)}
        onPointerUp={() => hasLp && endLongPress(ch)}
        onPointerLeave={() => hasLp && cancelLongPress()}
        onPointerCancel={() => hasLp && cancelLongPress()}
        whileTap={{ scale: 0.88, y: 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        style={{ ...keyStyle('#FFD600', '#C17F00'), minWidth: 28, position: 'relative' }}
      >
        {ch}
        {/* Small dot indicator for long-press keys */}
        {hasLp && (
          <span style={{
            position: 'absolute', top: 3, right: 4,
            width: 4, height: 4, borderRadius: '50%',
            background: '#C17F00', opacity: 0.6,
            pointerEvents: 'none',
          }} />
        )}
      </motion.button>
    );
  };

  return (
    <>
      {/* Fixed popup — renders outside keyboard so parent overflow:hidden doesn't clip it */}
      <AnimatePresence>
        {popup && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 998 }}
              onPointerDown={() => setPopup(null)}
            />
            {(() => {
              const popupLeft = Math.max(6, Math.min(popup.screenX - 148, window.innerWidth - 304));
              const triLeft = Math.max(14, Math.min(popup.screenX - popupLeft, 278));
              return (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              style={{
                position: 'fixed',
                left: popupLeft,
                bottom: Math.max(6, window.innerHeight - popup.screenY + 4),
                zIndex: 999,
                background: '#FFFFFF',
                border: '2.5px solid #FFD600',
                borderRadius: 14,
                boxShadow: '0 6px 20px rgba(0,0,0,0.22), 0 3px 0 #F5A800',
                padding: '6px 6px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                maxWidth: 'min(calc(100vw - 12px), 296px)',
              }}
            >
              {/* Triangle pointer — points down toward the key */}
              <div style={{
                position: 'absolute',
                bottom: -9, left: triLeft, transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '9px solid #FFD600',
              }} />
              <div style={{
                position: 'absolute',
                bottom: -6, left: triLeft, transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '7px solid #FFFFFF',
              }} />

              {popup.chars.map(ch => (
                <motion.button key={ch}
                  onPointerDown={(e) => { e.stopPropagation(); press(ch); setPopup(null); }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 38, height: 38, flexShrink: 0,
                    borderRadius: 9,
                    background: '#FFD600',
                    border: '2px solid #F5A800',
                    boxShadow: '0 2px 0 #C17F00',
                    fontSize: 15, fontWeight: 800, color: '#3E2000',
                    fontFamily: "'Baloo 2', cursive",
                    cursor: 'pointer',
                  }}
                >{ch}</motion.button>
              ))}
            </motion.div>
              );
            })()}
          </>
        )}
      </AnimatePresence>

      {/* Keyboard */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!numMode ? (
          <>
            {ROWS_ALPHA.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                {row.map(ch => renderAlphaKey(ch))}
                {ri === 2 && (
                  <motion.button onPointerDown={del}
                    whileTap={{ scale: 0.88, y: 3 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    style={{ ...keyStyle('#E3F2FD', '#29B6F6', '#01579B'), minWidth: 48, flex: 1.5 }}
                  >
                    <Delete size={18} />
                  </motion.button>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            {ROWS_NUM.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 5 }}>
                {row.map(ch => (
                  <motion.button key={ch} onPointerDown={() => press(ch)}
                    whileTap={{ scale: 0.88, y: 3 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    style={{ ...keyStyle('#FFD600', '#C17F00'), minWidth: 28 }}
                  >{ch}</motion.button>
                ))}
                {ri === 1 && (
                  <motion.button onPointerDown={del}
                    whileTap={{ scale: 0.88, y: 3 }}
                    style={{ ...keyStyle('#E3F2FD', '#29B6F6', '#01579B'), minWidth: 48, flex: 1.5 }}
                  >
                    <Delete size={18} />
                  </motion.button>
                )}
              </div>
            ))}
          </>
        )}

        {/* Bottom row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <motion.button
            onPointerDown={() => { audio.play('button-click'); setNumMode(m => !m); setPopup(null); }}
            whileTap={{ scale: 0.92, y: 2 }}
            style={{ ...keyStyle('#FFF3A3', '#F5A800'), flex: 1.4, gap: 5 }}
          >
            {numMode ? <Type size={15} /> : <Hash size={15} />}
            {numMode ? 'ABC' : '123'}
          </motion.button>

          <motion.button
            onPointerDown={() => press(' ')}
            whileTap={{ scale: 0.92, y: 2 }}
            style={{ ...keyStyle('#FFFFFF', '#FFD600'), flex: 3, fontSize: 13 }}
          >
            Khoảng cách
          </motion.button>

          <motion.button
            onPointerDown={onSubmit}
            whileTap={{ scale: 0.92, y: 2 }}
            disabled={!onSubmit || value.trim().length === 0}
            style={{
              ...keyStyle(
                value.trim() ? '#4CAF50' : '#F5F5F5',
                value.trim() ? '#2E7D32' : '#BDBDBD',
                '#FFFFFF'
              ),
              flex: 1.4,
              opacity: value.trim() ? 1 : 0.4,
            }}
          >
            <ArrowRight size={20} />
          </motion.button>
        </div>
      </div>
    </>
  );
}
