import { AchievementToasts } from './components/AchievementToasts';
import { GameScreen } from './components/GameScreen';
import { PostmortemScreen } from './components/PostmortemScreen';
import { StartScreen } from './components/StartScreen';
import { useGame } from './game/useGame';

export default function App() {
  const game = useGame();
  const { phase } = game.state;

  return (
    <div className="app">
      {phase === 'idle' && <StartScreen game={game} />}
      {(phase === 'incident' || phase === 'result') && <GameScreen game={game} />}
      {phase === 'over' && <PostmortemScreen game={game} />}
      <AchievementToasts toasts={game.toasts} onDismiss={game.dismissToast} />
    </div>
  );
}
