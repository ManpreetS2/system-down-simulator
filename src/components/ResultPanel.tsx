import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Hourglass,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { Game } from '../game/useGame';
import type { Focus, ResolvedResult } from '../types';
import { formatSigned, formatSignedMoney } from '../utils/format';

const FOCUS_LABEL: Record<Focus, string> = {
  speed: 'This choice prioritized speed.',
  safety: 'This choice prioritized safety.',
  cost: 'This choice prioritized cost.',
  customer: 'This choice prioritized customer impact.',
};

export function ResultPanel({ result, game }: { result: ResolvedResult; game: Game }) {
  const { record, outcome, incident, action } = result;
  const { state } = game;

  const banner = record.timedOut
    ? {
        tone: 'bad',
        icon: <Hourglass size={20} aria-hidden="true" />,
        title: 'No response in time',
        sub: 'The countdown expired before any action was taken.',
      }
    : outcome.quality === 'success'
      ? {
          tone: 'ok',
          icon: <CheckCircle2 size={20} aria-hidden="true" />,
          title: 'Incident resolved',
          sub: action?.label ?? '',
        }
      : outcome.quality === 'partial'
        ? {
            tone: 'warn',
            icon: <HelpCircle size={20} aria-hidden="true" />,
            title: 'Partial success',
            sub: action?.label ?? '',
          }
        : {
            tone: 'bad',
            icon: <XCircle size={20} aria-hidden="true" />,
            title: 'The decision backfired',
            sub: action?.label ?? '',
          };

  const isLast = state.gameOverReason !== null || state.index + 1 >= state.queue.length;

  return (
    <section className="panel result" aria-label="Incident outcome">
      <p className="result-context">
        Incident {state.index + 1} · {incident.title}
      </p>

      <header className={`result-banner tone-${banner.tone}`}>
        {banner.icon}
        <div>
          <h2>{banner.title}</h2>
          {banner.sub && <p>{banner.sub}</p>}
        </div>
        <span className={`result-score mono${record.score >= 0 ? ' is-pos' : ' is-neg'}`}>
          {record.score >= 0 ? '+' : ''}
          {record.score} pts
        </span>
      </header>

      <ul className="delta-grid" aria-label="Metric changes">
        <li>
          <HeartPulse size={14} aria-hidden="true" />
          <span>Health</span>
          <strong className={`mono ${record.effects.health >= 0 ? 'is-pos' : 'is-neg'}`}>
            {formatSigned(record.effects.health, '%')}
          </strong>
        </li>
        <li>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Trust</span>
          <strong className={`mono ${record.effects.trust >= 0 ? 'is-pos' : 'is-neg'}`}>
            {formatSigned(record.effects.trust, '%')}
          </strong>
        </li>
        <li>
          <CircleDollarSign size={14} aria-hidden="true" />
          <span>Revenue</span>
          <strong className={`mono ${record.totalRevenueDelta >= 0 ? 'is-pos' : 'is-neg'}`}>
            {formatSignedMoney(record.totalRevenueDelta)}
          </strong>
        </li>
        <li>
          <Wallet size={14} aria-hidden="true" />
          <span>Budget</span>
          <strong className={`mono ${record.effects.budget >= 0 ? 'is-pos' : 'is-neg'}`}>
            {formatSignedMoney(record.effects.budget)}
          </strong>
        </li>
        <li>
          <Clock3 size={14} aria-hidden="true" />
          <span>Response</span>
          <strong className="mono">
            {record.timedOut ? 'timed out' : `${Math.round(record.responseSec)}s`}
          </strong>
        </li>
      </ul>

      {result.timeLossRevenue > 0 && action && (
        <p className="result-note">
          The ~{action.timeCostMin} min remediation window cost an additional{' '}
          {formatSignedMoney(-result.timeLossRevenue)} in revenue while the fix was applied
          (included above).
        </p>
      )}

      <div className="result-block">
        <h3 className="subheading">What happened</h3>
        <p>{outcome.explanation}</p>
        {action && <p className="result-focus">{FOCUS_LABEL[action.focus]}</p>}
      </div>

      <div className="result-block result-expert">
        <h3 className="subheading">
          <GraduationCap size={14} aria-hidden="true" /> Experienced responder&rsquo;s take
        </h3>
        <p>{incident.recommended}</p>
      </div>

      {result.delayedLanded.map((d) => (
        <div key={d.sourceIncident + d.message} className="result-block result-delayed" role="status">
          <h3 className="subheading">Delayed consequence landed</h3>
          <p>{d.message}</p>
        </div>
      ))}

      {result.delayedQueuedMessage && (
        <p className="result-warning" role="status">
          {result.delayedQueuedMessage}
        </p>
      )}

      {state.gameOverReason && (
        <p className="result-gameover" role="alert">
          {state.gameOverReason}
        </p>
      )}

      <div className="result-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={game.continueShift}>
          {isLast ? 'View shift postmortem' : 'Continue to next incident'}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        {!isLast && <span className="action-hint">or press <kbd>Enter</kbd></span>}
      </div>
    </section>
  );
}
