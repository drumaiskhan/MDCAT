// Floating "where am I" bar. Slides up while neither the hero nor your own row
// is on screen, so on a long board you can always see your place and jump back
// to it. Sits above the phone tab bar (md:hidden) and bottom-right on desktop.
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { StreakBadge } from './RankRow';
import type { Metric, RankedRow } from './metrics';

export function YouDock({ you, metric, show, onJump }: { you: RankedRow | null; metric: Metric; show: boolean; onJump: () => void }) {
  if (!you) return null;
  const value = you.position != null ? metric.format(metric.value(you)) : '—';
  // Rendered into <body>: the page wrapper is animated, and a transformed
  // ancestor would turn `fixed` into "fixed to the column" (see .page-enter in index.css).
  if (typeof document === 'undefined') return null;
  return createPortal(<div className="lb-dock pointer-events-none fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-30 md:inset-x-auto md:bottom-6 md:right-8 md:w-[26rem]" data-show={show ? 'true' : 'false'} aria-hidden={!show} data-testid="dock-you">
    <div className="lb2-dock pointer-events-auto">
      <span className="lb2-dock__pos">{you.position ?? '–'}</span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-sm font-bold">Your place</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="tabular-nums text-foreground">{value}</span><span>{metric.unit}</span><StreakBadge days={you.currentStreak} /></div>
      </div>
      <button type="button" onClick={onJump} tabIndex={show ? 0 : -1} className="lb2-dock__btn" data-testid="button-jump-to-me"><ArrowUp size={14} /> Jump to me</button>
    </div>
  </div>, document.body);
}
