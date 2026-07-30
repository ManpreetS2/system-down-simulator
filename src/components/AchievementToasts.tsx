import { Award, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Toast } from '../game/useGame';

const TOAST_LIFETIME_MS = 6000;

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const id = window.setTimeout(() => onDismiss(toast.id), TOAST_LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, [toast.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <span className="toast-icon" aria-hidden="true">
        <Award size={18} />
      </span>
      <div className="toast-body">
        <p className="toast-kicker">Achievement unlocked</p>
        <p className="toast-title">{toast.title}</p>
        <p className="toast-desc">{toast.description}</p>
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label={`Dismiss ${toast.title} notification`}
        onClick={() => onDismiss(toast.id)}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function AchievementToasts({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
