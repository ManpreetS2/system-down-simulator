import type { DifficultyId } from '../types';

const KEYS = {
  highScore: 'system-down:high-score',
  achievements: 'system-down:achievements',
  sound: 'system-down:sound',
  difficulty: 'system-down:difficulty',
} as const;

function read<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota) — the game still works.
  }
}

export function loadHighScore(): number {
  return read(KEYS.highScore, 0, (v): v is number => typeof v === 'number' && Number.isFinite(v));
}

export function saveHighScore(score: number): void {
  write(KEYS.highScore, score);
}

export function loadAchievements(): string[] {
  return read(KEYS.achievements, [], (v): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );
}

export function saveAchievements(ids: string[]): void {
  write(KEYS.achievements, ids);
}

export function loadSound(): boolean {
  return read(KEYS.sound, true, (v): v is boolean => typeof v === 'boolean');
}

export function saveSound(enabled: boolean): void {
  write(KEYS.sound, enabled);
}

export function loadDifficulty(): DifficultyId {
  return read(
    KEYS.difficulty,
    'engineer',
    (v): v is DifficultyId => v === 'junior' || v === 'engineer' || v === 'senior',
  );
}

export function saveDifficulty(difficulty: DifficultyId): void {
  write(KEYS.difficulty, difficulty);
}
