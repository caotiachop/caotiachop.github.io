import { motion } from 'framer-motion';

const LETTER_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  A: { bg: '#FF4444', shadow: '#AA0000', text: '#fff' },
  B: { bg: '#2979FF', shadow: '#0044CC', text: '#fff' },
  C: { bg: '#00C853', shadow: '#006600', text: '#fff' },
  D: { bg: '#FF6D00', shadow: '#CC3D00', text: '#fff' },
  E: { bg: '#AA00FF', shadow: '#6600AA', text: '#fff' },
  F: { bg: '#F50057', shadow: '#990033', text: '#fff' },
};

interface Props {
  letter: string;
  text: string;
  status?: 'idle' | 'correct' | 'wrong' | 'disabled';
  isSpeaking?: boolean;
  onClick?: () => void;
}

export function AnswerButton({ letter, text, status = 'idle', isSpeaking = false, onClick }: Props) {
  const col = LETTER_COLORS[letter] ?? LETTER_COLORS['A'];
  const isDisabled = status === 'disabled';

  const cardBg =
    status === 'correct' ? '#E8F5E9' :
    status === 'wrong' ? '#FBE9E7' : '#FFFFFF';
  const cardBorder =
    status === 'correct' ? '#4CAF50' :
    status === 'wrong' ? '#FF5722' : '#FFD600';
  const cardShadow =
    status === 'correct' ? '0 4px 0 #4CAF50' :
    status === 'wrong' ? '0 4px 0 #FF5722' : '0 4px 0 #F5A800';

  const speakShadow = isSpeaking && status === 'idle'
    ? `0 0 0 3px #2196F3, ${cardShadow}`
    : cardShadow;

  return (
    <motion.button
      onPointerDown={!isDisabled ? onClick : undefined}
      animate={status === 'wrong' ? { x: [0, -8, 8, -6, 6, 0] } : {}}
      transition={status === 'wrong' ? { duration: 0.35 } : { type: 'spring', stiffness: 300, damping: 20 }}
      whileTap={!isDisabled ? { scale: 0.96, y: 4 } : {}}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        background: cardBg,
        border: `3px solid ${isSpeaking && status === 'idle' ? '#2196F3' : cardBorder}`,
        boxShadow: speakShadow,
        borderRadius: 16,
        padding: '12px 14px',
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        fontFamily: "'Baloo 2', cursive",
        textAlign: 'left',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: col.bg,
        boxShadow: `3px 3px 0 ${col.shadow}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 24,
          fontWeight: 800,
          color: col.text,
          textShadow: `2px 2px 0 ${col.shadow}`,
          lineHeight: 1,
        }}>
          {letter}
        </span>
      </div>
      <span style={{ fontSize: 17, fontWeight: 600, color: '#3E2000', flex: 1 }}>{text}</span>
    </motion.button>
  );
}
