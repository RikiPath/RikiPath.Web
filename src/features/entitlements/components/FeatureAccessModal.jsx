import { useId } from 'react';
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, Sparkles } from 'lucide-react';
import { SpotArt } from '@/assets/illustrations/SpotArt.jsx';
import { Button, Modal, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { ACCESS_REASON } from '../featureAccess.js';


const REASON_META = {
  [ACCESS_REASON.PLAN]: { badge: 'Yêu cầu gói tự học', badgeIcon: LockKeyhole, art: 'locked' },
  [ACCESS_REASON.CREDIT]: { badge: 'Yêu cầu lượt AI', badgeIcon: Sparkles, art: 'locked' },
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

/**
 * The one dialog for "you cannot use this feature yet" (missing self-study plan or missing AI credits).
 * Built on the shared Modal: focus trap, Escape / backdrop / "Để sau" close, focus returns to the trigger.
 *
 * primaryAction / secondaryAction: { label, onClick, loading? } — labels are VI keys.
 */
export default function FeatureAccessModal({
  open,
  onClose,
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
  const secondary = secondaryAction ?? { label: 'Để sau', onClick: onClose };
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
