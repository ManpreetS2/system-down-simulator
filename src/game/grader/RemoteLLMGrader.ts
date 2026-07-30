import type { GradeContext, GradeResult, ResponseGrader } from './types';

/**
 * Placeholder adapter for a future server-hosted grader.
 *
 * Not connected in this public build: no network calls, API keys, or paid
 * services. The live app uses LocalRubricGrader so play stays deterministic,
 * private, free, and testable offline.
 */
export class RemoteLLMGrader implements ResponseGrader {
  readonly id = 'remote-llm-adapter';

  grade(_text: string, _context: GradeContext): GradeResult {
    throw new Error(
      'RemoteLLMGrader is not enabled in this build. Use LocalRubricGrader, or host a future server-side evaluator behind this adapter.',
    );
  }
}
