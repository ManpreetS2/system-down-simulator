import { getIncidentRubric } from '../../data/rubrics';
import { INTENT_LABELS, extractIntents, normalizeResponseText } from './intents';
import type {
  DetectedConcept,
  GradeContext,
  GradeResult,
  IntentId,
  ResponseGrader,
} from './types';
import type { Effects, Focus, Quality, Risk } from '../../types';

const VAGUE_ONLY = /^(fix( it)?|help|idk|not sure|do something|handle it|resolve it)\.?$/i;

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function buildEffects(quality: Quality, dangerous: boolean, communicated: boolean): Effects {
  if (dangerous || quality === 'failure') {
    return { health: -8, trust: -6, revenue: -12000, budget: 0 };
  }
  if (quality === 'partial') {
    return {
      health: 2,
      trust: communicated ? 2 : 0,
      revenue: -3000,
      budget: -1000,
    };
  }
  return {
    health: 6,
    trust: communicated ? 4 : 2,
    revenue: 6000,
    budget: -1000,
  };
}

function scoreFrom(quality: Quality, requiredHit: number, requiredTotal: number, helpful: number, dangerous: number): number {
  if (dangerous > 0 && requiredHit === 0) return -45;
  if (quality === 'failure') return -35;
  if (quality === 'partial') return 40 + helpful * 5 + requiredHit * 8;
  return 90 + requiredHit * 8 + helpful * 5 - (requiredTotal - requiredHit) * 5;
}

export class LocalRubricGrader implements ResponseGrader {
  readonly id = 'local-rubric';

  grade(text: string, context: GradeContext): GradeResult {
    const rawText = text.trim();
    const normalized = normalizeResponseText(rawText);
    const rubric = getIncidentRubric(context.incidentId);
    const extracted = extractIntents(rawText);
    const detectedIntents = unique(extracted.map((e) => e.intent));

    const detected: DetectedConcept[] = extracted.map((e) => ({
      intent: e.intent,
      label: INTENT_LABELS[e.intent],
      matchedPhrase: e.matchedPhrase,
    }));

    const wordCount = normalized ? normalized.split(' ').length : 0;
    const tooVague =
      !normalized ||
      wordCount < 3 ||
      VAGUE_ONLY.test(normalized) ||
      (detectedIntents.length === 0 && wordCount < 8);

    const requiredHit = rubric.required.filter((i) => detectedIntents.includes(i));
    const missedRequired = rubric.required.filter((i) => !detectedIntents.includes(i));
    const helpfulHit = rubric.helpful.filter((i) => detectedIntents.includes(i));
    const dangerous = unique([
      ...rubric.harmful.filter((i) => detectedIntents.includes(i)),
      ...rubric.contradictory.filter((i) => detectedIntents.includes(i)),
    ]);
    const riskyHit = rubric.risky.filter((i) => detectedIntents.includes(i));
    const communicated = rubric.customerCommunication.some((i) => detectedIntents.includes(i));
    const validated = rubric.validation.some((i) => detectedIntents.includes(i));
    const prevention = rubric.prevention.some((i) => detectedIntents.includes(i));

    let confidence = 0.2;
    if (detectedIntents.length > 0) confidence += Math.min(0.55, detectedIntents.length * 0.18);
    if (requiredHit.length > 0) confidence += 0.15 * (requiredHit.length / Math.max(1, rubric.required.length));
    if (wordCount >= 8) confidence += 0.08;
    if (tooVague) confidence = Math.min(confidence, 0.35);
    confidence = Math.max(0, Math.min(0.98, confidence));

    const needsClarification = tooVague || (confidence < 0.45 && detectedIntents.length <= 1);

    let quality: Quality = 'partial';
    if (dangerous.length > 0 && requiredHit.length === 0) quality = 'failure';
    else if (
      requiredHit.length >= Math.ceil(rubric.required.length * 0.67) &&
      dangerous.length === 0
    ) {
      quality = 'success';
    } else if (dangerous.length > 0 && requiredHit.length > 0) {
      quality = 'partial';
    } else if (requiredHit.length === 0 && helpfulHit.length === 0) {
      quality = detectedIntents.length === 0 ? 'failure' : 'partial';
    }

    const risk: Risk =
      dangerous.length > 0 ? 'high' : riskyHit.length > 0 ? 'medium' : requiredHit.length > 0 ? 'low' : 'medium';

    let focus: Focus = 'safety';
    if (detectedIntents.includes('communicate_status')) focus = 'customer';
    else if (detectedIntents.includes('scale') || detectedIntents.includes('restart')) focus = 'speed';
    else if (detectedIntents.includes('rate_limit') && !requiredHit.length) focus = 'cost';

    const effects = buildEffects(quality, dangerous.length > 0 && requiredHit.length === 0, communicated);
    if (validated && quality !== 'failure') effects.health += 1;
    if (prevention && quality === 'success') effects.budget -= 500;

    const score = needsClarification
      ? 0
      : scoreFrom(quality, requiredHit.length, rubric.required.length, helpfulHit.length, dangerous.length);

    const interpretedParts = detected.map((d) => d.label);
    const interpreted =
      interpretedParts.length > 0
        ? `Detected plan: ${interpretedParts.join('; ')}.`
        : 'No clear remediation intents were recognized.';

    const explanation = needsClarification
      ? 'The response is too vague or incomplete to grade confidently. Clarify the specific investigation or remediation steps you would take.'
      : buildExplanation({
          quality,
          requiredHit,
          missedRequired,
          dangerous,
          helpfulHit,
          communicated,
          validated,
          investigated: context.investigatedSourceIds.length,
        });

    const suggestedActionIds = rubric.preferredActionId ? [rubric.preferredActionId] : [];

    return {
      interpreted,
      detected,
      missedRequired,
      dangerous,
      confidence,
      needsClarification,
      clarificationPrompt: needsClarification
        ? 'Try naming a concrete action (for example: roll back the deploy, kill the runaway queries, or revoke the exposed key) and any validation step.'
        : null,
      suggestedActionIds,
      quality,
      score,
      effects,
      risk,
      focus,
      explanation,
      rawText,
    };
  }
}

function buildExplanation(args: {
  quality: Quality;
  requiredHit: IntentId[];
  missedRequired: IntentId[];
  dangerous: IntentId[];
  helpfulHit: IntentId[];
  communicated: boolean;
  validated: boolean;
  investigated: number;
}): string {
  const bits: string[] = [];
  if (args.quality === 'success') {
    bits.push('This plan covers the core containment steps an experienced responder would prioritize.');
  } else if (args.quality === 'partial') {
    bits.push('Parts of this plan help, but key steps are missing or the approach is incomplete.');
  } else {
    bits.push('This response is likely to make the incident worse or leave the root cause untouched.');
  }

  if (args.dangerous.length) {
    bits.push(
      `Risky/harmful ideas detected (${args.dangerous.map((i) => INTENT_LABELS[i]).join(', ')}): these can destroy evidence or widen blast radius.`,
    );
  }
  if (args.missedRequired.length) {
    bits.push(
      `Missing important concepts: ${args.missedRequired.map((i) => INTENT_LABELS[i]).join(', ')}.`,
    );
  }
  if (args.helpfulHit.length) {
    bits.push(`Helpful additions noted: ${args.helpfulHit.map((i) => INTENT_LABELS[i]).join(', ')}.`);
  }
  if (args.communicated) bits.push('Customer communication was included — that protects trust during impact.');
  if (args.validated) bits.push('Validation steps improve confidence that the fix actually worked.');
  if (args.investigated === 0) {
    bits.push('Little investigation was recorded before acting; confirming evidence first usually reduces risk.');
  }
  return bits.join(' ');
}
