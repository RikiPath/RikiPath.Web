import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertDialog, Badge, Banner, Button, Modal, SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import QuizStepper from '@/features/learning-journey/components/QuizStepper.jsx';
import PracticeResultReview from '@/features/practice/components/PracticeResultReview.jsx';
import {
  startCheckpointAttempt,
  submitCheckpointAttempt,
} from '@/features/practice/api/practiceExerciseApi.js';
import { formatCheckpointScopeLabel } from '@/features/learning-path/adaptiveRoadmapModel.js';
import { useLocale } from '@/locales/locale.js';

export default function RoadmapCheckpointModal({ open, checkpoint, onClose, onCompleted }) {
  const { tr, trf } = useLocale();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const exerciseId = checkpoint?.exerciseId ?? checkpoint?.practiceExerciseId;

  const startMutation = useMutation({
    mutationFn: (id) => startCheckpointAttempt(id),
    onMutate: () => {
      setAttempt(null);
      setAnswers({});
      setResult(null);
    },
    onSuccess: (data) => {
      setAttempt(data);
    },
    onError: (err) => {
      notify.apiError(err, tr('Không mở được bài kiểm tra chặng'), { key: 'checkpoint-start-err' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = attempt.questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: answers[q.questionId] ?? null,
      }));
      return submitCheckpointAttempt(attempt.attemptId, payload);
    },
    onSuccess: async (data) => {
      setResult(data);
      setAttempt(null);
      if (data?.passed) {
        notify.success(tr('Đã vượt qua bài kiểm tra chặng!'), '', { key: 'checkpoint-submit' });
      } else {
        notify.info(tr('Đã chấm bài kiểm tra.'), '', { key: 'checkpoint-submit' });
      }
      await onCompleted?.(data);
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa nộp được bài kiểm tra'), { key: 'checkpoint-submit-err' });
    },
  });

  useEffect(() => {
    if (open && exerciseId) {
      startMutation.mutate(exerciseId);
    }
    // Trigger checkpoint start only when modal opens for a specific exercise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exerciseId]);

  const handleClose = () => {
    if (submitMutation.isPending) return;
    if (attempt && Object.keys(answers).length > 0 && !confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    setConfirmLeave(false);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    onClose?.();
  };

  const scopeLabel = formatCheckpointScopeLabel(checkpoint?.scope);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      dismissible={!submitMutation.isPending && !attempt}
      size="lg"
      title={checkpoint?.title ? tr(checkpoint.title) : tr(scopeLabel)}
      description={
        checkpoint
          ? trf('{0} · Điểm đạt {1}%', {
              0: tr(scopeLabel),
              1: checkpoint.passingScorePercent ?? 70,
            })
          : undefined
      }
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          {result && exerciseId && (
            <Button
              type="button"
              variant="soft"
              size="sm"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate(exerciseId)}
            >
              {tr('Làm lại bài kiểm tra')}
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
            {tr('Đóng')}
          </Button>
        </div>
      )}
    >
      <div
        className="space-y-4"
        data-exam-attempt-active={attempt ? 'true' : undefined}
      >
        {checkpoint && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-rp-text-muted">
            <Badge tone="brand" size="sm" icon={false}>{tr(scopeLabel)}</Badge>
            {checkpoint.levelCode && <Badge tone="neutral" size="sm" icon={false}>{checkpoint.levelCode}</Badge>}
            {checkpoint.questionCount > 0 && (
              <span>{trf('{0} câu hỏi', { 0: checkpoint.questionCount })}</span>
            )}
          </div>
        )}

        {startMutation.isPending && (
          <SakuraLoader variant="section" context="homework" label={tr('Đang chuẩn bị đề kiểm tra…')} />
        )}

        {startMutation.isError && !attempt && !result && (
          <Banner
            tone="danger"
            actions={
              <Button type="button" size="sm" variant="secondary" onClick={() => exerciseId && startMutation.mutate(exerciseId)}>
                {tr('Thử lại')}
              </Button>
            }
          >
            {tr(startMutation.error?.message || 'Không tải được đề kiểm tra.')}
          </Banner>
        )}

        {attempt && (
          <QuizStepper
            name={`checkpoint-${attempt.attemptId}`}
            questions={attempt.questions ?? []}
            answers={answers}
            submitting={submitMutation.isPending}
            submitLabel="Nộp bài kiểm tra"
            onAnswer={(questionId, optionId) =>
              setAnswers((prev) => ({ ...prev, [questionId]: optionId }))}
            onSubmit={() => submitMutation.mutate()}
          />
        )}

        {result && (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <PracticeResultReview
              result={result}
              sourceTitle={checkpoint?.title || scopeLabel}
              contentPrefix={`checkpoint-${exerciseId ?? 'x'}`}
            />
          </div>
        )}
      </div>
      <AlertDialog
        open={confirmLeave}
        tone="warning"
        title="Rời bài kiểm tra?"
        description="Các câu trả lời chưa nộp sẽ không được lưu."
        confirmLabel="Rời bài"
        cancelLabel="Tiếp tục làm bài"
        onConfirm={() => {
          setConfirmLeave(false);
          setAttempt(null);
          setAnswers({});
          setResult(null);
          onClose?.();
        }}
        onCancel={() => setConfirmLeave(false)}
        onClose={() => setConfirmLeave(false)}
      />
    </Modal>
  );
}
