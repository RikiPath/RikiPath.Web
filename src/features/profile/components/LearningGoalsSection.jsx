import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Check, Clock, Compass, Flag, GraduationCap } from 'lucide-react';
import { AlertDialog, Button, SakuraLoader, cx, notify } from '@/components/ui';
import { useCertificateLevelsQuery, useCertificateTypesQuery } from '@/features/learning-path/hooks/useCertificates.js';
import { useLocale } from '@/locales/locale.js';
import { setStudyLevel } from '../api/profileApi.js';

export default function LearningGoalsSection({ profile, onProfileUpdated }) {
  const { tr, trf, locale } = useLocale();
  const { data: certificateTypes = [], isPending: loadingTypes } = useCertificateTypesQuery();

  const targetCertId = useMemo(() => {
    if (profile?.targetCertificateTypeId) return profile.targetCertificateTypeId;
    const jlpt = certificateTypes.find((c) => c.name?.trim().toUpperCase() === 'JLPT');
    return jlpt?.id ?? certificateTypes[0]?.id ?? null;
  }, [profile?.targetCertificateTypeId, certificateTypes]);

  const { data: levels = [], isPending: loadingLevels } = useCertificateLevelsQuery(targetCertId);

  const sortedLevels = useMemo(() => {
    return [...levels]
      .filter((lvl) => ['N5', 'N4', 'N3', 'N2'].includes(lvl.code?.trim().toUpperCase()))
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  }, [levels]);

  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const currentStudyLevelId = profile?.currentStudyLevelId ?? null;
  const activeSelectionId = selectedLevelId ?? currentStudyLevelId ?? sortedLevels[0]?.id ?? null;
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);

  const saveLevelMutation = useMutation({
    mutationFn: setStudyLevel,
    onSuccess: (updated) => {
      setConfirmSwitchOpen(false);
      onProfileUpdated?.(updated);
      notify.success(tr('Đã cập nhật cấp độ đang học trên lộ trình.'), '', { key: 'goal-level-ok' });
    },
    onError: (err) => {
      setConfirmSwitchOpen(false);
      notify.apiError(err, tr('Chưa cập nhật được cấp độ đang học'), { key: 'goal-level-err' });
    },
  });

  const targetLevelLabel = useMemo(() => {
    if (profile?.targetJlptLevelName) return profile.targetJlptLevelName;
    const found = sortedLevels.find((l) => l.id === profile?.targetJlptLevelId);
    return found?.code || null;
  }, [profile?.targetJlptLevelName, profile?.targetJlptLevelId, sortedLevels]);

  const selectedLevelObj = sortedLevels.find((l) => l.id === activeSelectionId) || null;
  const changedFromCurrent = currentStudyLevelId && activeSelectionId && currentStudyLevelId !== activeSelectionId;

  function handleSaveStudyLevel() {
    if (!activeSelectionId || saveLevelMutation.isPending) return;
    if (currentStudyLevelId && activeSelectionId === currentStudyLevelId) {
      notify.info(tr('Bạn đang học ở cấp độ này rồi.'), '', { key: 'goal-level-same' });
      return;
    }
    if (changedFromCurrent) {
      setConfirmSwitchOpen(true);
      return;
    }
    saveLevelMutation.mutate({ currentStudyLevelId: activeSelectionId });
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#EAE3E4] pb-4">
        <h3 className="text-[17px] font-semibold text-rp-text">{tr('Mục tiêu & tiến trình học tập')}</h3>
        <p className="mt-1 text-[12.5px] leading-5 text-rp-text-muted">
          {tr('Phân tách rõ giữa mục tiêu hướng tới, kết quả đánh giá đầu vào, chứng chỉ hiện có và cấp độ bạn đang luyện.')}
        </p>
      </div>

      {/* Distinct 4 cards: Goal, Assessed Level, Declared Cert, Daily Target */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-rp-text-muted">
            <Flag aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
            {tr('Mục tiêu đang chọn')}
          </div>
          <p className="mt-2 text-[22px] font-semibold text-rp-brand">
            {targetLevelLabel ? `JLPT ${targetLevelLabel}` : tr('Chưa thiết lập')}
          </p>
          <p className="mt-1 text-[11.5px] text-rp-text-muted">
            {profile?.targetExamDate
              ? trf('Ngày dự thi: {0}', {
                  0: new Date(profile.targetExamDate).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                })
              : tr('Đích hướng tới cho toàn lộ trình cá nhân hóa.')}
          </p>
        </div>

        <div className="rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-rp-text-muted">
            <Compass aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
            {tr('Trình độ đánh giá đầu vào')}
          </div>
          <p className="mt-2 text-[22px] font-semibold text-rp-text">
            {profile?.assessedJlptLevelName ? `JLPT ${profile.assessedJlptLevelName}` : tr('Chưa làm bài')}
          </p>
          <Link to="/app/placement-test" className="rp-focus rp-link mt-1 inline-flex items-center gap-1 text-[11.5px]">
            {profile?.assessedJlptLevelName ? tr('Xem lại đánh giá') : tr('Làm đánh giá năng lực')}
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-rp-text-muted">
            <Award aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
            {tr('Chứng chỉ đã có (tự khai báo)')}
          </div>
          <p className="mt-2 text-[18px] font-semibold text-rp-text">
            {profile?.declaredJlptCertificateCode && profile.declaredJlptCertificateCode !== 'NONE'
              ? `JLPT ${profile.declaredJlptCertificateCode}`
              : tr('Chưa khai báo')}
          </p>
          <p className="mt-1 text-[11.5px] text-rp-text-muted">
            {tr('Dùng để bỏ qua các bài nhập môn bạn đã nắm vững.')}
          </p>
        </div>

        <div className="rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-4">
          <div className="flex items-center gap-2 text-[12px] font-medium text-rp-text-muted">
            <Clock aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
            {tr('Thời lượng mỗi ngày')}
          </div>
          <p className="mt-2 text-[22px] font-semibold text-rp-text">
            {profile?.dailyStudyMinutes ? `${profile.dailyStudyMinutes} ${tr('phút')}` : tr('Chưa đặt')}
          </p>
          <p className="mt-1 text-[11.5px] text-rp-text-muted">
            {tr('Cân đối số bài học và lượt ôn SRS mỗi ngày.')}
          </p>
        </div>
      </div>

      {/* Dynamic Study Level Selector (N5 - N2 from Backend) */}
      <section aria-label={tr('Cấp độ đang học')} className="rounded-xl border border-[#EAE3E4] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-rp-brand-strong">
              <GraduationCap aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-[14.5px] font-semibold text-rp-text">{tr('Cấp độ đang học trên lộ trình')}</h4>
              <p className="mt-0.5 text-[12px] text-rp-text-muted">
                {tr('Danh sách cấp độ được đồng bộ trực tiếp từ hệ thống chứng chỉ (hỗ trợ JLPT N5 đến N2).')}
              </p>
            </div>
          </div>
          <Link
            to="/onboarding"
            className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#EAE3E4] bg-white px-3 text-[12px] font-medium text-rp-brand-strong hover:bg-[#FFF0F4]"
          >
            {targetLevelLabel ? tr('Chỉnh sửa mục tiêu đầy đủ') : tr('Thiết lập mục tiêu')}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        {(loadingTypes || loadingLevels) ? (
          <SakuraLoader variant="section" context="profile" delay={120} className="mt-4" />
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {sortedLevels.map((lvl) => {
                const selected = activeSelectionId === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={cx(
                      'rp-focus inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                      selected
                        ? 'border-[#E7B6C7] bg-[#FFF0F4] text-rp-brand-strong'
                        : 'border-[#EAE3E4] bg-white text-rp-text-2 hover:bg-[#FFF9FA]',
                    )}
                  >
                    {lvl.code}
                    {lvl.id === currentStudyLevelId && (
                      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-rp-text-muted">
                        {tr('Hiện tại')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end border-t border-[#EAE3E4] pt-3">
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Check}
                disabled={!activeSelectionId}
                loading={saveLevelMutation.isPending}
                onClick={handleSaveStudyLevel}
              >
                {tr('Áp dụng cấp độ đang học')}
              </Button>
            </div>
          </div>
        )}
      </section>

      <AlertDialog
        open={confirmSwitchOpen}
        onCancel={() => !saveLevelMutation.isPending && setConfirmSwitchOpen(false)}
        onConfirm={() => saveLevelMutation.mutate({ currentStudyLevelId: activeSelectionId })}
        busy={saveLevelMutation.isPending}
        tone="info"
        title="Chuyển cấp độ đang học?"
        description={`Lộ trình hiển thị trên bảng học tập sẽ ưu tiên cấp độ ${selectedLevelObj?.code || ''}. Tiến độ bài đã học trước đó vẫn được bảo toàn.`}
        confirmLabel="Xác nhận chuyển"
        cancelLabel="Giữ nguyên"
      />
    </div>
  );
}
