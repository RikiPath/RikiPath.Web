import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileCheck2,
  Headphones,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { Badge, Banner, Button, Modal } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { resolveSkillLabel } from '@/features/mock-test/utils/practiceStatusHelpers.js';

/**
 * Generates a neutral two-tone chime using Web Audio API so learners can check
 * speaker/headphone output without exposing any confidential exam audio.
 */
function playSampleAudioChime(onEnded) {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.36);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now + 0.25); // E5
  gain2.gain.setValueAtTime(0.001, now + 0.25);
  gain2.gain.exponentialRampToValueAtTime(0.18, now + 0.3);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.25);
  osc2.stop(now + 0.78);

  const timer = setTimeout(() => {
    void ctx.close().catch(() => {});
    onEnded?.();
  }, 850);

  return () => {
    clearTimeout(timer);
    void ctx.close().catch(() => {});
  };
}

export default function MockExamRegulationsModal({
  open,
  exam,
  onClose,
  onConfirmStart,
  starting = false,
}) {
  const { tr, trf } = useLocale();
  const [testingAudio, setTestingAudio] = useState(false);
  const [audioVerified, setAudioVerified] = useState(false);
  const stopSampleRef = useRef(null);

  if (!exam) return null;

  const sections = exam.sections || [];
  const hasListening = sections.some((s) => s.requiresAudio);
  const isResumable = exam.userStatus === 'IN_PROGRESS' && Boolean(exam.activeAttemptId);

  function handleTestSound() {
    if (testingAudio) return;
    stopSampleRef.current?.();
    setTestingAudio(true);
    const cleanup = playSampleAudioChime(() => {
      setTestingAudio(false);
      setAudioVerified(true);
    });
    if (!cleanup) {
      setTestingAudio(false);
    } else {
      stopSampleRef.current = cleanup;
    }
  }

  function handleClose() {
    if (starting) return;
    stopSampleRef.current?.();
    setTestingAudio(false);
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={tr('Bạn đã sẵn sàng bắt đầu thi thử JLPT?')}
      titleBadge={
        exam.jlptLevelName ? <Badge tone="brand" size="sm" icon={false}>JLPT {exam.jlptLevelName}</Badge> : undefined
      }
      description={tr(exam.title)}
      footer={
        <>
          <Button type="button" variant="secondary" size="md" disabled={starting} onClick={handleClose}>
            {tr('Quay lại')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={FileCheck2}
            loading={starting}
            onClick={() => onConfirmStart?.(exam)}
          >
            {isResumable ? tr('Tiếp tục bài thi') : tr('Bắt đầu thi')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Strict structure & summary */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng thời gian')}</p>
            <p className="mt-1 flex items-center gap-1.5 text-base font-bold text-rp-text">
              <Clock aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
              {trf('{0} phút', { 0: exam.timeLimitMinutes })}
            </p>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Tổng số câu hỏi')}</p>
            <p className="mt-1 text-base font-bold text-rp-text">
              {trf('{0} câu', { 0: exam.questionCount })}
            </p>
          </div>
          <div className="rounded-xl border border-rp-line bg-rp-bg-2/70 p-3">
            <p className="text-xs font-medium text-rp-text-muted">{tr('Cấu trúc đề')}</p>
            <p className="mt-1 text-base font-bold text-rp-text">
              {trf('{0} phần thi', { 0: sections.length })}
            </p>
          </div>
        </div>

        {/* Section breakdown (metadata only, NEVER questions) */}
        {sections.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
              {tr('Cấu trúc các phần thi')}
            </p>
            <ul className="divide-y divide-rp-line rounded-xl border border-rp-line bg-rp-surface">
              {sections.map((section, idx) => (
                <li key={section.sectionId || idx} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-semibold text-rp-text">
                      {section.title ? tr(section.title) : resolveSkillLabel(section.skillName, tr)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-rp-text-muted">
                    <span>{trf('{0} câu', { 0: section.questionCount })}</span>
                    {section.durationMinutes > 0 && (
                      <span>· {trf('{0} phút', { 0: section.durationMinutes })}</span>
                    )}
                    {section.requiresAudio && (
                      <Badge tone="info" size="sm" icon={Headphones}>{tr('Audio')}</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exam Regulations */}
        <div className="rounded-xl border border-rp-line bg-slate-50/75 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rp-brand-strong">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {tr('Quy định phòng thi thử JLPT')}
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs leading-5 text-rp-text-2">
            <li>• {tr('Bài thi có giới hạn thời gian nghiêm ngặt; đồng hồ chỉ bắt đầu chạy sau khi bạn bấm “Bắt đầu thi”.')}</li>
            <li>• {tr('Khi rời trang hoặc tải lại trình duyệt, đồng hồ vẫn tiếp tục đếm theo thời gian thực trên máy chủ.')}</li>
            <li>• {tr('Hệ thống tự động lưu các câu trả lời trong quá trình làm bài và tự động nộp khi hết thời gian.')}</li>
            <li>• {tr('Không thể xem trước câu hỏi, đáp án đúng hoặc lời giải trước khi hoàn thành bài thi.')}</li>
          </ul>
        </div>

        {/* Audio sample test without touching confidential exam media */}
        {hasListening && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rp-line bg-rp-bg-2/70 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold text-rp-text">
                <Volume2 aria-hidden="true" className="h-4 w-4 text-rp-brand-strong" />
                {tr('Kiểm tra âm thanh trước khi thi')}
              </p>
              <p className="text-xs text-rp-text-muted">
                {tr('Đề thi có phần Nghe hiểu. Hãy phát âm thanh mẫu để chắc chắn loa hoặc tai nghe hoạt động ổn định.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {audioVerified && (
                <Badge tone="success" size="sm" icon={CheckCircle2}>{tr('Âm thanh sẵn sàng')}</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Volume2}
                loading={testingAudio}
                onClick={handleTestSound}
              >
                {testingAudio ? tr('Đang phát mẫu…') : tr('Nghe âm thanh mẫu')}
              </Button>
            </div>
          </div>
        )}

        {isResumable && (
          <Banner tone="warning" title={tr('Lượt thi đang diễn ra')}>
            {tr('Bạn đang có một lượt thi thử chưa nộp cho đề này. Bấm “Tiếp tục bài thi” để khôi phục đáp án và thời gian còn lại theo máy chủ.')}
          </Banner>
        )}
      </div>
    </Modal>
  );
}
