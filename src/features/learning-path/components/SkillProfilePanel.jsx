import { Badge, Card } from '@/components/ui';
import { formatSkillProfileItem } from '@/features/learning-path/adaptiveRoadmapModel.js';
import { useLocale } from '@/locales/locale.js';

export default function SkillProfilePanel({
  skillProfile = [],
  hasPlacementEvidence = false,
  placementDecision = null,
}) {
  const { tr, trf } = useLocale();
  const formatted = Array.isArray(skillProfile) ? skillProfile.map(formatSkillProfileItem) : [];
  if (formatted.length === 0) return null;

  const assessedCount = formatted.filter((item) => item.status !== 'NOT_YET_ASSESSED').length;

  return (
    <Card className="border-rp-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-rp-navy">
            {tr('Hồ sơ năng lực 5 kỹ năng')}
          </h3>
          <p className="mt-0.5 text-xs text-rp-text-muted">
            {assessedCount === 0
              ? tr('Chưa có đủ dữ liệu đánh giá. Làm bài đánh giá năng lực hoặc bài luyện tập để hệ thống cập nhật chính xác từng kỹ năng.')
              : hasPlacementEvidence
                ? trf('Tổng hợp từ bài đánh giá năng lực và các bài luyện tập ({0}/5 kỹ năng đã có dữ liệu).', { 0: assessedCount })
                : trf('Tổng hợp từ kết quả luyện tập thực tế ({0}/5 kỹ năng đã có dữ liệu).', { 0: assessedCount })}
          </p>
        </div>
        {String(placementDecision ?? '').toUpperCase() === 'SKIPPED' && !hasPlacementEvidence && (
          <Badge tone="neutral" size="sm" icon={false}>
            {tr('Đã bỏ qua đánh giá đầu vào')}
          </Badge>
        )}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {formatted.map((skill) => {
          const isUnassessed = skill.status === 'NOT_YET_ASSESSED';
          return (
            <li
              key={skill.skillCode}
              className="flex flex-col justify-between rounded-xl border border-rp-line bg-rp-surface/65 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-rp-text">{tr(skill.skillLabel)}</span>
                <Badge tone={skill.tone} size="sm" icon={false}>
                  {tr(skill.statusLabel)}
                </Badge>
              </div>

              <div className="mt-2">
                {isUnassessed ? (
                  <p className="text-xs font-medium text-rp-text-muted">
                    {tr('Chưa đủ dữ liệu')}
                  </p>
                ) : (
                  <p className="text-lg font-extrabold text-rp-navy">
                    {skill.scoreLabel}
                  </p>
                )}
              </div>

              {skill.sourceSummary && (
                <p className="mt-1.5 text-[11px] leading-4 text-rp-text-muted">
                  {tr(skill.sourceSummary)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
