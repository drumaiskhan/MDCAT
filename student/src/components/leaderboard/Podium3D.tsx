// Top three: flat cards on stepped pillars (2 – 1 – 3). Colour marks the
// place; no 3D, blur or looping animation.
import { Crown, Flame } from 'lucide-react';
import { Count } from '@/lib/fx3d';
import { LbAvatar } from './RankRow';
import type { Metric, RankedRow } from './metrics';

type Place = 1 | 2 | 3;

function Slot({ row, place, metric }: { row: RankedRow; place: Place; metric: Metric }) {
  const value = metric.value(row);
  const decimals = metric.key === 'accuracy' && value % 1 ? 1 : 0;
  const suffix = metric.key === 'accuracy' ? '%' : metric.key === 'points' ? ' pts' : metric.key === 'streak' ? ' days' : ' answered';
  return <div className={`lb2-slot lb2-slot--${place} lb2-tone-${place}`} data-testid={`podium-place-${place}`}>
    <div className="lb2-slot__card">
      {place === 1 && <Crown size={20} className="lb2-slot__crown" fill="currentColor" aria-label="Leader" />}
      <LbAvatar name={row.name} size={place === 1 ? 64 : 52} place={place} />
      <div className="lb2-slot__name"><span className="truncate">{row.name}</span>{row.isYou && <span className="lb2-you">You</span>}</div>
      <div className="lb2-slot__value"><Count value={value} decimals={decimals} suffix={suffix} /></div>
      {metric.key !== 'streak' && (row.currentStreak ?? 0) > 0 && <span className="lb2-streak"><Flame size={11} fill="currentColor" />{row.currentStreak}</span>}
    </div>
    <div className="lb2-pillar"><span>{place}</span></div>
  </div>;
}

export function Podium3D({ rows, metric }: { rows: RankedRow[]; metric: Metric }) {
  const [first, second, third] = rows;
  if (!first) return null;
  return <div id="lb-podium" className="lb2-podium" data-testid="podium">
    {second ? <Slot row={second} place={2} metric={metric} /> : <span />}
    <Slot row={first} place={1} metric={metric} />
    {third ? <Slot row={third} place={3} metric={metric} /> : <span />}
  </div>;
}
