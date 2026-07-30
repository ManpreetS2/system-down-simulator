import { DIFFICULTIES } from '../data/difficulty';
import { getIncident } from '../data/incidents';
import type {
  DecisionRecord,
  DelayedQueued,
  DifficultyId,
  Effects,
  GameState,
  Incident,
  IncidentAction,
  InfraState,
  Metrics,
  Outcome,
} from '../types';

export const INFRA_BASELINE: InfraState = {
  cpu: 34,
  memory: 47,
  dbLatency: 88,
  errorRate: 0.4,
  requestVolume: 100,
  uptimePct: 100,
};

export type GameAction =
  | { type: 'START'; difficulty: DifficultyId; queue: string[]; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'CHOOSE'; actionId: string; roll: number; now: number }
  | { type: 'CONTINUE'; now: number }
  | { type: 'RESET' };

export function initialState(difficulty: DifficultyId): GameState {
  const config = DIFFICULTIES[difficulty];
  return {
    phase: 'idle',
    difficulty,
    queue: [],
    index: 0,
    metrics: {
      health: config.startHealth,
      trust: config.startTrust,
      budget: config.startBudget,
      revenue: 0,
      revenueLost: 0,
      revenueSaved: 0,
      spend: 0,
    },
    infra: { ...INFRA_BASELINE },
    score: 0,
    streak: 0,
    bestStreak: 0,
    minHealth: config.startHealth,
    minTrust: config.startTrust,
    shiftStartedAt: 0,
    shiftElapsedSec: 0,
    downtimeSec: 0,
    incidentStartedAt: null,
    incidentDeadline: null,
    lastResult: null,
    pendingDelayed: [],
    records: [],
    gameOverReason: null,
    healthHistory: [config.startHealth],
    trustHistory: [config.startTrust],
  };
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Negative consequences scale with difficulty; positive ones do not. */
function scaleEffects(effects: Effects, mult: number): Effects {
  const scale = (v: number): number => (v < 0 ? Math.round(v * mult) : v);
  return {
    health: scale(effects.health),
    trust: scale(effects.trust),
    revenue: scale(effects.revenue),
    budget: scale(effects.budget),
  };
}

function applyEffects(metrics: Metrics, effects: Effects): Metrics {
  return {
    ...metrics,
    health: clamp(metrics.health + effects.health, 0, 100),
    trust: clamp(metrics.trust + effects.trust, 0, 100),
    budget: metrics.budget + effects.budget,
    revenue: metrics.revenue + effects.revenue,
    spend: metrics.spend + Math.max(0, -effects.budget),
    revenueSaved: metrics.revenueSaved + Math.max(0, effects.revenue),
    revenueLost: metrics.revenueLost + Math.max(0, -effects.revenue),
  };
}

function gameOverReasonFor(metrics: Metrics): string | null {
  if (metrics.health <= 0)
    return 'System health hit zero. The platform went completely dark and leadership called the shift.';
  if (metrics.trust <= 0)
    return 'Customer trust hit zero. Churn spiked past the point of recovery and the shift was called.';
  if (metrics.budget <= 0)
    return 'The engineering budget ran dry. The company is insolvent and the shift was called.';
  return null;
}

function currentIncident(state: GameState): Incident | null {
  const id = state.queue[state.index];
  return id ? getIncident(id) : null;
}

function moveToward(current: number, target: number, rate: number, jitter: number): number {
  const next = current + (target - current) * rate + (Math.random() - 0.5) * jitter;
  return Math.max(0, next);
}

function stepInfra(infra: InfraState, incident: Incident | null, uptimePct: number): InfraState {
  const impact = incident?.impact ?? {};
  return {
    cpu: clamp(moveToward(infra.cpu, INFRA_BASELINE.cpu + (impact.cpu ?? 0), 0.12, 2.4), 1, 100),
    memory: clamp(
      moveToward(infra.memory, INFRA_BASELINE.memory + (impact.memory ?? 0), 0.12, 1.6),
      1,
      100,
    ),
    dbLatency: moveToward(
      infra.dbLatency,
      INFRA_BASELINE.dbLatency + (impact.dbLatency ?? 0),
      0.12,
      7,
    ),
    errorRate: Math.max(
      0,
      moveToward(infra.errorRate, INFRA_BASELINE.errorRate + (impact.errorRate ?? 0), 0.12, 0.3),
    ),
    requestVolume: Math.max(
      4,
      moveToward(
        infra.requestVolume,
        INFRA_BASELINE.requestVolume + (impact.requestVolume ?? 0),
        0.12,
        4,
      ),
    ),
    uptimePct,
  };
}

interface ResolveArgs {
  state: GameState;
  incident: Incident;
  action: IncidentAction | null;
  outcome: Outcome;
  timedOut: boolean;
  now: number;
}

function resolveIncident({ state, incident, action, outcome, timedOut, now }: ResolveArgs): GameState {
  const config = DIFFICULTIES[state.difficulty];
  const scaled = scaleEffects(outcome.effects, config.consequenceMult);

  // Slower remediations bleed more revenue while the fix is applied.
  const timeLossRevenue = action
    ? Math.round(action.timeCostMin * incident.revenueLossPerMin * config.consequenceMult)
    : 0;

  let metrics = applyEffects(state.metrics, scaled);
  metrics = {
    ...metrics,
    revenue: metrics.revenue - timeLossRevenue,
    revenueLost: metrics.revenueLost + timeLossRevenue,
  };

  // Delayed consequences queued by earlier decisions land now.
  const delayedLanded: DelayedQueued[] = [];
  let delayedScore = 0;
  for (const pending of state.pendingDelayed) {
    const scaledDelayed = scaleEffects(pending.effects, config.consequenceMult);
    metrics = applyEffects(metrics, scaledDelayed);
    delayedScore += pending.score;
    delayedLanded.push({ ...pending, effects: scaledDelayed });
  }

  const pendingDelayed: DelayedQueued[] = outcome.delayed
    ? [{ ...outcome.delayed, sourceIncident: incident.title }]
    : [];

  const responseSec = state.incidentStartedAt ? (now - state.incidentStartedAt) / 1000 : 0;
  const failed = timedOut || outcome.quality === 'failure';
  const streak = failed ? 0 : state.streak + 1;

  const record: DecisionRecord = {
    incidentId: incident.id,
    incidentTitle: incident.title,
    severity: incident.severity,
    category: incident.category,
    actionLabel: action?.label ?? null,
    risk: action?.risk ?? null,
    focus: action?.focus ?? null,
    quality: outcome.quality,
    timedOut,
    score: outcome.score,
    responseSec,
    atShiftSec: (now - state.shiftStartedAt) / 1000,
    totalRevenueDelta: scaled.revenue - timeLossRevenue,
    effects: scaled,
    explanation: outcome.explanation,
  };

  const gameOverReason = gameOverReasonFor(metrics);

  return {
    ...state,
    phase: 'result',
    metrics,
    score: state.score + outcome.score + delayedScore,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    minHealth: Math.min(state.minHealth, metrics.health),
    minTrust: Math.min(state.minTrust, metrics.trust),
    incidentStartedAt: null,
    incidentDeadline: null,
    lastResult: {
      record,
      outcome,
      incident,
      action,
      timeLossRevenue,
      delayedLanded,
      delayedQueuedMessage: outcome.delayed
        ? 'This decision has a delayed consequence. It will surface later in the shift.'
        : null,
    },
    pendingDelayed,
    records: [...state.records, record],
    gameOverReason,
    healthHistory: [...state.healthHistory, metrics.health],
    trustHistory: [...state.trustHistory, metrics.trust],
  };
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START': {
      const fresh = initialState(action.difficulty);
      return {
        ...fresh,
        phase: 'incident',
        queue: action.queue,
        shiftStartedAt: action.now,
        incidentStartedAt: action.now,
        incidentDeadline: action.now + DIFFICULTIES[action.difficulty].timerSec * 1000,
      };
    }

    case 'TICK': {
      if (state.phase !== 'incident' && state.phase !== 'result') return state;
      const config = DIFFICULTIES[state.difficulty];
      const incident = state.phase === 'incident' ? currentIncident(state) : null;
      const dt = 0.25; // ticker period in seconds
      const shiftElapsedSec = (action.now - state.shiftStartedAt) / 1000;

      let downtimeSec = state.downtimeSec;
      let metrics = state.metrics;

      if (incident) {
        const mult = config.consequenceMult;
        const revenueBleed = (incident.revenueLossPerMin / 60) * dt * mult;
        metrics = {
          ...metrics,
          health: clamp(metrics.health - incident.healthDrainPerSec * dt * mult, 0, 100),
          trust: clamp(metrics.trust - incident.trustDrainPerSec * dt * mult, 0, 100),
          revenue: metrics.revenue - revenueBleed,
          revenueLost: metrics.revenueLost + revenueBleed,
        };
        if (incident.severity === 'SEV1') downtimeSec += dt;
      }

      // Uptime is measured against at least a 10-minute window so a few
      // seconds of SEV1 at the start of a shift doesn't read as 0%.
      const uptimePct = clamp(100 * (1 - downtimeSec / Math.max(shiftElapsedSec, 600)), 0, 100);

      // Sample health/trust for the trend sparklines every ~2 seconds.
      const sample = Math.floor(shiftElapsedSec / 2) > Math.floor(state.shiftElapsedSec / 2);
      const healthHistory = sample
        ? [...state.healthHistory, metrics.health].slice(-200)
        : state.healthHistory;
      const trustHistory = sample
        ? [...state.trustHistory, metrics.trust].slice(-200)
        : state.trustHistory;

      const next: GameState = {
        ...state,
        shiftElapsedSec,
        downtimeSec,
        metrics,
        minHealth: Math.min(state.minHealth, metrics.health),
        minTrust: Math.min(state.minTrust, metrics.trust),
        infra: stepInfra(state.infra, incident, uptimePct),
        healthHistory,
        trustHistory,
      };

      if (!incident) return next;

      // Drains collapsed a core metric — the incident overwhelms the shift.
      if (metrics.health <= 0 || metrics.trust <= 0) {
        return resolveIncident({
          state: next,
          incident,
          action: null,
          outcome: incident.timeout,
          timedOut: true,
          now: action.now,
        });
      }

      // Countdown expired — the timeout consequence applies automatically.
      if (state.incidentDeadline !== null && action.now >= state.incidentDeadline) {
        return resolveIncident({
          state: next,
          incident,
          action: null,
          outcome: incident.timeout,
          timedOut: true,
          now: action.now,
        });
      }

      return next;
    }

    case 'CHOOSE': {
      if (state.phase !== 'incident') return state;
      const incident = currentIncident(state);
      if (!incident) return state;
      const chosen = incident.actions.find((a) => a.id === action.actionId);
      if (!chosen) return state;
      const outcome =
        action.roll <= chosen.successChance || !chosen.failure ? chosen.success : chosen.failure;
      return resolveIncident({
        state,
        incident,
        action: chosen,
        outcome,
        timedOut: false,
        now: action.now,
      });
    }

    case 'CONTINUE': {
      if (state.phase !== 'result') return state;
      const config = DIFFICULTIES[state.difficulty];

      if (state.gameOverReason !== null || state.index + 1 >= state.queue.length) {
        return { ...state, phase: 'over', shiftElapsedSec: (action.now - state.shiftStartedAt) / 1000 };
      }

      // Between incidents the org stabilizes a little: partial recovery keeps
      // one bad call from spiraling into an unwinnable shift.
      const metrics: Metrics = {
        ...state.metrics,
        health: clamp(state.metrics.health + config.recoveryHealth, 0, 100),
        trust: clamp(state.metrics.trust + config.recoveryTrust, 0, 100),
        budget: state.metrics.budget + config.budgetAccrual,
      };

      return {
        ...state,
        phase: 'incident',
        index: state.index + 1,
        metrics,
        lastResult: null,
        incidentStartedAt: action.now,
        incidentDeadline: action.now + config.timerSec * 1000,
      };
    }

    case 'RESET':
      return initialState(state.difficulty);

    default:
      return state;
  }
}

export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
