/**
 * Deterministic smoke test for the game engine and local response grader.
 * Run with: npm run test:engine
 */
import { DIFFICULTIES } from '../src/data/difficulty';
import { INCIDENTS } from '../src/data/incidents';
import { getIncidentBrief } from '../src/data/investigations';
import { initialState, MAX_DRAIN_DT_SEC, reducer } from '../src/game/engine';
import { defaultGrader, extractIntents } from '../src/game/grader';
import type { GameState } from '../src/types';

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

const allIds = INCIDENTS.map((i) => i.id);
let now = 1_000_000;

function investigateOnce(state: GameState, clock: number): { state: GameState; now: number } {
  const incidentId = state.queue[state.index];
  const brief = getIncidentBrief(incidentId);
  const source = brief.investigations[0];
  const nextNow = clock + 10;
  return {
    state: reducer(state, { type: 'INVESTIGATE', sourceId: source.id, now: nextNow }),
    now: nextNow,
  };
}

// --- Scenario 1: every incident times out on senior → early game over ---
console.log('Scenario 1: all timeouts on senior');
let s: GameState = reducer(initialState('senior'), {
  type: 'START',
  difficulty: 'senior',
  queue: allIds.slice(0, 10),
  now,
});
assert(s.phase === 'incident', 'shift starts in incident phase');
assert(s.revealedEvidence.length > 0, 'initial evidence is present');
assert(s.scenarioPhase === 'triage', 'senior begins in triage');

let guard = 0;
while (s.phase !== 'over' && guard < 50) {
  guard += 1;
  if (s.phase === 'incident') {
    let ticks = 0;
    while (s.phase === 'incident' && ticks < 500) {
      now += 250;
      s = reducer(s, { type: 'TICK', now });
      ticks += 1;
    }
    assert(s.phase === 'result', `incident ${s.index + 1} timed out into a result`);
    assert(s.lastResult?.record.timedOut === true, 'result is marked as timed out');
    assert(s.lastResult?.record.responseMode === 'timeout', 'timeout response mode recorded');
  } else if (s.phase === 'result') {
    const before = s;
    s = reducer(s, { type: 'CHOOSE', actionId: 'anything', roll: 0.5, now });
    assert(s === before, 'CHOOSE during result phase is a no-op');
    now += 1000;
    s = reducer(s, { type: 'CONTINUE', now });
  }
}
assert(s.phase === 'over', 'shift ends');
assert(s.gameOverReason !== null, `all-timeout shift ends early with a reason: "${s.gameOverReason}"`);
assert(s.metrics.health <= 0 || s.metrics.trust <= 0 || s.metrics.budget <= 0, 'a core metric hit zero');
assert(s.records.length < 10, `ended after ${s.records.length}/10 incidents (early)`);

// --- Scenario 2: investigate then choose carefully on engineer ---
console.log('Scenario 2: investigate-then-act on engineer');
now = 2_000_000;
s = reducer(initialState('engineer'), {
  type: 'START',
  difficulty: 'engineer',
  queue: allIds.slice(0, 8),
  now,
});
guard = 0;
while (s.phase !== 'over' && guard < 50) {
  guard += 1;
  if (s.phase === 'incident') {
    const blocked = reducer(s, {
      type: 'CHOOSE',
      actionId: INCIDENTS.find((i) => i.id === s.queue[s.index])!.actions[0].id,
      roll: 0.01,
      now,
    });
    assert(blocked === s, 'CHOOSE before required investigation is a no-op');

    const investigated = investigateOnce(s, now);
    s = investigated.state;
    now = investigated.now;
    assert(s.investigatedSources.length >= 1, 'investigation recorded');
    assert(s.scenarioPhase === 'ready', 'actions unlock after required investigation');

    now += 3000;
    s = reducer(s, { type: 'TICK', now });
    const incident = INCIDENTS.find((i) => i.id === s.queue[s.index])!;
    const best = [...incident.actions].sort(
      (a, b) => (a.risk === 'low' ? -1 : 1) - (b.risk === 'low' ? -1 : 1),
    )[0];
    s = reducer(s, { type: 'CHOOSE', actionId: best.id, roll: 0.01, now });
    assert(s.phase === 'result', 'choosing an action resolves to result');
    assert(s.lastResult?.record.investigationsUsed >= 1, 'investigation count saved on record');
  } else {
    now += 2000;
    s = reducer(s, { type: 'CONTINUE', now });
  }
}
assert(s.phase === 'over', 'shift completes');
assert(s.gameOverReason === null, 'careful play survives the full shift');
assert(s.records.length === 8, 'all 8 incidents recorded');
assert(s.score > 0, `score is positive (${s.score})`);
assert(
  s.records.every((r) => !r.timedOut),
  'no record marked as timeout',
);

// --- Scenario 3: delayed consequences land on the next resolution ---
console.log('Scenario 3: delayed consequence pipeline');
now = 3_000_000;
s = reducer(initialState('junior'), {
  type: 'START',
  difficulty: 'junior',
  queue: ['db-overload', 'failed-deploy'],
  now,
});
now += 1000;
s = reducer(s, { type: 'CHOOSE', actionId: 'scale-db', roll: 0.5, now });
assert(s.pendingDelayed.length === 1, 'delayed consequence queued');
now += 1000;
s = reducer(s, { type: 'CONTINUE', now });
now += 1000;
s = reducer(s, { type: 'CHOOSE', actionId: 'rollback', roll: 0.5, now });
assert(s.lastResult?.delayedLanded.length === 1, 'delayed consequence lands on next resolution');
assert(s.pendingDelayed.length === 0, 'delayed queue drains');

// --- Scenario 4: suspended-tab catch-up is capped; absolute timeout still works ---
console.log('Scenario 4: elapsed-time drain cap and absolute timeout');
now = 4_000_000;
s = reducer(initialState('junior'), {
  type: 'START',
  difficulty: 'junior',
  queue: ['memory-leak'],
  now,
});
const healthBeforeJump = s.metrics.health;
const trustBeforeJump = s.metrics.trust;
now += 30_000;
s = reducer(s, { type: 'TICK', now });
const healthDrop = healthBeforeJump - s.metrics.health;
const trustDrop = trustBeforeJump - s.metrics.trust;
const incident = INCIDENTS.find((i) => i.id === 'memory-leak')!;
const mult = DIFFICULTIES.junior.consequenceMult;
const maxHealthDrop = incident.healthDrainPerSec * MAX_DRAIN_DT_SEC * mult + 0.0001;
const maxTrustDrop = incident.trustDrainPerSec * MAX_DRAIN_DT_SEC * mult + 0.0001;
assert(healthDrop <= maxHealthDrop, `health drain capped after long gap (${healthDrop.toFixed(4)} <= ${maxHealthDrop.toFixed(4)})`);
assert(trustDrop <= maxTrustDrop, `trust drain capped after long gap (${trustDrop.toFixed(4)} <= ${maxTrustDrop.toFixed(4)})`);
assert(Math.abs(s.shiftElapsedSec - 30) < 0.001, 'wall-clock shift elapsed still advances by 30s');
now = s.incidentDeadline! + 1;
s = reducer(s, { type: 'TICK', now });
assert(s.phase === 'result', 'absolute deadline still times out after a large jump');
assert(s.lastResult?.record.timedOut === true, 'timeout after large jump is marked timed out');

// --- Scenario 5: local open-response grader ---
console.log('Scenario 5: local rubric grader');
const vague = defaultGrader.grade('fix it', {
  incidentId: 'failed-deploy',
  investigatedSourceIds: [],
  difficulty: 'senior',
});
assert(vague.needsClarification, 'vague response asks for clarification');
assert(vague.confidence < 0.5, 'vague response has low confidence');

const strong = defaultGrader.grade(
  'Roll back the latest deployment and monitor error rates after the rollback.',
  {
    incidentId: 'failed-deploy',
    investigatedSourceIds: ['deployments'],
    difficulty: 'senior',
  },
);
assert(!strong.needsClarification, 'clear rollback plan does not need clarification');
assert(
  strong.detected.some((d) => d.intent === 'rollback'),
  'rollback intent detected',
);
assert(strong.quality === 'success', 'strong rollback plan grades as success');

const risky = defaultGrader.grade('Restart everything.', {
  incidentId: 'failed-deploy',
  investigatedSourceIds: [],
  difficulty: 'senior',
});
assert(
  risky.detected.some((d) => d.intent === 'restart'),
  'restart intent detected',
);
assert(risky.quality !== 'success', 'broad restart is not a success for failed deploy');

const creds = defaultGrader.grade(
  'Revoke and rotate the exposed credentials, preserve logs, then monitor CloudTrail.',
  {
    incidentId: 'credential-leak',
    investigatedSourceIds: ['auth-logs'],
    difficulty: 'senior',
  },
);
assert(creds.quality === 'success', 'credential response covers required concepts');
assert(extractIntents('enable waf challenge rules').some((i) => i.intent === 'waf_challenge'), 'waf synonym works');

now = 5_000_000;
s = reducer(initialState('senior'), {
  type: 'START',
  difficulty: 'senior',
  queue: ['failed-deploy'],
  now,
  openResponsePreferred: true,
});
({ state: s, now } = investigateOnce(s, now));
const grade = defaultGrader.grade(
  'Roll back to the previous release and watch the error rate.',
  {
    incidentId: 'failed-deploy',
    investigatedSourceIds: s.investigatedSources,
    difficulty: 'senior',
  },
);
s = reducer(s, { type: 'SUBMIT_OPEN', grade, now: now + 500 });
assert(s.phase === 'result', 'open response can resolve an incident');
assert(s.lastResult?.record.responseMode === 'open', 'open response mode recorded');

const clarifyState = reducer(
  reducer(initialState('senior'), {
    type: 'START',
    difficulty: 'senior',
    queue: ['failed-deploy'],
    now: 6_000_000,
  }),
  {
    type: 'SUBMIT_OPEN',
    grade: defaultGrader.grade('help', {
      incidentId: 'failed-deploy',
      investigatedSourceIds: [],
      difficulty: 'senior',
    }),
    now: 6_000_100,
  },
);
assert(clarifyState.phase === 'incident', 'low-confidence open response does not resolve yet');
assert(clarifyState.pendingOpenResponse !== null, 'pending clarification stored');

console.log(failures === 0 ? '\nALL ENGINE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
