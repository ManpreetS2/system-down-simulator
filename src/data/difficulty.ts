import type { DifficultyConfig, DifficultyId } from '../types';

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  junior: {
    id: 'junior',
    label: 'Junior',
    tagline: 'Longer timers, forgiving consequences, 6 incidents.',
    incidentCount: 6,
    timerSec: 75,
    consequenceMult: 0.75,
    startBudget: 90_000,
    startHealth: 100,
    startTrust: 92,
    budgetAccrual: 7_000,
    recoveryHealth: 5,
    recoveryTrust: 3,
  },
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    tagline: 'Balanced pressure and stakes, 8 incidents.',
    incidentCount: 8,
    timerSec: 55,
    consequenceMult: 1,
    startBudget: 70_000,
    startHealth: 96,
    startTrust: 86,
    budgetAccrual: 5_000,
    recoveryHealth: 4,
    recoveryTrust: 2,
  },
  senior: {
    id: 'senior',
    label: 'Senior',
    tagline: 'Short timers, harsh consequences, 10 incidents.',
    incidentCount: 10,
    timerSec: 40,
    consequenceMult: 1.35,
    startBudget: 55_000,
    startHealth: 92,
    startTrust: 80,
    budgetAccrual: 4_000,
    recoveryHealth: 3,
    recoveryTrust: 2,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['junior', 'engineer', 'senior'];

/** Theoretical max score per incident, used for grading. */
export const MAX_SCORE_PER_INCIDENT = 120;
