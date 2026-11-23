import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getActivePlacement, savePlacementAnswer, submitPlacement } from '@/features/placement/api/placementApi.js';
import ExamWorkspace from '@/features/mock-test/components/ExamWorkspace.jsx';
import { describeApiError } from '@/api/apiErrors.js';
import { recordDiagnostic } from '@/api/diagnostics.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';
import {
  Button,
  Card,
  ContextualErrorState,
  Modal,
  PageContainer,
  Radio,
  SakuraLoader,
  notify,
  useUnsavedGuard,
} from '@/components/ui';

function remainingSeconds(expiresAt) {
  if (!expiresAt) return null;
  const parsed = parseUtcDate(expiresAt);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((parsed.getTime() - Date.now()) / 1000));
}

function clock(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PlacementExam() {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const { tr, trf } = useLocale();
  const seeded = state?.attempt || null;
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(() => remainingSeconds(seeded?.expiresAt));
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSubmitted = useRef(false);
  const submitRef = useRef(null);
  const queryClient = useQueryClient();

  const uid = getSession()?.userId ?? 'anon';
  const activeQuery = useQuery({
    queryKey: ['placement-active', uid],
    queryFn: getActivePlacement,
    enabled: !seeded,
  });

  const attempt = seeded || activeQuery.data;
  const questions = useMemo(() => attempt?.questions || [], [attempt]);

  const [syncedAttempt, setSyncedAttempt] = useState(null);
  if (attempt?.questions && attempt !== syncedAttempt) {
    setSyncedAttempt(attempt);
    const saved = {};
    attempt.questions.forEach((question) => {
      if (question.selectedOptionId) saved[question.questionId] = question.selectedOptionId;
    });
    setAnswers(saved);
    setLeft(remainingSeconds(attempt.expiresAt));
  }

  const hasDeadline = left != null;
  useEffect(() => {
    if (!hasDeadline) return undefined;
    const timer = window.setInterval(() => {
      setLeft((value) => (value == null ? value : Math.max(0, value - 1)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasDeadline]);

  useEffect(() => {
    if (left !== 0 || !attempt?.attemptId || autoSubmitted.current) return;
    autoSubmitted.current = true;
    submitRef.current?.mutate();
  }, [left, attempt?.attemptId]);

  const payload = () => questions.map((question) => ({
    questionId: question.questionId,
    selectedOptionId: answers[question.questionId] ?? null,
  }));

  const submit = useMutation({
    mutationFn: () => {
      notify.loading(tr('Đang nộp bài đánh giá…'), '', { key: 'placement-submit', maxWaitMs: 30000 });
      return submitPlacement(attempt.attemptId, payload());
    },
    onSuccess: (result) => {
      setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['learner', 'placement-status'] });
      notify.success(tr('Đã hoàn thành bài đánh giá năng lực!'), '', { key: 'placement-submit', replace: true });
      navigate(`/placement/result/${result.attemptId}`, { replace: true });
    },
    onError: (err) => {
      setError(describeApiError(err).message);
      notify.apiError(err, tr('Chưa nộp được bài đánh giá'), { key: 'placement-submit', replace: true });
    },
  });
  useLayoutEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  useUnsavedGuard(Boolean(attempt && !submit.isSuccess && Object.keys(answers).length > 0));

  const choose = (question, optionId) => {
    setError('');
    setSaving(true);
    setAnswers((current) => ({ ...current, [question.questionId]: optionId }));
    savePlacementAnswer(attempt.attemptId, {
      questionId: question.questionId,
      selectedOptionId: optionId,
    })
      .catch((err) => {
        recordDiagnostic({ source: 'PlacementExam', operation: 'savePlacementAnswer', error: err });
        notify.apiError(err, tr('Chưa tự động lưu đáp án vừa chọn'), { key: 'placement-autosave-err' });
      })
      .finally(() => setSaving(false));
  };

  const answered = Object.keys(answers).length;
  const totalQuestions = questions.length || attempt?.totalQuestions || 0;

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Đánh giá năng lực')}>
      <PageContainer data-page="PlacementExam" width={attempt ? 'default' : 'reading'} density="comfortable" className="space-y-4 text-rp-text">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/placement/" className="rp-link inline-flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> {tr('Về trang đánh giá')}
          </Link>
        </div>

        {activeQuery.isPending && !seeded && (
          <SakuraLoader variant="section" context="assessment" label={tr('Đang tải bài đánh giá')} delay={160} />
        )}
        {activeQuery.isError && !attempt && (
          <Card className="mb-4">
            <ContextualErrorState
              compact
              error={activeQuery.error}
              title={tr('Chưa tải được bài đánh giá')}
              onRetry={() => activeQuery.refetch()}
              retrying={activeQuery.isFetching}
            />
          </Card>
        )}
        {!activeQuery.isPending && !activeQuery.isError && !attempt && (
          <Card className="space-y-3 text-sm text-rp-text-muted">
            <p>{tr('Không có lượt đang làm. Hãy bắt đầu từ trang đánh giá.')}</p>
            <Link to="/placement/">
              <Button variant="primary" size="sm">{tr('Quay lại trang đánh giá')}</Button>
            </Link>
          </Card>
        )}

        {attempt && (
          <ExamWorkspace
            title={tr('Bài đánh giá năng lực')}
            subtitle={`${totalQuestions} ${tr('câu')}`}
            questions={questions}
            isAnswered={(q) => answers[q.questionId] != null}
            clockLabel={left != null ? clock(left) : null}
            secondsLeft={left}
            urgentSecondsThreshold={60}
            saveState={saving ? 'saving' : answered > 0 ? 'saved' : 'idle'}
            pending={submit.isPending}
            expired={left === 0}
            errorMessage={error}
            submitLabel={tr('Nộp bài')}
            onRequestSubmit={() => {
              setError('');
              setConfirmOpen(true);
            }}
            onExpiredSubmit={() => submit.mutate()}
            renderQuestionBody={(question) => (
              <div className="space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.questionId] === option.optionId;
                  return (
                    <div
                      key={option.optionId}
                      className={`rounded-xl border px-3.5 py-2.5 transition-colors ${
                        selected ? 'border-rp-brand bg-rp-brand-tint/65' : 'border-rp-line bg-rp-surface hover:border-rp-brand-border hover:bg-rp-brand-tint/30'
                      }`}
                    >
                      <Radio
                        name={`q-${question.questionId}`}
                        checked={selected}
                        onChange={() => choose(question, option.optionId)}
                        label={option.content}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          />
        )}

        <Modal
          open={confirmOpen}
          onClose={() => !submit.isPending && setConfirmOpen(false)}
          title="Xác nhận nộp bài đánh giá?"
          description={trf('Bạn đã chọn {0}/{1} câu hỏi.', { 0: answered, 1: totalQuestions })}
          size="sm"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submit.isPending}>
                {tr('Làm tiếp')}
              </Button>
              <Button variant="primary" loading={submit.isPending} onClick={() => submit.mutate()}>
                {tr('Xác nhận nộp bài')}
              </Button>
            </>
          )}
        >
          <p className="text-sm text-rp-text-2">
            {answered < totalQuestions
              ? tr('Vẫn còn câu chưa trả lời. Sau khi nộp, hệ thống sẽ chấm điểm và hiển thị kết quả ngay.')
              : tr('Bạn đã hoàn thành toàn bộ câu hỏi. Bấm xác nhận để nhận kết quả.')}
          </p>
        </Modal>
      </PageContainer>
    </LearnerShell>
  );
}
