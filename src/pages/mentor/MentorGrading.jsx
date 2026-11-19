import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/api/client.js';
import { gradeSpeaking } from '@/features/practice/api/practiceGradingApi.js';
import GradingFeedback from '@/features/practice/components/GradingFeedback.jsx';
import { MentorShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualErrorState } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useCertificateLevelsQuery, useCertificateTypesQuery } from '@/features/learning-path/hooks/useCertificates.js';
import { useLocale } from '@/locales/locale.js';

const inputClass = 'mt-1 w-full rounded-lg border border-rp-line bg-white p-2 text-sm';

export default function MentorGrading() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [type, setType] = useState('Writing');
  const [levelId, setLevelId] = useState('');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const certificates = useCertificateTypesQuery();
  const jlpt = certificates.data?.find(item => item.name === 'JLPT');
  const levels = useCertificateLevelsQuery(jlpt?.id);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    const toastKey = 'mentor-ai-grading';
    notify.loading(
      type === 'Speaking' ? 'Đang tải bản ghi & chấm bài AI…' : 'Đang gửi bài chấm AI…',
      '',
      { key: toastKey, maxWaitMs: 35000 }
    );
    try {
      const response = type === 'Speaking'
        ? await gradeSpeaking(audioFile, levelId, topic)
        : (await api.post('/PracticeSubmission/submit', {
            type, certificateLevelId: Number(levelId), textContent: text.trim(), topic: topic.trim(), gradeWithAi: true,
          })).result;
      setResult(response);
      if (response?.grading) {
        notify.success('Đã có gợi ý chấm điểm AI.', '', { key: toastKey, replace: true });
      } else {
        const note = response?.gradingNote || 'Chưa chấm được bài.';
        setError(note);
        notify.warning('Chưa chấm được bài', note, { key: toastKey, replace: true });
      }
    } catch (err) {
      setError(describeApiError(err).message);
      notify.apiError(err, 'Chấm bài AI thất bại', { key: toastKey, replace: true });
    } finally {
      setBusy(false);
    }
  }

  return <MentorShell pathname={pathname} breadcrumb={tr('Chấm bài AI')}>
    <main className="rp-container-reading py-6 lg:py-8">
      <h1 className="mb-5 text-2xl font-bold">{tr('Chấm bài AI')}</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-rp-line bg-white p-5">
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">{tr('Kỹ năng')}
              <select className={inputClass} value={type} onChange={event => {
                setType(event.target.value);
                setAudioFile(null);
                setResult(null);
                setError('');
              }}>
                <option value="Writing">{tr('Viết')}</option>
                <option value="Speaking">{tr('Nói')}</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">{tr('Độ khó tham chiếu')}
              <select className={inputClass} value={levelId} required onChange={event => setLevelId(event.target.value)}>
                <option value="">{levels.isLoading ? tr('Đang tải…') : tr('Chọn cấp độ')}</option>
                {levels.data?.map(level => <option key={level.id} value={level.id}>{level.code}</option>)}
              </select>
            </label>
          </div>
          {(certificates.isError || levels.isError) && (
            <ContextualErrorState
              variant="inline"
              compact
              error={certificates.error || levels.error}
              title={tr('Chưa tải được danh sách độ khó')}
              onRetry={() => (certificates.isError ? certificates.refetch() : levels.refetch())}
              retrying={certificates.isFetching || levels.isFetching}
            />
          )}
          <label className="block text-sm font-semibold">{tr('Đề bài hoặc câu mẫu (tùy chọn)')}
            <input className={inputClass} value={topic} onChange={event => setTopic(event.target.value)} />
          </label>
          {type === 'Writing' ? <label className="block text-sm font-semibold">{tr('Nội dung bài viết')}
            <textarea className={inputClass} value={text} onChange={event => setText(event.target.value)} rows={7} maxLength={4000} required lang="ja" />
          </label> : <label className="block text-sm font-semibold">{tr('Bản ghi âm')}
            <input className={inputClass} type="file" accept="audio/*,.webm,.mp4" required
              onChange={event => setAudioFile(event.target.files[0] ?? null)} />
            <span className="mt-1 block text-xs font-normal">{tr('AI nhận xét nội dung từ bản chép lời.')}</span>
          </label>}
          <button type="submit" disabled={!levelId || (type === 'Writing' ? !text.trim() : !audioFile)}
            className="rounded-lg bg-rp-brand-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 rp-press">
            {busy ? tr('Đang chấm…') : tr('Chấm bài bằng AI')}
          </button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
      {result?.transcript && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4" lang="ja">{result.transcript}</p>}
      <GradingFeedback grading={result?.grading} skill={type === 'Speaking' ? tr('nói') : tr('viết')} />
    </main>
  </MentorShell>;
}
