import type { CSSProperties } from 'react';
import type { FoxEmotion } from '../types';

const EMOTION_IDX: Record<FoxEmotion, number> = {
  normal: 2, happy: 3, thinking: 0, angry: 1, sad: 4,
};

// Sprite sheet: 1281 × 384, 5 frames horizontal
// Frame size: 256.2 × 384 → height/width ratio ≈ 1.499
const SPRITE_W = 1281;
const SPRITE_H = 384;
const FRAME_COUNT = 5;
const FRAME_H_RATIO = SPRITE_H / (SPRITE_W / FRAME_COUNT);

interface Props {
  outfit?: string;
  emotion?: FoxEmotion;
  width?: number;
  style?: CSSProperties;
}

export function FoxCharacter({ outfit = 'default', emotion = 'normal', width = 120, style }: Props) {
  const idx = EMOTION_IDX[emotion];
  const height = Math.round(width * FRAME_H_RATIO);

  return (
    <div style={{
      width,
      height,
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
      ...style,
    }}>
      <img
        src={`/assets/fox-charater/${outfit}.png`}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          width: `${FRAME_COUNT * width}px`,
          height: 'auto',
          left: `${-idx * width}px`,
          top: 0,
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
