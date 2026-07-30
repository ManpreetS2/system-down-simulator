import {
  Activity,
  Clock,
  Cpu,
  Database,
  DollarSign,
  Gauge,
  HeartPulse,
  MemoryStick,
  ShieldCheck,
  TrendingDown,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  Zap,
} from 'lucide-react';
import { DIFFICULTIES } from '../data/difficulty';
import { getIncident } from '../data/incidents';
import type { Game } from '../game/useGame';
import { rankFor } from '../game/report';
import { formatClock, formatCompact, formatMoney } from '../utils/format';
import { IncidentPanel } from './IncidentPanel';
import { ResultPanel } from './ResultPanel';
import { Sparkline } from './Sparkline';

function healthTone(value: number): string {
  if (value >= 60) return 'ok';
  if (value >= 30) return 'warn';
  return 'bad';
}

export function GameScreen({ game }: { game: Game }) {
  const { state } = game;
  const config = DIFFICULTIES[state.difficulty];
  const incident = getIncident(state.queue[state.index]);
  const incidentActive = state.phase === 'incident';

  const { metrics, infra } = state;
  const activeUsers = Math.round(
    48200 * (0.35 + (0.65 * (0.6 * metrics.trust + 0.4 * metrics.health)) / 100) +
      900 * Math.sin(state.shiftElapsedSec / 7),
  );
  const revenueLossPerMin = incidentActive
    ? Math.round(incident.revenueLossPerMin * config.consequenceMult)
    : 0;
  const rank = rankFor(state.score, Math.max(1, state.records.length));

  return (
    <div className="game">
      <header className="game-header">
        <div className="brand brand-sm">
          <span className="brand-mark" aria-hidden="true">
            <Activity size={18} strokeWidth={2.4} />
          </span>
          <span className="brand-name">
            SYSTEM <span className="brand-accent">DOWN</span>
          </span>
        </div>

        <dl className="shift-info">
          <div className="shift-chip">
            <dt>Incident</dt>
            <dd>
              {state.index + 1}<span className="dim">/{state.queue.length}</span>
            </dd>
          </div>
          <div className="shift-chip">
            <dt>Shift time</dt>
            <dd className="mono">{formatClock(state.shiftElapsedSec)}</dd>
          </div>
          <div className="shift-chip">
            <dt>Difficulty</dt>
            <dd>{config.label}</dd>
          </div>
          <div className="shift-chip">
            <dt>Rank</dt>
            <dd>{rank}</dd>
          </div>
          <div className="shift-chip shift-chip-score">
            <dt>Score</dt>
            <dd className="mono">{state.score.toLocaleString()}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="btn btn-icon"
          aria-pressed={game.soundOn}
          aria-label={game.soundOn ? 'Mute sound' : 'Unmute sound'}
          title={game.soundOn ? 'Mute sound' : 'Unmute sound'}
          onClick={game.toggleSound}
        >
          {game.soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
      </header>

      <section className="metric-row" aria-label="Primary company metrics">
        <article className={`metric-card tone-${healthTone(metrics.health)}`}>
          <div className="metric-head">
            <HeartPulse size={15} aria-hidden="true" />
            <h3>System Health</h3>
          </div>
          <p className="metric-value mono">{Math.round(metrics.health)}%</p>
          <div
            className="meter"
            role="meter"
            aria-valuenow={Math.round(metrics.health)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="System health"
          >
            <span style={{ width: `${metrics.health}%` }} />
          </div>
        </article>

        <article className={`metric-card tone-${healthTone(metrics.trust)}`}>
          <div className="metric-head">
            <ShieldCheck size={15} aria-hidden="true" />
            <h3>Customer Trust</h3>
          </div>
          <p className="metric-value mono">{Math.round(metrics.trust)}%</p>
          <div
            className="meter"
            role="meter"
            aria-valuenow={Math.round(metrics.trust)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Customer trust"
          >
            <span style={{ width: `${metrics.trust}%` }} />
          </div>
        </article>

        <article className={`metric-card${metrics.revenue < 0 ? ' tone-bad' : ''}`}>
          <div className="metric-head">
            <DollarSign size={15} aria-hidden="true" />
            <h3>Shift Revenue</h3>
          </div>
          <p className="metric-value mono">{formatMoney(metrics.revenue)}</p>
          <p className="metric-sub">net impact this shift</p>
        </article>

        <article className={`metric-card${metrics.budget < config.startBudget * 0.25 ? ' tone-warn' : ''}`}>
          <div className="metric-head">
            <Wallet size={15} aria-hidden="true" />
            <h3>Eng. Budget</h3>
          </div>
          <p className="metric-value mono">{formatMoney(metrics.budget)}</p>
          <p className="metric-sub">spent {formatMoney(metrics.spend)}</p>
        </article>

        <article className="metric-card">
          <div className="metric-head">
            <Users size={15} aria-hidden="true" />
            <h3>Active Users</h3>
          </div>
          <p className="metric-value mono">{formatCompact(activeUsers)}</p>
          <p className="metric-sub">on platform now</p>
        </article>

        <article className={`metric-card${revenueLossPerMin > 0 ? ' tone-bad' : ''}`}>
          <div className="metric-head">
            <TrendingDown size={15} aria-hidden="true" />
            <h3>Revenue Loss</h3>
          </div>
          <p className="metric-value mono">{formatMoney(revenueLossPerMin)}/min</p>
          <p className="metric-sub">{revenueLossPerMin > 0 ? 'while unresolved' : 'no active bleed'}</p>
        </article>
      </section>

      <div className="game-body">
        <main className="stage" aria-live="polite">
          {state.phase === 'result' && state.lastResult ? (
            <ResultPanel result={state.lastResult} game={game} />
          ) : (
            <IncidentPanel incident={incident} game={game} />
          )}
        </main>

        <aside className="side">
          <section className="panel infra-panel" aria-label="Infrastructure metrics">
            <h2 className="panel-heading">
              <Gauge size={15} aria-hidden="true" /> Infrastructure
            </h2>
            <ul className="infra-list">
              <InfraRow
                icon={<Cpu size={14} />}
                label="CPU usage"
                value={`${infra.cpu.toFixed(0)}%`}
                pct={infra.cpu}
                warnAt={70}
                badAt={88}
              />
              <InfraRow
                icon={<MemoryStick size={14} />}
                label="Memory"
                value={`${infra.memory.toFixed(0)}%`}
                pct={infra.memory}
                warnAt={70}
                badAt={88}
              />
              <InfraRow
                icon={<Database size={14} />}
                label="DB latency"
                value={`${infra.dbLatency.toFixed(0)} ms`}
                pct={Math.min(100, (infra.dbLatency / 800) * 100)}
                warnAt={30}
                badAt={60}
              />
              <InfraRow
                icon={<Zap size={14} />}
                label="Error rate"
                value={`${infra.errorRate.toFixed(1)}%`}
                pct={Math.min(100, infra.errorRate * 2.5)}
                warnAt={10}
                badAt={35}
              />
              <InfraRow
                icon={<Activity size={14} />}
                label="Requests"
                value={`${((infra.requestVolume / 100) * 12.4).toFixed(1)}k/min`}
                pct={Math.min(100, infra.requestVolume / 3)}
                warnAt={55}
                badAt={80}
              />
              <InfraRow
                icon={<Clock size={14} />}
                label="Uptime"
                value={`${infra.uptimePct.toFixed(1)}%`}
                pct={infra.uptimePct}
                warnAt={-1}
                badAt={-1}
                invert
              />
            </ul>
          </section>

          <section className="panel trend-panel" aria-label="Health and trust trend">
            <h2 className="panel-heading">
              <Activity size={15} aria-hidden="true" /> Shift trend
            </h2>
            <div className="trend-row">
              <span className="trend-label trend-health">Health</span>
              <Sparkline values={state.healthHistory.slice(-40)} className="spark spark-health" />
            </div>
            <div className="trend-row">
              <span className="trend-label trend-trust">Trust</span>
              <Sparkline values={state.trustHistory.slice(-40)} className="spark spark-trust" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

interface InfraRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  warnAt: number;
  badAt: number;
  invert?: boolean;
}

function InfraRow({ icon, label, value, pct, warnAt, badAt, invert }: InfraRowProps) {
  let tone = 'ok';
  if (invert) {
    tone = pct >= 99 ? 'ok' : pct >= 95 ? 'warn' : 'bad';
  } else if (badAt >= 0 && pct >= badAt) {
    tone = 'bad';
  } else if (warnAt >= 0 && pct >= warnAt) {
    tone = 'warn';
  }
  return (
    <li className={`infra-row tone-${tone}`}>
      <span className="infra-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="infra-label">{label}</span>
      <span className="infra-value mono">{value}</span>
      <span className="meter meter-thin" aria-hidden="true">
        <span style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </span>
    </li>
  );
}
