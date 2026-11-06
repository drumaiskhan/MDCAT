// One row of the ranked list: place number, avatar, name with a
// bar relative to the best value on screen, secondary stats (tablet and up)
// and the headline number for the active metric.
import { memo } from 'react';
import { Flame } from 'lucide-react';
import { initials } from '@/lib/shared';
import type { Metric, RankedRow } from './metrics';

export function StreakBadge({ days, className = '' }: { days: number | undefined; className?: string }) {
  const n = days ?? 0;
  if (n <= 0) return null;
  return <span className={`lb2-streak ${className}`} title={`${n}-day streak`} data-testid="badge-streak"><Flame size={11} fill="currentColor" />{n}</span>;
}

export function LbAvatar({ name, size = 40, place }: { name: string; size?: number; place?: 1 | 2 | 3 }) {
  return <span className={`lb2-avatar ${place ? `lb2-tone-${place}` : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">{initials(name)}</span>;
}

function RankRowCardImpl({ row, metric, max }: { row: RankedRow; metric: Metric; max: number; index: number }) {
  const value = metric.value(row);
  const pct = max > 0 ? Math.max(3, Math.min(100, (value / max) * 100)) : 0;
  const ranked = row.position != null;
  return <div id={row.isYou ? 'lb-you-row' : undefined} className={`lb2-row ${row.isYou ? 'lb2-row--you' : ''} ${ranked ? '' : 'lb2-row--unranked'}`} data-testid={`row-leaderboard-${row.userId}`}>
    <span className="lb2-row__pos">{row.position ?? '–'}</span>
    <LbAvatar name={row.name} />
    <div className="lb2-row__who">
      <div className="lb2-row__name"><span className="truncate">{row.name}</span>{row.isYou && <span className="lb2-you">You</span>}</div>
      <div className="lb2-meter" aria-hidden="true"><i style={{ transform: `scaleX(${ranked ? pct / 100 : 0})` }} /></div>
    </div>
    <div className="lb2-row__stats">
      <span><b>{row.accuracy}%</b> accuracy</span>
      <span><b>{row.questionsAnswered.toLocaleString()}</b> questions</span>
      <span><b>{row.sessions}</b> sessions</span>
    </div>
    <div className="lb2-row__value">
      <div className="lb2-num" data-testid={`value-leaderboard-${row.userId}`}>{ranked || metric.key === 'points' || metric.key === 'questions' ? metric.format(value) : '—'}</div>
      <div className="lb2-unit">{metric.unit}</div>
      {metric.key !== 'streak' && <StreakBadge days={row.currentStreak} />}
    </div>
  </div>;
}

// Memoised: a poll or a search keystroke only re-renders rows whose data actually changed.
export const RankRowCard = memo(RankRowCardImpl);
