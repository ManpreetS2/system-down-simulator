import type { Effects, Focus, Quality, Risk } from '../../types';

/** Reliability of a piece of information shown to the player. */
export type EvidenceKind = 'confirmed' | 'indicator' | 'assumption' | 'unknown';

export type ScenarioPhase = 'triage' | 'investigating' | 'ready';

export type InvestigationSourceId =
  | 'deployments'
  | 'app-logs'
  | 'db-metrics'
  | 'network'
  | 'auth-logs'
  | 'cache'
  | 'customer-reports'
  | 'status-page';

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  text: string;
  /** Optional junior-friendly glossary term. */
  glossary?: string;
}

export interface InvestigationSource {
  id: InvestigationSourceId;
  label: string;
  /** Seconds of response-window time spent inspecting this source. */
  timeCostSec: number;
  findings: EvidenceItem[];
  /** Optional infra metric nudges once this source is inspected. */
  indicatorHints?: Partial<{
    cpu: number;
    memory: number;
    dbLatency: number;
    errorRate: number;
    requestVolume: number;
  }>;
  /** Marks this source as especially relevant on Junior. */
  highlight?: boolean;
}

export interface IncidentBrief {
  /** Short customer-impact summary shown at triage. */
  customerImpact: string;
  /** Initial confirmed evidence (usually 1–2 lines). */
  initialEvidence: EvidenceItem[];
  /** Keys of key indicators to emphasize (subset of dashboard metrics). */
  keyIndicators: Array<'health' | 'trust' | 'revenueLoss' | 'cpu' | 'memory' | 'dbLatency' | 'errorRate' | 'requestVolume'>;
  investigations: InvestigationSource[];
}

/** Normalized remediation / investigation intents the local grader understands. */
export type IntentId =
  | 'investigate_logs'
  | 'inspect_deployment'
  | 'rollback'
  | 'restart'
  | 'scale'
  | 'rate_limit'
  | 'shed_load'
  | 'disable_feature'
  | 'rotate_credentials'
  | 'revoke_credentials'
  | 'preserve_logs'
  | 'verify_data'
  | 'restore_gradually'
  | 'communicate_status'
  | 'monitor'
  | 'add_prevention'
  | 'failover'
  | 'cache_purge'
  | 'queue_retry'
  | 'waf_challenge'
  | 'kill_queries'
  | 'issue_certificate'
  | 'pause_campaign'
  | 'edge_cache';

export interface ResponseRubric {
  required: IntentId[];
  helpful: IntentId[];
  risky: IntentId[];
  harmful: IntentId[];
  contradictory: IntentId[];
  customerCommunication: IntentId[];
  validation: IntentId[];
  prevention: IntentId[];
  /** Preferred multiple-choice action id when open response maps cleanly. */
  preferredActionId?: string;
}

export interface DetectedConcept {
  intent: IntentId;
  label: string;
  matchedPhrase: string;
}

export interface GradeResult {
  interpreted: string;
  detected: DetectedConcept[];
  missedRequired: IntentId[];
  dangerous: IntentId[];
  confidence: number;
  needsClarification: boolean;
  clarificationPrompt: string | null;
  /** Closest structured actions offered when confidence is low. */
  suggestedActionIds: string[];
  quality: Quality;
  score: number;
  effects: Effects;
  risk: Risk;
  focus: Focus;
  explanation: string;
  rawText: string;
}

export interface GradeContext {
  incidentId: string;
  investigatedSourceIds: string[];
  difficulty: 'junior' | 'engineer' | 'senior';
}

export interface ResponseGrader {
  readonly id: string;
  grade(text: string, context: GradeContext): GradeResult;
}
