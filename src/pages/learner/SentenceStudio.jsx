import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { errorMessage as formatApiError } from '@/api/apiErrors.js';
import { History } from 'lucide-react';
import {
  Banner,
  Button,
  Card,
  Field,
  Input,
  PageContainer,
  useUnsavedGuard,
} from '@/components/ui';
import { ControlGroup, CounterPill, IllustratedPageHeader, LevelTabs, SUPPORTED_JLPT_LEVELS } from '@/features/learner-ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { getCertificateTypes, getLevelsByCertificate } from '@/features/learning-path/api/certificateApi.js';
import { getPracticeLevelId } from '@/features/practice/api/practiceGradingApi.js';
import { submitPracticeWriting } from '@/features/practice/api/practiceSubmissionApi.js';
import RomajiJapaneseInput from '@/features/writing/components/RomajiJapaneseInput.jsx';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';

const JLPT_ORDER = SUPPORTED_JLPT_LEVELS;

export default function SentenceStudio() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCode, setSelectedCode] = useState('N3');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [speechBusy, setSpeechBusy] = useState(false);

  const studyAccess = useStudyAccess();
  const subscription = studyAccess.data;
  const writingQuota = subscription
    ? (Number(subscription.writingUsesRemaining ?? 0) + Number(subscription.aiGradingUsesRemaining ?? 0))
    : null;

  const levelsQuery = useQuery({
    queryKey: ['jlpt-certificate-levels'],
    queryFn: async () => {
      const types = await getCertificateTypes();
      const jlpt = (Array.isArray(types) ? types : []).find(
        (type) => type.name?.trim().toUpperCase() === 'JLPT',
      );
      const raw = jlpt ? await getLevelsByCertificate(jlpt.id) : [];
      return Array.isArray(raw) ? raw : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const levelOptions = useMemo(() => {
    const map = new Map();
    for (const item of levelsQuery.data ?? []) {
      const code = item?.code?.trim().toUpperCase();
      if (code) map.set(code, item.id);
    }
    return JLPT_ORDER.map((code) => ({
      code,
      id: map.get(code) ?? null,
    }));
  }, [levelsQuery.data]);

  const selectedLevel = levelOptions.find((item) => item.code === selectedCode) ?? levelOptions[2];

  const submit = useMutation({
    mutationFn: async () => {
      notify.loading(tr('Đang gửi bài luyện viết…'), '', { key: 'sentence-submit', maxWaitMs: 30000 });
      const resolvedId = selectedLevel?.id ?? (await getPracticeLevelId(selectedCode));
      return submitPracticeWriting({
        textContent: text.trim(),
        certificateLevelId: resolvedId,
        topic: topic.trim(),
      });
    },
    onSuccess: (data) => {
      notify.success(tr('Đã gửi bài luyện viết'), tr('Hệ thống đang mở trang kết quả chấm điểm.'), {
        key: 'sentence-submit',
        replace: true,
      });
      navigate(`/ai-scoring/?submissionId=${data.submissionId}`);
    },
    onError: (err) => notify.apiError(err, tr('Không gửi được bài viết'), { key: 'sentence-submit', replace: true }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['study-subscription'] });
    },
  });

  useUnsavedGuard(Boolean(text.trim() || topic.trim()) && !submit.isPending && !submit.isSuccess);

  const isQuotaError = Boolean(
    submit.isError &&
      (submit.error?.status === 403 ||
        ['AI_CREDIT_REQUIRED', 'WRITING_PACKAGE_REQUIRED', 'SELF_STUDY_PACKAGE_REQUIRED'].includes(
          submit.error?.data?.errorCode || submit.error?.errorCode,
        )),
  );

  return (
    <LearnerShell pathname="/sentence-studio" breadcrumb={tr('Chấm bài viết')}>
      <PageContainer width="default" className="space-y-4">
        <IllustratedPageHeader
          icon="writing"
          tone="peach"
          eyebrow={tr('LUYỆN VIẾT')}
          title={tr('Viết câu & nhận nhận xét')}
          description={tr('Chọn cấp độ JLPT N5–N2, nhập đoạn văn tiếng Nhật để lưu bài và chấm gợi ý bằng AI.')}
          actions={
            <ControlGroup>
              {writingQuota !== null && (
                <CounterPill tone={writingQuota > 0 ? 'brand' : 'neutral'}>
                  {trf('Lượt AI viết: {0}', { 0: writingQuota })}
                </CounterPill>
              )}
              <Button as={Link} to="/ai-scoring/" variant="secondary" size="md" icon={History}>
                {tr('Xem các bài đã nộp')}
              </Button>
            </ControlGroup>
          }
        />

        {writingQuota === 0 && (
          <Banner
            tone="warning"
            className="mb-4"
            actions={
              <Link
                to="/plans/"
                state={{ from: { pathname }, requiredFeatureLabel: tr('Chấm bài viết AI') }}
                className="rp-link text-xs font-semibold"
              >
                {tr('Mua gói ngay')}
              </Link>
            }
          >
            {tr('Bạn đã hết lượt chấm viết AI. Hãy nạp thêm lượt để nhận phân tích chi tiết cho bài nộp mới.')}
          </Banner>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="space-y-4">
            <div>
              <span className="mb-2 block text-xs font-semibold text-rp-text-muted">
                {tr('Cấp độ mục tiêu')}
              </span>
              <LevelTabs
                label={tr('Chọn cấp độ JLPT')}
                value={selectedCode}
                onChange={setSelectedCode}
                levels={JLPT_ORDER}
              />
            </div>

            <Field label={tr('Đề bài (tuỳ chọn)')}>
              <Input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder={tr('Ví dụ: Kể về một ngày cuối tuần đáng nhớ')}
                disabled={submit.isPending}
              />
            </Field>

            <RomajiJapaneseInput
              value={text}
              onChange={setText}
              disabled={submit.isPending}
              onSpeechBusyChange={setSpeechBusy}
            />

            {submit.isError && (
              <Banner
                tone="danger"
                actions={
                  isQuotaError ? (
                    <Link
                      to="/plans/"
                      state={{ from: { pathname }, requiredFeatureLabel: tr('Chấm bài viết AI') }}
                      className="rp-link text-xs font-semibold"
                    >
                      {tr('Mua gói ngay')}
                    </Link>
                  ) : null
                }
              >
                {formatApiError(submit.error, tr('Không gửi được bài viết.'))}
              </Banner>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
              <p className="text-xs text-rp-text-muted">
                {tr('Nhập tối thiểu 8 ký tự để hệ thống có đủ ngữ cảnh nhận xét.')}
              </p>
              <Button
                type="button"
                variant="primary"
                disabled={submit.isPending || speechBusy || text.trim().length < 8}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? tr('Đang chấm…') : tr('Nộp bài')}
              </Button>
            </div>
          </Card>

          <Card tone="muted" className="space-y-3">
            <h2 className="text-sm font-semibold text-rp-text">{tr('Sau khi nộp')}</h2>
            <p className="text-xs leading-6 text-rp-text-muted">
              {tr('Bài viết được lưu vào lịch sử kèm điểm tổng quan, điểm mạnh, lỗi cần chỉnh và gợi ý câu tự nhiên hơn.')}
            </p>
            <div className="flex flex-col gap-2 border-t border-rp-line pt-3">
              <Link to="/ai-scoring/" className="rp-link text-xs font-semibold">
                {tr('Mở danh sách bài đã nộp →')}
              </Link>
              <Link to="/riki/essay/" className="rp-link text-xs font-semibold">
                {tr('Chuyển sang luyện viết & quét ảnh →')}
              </Link>
            </div>
          </Card>
        </div>
      </PageContainer>
    </LearnerShell>
  );
}
