export type DifficultyId = 'junior' | 'engineer' | 'senior';

export type Severity = 'SEV1' | 'SEV2' | 'SEV3';

export type Risk = 'low' | 'medium' | 'high';

/** What a decision primarily optimizes for. */
export type Focus = 'speed' | 'safety' | 'cost' | 'customer';

export type Quality = 'success' | 'partial' | 'failure';

export interface Effects {
  /** System health, 0–100 scale delta. */
  health: number;
  /** Customer trust, 0–100 scale delta. */
  trust: number;
  /** Direct revenue delta in dollars (before time-based loss). */
  revenue: number;
  /** Engineering budget delta in dollars (spend is negative). */
  budget: number;
}

export interface DelayedEffect {
  /** Shown when the effect lands, at the resolution of a later incident. */
  message: string;
  effects: Effects;
  score: number;
}

export interface Outcome {
  quality: Quality;
  score: number;
  effects: Effects;
  /** Plain-language engineering explanation of why this worked or failed. */
  explanation: string;
  delayed?: DelayedEffect;
}

export interface IncidentAction {
  id: string;
  label: string;
  detail: string;
  risk: Risk;
  focus: Focus;
  /** Simulated remediation time in minutes; drives extra revenue loss. */
  timeCostMin: number;
  /** 0–1 probability the action succeeds. 1 = deterministic. */
  successChance: number;
  success: Outcome;
  failure?: Outcome;
}

export interface InfraImpact {
  cpu?: number;
  memory?: number;
  dbLatency?: number;
  errorRate?: number;
  requestVolume?: number;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  /** Realistic alert text, as a paging system would render it. */
  alert: string;
  symptoms: string[];
  /** Infra metric deltas applied while the incident is active. */
  impact: InfraImpact;
  /** Revenue lost per minute while unresolved, in dollars. */
  revenueLossPerMin: number;
  /** Health drain per second while unresolved. */
  healthDrainPerSec: number;
  /** Trust drain per second while unresolved. */
  trustDrainPerSec: number;
  /** What an experienced incident responder would actually do. */
  recommended: string;
  actions: IncidentAction[];
  /** Applied automatically if the countdown expires. */
  timeout: Outcome;
}

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  tagline: string;
  incidentCount: number;
  timerSec: number;
  /** Multiplier applied to negative consequences. */
  consequenceMult: number;
  startBudget: number;
  startHealth: number;
  startTrust: number;
  /** Budget accrual granted between incidents. */
  budgetAccrual: number;
  /** Passive health/trust recovery between incidents. */
  recoveryHealth: number;
  recoveryTrust: number;
}

export interface Metrics {
  health: number;
  trust: number;
  budget: number;
  /** Net company revenue generated this shift (can go negative). */
  revenue: number;
  revenueLost: number;
  revenueSaved: number;
  spend: number;
}

export interface InfraState {
  cpu: number;
  memory: number;
  dbLatency: number;
  errorRate: number;
  requestVolume: number;
  uptimePct: number;
}

export interface DelayedQueued extends DelayedEffect {
  sourceIncident: string;
}

export interface DecisionRecord {
  incidentId: string;
  incidentTitle: string;
  severity: Severity;
  category: string;
  actionLabel: string | null;
  risk: Risk | null;
  focus: Focus | null;
  quality: Quality;
  timedOut: boolean;
  score: number;
  responseSec: number;
  /** Seconds into the shift when the incident was resolved. */
  atShiftSec: number;
  totalRevenueDelta: number;
  effects: Effects;
  explanation: string;
}

export interface ResolvedResult {
  record: DecisionRecord;
  outcome: Outcome;
  incident: Incident;
  action: IncidentAction | null;
  timeLossRevenue: number;
  delayedLanded: DelayedQueued[];
  delayedQueuedMessage: string | null;
}

export type Phase = 'idle' | 'incident' | 'result' | 'over';

export interface GameState {
  phase: Phase;
  difficulty: DifficultyId;
  queue: string[];
  index: number;
  metrics: Metrics;
  infra: InfraState;
  score: number;
  streak: number;
  bestStreak: number;
  minHealth: number;
  minTrust: number;
  shiftStartedAt: number;
  shiftElapsedSec: number;
  downtimeSec: number;
  incidentStartedAt: number | null;
  incidentDeadline: number | null;
  lastResult: ResolvedResult | null;
  pendingDelayed: DelayedQueued[];
  records: DecisionRecord[];
  gameOverReason: string | null;
  healthHistory: number[];
  trustHistory: number[];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Checked after each resolution ('decision') or at shift end ('shift'). */
  scope: 'decision' | 'shift';
  check: (state: GameState, config: DifficultyConfig) => boolean;
}
