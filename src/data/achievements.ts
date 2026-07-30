import type { AchievementDef } from '../types';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-responder',
    title: 'First Responder',
    description: 'Successfully resolve an incident in under 15 seconds.',
    scope: 'decision',
    check: (state) => {
      const last = state.records[state.records.length - 1];
      return !!last && last.quality === 'success' && last.responseSec < 15;
    },
  },
  {
    id: 'calm-under-pressure',
    title: 'Calm Under Pressure',
    description: 'Resolve three incidents in a row without a single failure.',
    scope: 'decision',
    check: (state) => state.streak >= 3,
  },
  {
    id: 'zero-downtime',
    title: 'Zero Downtime',
    description: 'Complete a shift without system health ever dropping below 60%.',
    scope: 'shift',
    check: (state) => state.gameOverReason === null && state.minHealth >= 60,
  },
  {
    id: 'budget-guardian',
    title: 'Budget Guardian',
    description: 'Complete a shift spending less than 25% of the starting budget.',
    scope: 'shift',
    check: (state, config) =>
      state.gameOverReason === null && state.metrics.spend < config.startBudget * 0.25,
  },
  {
    id: 'trust-saver',
    title: 'Trust Saver',
    description: 'End a shift with customer trust at 90% or higher.',
    scope: 'shift',
    check: (state) => state.gameOverReason === null && state.metrics.trust >= 90,
  },
  {
    id: 'perfect-shift',
    title: 'Perfect Shift',
    description: 'Complete a full shift where every decision succeeds.',
    scope: 'shift',
    check: (state) =>
      state.gameOverReason === null &&
      state.records.length > 0 &&
      state.records.every((r) => r.quality === 'success'),
  },
];
