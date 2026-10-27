import SiteName from '@/components/SiteName';
// Auto-extracted shared helpers/components/hooks used across page modules.
// Split out of the original monolithic App.tsx so route-level pages can be
// lazy-loaded independently without dragging this along more than once.
import { type ReactNode, type ComponentProps, type TouchEvent, useState, useEffect, useRef, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, useSearch, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight,
  CircleHelp, Clock3, CreditCard, FileText, Flame, FolderOpen,
  LayoutDashboard, CalendarCheck, Library, LockKeyhole, LogOut, Menu, MoreHorizontal, Pencil, Plus,
  ReceiptText, Search, Settings, ShieldCheck, Sparkles, Stethoscope, Target, Trash2,
  TrendingUp, TrendingDown, Minus, Users, X, Zap, Bell, SlidersHorizontal, FileStack, NotebookPen, Bookmark,
  Flag, Trophy, MessageSquare, Landmark, Copy, QrCode, User as UserIcon, Mail, Phone, Hash,
  GraduationCap, Eye, EyeOff, Smartphone, UploadCloud, ImageOff,
  RotateCcw, ThumbsUp, ThumbsDown, CheckCheck, ClipboardCheck, AlertTriangle, Link2 as LinkIcon, Lightbulb,
  LayoutGrid, Presentation, Wand2, Crown, Globe, Star, Megaphone, Swords
} from 'lucide-react';
import { applyThemeVars } from '@/lib/theme';
import { Aurora, AuthShowcase } from '@/lib/landing-visuals';
import { SubjectIcon, resolveSubjectIcon } from '@/lib/subject-icons';
import { queryClient } from '@/lib/query-client';
import { isNativeApp, clearNativeAuthToken } from '@/lib/native-auth';
import { SidebarNav, SidebarProfile, type SidebarGroup } from '@/components/nav/SidebarNav';
import {
  getListMembershipPlansQueryKey, getListPaymentsQueryKey, getListMcqsQueryKey, getListModulesQueryKey, getListStudentsQueryKey, getListNotificationsQueryKey, getGetCurrentUserQueryKey,
  useApprovePayment, useCreateMembershipPlan, useCreateMcq, useCreateModule, useGetAdminDashboard,
  useGetCurrentUser, useGetStudentDashboard, useListFlashcards, useListMembershipPlans,
  useListMcqs, useListModules, useListNotifications, useListPayments, useListResources,
  useListStudents, useListSubjects, useListTopics, useRejectPayment,
  useSubmitPayment, useUpdateMembershipPlan,
} from '@/lib/api-client-react';
import type {
  AdminDashboard, Flashcard, Mcq, MembershipPlan, Module, Notification, Payment, Resource,
  Student, Subject, Topic, User
} from '@/lib/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { CommandPalette, type PalettePage } from '@/components/search/CommandPalette';
import { BlockPoster, ModulePoster } from '@/components/blocks/BlockCards';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { authApi, academicApi, settingsApi, uploadFile, resolveUploadUrl, ApiRequestError, publicApi, pastPapersApi, notebookApi, savedSessionsApi, flaggedMcqsApi, feedbackApi, type MyFeedbackEntry, analyticsApi, type ProgressTrend, mcqImportApi, studentsAdminApi, paymentsAdminApi, membershipPlansAdminApi, mcqAdminApi, notificationsApi, siteContentApi, teamApi, moduleAdminApi, blocksApi, type Block, examsAdminApi, examsApi, explanationsApi, booksApi, type AdminBookStudent, DEFAULT_IMPORT_PATTERNS, STUDENT_STATUSES, type Institution, type Program, type AcademicYear, type Batch, type PastPaper, type NotebookEntry, type SavedSession, type FlaggedMcq, type FeedbackEntry, type McqCandidate, type StudentDetail, type SiteContent, type TeamMember, TEAM_CATEGORIES, TEAM_CATEGORY_LABELS, type AdminModule, type AdminExam, type StudentExam, type ExamAttemptRow, type ExamStartResponse, type ExamResult, type Exam, type ExplanationStatus, type PaymentDetails, type PaymentMethodConfig, aiVisualizerApi, type VisualizationSpec, LeaderboardRow } from '@/lib/api';



// Round 3, item 10 (performance) — this was `new QueryClient()` with no
// options, meaning every query defaulted to `staleTime: 0` and refetched
// on every component mount AND every window refocus. For a study app where
// most data (modules, subjects, MCQs, progress) doesn't change
// second-to-second, that's a real over-fetching cost on every navigation
// and every alt-tab back to the app — exactly the "waterfalls/refetch on
// every mount" pattern item 10 flagged as a likely culprit. A 30s
// staleTime means switching between pages you've already visited in the
// last 30s reuses cached data instead of re-hitting the API, and turning
// off refetch-on-window-focus stops a background-tab refocus from firing
// a full page's worth of requests. Individual queries that DO need to
// react fast (the live leaderboard's refetchInterval, mutations that
// invalidateQueries after a save) already set their own options, which
// override these defaults per-query — this only changes the fallback for
// queries that didn't specify anything.

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const initials = (name = 'MDCAT') => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export const money = (amount: number, currency = 'PKR') => new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

// Shared with Shell's banner (below) and Register.tsx's pre-signup banner
// so both read GLOBAL_TRIAL_MODE/PROGRAM/YEAR the same way. Empty
// program/year strings mean "no restriction on that axis" (see
// routes/settings.ts's comment on those two keys) — this only affects the
// wording, the actual access grant is enforced server-side either way.
export function ordinalYear(year: number) { return `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'}`; }

// Small reusable confirm-before-delete dialog, used by every admin list's
// delete action (task: real confirm modal, not window.confirm).

export function ConfirmDialog({ title, body, confirmLabel = 'Delete', pendingLabel, onConfirm, onCancel, pending }: { title: string; body: string; confirmLabel?: string; pendingLabel?: string; onConfirm: () => void; onCancel: () => void; pending?: boolean }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onCancel}><div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"><h3 className="font-extrabold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p><div className="mt-5 flex gap-2"><button onClick={onCancel} className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold transition-transform active:scale-95" data-testid="button-confirm-cancel">Cancel</button><button onClick={onConfirm} disabled={pending} className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-extrabold text-destructive-foreground transition-transform active:scale-95 disabled:opacity-50" data-testid="button-confirm-delete">{pending ? (pendingLabel ?? 'Deleting…') : confirmLabel}</button></div></div></div>;
}

// Branded full-screen loader — same wave-draw look as the static one in
// index.html (which covers the gap before JS loads at all), used here for
// the session-restore loading state once React has taken over. Self-
// contained <style> tag rather than a Tailwind config change, matching how
// index.html does it, so the two stay visually identical without needing
// to share a build step.

// Kept visually identical to index.html's raw-HTML .boot-loader (which
// paints before React/JS has even downloaded) — see the comment above that
// markup. Both got the same 2024 redesign: a vibrant multi-tone gradient
// backdrop with slow-drifting blurred glow orbs, a glassmorphism card, and
// a "3D" wave mark (blurred glow pass + offset dark shadow pass beneath the
// gradient-stroked main pass) that gently tilts in place instead of sitting
// flat.
export function BrandedLoadingScreen() {
  return <div className="study-loader" role="status" aria-live="polite"><div><div className="study-loader__mark"><svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 11C15 9 20 11 24 15C28 11 33 9 40 11V35C33 33 28 35 24 39C20 35 15 33 8 35V11Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M24 15V39M14 18H18M14 24H18M30 18H34M30 24H34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></div><div className="study-loader__brand"><SiteName /></div><p className="study-loader__caption">Preparing your next step.</p><div className="study-loader__track" /></div></div>;
}

// Small reusable brand mark used anywhere the app needs an inline
// "loading" indicator — replaces plain spinners / bare "Loading…" text so
// every loading state (not just the full-screen boot one) carries the
// MDCAT wave mark instead of defaulting to blank white.

export function BrandSpinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <svg width={size} height={size * 0.625} viewBox="0 0 64 40" aria-hidden="true" role="status" aria-label="Loading" className={cn('brand-spinner shrink-0', className)}>
    <path d="M2 20 H14 L19 6 L27 34 L33 12 L38 20 H62" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function InlineLoading({ label = 'Loading…', size = 13 }: { label?: string; size?: number }) {
  return <div className="flex items-center gap-2 py-2 text-[11px] font-semibold text-primary"><BrandSpinner size={size} />{label}</div>;
}

// Animated version of the brand mark (same path + pulse keyframe as
// BrandedLoadingScreen's boot animation) sized for inline use next to a
// wordmark — e.g. the marketing site's nav logo — rather than as a
// full-screen loading state.
export function AnimatedBrandMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn('shrink-0', className)}>
    <rect width="32" height="32" rx="10" fill="currentColor" />
    <path d="M7 12c4-1 6 0 9 2 3-2 5-3 9-2v11c-4-1-6 0-9 2-3-2-5-3-9-2Z" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M16 14v11" stroke="white" strokeWidth="1.5" /><circle cx="16" cy="8" r="2.5" fill="#F2A084" />
  </svg>;
}

export function SkeletonPage() { return <div className="space-y-5"><div className="flex items-center gap-2 text-primary"><BrandSpinner size={22} /><span className="text-[11px] font-bold uppercase tracking-[.1em]">Loading</span></div><div className="skeleton h-8 w-56 rounded-lg" /><div className="grid gap-4 md:grid-cols-3"><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div><div className="skeleton h-72 rounded-2xl" /></div>; }

export function EmptyState({ icon: Icon = FolderOpen, title, body, action }: { icon?: typeof FolderOpen; title: string; body: string; action?: ReactNode }) { return <div className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center"><div><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15"><Icon size={24} /></div><h3 className="text-[15px] font-extrabold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div></div>; }

export function ErrorState({ retry }: { retry?: () => void }) { return <div className="rounded-2xl border border-[#efc7bc] bg-[#fff5f0] p-6 text-sm text-[#9e4c39]"><div className="flex items-center gap-2 font-bold"><CircleHelp size={17} /> We couldn't load this view.</div><p className="mt-2 text-[#a96a5b]">Check your connection, then try again.</p>{retry && <button onClick={retry} className="mt-4 rounded-lg bg-[#a9533f] px-3 py-2 text-xs font-bold text-white" data-testid="button-retry">Try again</button>}</div>; }

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' }) { return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ring-1 ring-inset', tone === 'green' && 'bg-[#d7eee4] text-[#287058] ring-[#287058]/15', tone === 'amber' && 'bg-[#fff0cb] text-[#8d6420] ring-[#8d6420]/15', tone === 'red' && 'bg-[#f9ddd6] text-[#a34c3e] ring-[#a34c3e]/15', tone === 'blue' && 'bg-[#dceaf1] text-[#32647b] ring-[#32647b]/15', tone === 'neutral' && 'bg-muted text-muted-foreground ring-border')}>{children}</span>; }

// easy -> green, moderate -> blue, hard -> red — was a hardcoded blue
// regardless of value.

export function difficultyTone(difficulty?: string | null): 'green' | 'blue' | 'red' {
  if (difficulty === 'easy') return 'green';
  if (difficulty === 'hard') return 'red';
  return 'blue';
}

export function Progress({ value, color = 'bg-primary' }: { value: number; color?: string }) { return <div className="d3-well h-2.5 overflow-hidden rounded-full"><div className={cn('bar-fill h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: ReactNode; action?: ReactNode }) { return <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2"><div className="flex items-stretch gap-3"><span className="w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary/30" /><div>{eyebrow && <div className="font-mono-app text-[10px] font-bold uppercase tracking-[.16em] text-primary">{eyebrow}</div>}<h2 className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-[-.03em]">{title}</h2>{description && <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p>}</div></div>{action}</div>; }

export function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-border/60 bg-card/70 p-3 text-center"><div className="font-display text-2xl">{value}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div></div>; }

// The student-facing half of the same progress-trend data the practice
// result card uses — so a student can check "am I improving?" any time,
// not just right after finishing a session.

export function StatTile({ icon: Icon, bg, fg, label, value }: { icon: typeof Clock3; bg: string; fg: string; label: string; value: ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-2xs)] transition-shadow hover:shadow-[var(--shadow-xs)]" data-testid={`stat-tile-${label.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="flex items-center gap-3"><span className={cn('d3-tile grid size-10 shrink-0 place-items-center rounded-xl', bg, fg)}><Icon size={18} /></span><div className="text-xs font-semibold text-muted-foreground">{label}</div></div>
    <div className="mt-3 font-display text-3xl">{value}</div>
  </div>;
}
