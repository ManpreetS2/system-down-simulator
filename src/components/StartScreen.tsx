import {
  Activity,
  Award,
  BookOpen,
  ChevronDown,
  Keyboard,
  Lock,
  Play,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/difficulty';
import type { Game } from '../game/useGame';
import type { DifficultyId } from '../types';
import { sfx } from '../utils/sound';

export function StartScreen({ game }: { game: Game }) {
  const [difficulty, setDifficulty] = useState<DifficultyId>(game.state.difficulty);
  const [showHelp, setShowHelp] = useState(false);
  const [openResponse, setOpenResponse] = useState(false);
  const selected = DIFFICULTIES[difficulty];

  return (
    <main className="start">
      <header className="start-hero">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Activity size={26} strokeWidth={2.4} />
          </span>
          <h1 className="brand-name">
            SYSTEM <span className="brand-accent">DOWN</span>
          </h1>
        </div>
        <p className="start-tagline">An incident-response strategy game</p>
        <p className="start-desc">
          You are the on-call engineer. Production is about to break in creative ways — failed
          deploys, database meltdowns, security leaks, vendor outages. Investigate what you can
          confirm, choose how to respond, and keep system health, customer trust, and the budget
          alive until the end of your shift.
        </p>
      </header>

      <section className="start-panel" aria-labelledby="difficulty-heading">
        <h2 id="difficulty-heading" className="panel-heading">
          Select difficulty
        </h2>
        <div className="difficulty-grid" role="radiogroup" aria-labelledby="difficulty-heading">
          {DIFFICULTY_ORDER.map((id) => {
            const config = DIFFICULTIES[id];
            const selected = difficulty === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`difficulty-card${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  setDifficulty(id);
                  sfx.click();
                }}
              >
                <span className="difficulty-name">{config.label}</span>
                <span className="difficulty-tagline">{config.tagline}</span>
                <span className="difficulty-facts">
                  <span>{config.timerSec}s timers</span>
                  <span>${Math.round(config.startBudget / 1000)}k budget</span>
                </span>
              </button>
            );
          })}
        </div>

        {selected.allowOpenResponse && (
          <label className="open-response-toggle">
            <input
              type="checkbox"
              checked={openResponse}
              onChange={(e) => {
                setOpenResponse(e.target.checked);
                sfx.click();
              }}
            />
            <span>
              Prefer <strong>Open Response</strong> mode (type your plan; graded locally with a
              structured rubric)
            </span>
          </label>
        )}

        <div className="start-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() =>
              game.start(difficulty, selected.allowOpenResponse ? openResponse : false)
            }
          >
            <Play size={18} aria-hidden="true" />
            Start Shift
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            aria-pressed={game.soundOn}
            onClick={game.toggleSound}
          >
            {game.soundOn ? (
              <Volume2 size={17} aria-hidden="true" />
            ) : (
              <VolumeX size={17} aria-hidden="true" />
            )}
            Sound {game.soundOn ? 'on' : 'off'}
          </button>
        </div>

        {game.highScore > 0 && (
          <p className="high-score">
            <Trophy size={15} aria-hidden="true" /> Best shift score:{' '}
            <strong>{game.highScore.toLocaleString()}</strong>
          </p>
        )}
      </section>

      <section className="start-panel" aria-labelledby="howto-heading">
        <button
          type="button"
          className="panel-toggle"
          aria-expanded={showHelp}
          aria-controls="howto-body"
          onClick={() => {
            setShowHelp((v) => !v);
            sfx.click();
          }}
        >
          <h2 id="howto-heading" className="panel-heading">
            <BookOpen size={16} aria-hidden="true" /> How to play
          </h2>
          <ChevronDown size={17} className={`chev${showHelp ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {showHelp && (
          <div id="howto-body" className="howto">
            <ol>
              <li>
                Incidents start lean: alert, customer impact, a few key indicators, and confirmed
                evidence. A countdown runs while revenue and health drain.
              </li>
              <li>
                Investigate sources (logs, deploys, metrics, status pages) to reveal confirmed facts,
                indicators, and assumptions — investigation spends response time.
              </li>
              <li>
                Junior keeps multiple-choice unlocked with glossary tips. Engineer and Senior require
                investigation before remediation. Senior can also type an open response graded by a
                local rubric.
              </li>
              <li>
                After you act, you see the outcome, metric impact, and what an experienced responder
                might do. The shift ends early if health, trust, or budget hits zero.
              </li>
            </ol>
            <p className="howto-keys">
              <Keyboard size={15} aria-hidden="true" /> Shortcuts: press <kbd>1</kbd>–<kbd>4</kbd> to
              choose an action, <kbd>Enter</kbd> to continue after a result.
            </p>
          </div>
        )}
      </section>

      <section className="start-panel" aria-labelledby="ach-heading">
        <h2 id="ach-heading" className="panel-heading">
          <Award size={16} aria-hidden="true" /> Achievements{' '}
          <span className="panel-heading-note">
            {game.unlocked.length}/{ACHIEVEMENTS.length} unlocked
          </span>
        </h2>
        <ul className="achievement-list">
          {ACHIEVEMENTS.map((a) => {
            const done = game.unlocked.includes(a.id);
            return (
              <li key={a.id} className={`achievement${done ? ' is-unlocked' : ''}`}>
                <span className="achievement-icon" aria-hidden="true">
                  {done ? <Award size={16} /> : <Lock size={14} />}
                </span>
                <span>
                  <span className="achievement-title">{a.title}</span>
                  <span className="achievement-desc">{a.description}</span>
                </span>
                <span className="visually-hidden">{done ? '(unlocked)' : '(locked)'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="start-footer">
        Runs entirely in your browser. No account, no backend — just you and the pager.
      </footer>
    </main>
  );
}
