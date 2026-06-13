import { motion, AnimatePresence } from 'framer-motion';

function formatApples(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = parseFloat((n / 1000).toFixed(1));
    return `${v} ngàn`;
  }
  if (n < 1_000_000_000) {
    const v = parseFloat((n / 1_000_000).toFixed(1));
    return `${v} triệu`;
  }
  const v = parseFloat((n / 1_000_000_000).toFixed(1));
  return `${v} tỷ`;
}

interface Props {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AppleCount({ count, size = 'md' }: Props) {
  const cfg = {
    sm: { img: 20, font: 15, pad: '4px 10px', radius: 20, gap: 5 },
    md: { img: 26, font: 18, pad: '6px 14px', radius: 24, gap: 6 },
    lg: { img: 32, font: 22, pad: '8px 18px', radius: 28, gap: 8 },
  }[size];

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: cfg.gap,
      background: '#FFFFFF',
      border: '3px solid #FFD600',
      borderRadius: cfg.radius,
      padding: cfg.pad,
      boxShadow: '0 3px 0 #F5A800',
    }}>
      <img src="/assets/apple.webp" width={cfg.img} height={cfg.img} alt="táo"
        style={{ objectFit: 'contain', flexShrink: 0 }} />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ fontWeight: 800, fontSize: cfg.font, color: '#3E2000', lineHeight: 1, whiteSpace: 'nowrap' }}
        >
          {formatApples(count)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
