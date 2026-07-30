import { LocalRubricGrader } from './LocalRubricGrader';
import type { ResponseGrader } from './types';

export type { ResponseGrader, GradeResult, GradeContext, IntentId, EvidenceKind } from './types';
export { LocalRubricGrader } from './LocalRubricGrader';
export { RemoteLLMGrader } from './RemoteLLMGrader';
export { INTENT_LABELS, extractIntents, normalizeResponseText } from './intents';

/** Default grader for the public browser build. */
export const defaultGrader: ResponseGrader = new LocalRubricGrader();
