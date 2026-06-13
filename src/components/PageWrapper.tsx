import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  scroll?: boolean;
}

export function PageWrapper({ children, style, scroll = false }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      style={{ position: 'absolute', inset: 0, overflowY: scroll ? 'auto' : 'hidden', ...style }}
    >
      {children}
    </motion.div>
  );
}
