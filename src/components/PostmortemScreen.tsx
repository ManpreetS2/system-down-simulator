import {
  Award,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  HelpCircle,
  Home,
  Hourglass,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Wallet,
  XCircle,
} from 'lucide-react';
import { DIFFICULTIES } from '../data/difficulty';
import type { Game } from '../game/useGame';
import { buildRecommendations, computeStats, gradeFor, rankFor } from '../game/report';
import type { DecisionRecord } from '../types';
import { formatClock, formatMoney } from '../utils/format';

function qualityMeta(record: DecisionRecord) {
  if (record.timedOut)
    return { label: 'Timed out', tone: 'bad', icon: <Hourglass size={13} aria-hidden="true" /> };
  if (record.quality === 'success')
    return { label: 'Resolved', tone: 'ok', icon: <CheckCircle2 size={13} aria-hidden="true" /> };
  if (record.quality === 'partial')
    return { label: 'Partial', tone: 'warn', icon: <HelpCircle size={13} aria-hidden="true" /> };
  return { label: 'Backfired', tone: 'bad', icon: <XCircle size={13} aria-hidden="true" /> };
}

export function PostmortemScreen({ game }: { game: Game }) {
  const { state } = game;
  const config = DIFFICULTIES[state.difficulty];
  const stats = computeStats(state.records);
  const finished = state.gameOverReason === null;
  const grade = gradeFor(state.score, state.queue.length, finished);
  const rank = rankFor(state.score, Math.max(1, state.records.length));
  const recommendations = buildRecommendations(state, stats);

  return (
    <main className="postmortem">
      <header className="pm-head">
        <div className={`grade grade-${grade.toLowerCase()}`} aria-label={`Shift grade ${grade}`}>
          {grade}
        </div>
        <div className="pm-head-text">
          <p className="pm-kicker">{finished ? 'Shift complete' : 'Shift ended early'}</p>
          <h1>Incident Postmortem</h1>
          <p className="pm-rank">
            Final rank: <strong>{rank}</strong> · {config.label} difficulty
          </p>
          {!finished && (
            <p className="pm-fail" role="alert">
              {state.gameOverReason}
            </p>
          )}
          {game.isNewHighScore && (
            <p className="pm-highscore">
              <Trophy size={15} aria-hidden="true" /> New personal best!
            </p>
          )}
        </div>
        <div className="pm-score">
          <span className="pm-score-value mono">{state.score.toLocaleString()}</span>
          <span className="pm-score-label">final score</span>
          <span className="pm-score-best">best: {game.highScore.toLocaleString()}</span>
        </div>
      </header>

      <section className="pm-stats" aria-label="Shift statistics">
        <div className="pm-stat">
          <span className="pm-stat-label">Incidents resolved</span>
          <span className="pm-stat-value mono">
            {stats.resolved}/{state.queue.length}
          </span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Decision accuracy</span>
          <span className="pm-stat-value mono">{stats.accuracyPct}%</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Avg response time</span>
          <span className="pm-stat-value mono">
            {stats.avgResponseSec > 0 ? `${Math.round(stats.avgResponseSec)}s` : '—'}
          </span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Revenue saved</span>
          <span className="pm-stat-value mono is-pos">{formatMoney(state.metrics.revenueSaved)}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Revenue lost</span>
          <span className="pm-stat-value mono is-neg">{formatMoney(state.metrics.revenueLost)}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Engineering spend</span>
          <span className="pm-stat-value mono">{formatMoney(state.metrics.spend)}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Risky calls</span>
          <span className="pm-stat-value mono">{stats.riskyTaken}</span>
        </div>
        <div className="pm-stat">
          <span className="pm-stat-label">Best streak</span>
          <span className="pm-stat-value mono">{state.bestStreak}</span>
        </div>
      </section>

      <div className="pm-columns">
        <div className="pm-col">
          {stats.strongest && stats.mostDamaging && (
            <section className="panel" aria-label="Notable decisions">
              <h2 className="panel-heading">
                <Award size={15} aria-hidden="true" /> Notable decisions
              </h2>
              <div className="pm-decision is-strong">
                <ThumbsUp size={15} aria-hidden="true" />
                <div>
                  <p className="pm-decision-kicker">Strongest call · +{stats.strongest.score} pts</p>
                  <p className="pm-decision-title">{stats.strongest.incidentTitle}</p>
                  <p className="pm-decision-detail">
                    {stats.strongest.actionLabel ?? 'No action taken'}
                  </p>
                </div>
              </div>
              <div className="pm-decision is-weak">
                <ThumbsDown size={15} aria-hidden="true" />
                <div>
                  <p className="pm-decision-kicker">
                    Most damaging · {stats.mostDamaging.score} pts
                  </p>
                  <p className="pm-decision-title">{stats.mostDamaging.incidentTitle}</p>
                  <p className="pm-decision-detail">
                    {stats.mostDamaging.actionLabel ?? 'No response before the timer expired'}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="panel" aria-label="Final company metrics">
            <h2 className="panel-heading">
              <HeartPulse size={15} aria-hidden="true" /> Final company state
            </h2>
            <ul className="pm-final-metrics">
              <li>
                <HeartPulse size={14} aria-hidden="true" />
                <span>System health</span>
                <strong className="mono">{Math.round(state.metrics.health)}%</strong>
              </li>
              <li>
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Customer trust</span>
                <strong className="mono">{Math.round(state.metrics.trust)}%</strong>
              </li>
              <li>
                <Wallet size={14} aria-hidden="true" />
                <span>Budget remaining</span>
                <strong className="mono">{formatMoney(state.metrics.budget)}</strong>
              </li>
              <li>
                <Clock3 size={14} aria-hidden="true" />
                <span>Shift duration</span>
                <strong className="mono">{formatClock(state.shiftElapsedSec)}</strong>
              </li>
            </ul>
          </section>

          <section className="panel" aria-label="Improvement recommendations">
            <h2 className="panel-heading">
              <Lightbulb size={15} aria-hidden="true" /> Recommendations
            </h2>
            <ol className="pm-recs">
              {recommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ol>
          </section>
        </div>

        <section className="panel pm-col" aria-label="Incident timeline">
          <h2 className="panel-heading">
            <FileText size={15} aria-hidden="true" /> Shift timeline
          </h2>
          <ol className="timeline">
            {state.records.map((record, i) => {
              const meta = qualityMeta(record);
              return (
                <li key={`${record.incidentId}-${i}`} className={`timeline-item tone-${meta.tone}`}>
                  <span className="timeline-time mono">T+{formatClock(record.atShiftSec)}</span>
                  <div className="timeline-body">
                    <p className="timeline-title">
                      <span className={`badge badge-sev badge-${record.severity.toLowerCase()}`}>
                        {record.severity}
                      </span>
                      {record.incidentTitle}
                    </p>
                    <p className="timeline-detail">
                      {record.timedOut
                        ? 'No response before the countdown expired.'
                        : record.actionLabel}
                    </p>
                    <p className={`timeline-outcome tone-${meta.tone}`}>
                      {meta.icon}
                      {meta.label} · {record.score >= 0 ? '+' : ''}
                      {record.score} pts
                      {!record.timedOut && ` · responded in ${Math.round(record.responseSec)}s`}
                    </p>
                  </div>
                </li>
              );
            })}
            {state.records.length === 0 && (
              <li className="timeline-empty">The shift ended before any incident was handled.</li>
            )}
          </ol>
        </section>
      </div>

      <footer className="pm-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => game.start(state.difficulty)}>
          <RotateCcw size={17} aria-hidden="true" />
          Restart Shift
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={game.goHome}>
          <Home size={17} aria-hidden="true" />
          Return Home
        </button>
      </footer>
    </main>
  );
}
