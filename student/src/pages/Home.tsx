// Public marketing landing page — mounted at "/" (see App.tsx). Signed-out
// visitors land here first instead of being bounced straight to /login; a
// visitor who turns out to already have a session is sent on to
// /dashboard once that check resolves (see the effect below). Structure is
// modeled on the "hero → why us → about → pricing → features → CTA →
// footer" shape common to ed-tech marketing sites, filled in with this
// app's own copy, routes, and live data (site content + membership plans
// are both public endpoints) rather than any third-party site's content.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight, BookOpen, Bookmark, Check, ClipboardCheck, FileStack,
  GraduationCap, Lightbulb, Library, Menu, Sparkles, Stethoscope, Target, Trophy, TrendingUp, Wand2, X, Zap,
} from 'lucide-react';
import { useGetCurrentUser, getGetCurrentUserQueryKey, useListMembershipPlans } from '@/lib/api-client-react';
import type { MembershipPlan } from '@/lib/api-client-react';
import { siteContentApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { cn, Footer, AnimatedBrandMark, Testimonials, useSeoSync } from '@/lib/shared';
import { Reveal, SpotlightCard } from '@/lib/motion';
import { Aurora, GlossIcon } from '@/lib/landing-visuals';
import { TeamShowcase } from '@/components/TeamShowcase';

const WHY_US = [
  { hue: 176, icon: GraduationCap, title: 'Five subjects, one study space', desc: 'Biology, Chemistry, Physics, English and Logical Reasoning, organised for focused preparation.' },
  { hue: 176, icon: Lightbulb, title: 'Explanations included', desc: "Review available explanations alongside your answers to understand the reasoning." },
  { hue: 176, icon: Target, title: 'Practice, not panic', desc: 'Untimed practice by default. Timed MDCAT mock exams when you actually want the pressure.' },
  { hue: 176, icon: TrendingUp, title: 'Analytics that find the gaps', desc: 'Automatic weak-topic tracking so revision time goes where it actually helps.' },
  { hue: 176, icon: Trophy, title: 'Streaks, leaderboards & challenges', desc: 'Keep a daily streak, climb the leaderboard, or send a quiz code to a classmate and see who scores higher.' },
  { hue: 176, icon: Bookmark, title: 'Your own review flow', desc: 'Flag tricky MCQs, keep private notes in your notebook, and save sessions to pick up right where you left off.' },
];

const FEATURES = [
  { hue: 176, icon: BookOpen, title: 'MCQ Bank', desc: 'Subject and topic-based questions for focused practice.', href: '/mcqs' },
  { hue: 176, icon: Target, title: 'Practice Mode', desc: 'Untimed, explanation-first practice sessions you can start in a couple of taps.', href: '/practice' },
  { hue: 176, icon: ClipboardCheck, title: 'MDCAT Mock Exams', desc: 'Timed mock exams built to feel like the real thing, with full result breakdowns.', href: '/exams' },
  { hue: 176, icon: FileStack, title: 'Past Papers', desc: "Previous years' papers, organised and ready to work through subject by subject.", href: '/past-papers' },
  { hue: 176, icon: Zap, title: 'Flashcards', desc: 'Quick-fire spaced review for the facts that need to just stick.', href: '/flashcards' },
  { hue: 176, icon: BookOpen, title: 'Study Notes', desc: 'Readable notes with search, highlights, diagrams and saved reading position.', href: '/notes' },
  { hue: 176, icon: Library, title: 'Books', desc: 'Read free books, or unlock paid ones in the built-in reader.', href: '/books' },
];

function formatPrice(plan: MembershipPlan) {
  if (!plan.price) return 'Free';
  const amount = plan.currency === 'PKR' ? `Rs. ${plan.price.toLocaleString()}` : `${plan.currency} ${plan.price}`;
  // durationUnit is already stored plural ("months"/"years"/"days" — see
  // approve-payment's plan.durationUnit === "years"/"months" checks), so
  // appending another "s" here produced "monthss"/"yearss". Singularize it
  // for the 1-unit case instead of blindly pluralizing every case.
  const unit = plan.duration === 1 ? plan.durationUnit.replace(/s$/, '') : `${plan.duration} ${plan.durationUnit}`;
  return `${amount} / ${unit}`;
}

export default function Home() {
  const [, setLocation] = useLocation();
  useSeoSync();
  const [menuOpen, setMenuOpen] = useState(false);
  // Lightweight session check — doesn't block the page from rendering for
  // the (much more common) signed-out visitor; if it turns out there IS a
  // valid session, we hand off to the real dashboard once we know that.
  const userQuery = useGetCurrentUser({ query: { retry: false, queryKey: getGetCurrentUserQueryKey() } });
  const siteQ = useQuery({ queryKey: ['site-content'], queryFn: siteContentApi.get });
  const plansQ = useListMembershipPlans();
  const platformName = siteQ.data?.PLATFORM_NAME || 'MDCAT';
  const tagline = siteQ.data?.PLATFORM_TAGLINE;
  const plans = (plansQ.data ?? []).filter((p) => p.active).sort((a, b) => a.displayOrder - b.displayOrder);

  useEffect(() => {
    if (userQuery.data) setLocation('/dashboard');
  }, [userQuery.data, setLocation]);

  return <div className="studio-home min-h-[100dvh] bg-background">
    {/* Nav */}
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
          <AnimatedBrandMark size={22} className="text-primary" />
          <span className="text-[15px] font-extrabold tracking-[-.03em] text-primary">{platformName}</span>
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-bold text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#reviews" className="hover:text-foreground">Reviews</a>
          <a href="#about" className="hover:text-foreground">About</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-xl px-4 py-2.5 text-xs font-extrabold text-foreground hover:bg-muted" data-testid="link-nav-login">Log in</Link>
          <Link href="/register" className="btn-pop rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm" data-testid="link-nav-signup">Sign up</Link>
        </div>
        <button onClick={() => setMenuOpen((v) => !v)} className="grid size-9 place-items-center rounded-lg border border-border text-foreground md:hidden" data-testid="button-nav-menu" aria-label="Menu">
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
      {menuOpen && <div className="border-t border-border bg-background px-5 py-4 md:hidden">
        <nav className="flex flex-col gap-1 text-sm font-bold text-foreground">
          <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-muted">Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-muted">Pricing</a>
          <a href="#reviews" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-muted">Reviews</a>
          <a href="#about" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-muted">About</a>
          <div className="mt-2 flex gap-2 border-t border-border pt-3">
            <Link href="/login" className="flex-1 rounded-xl border border-border py-2.5 text-center text-xs font-extrabold" data-testid="link-nav-login-mobile">Log in</Link>
            <Link href="/register" className="flex-1 rounded-xl bg-primary py-2.5 text-center text-xs font-extrabold text-primary-foreground" data-testid="link-nav-signup-mobile">Sign up</Link>
          </div>
        </nav>
      </div>}
    </header>

    <section className="studio-hero">
      <div>
        <span className="studio-eyebrow"><span className="size-2 rounded-full bg-accent" /> A little progress. Every day.</span>
        <h1>Big dreams.<br /><span>Small daily wins.</span></h1>
        <p>{tagline || 'A calmer space for your MDCAT preparation. Practice by topic, make ideas stick, and find your rhythm — one focused session at a time.'}</p>
        <div className="studio-actions"><Link href="/register" className="studio-button" data-testid="link-hero-signup">Find your starting point <ArrowRight size={17}/></Link><a href="#features" className="studio-button studio-button--quiet">Take a look around</a></div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Check size={15} className="text-primary"/> Practice, reading & revision. Together.</div>
      </div>
      <div className="studio-preview" aria-label="Illustrative practice preview">
        <div className="studio-preview__label"><span className="flex items-center gap-2"><BookOpen size={17}/> A glimpse of your study space</span><span className="rounded-full bg-card px-2 py-1 text-[9px] text-foreground">PREVIEW</span></div>
        <div className="studio-question"><small>Biology · Cell biology</small><h2>Which organelle produces most of a cell’s ATP?</h2><div className="studio-answer"><span>A</span> Ribosome</div><div className="studio-answer studio-answer--correct"><span>B</span> Mitochondrion <Check size={15} className="ml-auto"/></div><div className="studio-answer"><span>C</span> Lysosome</div><p className="mt-4 text-xs leading-5 text-muted-foreground">Understand the why. Then try the next question.</p></div>
        <div className="studio-preview__foot"><div><Library size={20}/><strong>Room to explore</strong><small>Notes & your book reader</small></div><div><Zap size={20}/><strong>Make it stick</strong><small>A fresh set of flashcards</small></div></div>
      </div>
    </section>
    <div className="studio-subjects" aria-label="Subjects covered">{['Biology','Chemistry','Physics','English','Logical Reasoning'].map(subject=><span key={subject}>{subject}</span>)}</div>

    {/* Why choose us */}
    <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">Why choose us</div>
        <h2 className="mt-3 font-display text-4xl tracking-[-.03em]">Built for how you actually study</h2>
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {WHY_US.map((item, i) => <Reveal key={item.title} delay={(i % 3) * 90}><SpotlightCard className="h-full rounded-2xl border border-border bg-card p-6">
          <GlossIcon icon={item.icon} hue={item.hue} />
          <h3 className="mt-4 text-sm font-extrabold">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
        </SpotlightCard></Reveal>)}
      </div>
    </section>

    <Testimonials />

    {/* About */}
    <section id="about" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-3xl px-5 py-20 text-center md:px-8">
        <div className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">About {platformName}</div>
        <h2 className="mt-3 font-display text-4xl tracking-[-.03em]">Your preparation, with room to breathe.</h2>
        <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-base">
          {platformName} brings every subject, every topic, and your MCQ practice into one place, so
          revision stops being a scavenger hunt across scattered PDFs and group-chat screenshots.
          Practice mode stays untimed and explanation-first by default — the MDCAT mock exams are
          there for when you actually want the pressure. Progress tracking quietly keeps an eye on
          which topics need another pass, so your next study session already knows where to start.
        </p>
      </div>
    </section>

    {/* Team — same team data managed in Admin → Site content → Team, also
        shown on /about. v37: dark 3D-style showcase (components/TeamShowcase). */}
    <TeamShowcase team={siteQ.data?.team ?? []} />

    {/* Pricing */}
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-20 md:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">Pricing</div>
        <h2 className="mt-3 font-display text-4xl tracking-[-.03em]">Simple, affordable plans</h2>
        <p className="mt-3 text-sm text-muted-foreground">Choose the membership that fits your preparation.</p>
      </Reveal>
      {plansQ.isLoading ? <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div> : plans.length === 0 ? <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        <Link href="/register" className="font-bold text-primary hover:underline" data-testid="link-pricing-fallback">Create a free account</Link> to see current plans and pricing.
      </div> : <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => <div key={plan.id} className={cn('relative flex flex-col rounded-2xl border p-7', i === 1 ? 'border-primary bg-[#eef7f1] shadow-lg' : 'border-border bg-card', 'card-lift')} data-testid={`card-plan-${plan.id}`}>
          {plan.discountLabel && <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-[10px] font-extrabold text-accent-foreground">{plan.discountLabel}</span>}
          <h3 className="text-sm font-extrabold">{plan.name}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{plan.description}</p>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-3xl tracking-[-.03em]">{formatPrice(plan)}</span>
            {plan.originalPrice != null && plan.originalPrice > plan.price && <span className="text-xs text-muted-foreground line-through">{plan.currency} {plan.originalPrice}</span>}
          </div>
          <Link href="/register" className={cn('btn-pop mt-7 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold', i === 1 ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:bg-muted')} data-testid={`link-plan-signup-${plan.id}`}>
            Get started <ArrowRight size={14} />
          </Link>
        </div>)}
      </div>}
    </section>

    {/* Features */}
    <section id="features" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="font-mono-app text-[10px] uppercase tracking-[.16em] text-primary">Platform features</div>
          <h2 className="mt-3 font-display text-4xl tracking-[-.03em]">Everything you need in one place</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => <Reveal key={f.title} delay={(i % 3) * 90}><SpotlightCard className="h-full rounded-2xl border border-border bg-card p-6">
            <GlossIcon icon={f.icon} hue={f.hue} />
            <h3 className="mt-4 text-sm font-extrabold">{f.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.desc}</p>
          </SpotlightCard></Reveal>)}
        </div>
      </div>
    </section>

    {/* Final CTA */}
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-sidebar px-6 py-14 text-center text-sidebar-foreground shadow-xl md:px-12 md:py-16">
          <Aurora />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-display text-4xl tracking-[-.03em] md:text-5xl">Ready to start studying smarter?</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-sidebar-foreground/80">
              Create a free account and see the subjects, topics, and study tools right away.
            </p>
            <Link href="/register" className="btn-pop shine-btn mt-8 inline-flex items-center gap-2 rounded-xl bg-sidebar-primary px-8 py-3.5 text-xs font-extrabold text-sidebar-primary-foreground shadow-lg" data-testid="link-cta-signup">
              Create your free account <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>

    <div className="mx-auto max-w-6xl px-5 pb-16 md:px-8"><Footer variant="full" /></div>
  </div>;
}
