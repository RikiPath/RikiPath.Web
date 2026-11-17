import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client.js';
import { gradeSpeaking } from '../../api/practiceGrading.js';
import GradingFeedback from '../../components/GradingFeedback.jsx';
import { ConsultShell } from '../../components/shells';
import { useCertificateLevelsQuery, useCertificateTypesQuery } from '../../hooks/useCertificates.js';

const inputClass = 'mt-1 w-full rounded-lg border border-[#EADFE5] bg-white p-2 text-sm';

export default function MentorGrading() {
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
    try {
      const response = type === 'Speaking'
        ? await gradeSpeaking(audioFile, levelId, topic)
        : (await api.post('/PracticeSubmission/submit', {
            type, certificateLevelId: Number(levelId), textContent: text.trim(), topic: topic.trim(), gradeWithAi: true,
          })).result;
      setResult(response);
      if (!response?.grading) setError(response?.gradingNote || 'Chưa chấm được bài.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <ConsultShell pathname={pathname} breadcrumb="Chấm bài AI">
    <main className="mx-auto max-w-3xl px-5 py-6">
      <h1 className="mb-5 text-2xl font-bold">Chấm bài AI</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[#EADFE5] bg-white p-5">
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Kỹ năng
              <select className={inputClass} value={type} onChange={event => {
                setType(event.target.value);
                setAudioFile(null);
                setResult(null);
                setError('');
              }}>
                <option value="Writing">Viết</option>
                <option value="Speaking">Nói</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">Độ khó tham chiếu
              <select className={inputClass} value={levelId} required onChange={event => setLevelId(event.target.value)}>
                <option value="">{levels.isLoading ? 'Đang tải…' : 'Chọn cấp độ'}</option>
                {levels.data?.map(level => <option key={level.id} value={level.id}>{level.code}</option>)}
              </select>
            </label>
          </div>
          {(certificates.isError || levels.isError) && <p role="alert">Chưa tải được danh sách độ khó.</p>}
          <label className="block text-sm font-semibold">Đề bài hoặc câu mẫu (tùy chọn)
            <input className={inputClass} value={topic} onChange={event => setTopic(event.target.value)} />
          </label>
          {type === 'Writing' ? <label className="block text-sm font-semibold">Nội dung bài viết
            <textarea className={inputClass} value={text} onChange={event => setText(event.target.value)} rows={7} maxLength={4000} required lang="ja" />
          </label> : <label className="block text-sm font-semibold">Bản ghi âm
            <input className={inputClass} type="file" accept="audio/*,.webm,.mp4" required
              onChange={event => setAudioFile(event.target.files[0] ?? null)} />
            <span className="mt-1 block text-xs font-normal">AI nhận xét nội dung từ bản chép lời.</span>
          </label>}
          <button type="submit" disabled={!levelId || (type === 'Writing' ? !text.trim() : !audioFile)}
            className="rounded-lg bg-[#AD3155] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Đang chấm…' : 'Chấm bài bằng AI'}
          </button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
      {result?.transcript && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4" lang="ja">{result.transcript}</p>}
      <GradingFeedback grading={result?.grading} skill={type === 'Speaking' ? 'nói' : 'viết'} />
    </main>
  </ConsultShell>;
}
