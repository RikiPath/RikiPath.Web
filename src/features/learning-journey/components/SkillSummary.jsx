import { useId, useState } from 'react';
import { ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Button, Collapsible, cx } from '@/components/ui';
import { formatSkillProfileItem } from '@/features/learning-path/adaptiveRoadmapModel.js';
import SkillProfilePanel from '@/features/learning-path/components/SkillProfilePanel.jsx';
import { useLocale } from '@/locales/locale.js';

/**
 * Compact "Năng lực hiện tại" — strongest / to-reinforce skill and assessed count; the full 5-skill
 * profile opens on demand. Unassessed skills are never shown as 0%.
 */
export default function SkillSummary({ skillProfile = [], hasPlacementEvidence, placementDecision, className }) {
  const { tr, trf } = useLocale();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const raw = Array.isArray(skillProfile) ? skillProfile : [];
  const items = raw.map(formatSkillProfileItem);
  if (items.length === 0) return null;

  const assessed = items.filter((item) => item.status !== 'NOT_YET_ASSESSED');
  const sorted = [...assessed].sort((a, b) => (b.scorePercent ?? 0) - (a.scorePercent ?? 0));
  const strongest = sorted.length > 0 && sorted[0].status !== 'WEAK' && sorted[0].status !== 'NEEDS_REVIEW' ? sorted[0] : null;
  const weakest = sorted.length > 1
    ? sorted[sorted.length - 1]
    : sorted.find((item) => item.status === 'WEAK' || item.status === 'NEEDS_REVIEW') ?? null;
  const weakTopics = [...new Set(raw.flatMap((item) => (Array.isArray(item?.weakTopics) ? item.weakTopics : [])))].slice(0, 6);

  return (
    <section aria-labelledby={`${panelId}-title`} className={cx('rounded-rp-card border border-rp-line bg-white', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={`${panelId}-title`} className="text-[14px] font-bold text-rp-text">{tr('Năng lực hiện tại')}</h2>
          <p className="mt-0.5 text-[12px] text-rp-text-muted">
            {assessed.length === 0
              ? tr('Chưa đủ dữ liệu đánh giá')
              : trf('{0}/{1} kỹ năng đã được đánh giá', { 0: assessed.length, 1: items.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {strongest && (
            <Badge tone="success" size="sm" icon={TrendingUp}>
              {trf('Mạnh nhất: {0}', { 0: tr(strongest.skillLabel) })}
            </Badge>
          )}
          {weakest && weakest !== strongest && (
            <Badge tone="warning" size="sm" icon={TrendingDown}>
              {trf('Cần củng cố: {0}', { 0: tr(weakest.skillLabel) })}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            iconRight={ChevronDown}
            className={cx('[&_svg]:transition-transform', open && '[&_svg]:rotate-180')}
          >
            {open ? tr('Thu gọn') : tr('Xem phân tích chi tiết')}
          </Button>
        </div>
      </div>
      <Collapsible open={open} id={panelId}>
        <div className="space-y-3 border-t border-rp-line p-3">
          <SkillProfilePanel
            skillProfile={raw}
            hasPlacementEvidence={hasPlacementEvidence}
            placementDecision={placementDecision}
          />
          {weakTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 text-[12px]">
              <span className="font-semibold text-rp-text-2">{tr('Chủ đề cần cải thiện')}:</span>
              {weakTopics.map((topic) => (
                <Badge key={topic} tone="warning" size="sm" icon={false}>{tr(topic)}</Badge>
              ))}
            </div>
          )}
        </div>
      </Collapsible>
    </section>
  );
}
