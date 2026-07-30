/**
 * Deterministic smoke test for the game engine. Run with: npx tsx scripts/engine-smoke.ts
 * Verifies: timeout resolution, game-over conditions, reducer guards
 * (duplicate actions are no-ops), and full-shift completion.
 */
import { DIFFICULTIES } from '../src/data/difficulty';
import { INCIDENTS } from '../src/data/incidents';
import { initialState, MAX_DRAIN_DT_SEC, reducer } from '../src/game/engine';
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

// --- Scenario 1: every incident times out on senior → early game over ---
console.log('Scenario 1: all timeouts on senior');
let s: GameState = reducer(initialState('senior'), {
  type: 'START',
  difficulty: 'senior',
  queue: allIds.slice(0, 10),
  now,
});
assert(s.phase === 'incident', 'shift starts in incident phase');

let guard = 0;
while (s.phase !== 'over' && guard < 50) {
  guard += 1;
  if (s.phase === 'incident') {
    // Tick until past the deadline (ticks every 250ms).
    let ticks = 0;
    while (s.phase === 'incident' && ticks < 400) {
      now += 250;
      s = reducer(s, { type: 'TICK', now });
      ticks += 1;
    }
    assert(s.phase === 'result', `incident ${s.index + 1} timed out into a result`);
    assert(s.lastResult?.record.timedOut === true, 'result is marked as timed out');
  } else if (s.phase === 'result') {
    // Duplicate CHOOSE while in result phase must be a no-op.
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

// --- Scenario 2: always choose the first low-risk action → survive ---
console.log('Scenario 2: deliberate play on engineer');
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
    now += 3000;
    s = reducer(s, { type: 'TICK', now });
    const incident = INCIDENTS.find((i) => i.id === s.queue[s.index])!;
    const best = [...incident.actions].sort(
      (a, b) => (a.risk === 'low' ? -1 : 1) - (b.risk === 'low' ? -1 : 1),
    )[0];
    s = reducer(s, { type: 'CHOOSE', actionId: best.id, roll: 0.01, now });
    assert(s.phase === 'result', 'choosing an action resolves to result');
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
s = reducer(s, { type: 'CHOOSE', actionId: 'scale-db', roll: 0.5, now }); // queues delayed effect
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
now += 30_000; // simulate a 30s tab suspension between ticks
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

// Jump past the incident deadline in one tick — timeout must still apply.
now = s.incidentDeadline! + 1;
s = reducer(s, { type: 'TICK', now });
assert(s.phase === 'result', 'absolute deadline still times out after a large jump');
assert(s.lastResult?.record.timedOut === true, 'timeout after large jump is marked timed out');

console.log(failures === 0 ? '\nALL ENGINE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
