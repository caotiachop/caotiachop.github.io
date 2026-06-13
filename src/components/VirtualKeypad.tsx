import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Delete, Trash2 } from 'lucide-react';
import { audio } from '../lib/audio';

interface Props {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

const KEYS = ['1','2','3','4','5','6','7','8','9','CLR','0','DEL'];

export function VirtualKeypad({ value, onChange, maxLength = 99, disabled = false }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const cbRef = useRef({ onChange, disabled, maxLength });
  cbRef.current = { onChange, disabled, maxLength };

  const handleKey = (key: string) => {
    if (cbRef.current.disabled) return;
    audio.play('button-click');
    const cur = valueRef.current;
    if (key === 'CLR') { valueRef.current = ''; cbRef.current.onChange(''); return; }
    if (key === 'DEL') {
      const next = cur.slice(0, -1);
      valueRef.current = next;
      cbRef.current.onChange(next);
      return;
    }
    if (cur.length >= cbRef.current.maxLength) return;
    const next = cur + key;
    valueRef.current = next;
    cbRef.current.onChange(next);
  };

  // Physical keyboard support for hardware number keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (cbRef.current.disabled) return;
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); handleKey(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleKey('DEL'); }
      else if (e.key === 'Delete') { e.preventDefault(); handleKey('CLR'); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 10,
      width: '100%',
      maxWidth: 320,
      margin: '0 auto',
    }}>
      {KEYS.map((key) => (
        <motion.button
          key={key}
          onPointerDown={() => handleKey(key)}
          whileTap={{ scale: 0.9, y: 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            height: 68,
            borderRadius: 16,
            fontSize: 26,
            fontWeight: 700,
            fontFamily: "'Baloo 2', cursive",
            border: '3px solid #F5A800',
            background: key === 'CLR' ? '#FBE9E7' : key === 'DEL' ? '#E3F2FD' : '#FFD600',
            color: key === 'CLR' ? '#BF360C' : key === 'DEL' ? '#01579B' : '#3E2000',
            boxShadow: `0 5px 0 ${key === 'CLR' ? '#FF5722' : key === 'DEL' ? '#29B6F6' : '#C17F00'}`,
            cursor: 'pointer',
            userSelect: 'none',
            opacity: disabled ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {key === 'DEL' ? <Delete size={24} /> : key === 'CLR' ? <Trash2 size={20} /> : key}
        </motion.button>
      ))}
    </div>
  );
}
