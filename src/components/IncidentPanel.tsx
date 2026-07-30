import {
  AlertTriangle,
  BookOpen,
  Eye,
  Flame,
  HelpCircle,
  MessageSquareText,
  Search,
  ShieldCheck,
  TimerIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DIFFICULTIES } from '../data/difficulty';
import { getIncidentBrief } from '../data/investigations';
import type { Game } from '../game/useGame';
import type { Incident, Risk } from '../types';
import { formatClock, formatMoney } from '../utils/format';
import { sfx } from '../utils/sound';

const SEVERITY_LABEL: Record<string, string> = {
  SEV1: 'SEV1 · Critical',
  SEV2: 'SEV2 · Major',
  SEV3: 'SEV3 · Minor',
};

const PHASE_LABEL = {
  triage: 'Phase · Triage',
  investigating: 'Phase · Investigating',
  ready: 'Phase · Ready to act',
} as const;

const KIND_LABEL = {
  confirmed: 'Confirmed evidence',
  indicator: 'Indicator',
  assumption: 'Assumption',
  unknown: 'Unknown',
} as const;

const RISK_META: Record<Risk, { label: string; icon: React.ReactNode }> = {
  low: { label: 'Low risk', icon: <ShieldCheck size={13} aria-hidden="true" /> },
  medium: { label: 'Medium risk', icon: <AlertTriangle size={13} aria-hidden="true" /> },
  high: { label: 'High risk', icon: <Flame size={13} aria-hidden="true" /> },
};

function GlossaryTip({ text }: { text: string }) {
  return (
    <span className="glossary-tip">
      <HelpCircle size={13} aria-hidden="true" />
      <span className="glossary-tip-body">{text}</span>
    </span>
  );
}

export function IncidentPanel({ incident, game }: { incident: Incident; game: Game }) {
  const { state } = game;
  const config = DIFFICULTIES[state.difficulty];
  const brief = getIncidentBrief(incident.id);
  const [responseTab, setResponseTab] = useState<'choice' | 'open'>(
    config.allowOpenResponse && state.openResponsePreferred ? 'open' : 'choice',
  );
  const [openText, setOpenText] = useState('');

  const remainingSec = state.incidentDeadline
    ? Math.max(0, (state.incidentDeadline - Date.now()) / 1000)
    : 0;
  const pct = (remainingSec / config.timerSec) * 100;
  const timerTone = pct > 50 ? 'ok' : pct > 22 ? 'warn' : 'bad';

  const actionsUnlocked =
    state.investigatedSources.length >= config.minInvestigationsBeforeActions;
  const remainingSources = brief.investigations.filter(
    (s) => !state.investigatedSources.includes(s.id),
  );

  const keyIndicatorCards = useMemo(() => {
    const loss = Math.round(incident.revenueLossPerMin * config.consequenceMult);
    const map: Record<string, { label: string; value: string; hint?: string }> = {
      health: {
        label: 'System health',
        value: `${Math.round(state.metrics.health)}%`,
        hint: 'Overall ability of the platform to serve users.',
      },
      trust: {
        label: 'Customer trust',
        value: `${Math.round(state.metrics.trust)}%`,
        hint: 'How much customers still believe the product is reliable.',
      },
      revenueLoss: {
        label: 'Revenue loss',
        value: `${formatMoney(loss)}/min`,
        hint: 'Estimated money lost each minute while this incident stays open.',
      },
      cpu: {
        label: 'CPU',
        value: `${state.infra.cpu.toFixed(0)}%`,
        hint: 'How hard application servers are working.',
      },
      memory: {
        label: 'Memory',
        value: `${state.infra.memory.toFixed(0)}%`,
        hint: 'How much server memory is in use.',
      },
      dbLatency: {
        label: 'DB latency',
        value: `${state.infra.dbLatency.toFixed(0)} ms`,
        hint: 'How long database queries are taking.',
      },
      errorRate: {
        label: 'Error rate',
        value: `${state.infra.errorRate.toFixed(1)}%`,
        hint: 'Share of requests that are failing.',
      },
      requestVolume: {
        label: 'Requests',
        value: `${((state.infra.requestVolume / 100) * 12.4).toFixed(1)}k/min`,
        hint: 'How much traffic is hitting the system.',
      },
    };
    return brief.keyIndicators.slice(0, 5).map((key) => ({ key, ...map[key] }));
  }, [brief.keyIndicators, config.consequenceMult, incident.revenueLossPerMin, state.infra, state.metrics]);

  return (
    <section className={`panel incident sev-${incident.severity.toLowerCase()}`} aria-label="Active incident">
      <header className="incident-head">
        <div className="incident-badges">
          <span className={`badge badge-sev badge-${incident.severity.toLowerCase()}`}>
            <AlertTriangle size={13} aria-hidden="true" />
            {SEVERITY_LABEL[incident.severity]}
          </span>
          <span className="badge badge-cat">{incident.category}</span>
          <span className="badge badge-phase">{PHASE_LABEL[state.scenarioPhase]}</span>
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

      <p className="customer-impact">
        <strong>Customer impact:</strong> {brief.customerImpact}
      </p>

      <div className="key-indicators" aria-label="Important indicators">
        <h3 className="subheading">Important indicators</h3>
        <ul className="key-indicator-grid">
          {keyIndicatorCards.map((card) => (
            <li key={card.key}>
              <span className="key-indicator-label">
                {card.label}
                {config.showGlossary && card.hint && <GlossaryTip text={card.hint} />}
              </span>
              <strong className="mono">{card.value}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="evidence-panel">
        <h3 className="subheading">
          <Eye size={14} aria-hidden="true" /> Confirmed so far
        </h3>
        <ul className="evidence-list">
          {state.revealedEvidence.map((item) => (
            <li key={item.id} className={`evidence-item kind-${item.kind}`}>
              <span className={`badge badge-kind badge-kind-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
              <span className="evidence-text">
                {item.text}
                {config.showGlossary && item.glossary && <GlossaryTip text={item.glossary} />}
              </span>
              <span className="evidence-source">{item.sourceLabel}</span>
            </li>
          ))}
        </ul>
      </div>

      {remainingSources.length > 0 && (
        <div className="investigate-panel">
          <h3 className="subheading">
            <Search size={14} aria-hidden="true" /> Investigate
          </h3>
          <p className="investigate-hint">
            Inspection spends response time and reveals evidence. Labels mark what is confirmed versus
            assumed.
            {!actionsUnlocked && (
              <>
                {' '}
                On {config.label}, unlock remediation after {config.minInvestigationsBeforeActions}{' '}
                investigation{config.minInvestigationsBeforeActions === 1 ? '' : 's'}.
              </>
            )}
          </p>
          <ul className="investigate-list">
            {remainingSources.map((source) => (
              <li key={source.id}>
                <button
                  type="button"
                  className={`investigate-btn${
                    config.highlightRelevantEvidence && source.highlight ? ' is-highlight' : ''
                  }`}
                  onClick={() => game.investigate(source.id)}
                >
                  <span className="investigate-label">{source.label}</span>
                  <span className="investigate-meta">
                    {config.highlightRelevantEvidence && source.highlight ? 'Most relevant · ' : ''}~
                    {source.timeCostSec}s
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="incident-actions">
        <div className="response-tabs">
          <h3 className="subheading">Respond</h3>
          {config.allowOpenResponse && (
            <div className="response-tablist" role="tablist" aria-label="Response mode">
              <button
                type="button"
                role="tab"
                aria-selected={responseTab === 'choice'}
                className={`response-tab${responseTab === 'choice' ? ' is-selected' : ''}`}
                onClick={() => {
                  setResponseTab('choice');
                  sfx.click();
                }}
              >
                Multiple choice
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={responseTab === 'open'}
                className={`response-tab${responseTab === 'open' ? ' is-selected' : ''}`}
                onClick={() => {
                  setResponseTab('open');
                  sfx.click();
                }}
              >
                <MessageSquareText size={14} aria-hidden="true" />
                Open response
              </button>
            </div>
          )}
        </div>

        {!actionsUnlocked ? (
          <p className="action-locked" role="status">
            Investigate at least {config.minInvestigationsBeforeActions} source
            {config.minInvestigationsBeforeActions === 1 ? '' : 's'} before choosing a remediation.
            Gathering evidence first separates facts from guesses.
          </p>
        ) : responseTab === 'open' && config.allowOpenResponse ? (
          <div className="open-response">
            <label htmlFor="open-response-input" className="open-response-label">
              Describe your incident response in your own words
            </label>
            <textarea
              id="open-response-input"
              className="open-response-input"
              rows={4}
              value={openText}
              placeholder="Example: Roll back the latest deployment, reduce incoming traffic, and verify database connections before restoring service."
              onChange={(e) => setOpenText(e.target.value)}
            />
            <div className="open-response-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={openText.trim().length < 3}
                onClick={() => game.submitOpenResponse(openText)}
              >
                Submit response
              </button>
              <span className="action-hint">Graded locally with a structured rubric — no network call.</span>
            </div>

            {state.pendingOpenResponse && (
              <div className="open-clarify" role="status">
                <p className="open-clarify-title">Needs clarification</p>
                <p>{state.pendingOpenResponse.clarificationPrompt}</p>
                <p className="open-clarify-interpreted">{state.pendingOpenResponse.interpreted}</p>
                <p className="open-clarify-detail">{state.pendingOpenResponse.explanation}</p>
                {state.pendingOpenResponse.suggestedActionIds.length > 0 && (
                  <div className="open-clarify-suggestions">
                    <p>Closest structured actions:</p>
                    <ul>
                      {state.pendingOpenResponse.suggestedActionIds.map((id) => {
                        const action = incident.actions.find((a) => a.id === id);
                        if (!action) return null;
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => game.choose(action.id)}
                            >
                              Use: {action.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <button type="button" className="btn btn-ghost" onClick={game.clearOpenPending}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
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
                          {config.showRiskLabels && (
                            <span className={`badge badge-risk badge-risk-${action.risk}`}>
                              {risk.icon}
                              {risk.label}
                            </span>
                          )}
                          <span className="action-time">~{action.timeCostMin} min</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="action-hint">
              Press <kbd>1</kbd>–<kbd>4</kbd> when remediation is unlocked. Consequences appear after
              you decide — not on the buttons.
            </p>
          </>
        )}
      </div>

      {config.showGlossary && (
        <p className="glossary-footnote">
          <BookOpen size={13} aria-hidden="true" /> Hover the help icons for short definitions of
          unfamiliar terms.
        </p>
      )}
    </section>
  );
}
