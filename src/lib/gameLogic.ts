function fibMax(level: number): number {
  if (level <= 2) return 10;
  let a = 10, b = 10;
  for (let i = 3; i <= level; i++) [a, b] = [b, a + b];
  return Math.min(b, 1_000_000);
}

export function maxAnswer(level: number): number {
  return fibMax(level);
}

export function timeLimit(level: number): number {
  return Math.max(20 - (level - 1), 5);
}

export function requiredCorrect(level: number): number {
  if (level <= 20) return 5;
  if (level <= 40) return 10;
  return 15;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateQuestion(level: number): { expression: string; answer: number } {
  const max = maxAnswer(level);

  // Level 100+: 40% chance to produce a single × or ÷ question with integer answer.
  if (level >= 100 && Math.random() < 0.4) {
    if (Math.random() < 0.5) {
      const a = randInt(2, 9);
      const bMax = Math.max(2, Math.min(99, Math.floor(max / Math.max(a, 1))));
      const b = randInt(2, bMax);
      return { expression: `${a} × ${b}`, answer: a * b };
    } else {
      const b = randInt(2, 9);
      const resultMax = Math.max(2, Math.min(999, Math.floor(max / b)));
      const result = randInt(2, resultMax);
      const a = b * result;
      return { expression: `${a} ÷ ${b}`, answer: result };
    }
  }

  const numCount = level <= 5 ? 2 : level <= 15 ? 3 : randInt(3, 4);
  const perNum = Math.max(1, Math.floor(max / numCount));

  for (let attempt = 0; attempt < 120; attempt++) {
    const nums = Array.from({ length: numCount }, () => randInt(0, perNum));
    const ops: string[] = [];
    let result = nums[0];
    for (let i = 1; i < numCount; i++) {
      const op = Math.random() < 0.55 ? '+' : '-';
      ops.push(op);
      result = op === '+' ? result + nums[i] : result - nums[i];
    }
    if (result >= 0 && result <= max) {
      let expr = String(nums[0]);
      ops.forEach((op, i) => { expr += ` ${op === '+' ? '+' : '−'} ${nums[i + 1]}`; });
      return { expression: expr, answer: result };
    }
  }

  const a = randInt(0, Math.floor(max / 2));
  const b = randInt(0, max - a);
  return { expression: `${a} + ${b}`, answer: a + b };
}
