// "Your standing": rank, where you sit among everyone on a position strip,
// the gap to the next student, your headline numbers and your streak.
import { Link } from 'wouter';
import { BookOpen, Flame } from 'lucide-react';
import type { StreakCard } from '@/lib/api';
import { Count } from '@/lib/fx3d';
import { beatPercent, neighbour, type Metric, type RankedRow } from './metrics';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
function dayLetter(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAY[d.getUTCDay()];
}
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function StreakPanel({ streak, fallbackDays }: { streak: StreakCard | undefined; fallbackDays: number }) {
  const current = streak?.currentStreak ?? fallbackDays;
  const longest = Math.max(streak?.longestStreak ?? 0, current);
  const days = streak?.days ?? [];
  const today = days.length ? days[days.length - 1].date : null;
  const status = !streak ? null
    : streak.practicedToday ? { tone: 'ok' as const, text: current > 1 ? `Done for today. Day ${current} is locked in.` : 'Done for today. Streak started.' }
    : streak.atRisk ? { tone: 'risk' as const, text: `Practise today to keep your ${current}-day streak alive.` }
    : { tone: 'cold' as const, text: 'Answer one question today to start a new streak.' };
  return <div className="lb2-streakpanel" data-testid="panel-streak">
    <div className="lb2-streakpanel__head">
      <span className={`lb2-flame ${current > 0 ? 'is-lit' : ''}`}><Flame size={22} fill="currentColor" /></span>
      <div>
        <div className="lb2-streakpanel__num"><span data-testid="text-streak-current"><Count value={current} /></span> day streak</div>
        <div className="lb2-muted">Best run <b data-testid="text-streak-best">{longest} {longest === 1 ? 'day' : 'days'}</b></div>
      </div>
    </div>
    {status && <p className={`lb2-status lb2-status--${status.tone}`} data-testid={`streak-status-${status.tone}`}>{status.text}</p>}
    <div className="lb2-days" data-testid="streak-days" aria-label="Last 14 days">
      {(days.length ? days : Array.from({ length: 14 }, (_, i) => ({ date: String(i), sessions: 0, questions: 0 }))).map((d) => {
        const on = d.sessions > 0;
        return <div key={d.date} className="lb2-day" title={days.length ? `${d.date}: ${on ? `${d.sessions} session${d.sessions === 1 ? '' : 's'}, ${d.questions} questions` : 'no practice'}` : undefined}>
          <span className={`lb2-dot ${on ? 'is-on' : ''} ${d.date === today ? 'is-today' : ''}`} />
          <span className="lb2-day__l">{days.length ? dayLetter(d.date) : ''}</span>
        </div>;
      })}
    </div>
  </div>;
}

function PositionStrip({ position, total }: { position: number; total: number }) {
  const frac = total > 1 ? (position - 1) / (total - 1) : 0;
  return <div className="lb2-strip" role="img" aria-label={`Position ${position} of ${total}`}>
    <div className="lb2-strip__track"><span className="lb2-strip__fill" style={{ width: `${frac * 100}%` }} /><span className="lb2-strip__pin" style={{ ['--pos' as string]: `${frac * 100}%` }} /></div>
    <div className="lb2-strip__ends"><span>1st</span><span>{ordinal(total)}</span></div>
  </div>;
}

export function StandingHero({ you, ranked, rankedCount, metric, streak, periodLabel }: {
  you: RankedRow | null; ranked: RankedRow[]; rankedCount: number; metric: Metric; streak: StreakCard | undefined; periodLabel: string;
}) {
  const position = you?.position ?? null;
  const beat = position != null ? beatPercent(position, rankedCount) : null;
  const topPercent = position != null && rankedCount > 0 ? Math.max(1, Math.ceil((position / rankedCount) * 100)) : null;
  const near = you && position != null ? neighbour(you, ranked, metric) : null;

  return <section id="lb-hero" className="lb2-stand" data-testid="banner-your-rank">
    <div className="lb2-stand__main">
      <p className="lb2-muted">Your standing, {periodLabel}</p>
      {you && position != null ? <>
        <div className="lb2-rank">
          <span className="lb2-rank__num" data-testid="text-your-rank">#{position}</span>
          <div className="min-w-0">
            <h3 className="lb2-rank__title">{topPercent != null && rankedCount > 3 ? `Top ${topPercent}%` : position === 1 ? 'You lead' : 'On the podium'}</h3>
            {beat != null && <p className="lb2-muted" data-testid="text-beat-percent">You are doing better than {beat}% of other players.</p>}
          </div>
        </div>
        {rankedCount > 1 && <PositionStrip position={position} total={rankedCount} />}
        {near && <p className="lb2-gap" data-testid="text-rank-gap">{near.direction === 'above'
          ? <>{near.diff === 0 ? 'Level with' : <><b>{metric.format(near.diff)}</b> {metric.key === 'accuracy' ? 'behind' : `${metric.unit} to pass`}</>} <b>{near.row.name}</b> (#{near.row.position})</>
          : <>You’re <b>{metric.format(near.diff)}</b> {metric.key === 'accuracy' ? 'ahead of' : `${metric.unit} clear of`} <b>{near.row.name}</b></>}</p>}
      </> : <div className="lb2-empty">
        <h3 className="lb2-rank__title">{you ? 'Not ranked here yet' : 'Join the board'}</h3>
        <p className="lb2-muted">{you && metric.key === 'accuracy' ? 'Answer a few more questions to qualify for the accuracy ranking.' : you && metric.key === 'streak' ? 'Practise today to start your streak and climb this board.' : 'Finish a practice session in this period and you’ll appear here.'}</p>
        <Link href="/mcqs" className="studio-button lb2-cta" data-testid="link-start-practising"><BookOpen size={15} /> Start practising</Link>
      </div>}
      <dl className="lb2-stats">
        <div><dt>Points</dt><dd><Count value={you?.points ?? 0} /></dd></div>
        <div><dt>Accuracy</dt><dd><Count value={you?.accuracy ?? 0} decimals={you && you.accuracy % 1 ? 1 : 0} suffix="%" /></dd></div>
        <div><dt>Questions</dt><dd><Count value={you?.questionsAnswered ?? 0} /></dd></div>
        <div><dt>Sessions</dt><dd><Count value={you?.sessions ?? 0} /></dd></div>
      </dl>
    </div>
    <StreakPanel streak={streak} fallbackDays={you?.currentStreak ?? 0} />
  </section>;
}
