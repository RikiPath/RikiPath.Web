import { useId } from 'react';
import { ArrowRight, Check, CheckCircle2, Clock3, LockKeyhole, Ticket } from 'lucide-react';
import { SpotArt } from '@/assets/illustrations/SpotArt.jsx';
import { Button, Modal, cx } from '@/components/ui';
import WebClayIcon from '@/features/learner-ui/WebClayIcon.jsx';
import { useLocale } from '@/locales/locale.js';
import { ACCESS_REASON } from '../featureAccess.js';
import './featureAccessGuide.css';


const REASON_META = {
  [ACCESS_REASON.PLAN]: { badge: 'Yêu cầu gói tự học', badgeIcon: LockKeyhole, art: 'locked' },
  [ACCESS_REASON.CREDIT]: { badge: 'Yêu cầu lượt AI', badgeIcon: Ticket, art: 'locked' },
};

/**
 * Illustration shared by every feature-access surface: Sakura glow + spot art, a drifting petal and a small
 * tile with the feature's own icon, so each feature is recognisable while the composition stays identical.
 */
export function FeatureAccessArt({ reason = ACCESS_REASON.PLAN, icon: FeatureIcon, compact = false, className }) {
  const meta = REASON_META[reason] || REASON_META[ACCESS_REASON.PLAN];
  return (
    <div
      aria-hidden="true"
      className={cx('relative flex shrink-0 items-center justify-center', compact ? 'h-[104px] w-[120px]' : 'h-[132px] w-[150px]', className)}
    >
      <span className="rp-unlock-glow absolute inset-2 rounded-full bg-[radial-gradient(closest-side,rgba(247,182,200,0.55),transparent)]" />
      <SpotArt name={meta.art} size={compact ? 116 : 146} className="relative" />
      <svg viewBox="0 0 20 20" className="rp-unlock-petal absolute right-1 top-2 h-4 w-4">
        <path d="M10 1.5c3.6 2.3 6 5.6 5.5 9.4-.4 3.4-3 6.1-5.5 7.6-2.5-1.5-5.1-4.2-5.5-7.6C4 7.1 6.4 3.8 10 1.5Z" fill="#F7B6C8" />
      </svg>
      {FeatureIcon && (
        <span className="absolute bottom-1 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-rp-surface text-rp-brand-strong shadow-rp-xs ring-1 ring-rp-brand-border">
          <FeatureIcon className="h-[18px] w-[18px]" />
        </span>
      )}
    </div>
  );
}

/**
 * Body of a feature-access surface: art, condition badge, heading, description, optional benefits and note.
 * Used inside FeatureAccessModal and by the direct-URL locked page so both say exactly the same thing.
 * Strings are VI keys; the component translates them.
 */
export function FeatureAccessContent({
  reason = ACCESS_REASON.PLAN,
  icon,
  heading,
  description,
  detail,
  benefits = [],
  note,
  noteIcon = 'check',
  layout = 'stacked',
  headingAs: Heading = 'p',
  headingId,
  descriptionId,
  children,
}) {
  const { tr } = useLocale();
  const meta = REASON_META[reason] || REASON_META[ACCESS_REASON.PLAN];
  const BadgeIcon = meta.badgeIcon;
  const NoteIcon = noteIcon === 'clock' ? Clock3 : CheckCircle2;
  const stacked = layout === 'stacked';
  return (
    <div className={cx('relative', !stacked && 'sm:flex sm:items-start sm:gap-6')}>
      <FeatureAccessArt reason={reason} icon={icon} compact={stacked} className={cx('mx-auto', stacked ? 'mb-3' : 'mb-4 sm:mx-0 sm:mb-0')} />
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-rp-brand-tint px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rp-brand-strong">
          <BadgeIcon aria-hidden="true" className="h-3.5 w-3.5" /> {tr(meta.badge)}
        </p>
        <Heading id={headingId} className={cx('mt-2 font-bold text-rp-text', stacked ? 'text-[17px] leading-6' : 'text-xl leading-7 sm:text-2xl')}>
          {heading}
        </Heading>
        <div id={descriptionId}>
          {description && <p className="mt-1.5 text-sm leading-6 text-rp-text-2">{tr(description)}</p>}
          {detail && <p className="mt-1 text-[13px] leading-5 text-rp-text-muted">{tr(detail)}</p>}
        </div>
        {benefits.length > 0 && (
          <ul className="mt-3.5 grid gap-2 sm:grid-cols-2">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2 rounded-xl border border-rp-line bg-white px-3 py-2 text-[13px] leading-5 text-rp-text-2">
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-brand-strong" />
                {tr(text)}
              </li>
            ))}
          </ul>
        )}
        {note && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-rp-bg-2 px-3 py-2 text-[12.5px] leading-5 text-rp-text-2">
            <NoteIcon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rp-text-muted" />
            {tr(note)}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** Tones per setup feature: assessment = pastel blue + Sakura, roadmap = Sakura. */
const SETUP_ART = {
  placement: { icon: 'placement', glow: 'rgba(150, 190, 245, 0.55)', ring: '#CFE2F8' },
  roadmap: { icon: 'roadmap', glow: 'rgba(247, 182, 200, 0.6)', ring: '#F2CCD7' },
};

/** Large clay illustration for a setup lock: soft glow, gentle float, small lock that sways, a few sparkles. */
export function SetupGuideArt({ art = 'roadmap' }) {
  const meta = SETUP_ART[art] || SETUP_ART.roadmap;
  return (
    <div aria-hidden="true" className="rp-guide-art relative mx-auto flex h-[128px] w-[128px] items-center justify-center">
      <span className="rp-guide-glow absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${meta.glow}, transparent)` }} />
      <span className="absolute inset-[14px] rounded-full border-2 border-dashed" style={{ borderColor: meta.ring }} />
      <span className="rp-guide-float relative">
        <WebClayIcon name={meta.icon} size="xl" />
      </span>
      <span className="rp-guide-lock absolute bottom-3 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-rp-surface text-rp-text-2 shadow-rp-xs ring-1 ring-rp-line">
        <LockKeyhole className="h-4 w-4" />
      </span>
      <svg viewBox="0 0 10 10" className="rp-guide-spark absolute left-3 top-5 h-3 w-3 text-[#E9A23B]" style={{ '--d': '0ms' }}>
        <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 10 10" className="rp-guide-spark absolute right-4 top-2 h-2.5 w-2.5 text-[#F27A9B]" style={{ '--d': '900ms' }}>
        <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="currentColor" />
      </svg>
    </div>
  );
}

/** Compact setup stepper: done = green check, current = Sakura (soft pulse), locked = gray + lock. */
export function SetupGuideSteps({ steps = [] }) {
  const { tr, trf } = useLocale();
  return (
    <ol className="space-y-2 text-left" aria-label={tr('Các bước thiết lập')}>
      {steps.map((step, index) => {
        const done = step.status === 'done';
        const current = step.status === 'current';
        return (
          <li
            key={step.id}
            aria-current={current ? 'step' : undefined}
            style={{ '--d': `${160 + index * 80}ms` }}
            className={cx(
              'rp-guide-step flex items-center gap-3 rounded-xl border px-3 py-2.5',
              current ? 'border-rp-brand-border bg-rp-brand-tint/60' : 'border-rp-line bg-rp-surface',
            )}
          >
            <span
              className={cx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold',
                done && 'bg-rp-success text-white',
                current && 'rp-guide-step-current bg-rp-brand-pressed text-white',
                !done && !current && 'bg-rp-muted text-rp-text-muted',
              )}
            >
              {done ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : !current ? <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx('block text-[14px] font-bold leading-5', done ? 'text-rp-success' : current ? 'text-rp-text' : 'text-rp-text-muted')}>
                {trf('Bước {0} — {1}', { 0: index + 1, 1: tr(step.label) })}
              </span>
            </span>
            <span className={cx('shrink-0 text-[12px] font-semibold', done ? 'text-rp-success' : current ? 'text-rp-brand-strong' : 'text-rp-text-muted')}>
              {done ? tr('Đã hoàn thành') : current ? tr('Bước hiện tại') : tr('Chưa mở khóa')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The one dialog for "you cannot use this feature yet" (missing self-study plan or missing AI credits).
 * `variant="setup"`: the learning-setup guide (goal → assessment → roadmap) — centered art, category label,
 * heading, description, prerequisite steps, full-width primary CTA and "Để sau". Content comes from
 * `resolveFeatureLock` (feature context + shared setup state); this component only renders it.
 * Built on the shared Modal: focus trap, Escape / backdrop / "Để sau" close, focus returns to the trigger.
 *
 * primaryAction / secondaryAction: { label, onClick, loading? } — labels are VI keys.
 */
export default function FeatureAccessModal({
  open,
  onClose,
  variant = 'access',
  category,
  art,
  steps,
  title,
  reason = ACCESS_REASON.PLAN,
  icon,
  heading,
  description,
  detail,
  benefits,
  note,
  noteIcon,
  primaryAction,
  secondaryAction,
}) {
  const { tr } = useLocale();
  const descriptionId = useId();
  const headingId = useId();
  const secondary = secondaryAction ?? { label: 'Để sau', onClick: onClose };
  if (variant === 'setup') {
    return (
      <Modal open={open} onClose={onClose} size="sm" bare labelledBy={headingId} describedBy={descriptionId} className="rp-guide-modal">
        <div className="text-center" data-modal="SetupGuide" data-guide-art={art}>
          <SetupGuideArt art={art} />
          {category && (
            <p className="mt-3 text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-rp-brand-strong">{tr(category)}</p>
          )}
          <h2 id={headingId} className="mx-auto mt-1.5 max-w-[340px] text-[20px] font-extrabold leading-7 text-rp-text">{tr(heading)}</h2>
          <p id={descriptionId} className="mx-auto mt-1.5 max-w-[360px] text-sm leading-6 text-rp-text-2">{tr(description)}</p>
          {steps?.length > 0 && <div className="mt-4"><SetupGuideSteps steps={steps} /></div>}
          <div className="mt-5 space-y-1.5">
            {primaryAction && (
              <Button onClick={primaryAction.onClick} loading={primaryAction.loading} size="lg" className="rp-guide-cta w-full" iconRight={ArrowRight}>
                {tr(primaryAction.label)}
              </Button>
            )}
            <Button variant="ghost" size="md" className="w-full" onClick={secondary.onClick}>{tr(secondary.label)}</Button>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      describedBy={descriptionId}
      className="[&>div:last-child]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      footer={(
        <>
          <Button variant="secondary" onClick={secondary.onClick}>{tr(secondary.label)}</Button>
          {primaryAction && (
            <Button onClick={primaryAction.onClick} loading={primaryAction.loading} iconRight={ArrowRight}>
              {tr(primaryAction.label)}
            </Button>
          )}
        </>
      )}
    >
      <FeatureAccessContent
        reason={reason}
        icon={icon}
        heading={heading}
        description={description}
        detail={detail}
        benefits={benefits}
        note={note}
        noteIcon={noteIcon}
        descriptionId={descriptionId}
      />
    </Modal>
  );
}
