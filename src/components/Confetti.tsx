import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#FFD600','#FF5722','#4CAF50','#29B6F6','#AB47BC','#FF4081','#FF9800','#00BCD4'];

interface Particle {
  id: number; x: number; delay: number;
  color: string; size: number; rotate: number; drift: number;
}

export function Confetti({ count = 70 }: { count?: number }) {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotate: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
      drift: (Math.random() - 0.5) * 40,
    })), [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 995, overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: '110vh',
            x: `calc(${p.x}vw + ${p.drift}px)`,
            opacity: [1, 1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{ duration: 2.2 + Math.random() * 1.2, delay: p.delay, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: p.size, height: p.size,
            borderRadius: Math.random() > 0.4 ? '50%' : 3,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
