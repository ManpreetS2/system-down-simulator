import { AlertTriangle, Flame, ListChecks, ShieldCheck, TimerIcon } from 'lucide-react';
import { DIFFICULTIES } from '../data/difficulty';
import type { Game } from '../game/useGame';
import type { Incident, Risk } from '../types';
import { formatClock } from '../utils/format';

const SEVERITY_LABEL: Record<string, string> = {
  SEV1: 'SEV1 · Critical',
  SEV2: 'SEV2 · Major',
  SEV3: 'SEV3 · Minor',
};

const RISK_META: Record<Risk, { label: string; icon: React.ReactNode }> = {
  low: { label: 'Low risk', icon: <ShieldCheck size={13} aria-hidden="true" /> },
  medium: { label: 'Medium risk', icon: <AlertTriangle size={13} aria-hidden="true" /> },
  high: { label: 'High risk', icon: <Flame size={13} aria-hidden="true" /> },
};

export function IncidentPanel({ incident, game }: { incident: Incident; game: Game }) {
  const { state } = game;
  const config = DIFFICULTIES[state.difficulty];
  const remainingSec = state.incidentDeadline
    ? Math.max(0, (state.incidentDeadline - Date.now()) / 1000)
    : 0;
  const pct = (remainingSec / config.timerSec) * 100;
  const timerTone = pct > 50 ? 'ok' : pct > 22 ? 'warn' : 'bad';

  return (
    <section className={`panel incident sev-${incident.severity.toLowerCase()}`} aria-label="Active incident">
      <header className="incident-head">
        <div className="incident-badges">
          <span className={`badge badge-sev badge-${incident.severity.toLowerCase()}`}>
            <AlertTriangle size={13} aria-hidden="true" />
            {SEVERITY_LABEL[incident.severity]}
          </span>
          <span className="badge badge-cat">{incident.category}</span>
        </div>
        <div
          className={`incident-timer tone-${timerTone}`}
          role="timer"
          aria-label={`Time to respond: ${Math.ceil(remainingSec)} seconds`}
        >
          <TimerIcon size={15} aria-hidden="true" />
          <span className="mono">{formatClock(remainingSec)}</span>
        </div>
      </header>

      <div className={`timer-track tone-${timerTone}`} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <h2 className="incident-title">{incident.title}</h2>

      <p className="incident-alert mono" role="alert">
        {incident.alert}
      </p>

      <div className="incident-symptoms">
        <h3 className="subheading">
          <ListChecks size={14} aria-hidden="true" /> Observed symptoms
        </h3>
        <ul>
          {incident.symptoms.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="incident-actions">
        <h3 className="subheading">Choose your response</h3>
        <ol className="action-list">
          {incident.actions.map((action, i) => {
            const risk = RISK_META[action.risk];
            return (
              <li key={action.id}>
                <button
                  type="button"
                  className={`action-btn risk-${action.risk}`}
                  onClick={() => game.choose(action.id)}
                >
                  <span className="action-key mono" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="action-body">
                    <span className="action-label">{action.label}</span>
                    <span className="action-detail">{action.detail}</span>
                    <span className="action-meta">
                      <span className={`badge badge-risk badge-risk-${action.risk}`}>
                        {risk.icon}
                        {risk.label}
                      </span>
                      <span className="action-time">~{action.timeCostMin} min fix</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="action-hint">
          Press <kbd>1</kbd>–<kbd>4</kbd> to respond. If the timer expires, the incident resolves
          itself — badly.
        </p>
      </div>
    </section>
  );
}
