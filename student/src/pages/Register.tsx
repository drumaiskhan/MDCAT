// Auto-extracted route page — code-split via React.lazy() in App.tsx.
import { type ReactNode, type ComponentProps, type TouchEvent, useState, useEffect, useRef, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, useSearch, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight,
  CircleHelp, Clock3, CreditCard, FileText, Flame, FolderOpen,
  LayoutDashboard, Library, LockKeyhole, LogOut, Menu, MoreHorizontal, Pencil, Plus,
  ReceiptText, Search, Settings, ShieldCheck, Sparkles, Stethoscope, Target, Trash2,
  TrendingUp, TrendingDown, Minus, Users, X, Zap, Bell, SlidersHorizontal, FileStack, NotebookPen, Bookmark,
  Flag, Trophy, MessageSquare, Landmark, Copy, QrCode, User as UserIcon, Mail, Phone, Hash,
  GraduationCap, Eye, EyeOff, Smartphone, UploadCloud, ImageOff,
  RotateCcw, ThumbsUp, ThumbsDown, CheckCheck, ClipboardCheck, AlertTriangle, Link2 as LinkIcon, Lightbulb,
  LayoutGrid, Presentation, Wand2, Crown, Globe, Star, Activity
} from 'lucide-react';
import { applyThemeVars } from '@/lib/theme';
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
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { authApi, couponsApi, academicApi, settingsApi, uploadFile, resolveUploadUrl, ApiRequestError, publicApi, pastPapersApi, notebookApi, savedSessionsApi, flaggedMcqsApi, feedbackApi, type MyFeedbackEntry, analyticsApi, type ProgressTrend, mcqImportApi, studentsAdminApi, paymentsAdminApi, membershipPlansAdminApi, mcqAdminApi, notificationsApi, siteContentApi, teamApi, moduleAdminApi, blocksApi, type Block, examsAdminApi, examsApi, explanationsApi, booksApi, type AdminBookStudent, DEFAULT_IMPORT_PATTERNS, STUDENT_STATUSES, type Institution, type Program, type AcademicYear, type Batch, type PastPaper, type NotebookEntry, type SavedSession, type FlaggedMcq, type FeedbackEntry, type McqCandidate, type StudentDetail, type SiteContent, type TeamMember, TEAM_CATEGORIES, TEAM_CATEGORY_LABELS, type AdminModule, type AdminExam, type StudentExam, type ExamAttemptRow, type ExamStartResponse, type ExamResult, type Exam, type ExplanationStatus, type PaymentDetails, type PaymentMethodConfig, aiVisualizerApi, type VisualizationSpec, LeaderboardRow } from '@/lib/api';

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
import { AuthLayout, AuthField, AuthPassword, AuthSteps, IconField, PasswordStrength, cn, initials, money, BrandSpinner, PaymentDestinationCard, trialScopeLabel, trialFeatureSummary } from '@/lib/shared';

function MarksPair({ label, id, marks, total, pct, onMarks, onTotal }: { label: string; id: string; marks: string; total: string; pct: number | null; onMarks: (v: string) => void; onTotal: (v: string) => void }) {
  return <div className="au-marks">
    <div className="au-marks__label"><span>{label}</span>{pct != null && <b className="au-marks__pct" data-testid={`text-${id}-percent`}>{pct}%</b>}</div>
    <div className="au-marks__row">
      <input className="au-input au-input--plain" required type="number" inputMode="decimal" min={0} step="any" name={`${id}Marks`} value={marks} onChange={(e) => onMarks(e.target.value)} placeholder="Marks obtained" aria-label={`${label} marks obtained`} data-testid={`input-register-${id}-marks`} />
      <span className="au-marks__of" aria-hidden="true">out of</span>
      <input className="au-input au-input--plain" required type="number" inputMode="decimal" min={1} step="any" name={`${id}Total`} value={total} onChange={(e) => onTotal(e.target.value)} placeholder="Total" aria-label={`${label} total marks`} data-testid={`input-register-${id}-total`} />
    </div>
  </div>;
}

function Register() {
  // Two steps on one <form>: "About you" and "Plan & payment". Both steps stay
  // mounted (the inactive one is just `hidden`) so FormData on the final submit
  // still sees the name / email / phone / password typed on step 1.
  const [step, setStep] = useState<1 | 2>(1);
  const step1Ref = useRef<HTMLDivElement>(null);
  const [recap, setRecap] = useState<{ name: string; email: string } | null>(null);
  // Merit-list inputs. Controlled so the form can show a live percentage and
  // catch "marks higher than total" before the student moves to payment.
  const [matric, setMatric] = useState({ marks: '', total: '1100' });
  const [fsc, setFsc] = useState({ marks: '', total: '1100' });
  const [planId, setPlanId] = useState<number | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<{ code: string; discountedAmount: number; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [proof, setProof] = useState<{ storagePath: string; fileName: string; previewUrl: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Bumped on every new error so the banner remounts and shakes again.
  const [errorTick, setErrorTick] = useState(0);
  const [done, setDone] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredFree, setRegisteredFree] = useState(false);

  const fail = (message: string) => { setError(message); setErrorTick((n) => n + 1); };

  const plans = useListMembershipPlans();
  const paymentDetails = useQuery({ queryKey: ['payment-details'], queryFn: publicApi.paymentDetails });
  // Same site-content query Shell (shared.tsx) reads for its post-login
  // trial banner — surfaced here too so a signed-out visitor sees trial
  // availability *before* they commit to picking a plan and uploading
  // payment proof, not just after logging in.
  const siteQ = useQuery({ queryKey: ['site-content'], queryFn: siteContentApi.get });
  const trialOn = !!siteQ.data?.trial?.active;
  const trialScope = trialScopeLabel(siteQ.data?.trial?.program, siteQ.data?.trial?.years);

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => setDone(true),
    onError: (err: unknown) => fail(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.'),
  });

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const res = await uploadFile(file, 'payment-proof-signup');
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      setProof({ storagePath: res.storagePath, fileName: file.name, previewUrl });
    } catch (err) {
      fail(err instanceof ApiRequestError ? err.message : 'Could not upload that file. Try a smaller image or PDF.');
    } finally {
      setUploading(false);
    }
  };

  if (done) return <AuthLayout register>
    <div className="au-success">
      <div className="au-success__badge"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
      <h1 className="au-title">Almost there</h1>
      <p className="au-sub">We emailed a 6-digit code to <span className="font-bold text-foreground">{registeredEmail}</span>. Enter it to confirm your email — {registeredFree ? 'your account is ready to use right after that.' : 'once our team verifies your payment, your account is activated automatically.'}</p>
      <Link href={`/verify-email?email=${encodeURIComponent(registeredEmail)}`} className="au-btn mt-7" data-testid="link-enter-code">Enter verification code <ArrowRight size={16} className="au-btn__go" /></Link>
    </div>
  </AuthLayout>;

  const selectedPlan = (plans.data || []).find((p) => p.id === planId) || null;
  // A zero-priced plan (e.g. Trial) needs no payment, so no proof and no coupon.
  const isFreePlan = !!selectedPlan && Number(selectedPlan.price) <= 0;
  const bestValueId = (plans.data || []).length > 1 ? [...(plans.data || [])].sort((a, b) => (a.price / a.duration) - (b.price / b.duration))[0].id : null;

  const applyCoupon = async () => {
    if (!planId || !couponInput.trim()) return;
    setCouponChecking(true); setCouponError(null);
    try {
      const result = await couponsApi.validate(couponInput.trim(), planId);
      setCouponResult({ code: couponInput.trim().toUpperCase(), discountedAmount: result.discountedAmount, discountAmount: result.discountAmount });
    } catch (err) {
      setCouponResult(null);
      setCouponError(err instanceof ApiRequestError ? err.message : 'Could not check that code right now.');
    } finally {
      setCouponChecking(false);
    }
  };
  const pd = paymentDetails.data;
  const pctOf = (v: { marks: string; total: string }) => {
    const m = Number(v.marks), t = Number(v.total);
    return v.marks !== '' && t > 0 && m >= 0 && m <= t ? Math.round((m / t) * 10000) / 100 : null;
  };
  const matricPct = pctOf(matric);
  const fscPct = pctOf(fsc);

  // Step 1 → 2. Native validation first (required / email / min length), then
  // the three custom pickers in the order they appear on screen.
  const goNext = () => {
    setError(null);
    const fields = Array.from(step1Ref.current?.querySelectorAll<HTMLInputElement>('input[name]') ?? []);
    const bad = fields.find((el) => !el.checkValidity());
    if (bad) { bad.reportValidity(); return; }
    if (matricPct == null) return fail('Matric marks must be a number no higher than the total.');
    if (fscPct == null) return fail('FSc marks must be a number no higher than the total.');
    const val = (n: string) => step1Ref.current?.querySelector<HTMLInputElement>(`input[name="${n}"]`)?.value.trim() ?? '';
    setRecap({ name: val('name'), email: val('email') });
    setStep(2);
    window.scrollTo?.({ top: 0 });
  };
  const goBack = () => { setError(null); setStep(1); window.scrollTo?.({ top: 0 }); };

  const errorBlock = error && <div key={errorTick} className="au-alert is-shaking mt-4" role="alert" data-testid="text-register-error"><AlertTriangle size={16} /><div>{error}</div></div>;

  return <AuthLayout register>
    <AuthSteps step={step} onBack={goBack} />

    <form noValidate={false} onSubmit={(e) => {
      e.preventDefault();
      // Enter inside a step-1 field means "continue", never "submit".
      if (step === 1) { goNext(); return; }
      setError(null);
      if (!planId) { fail('Please choose a membership plan.'); return; }
      if (!isFreePlan && !proof) { fail('Please upload your payment proof before submitting.'); return; }
      const f = new FormData(e.currentTarget);
      const email = String(f.get('email')).trim();
      setRegisteredEmail(email);
      setRegisteredFree(isFreePlan);
      register.mutate({
        name: String(f.get('name')).trim(), email, password: String(f.get('password')),
        phone: String(f.get('phone')).trim(),
        matricMarks: Number(matric.marks), matricTotal: Number(matric.total), fscMarks: Number(fsc.marks), fscTotal: Number(fsc.total), planId, proofPath: isFreePlan ? undefined : proof?.storagePath,
        couponCode: isFreePlan ? undefined : couponResult?.code,
      });
    }}>

      {/* ───────── Step 1 — About you ───────── */}
      <div ref={step1Ref} hidden={step !== 1} className={step === 1 ? 'au-step-in' : undefined}>
        <h1 className="au-title">Create your account</h1>
        <p className="au-sub">The complete MCQ bank for MDCAT students — built for daily practice and learning, not exam pressure.</p>

        {trialOn && <div className="au-note mt-5" data-testid="banner-register-trial-mode"><Sparkles size={15} /><span>Trial mode is on{trialScope ? <> for <strong>{trialScope}</strong> students</> : ''} — you'll get {siteQ.data?.trial ? trialFeatureSummary(siteQ.data.trial.features) : 'free access'} free, right after you verify your email. No need to wait on payment review while it's active.</span></div>}

        <div className="mt-6">
          <AuthField label="Full name" icon={UserIcon} required name="name" autoComplete="name" placeholder="Your name" data-testid="input-register-name" />

          <AuthField label="Email" icon={Mail} required type="email" name="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@college.edu" data-testid="input-register-email" />
          <AuthField label="WhatsApp number" icon={Phone} required type="tel" name="phone" inputMode="tel" autoComplete="tel" placeholder="03xx-xxxxxxx" data-testid="input-register-phone" />
          <AuthPassword required minLength={8} name="password" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" toggleTestId="button-toggle-password" data-testid="input-register-password" />
          <PasswordStrength value={passwordValue} />

          <div className="au-section" role="group" aria-labelledby="reg-record-label">
            <div className="au-section__head"><span className="au-section__ico" aria-hidden="true"><GraduationCap size={16} /></span><div><div className="au-section__title" id="reg-record-label">Academic record</div><p className="au-section__sub">Used to calculate your merit position. Enter marks exactly as printed on your result card.</p></div></div>
            <MarksPair label="Matric" marks={matric.marks} total={matric.total} pct={matricPct} onMarks={(v) => setMatric((m) => ({ ...m, marks: v }))} onTotal={(v) => setMatric((m) => ({ ...m, total: v }))} id="matric" />
            <MarksPair label="FSc / Intermediate" marks={fsc.marks} total={fsc.total} pct={fscPct} onMarks={(v) => setFsc((m) => ({ ...m, marks: v }))} onTotal={(v) => setFsc((m) => ({ ...m, total: v }))} id="fsc" />
            <p className="au-hint">You'll be able to add your MDCAT marks from your profile after the results come out.</p>
          </div>
        </div>

        {step === 1 && errorBlock}
        <button type="button" onClick={goNext} className="au-btn mt-6" data-testid="button-register-continue">Continue <ArrowRight size={16} className="au-btn__go" /></button>
      </div>

      {/* ───────── Step 2 — Plan & payment ───────── */}
      <div hidden={step !== 2} className={step === 2 ? 'au-step-in' : undefined}>
        <h1 className="au-title">Choose your plan</h1>
        <p className="au-sub">Pick a plan. Paid plans need a payment receipt, which our team reviews before activating your account; free plans don't need one.</p>

        {recap && <div className="au-recap mt-5">
          <div className="au-recap__avatar" aria-hidden="true">{initials(recap.name)}</div>
          <div className="min-w-0"><div className="truncate text-sm font-extrabold">{recap.name}</div><div className="truncate text-[11px] text-muted-foreground">Matric {matricPct ?? '—'}% · FSc {fscPct ?? '—'}%</div></div>
          <button type="button" onClick={goBack} className="au-recap__edit" data-testid="button-register-edit-details">Edit</button>
        </div>}

        <div className="mt-6">
          <div className="au-fieldset-label" id="reg-plan-label">Membership plan</div>
          <div className="au-plans" role="group" aria-labelledby="reg-plan-label">
            {(plans.data || []).map((plan) => <button type="button" key={plan.id} aria-pressed={planId === plan.id} onClick={() => setPlanId(plan.id)} className="au-plan" data-testid={`button-select-plan-${plan.id}`}>
              {plan.id === bestValueId ? <span className="au-plan__badge">Best value</span> : plan.discountLabel ? <span className="au-plan__badge">{plan.discountLabel}</span> : null}
              <span className="au-plan__radio" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
              <span className="min-w-0"><span className="au-plan__name block">{plan.name}</span><span className="au-plan__meta block">{plan.duration} {plan.durationUnit} access</span></span>
              <span className="au-plan__price">{plan.originalPrice != null && plan.originalPrice > plan.price && <span className="au-plan__was">{money(plan.originalPrice, plan.currency)}</span>}{Number(plan.price) <= 0 ? 'Free' : money(plan.price, plan.currency)}</span>
            </button>)}
            {!plans.data?.length && <p className="au-hint">{plans.isLoading ? 'Loading plans…' : 'No membership plans are available yet — ask an admin to add one.'}</p>}
          </div>
        </div>

        {selectedPlan && !isFreePlan && <div className="au-coupon mt-4">
          <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCouponResult(null); setCouponError(null); }} placeholder="Coupon code (optional)" aria-label="Coupon code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="au-input au-input--plain" data-testid="input-register-coupon" />
          <button type="button" onClick={applyCoupon} disabled={!couponInput.trim() || couponChecking} className="au-btn au-btn--ghost au-btn--sm" data-testid="button-apply-coupon">{couponChecking ? 'Checking…' : 'Apply'}</button>
        </div>}
        {!isFreePlan && couponError && <p className="au-hint mt-2 !text-destructive" data-testid="text-coupon-error">{couponError}</p>}
        {!isFreePlan && couponResult && <p className="au-hint mt-2 !text-primary" data-testid="text-coupon-applied">Coupon applied — new price {selectedPlan ? money(couponResult.discountedAmount, selectedPlan.currency) : couponResult.discountedAmount}</p>}


        {pd && !isFreePlan && <div className="mt-5"><PaymentDestinationCard pd={pd} /></div>}

        {!isFreePlan && <div className="mt-5">
          <div className="au-fieldset-label">Payment proof<small>Required</small></div>
          <label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }} className={cn('au-drop', dragOver && 'is-over', proof && 'is-done')} data-testid="dropzone-payment-proof">
            <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" data-testid="input-payment-proof" />
            {uploading
              ? <p className="au-drop__title text-muted-foreground">Uploading…</p>
              : proof
                ? <>{proof.previewUrl ? <img src={proof.previewUrl} alt="Payment proof preview" className="max-h-28 rounded-lg border border-border object-contain" /> : <FileText size={22} className="text-primary" />}<p className="au-drop__title text-primary">{proof.fileName}</p><span className="au-drop__sub">Tap to replace</span></>
                : <><UploadCloud size={24} className="text-muted-foreground" /><p className="au-drop__title">Drop your payment screenshot here, or tap to browse</p><span className="au-drop__sub">PNG, JPEG, WEBP or PDF</span></>}
          </label>
        </div>}

        {selectedPlan && isFreePlan && <div className="au-ok mt-5" data-testid="text-free-plan-note"><CheckCircle2 size={15} className="shrink-0" /><span>{selectedPlan.name} is free — no payment needed. Create your account and verify your email to start right away.</span></div>}

        {selectedPlan && !isFreePlan && <div className="au-ok mt-5"><CheckCircle2 size={15} className="shrink-0" /><span>Paying {money(couponResult ? couponResult.discountedAmount : selectedPlan.price, selectedPlan.currency)} for {selectedPlan.name} — your order goes to the admin for approval.</span></div>}

        {step === 2 && errorBlock}
        <div className="au-row mt-5">
          <button type="button" onClick={goBack} className="au-btn au-btn--ghost" aria-label="Back to your details" data-testid="button-register-back"><ArrowLeft size={16} /> Back</button>
          <button disabled={register.isPending || uploading} className="au-btn" data-testid="button-register-submit">{register.isPending ? <><BrandSpinner size={20} /> Creating your account…</> : 'Create account'}</button>
        </div>
      </div>
    </form>

    <div className="au-or">Already registered?</div>
    <Link href="/login" className="au-btn au-btn--ghost" data-testid="link-login">Sign in</Link>
  </AuthLayout>;
}

export default Register;
