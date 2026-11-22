import { useRef, useState } from 'react';
import { Eye, UserCheck } from 'lucide-react';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  CustomSelect,
  Field,
  Input,
  Textarea,
} from '@/components/ui';
import { previewMentorReplacement, replaceCohortMentor } from '@/features/cohorts/api/cohortApi';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

export default function AdminMentorReplacementPanel({ cohorts, mentors, busy, onRun }) {
  const { tr, trf } = useLocale();
  const [cohortId, setCohortId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [fromSession, setFromSession] = useState('');
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef(null);

  const cohort = cohorts.find((c) => c.id === Number(cohortId));

  const runPreview = () => {
    setError('');
    setPreview(null);
    setConfirmed(false);
    keyRef.current = null;
    previewMentorReplacement(Number(cohortId), Number(mentorId), fromSession ? Number(fromSession) : null)
      .then(setPreview)
      .catch((e) => setError(e.message));
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-bold text-rp-text">{tr('Thay Giáo viên chính của lớp')}</h2>
        <p className="mt-1 text-xs text-rp-text-muted">
          {tr('Chỉ chuyển các buổi tương lai đủ thời gian báo trước theo chính sách; các buổi đã dạy giữ nguyên lịch sử và KPI.')}
        </p>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tr('Lớp nhóm')} required>
          <CustomSelect
            value={cohortId}
            aria-label={tr('Chọn lớp')}
            onChange={(val) => {
              setCohortId(val);
              setPreview(null);
            }}
            options={[
              { value: '', label: tr('Chọn lớp') },
              ...cohorts
                .filter((c) => c.status === 'Published' || c.status === 'Draft')
                .map((c) => ({
                  value: String(c.id),
                  label: `${c.name} · ${c.level} · ${c.mentorName || '—'}`,
                })),
            ]}
          />
        </Field>

        <Field label={tr('Giáo viên thay thế')} required>
          <CustomSelect
            value={mentorId}
            aria-label={tr('Chọn Giáo viên thay thế')}
            onChange={(val) => {
              setMentorId(val);
              setPreview(null);
            }}
            options={[
              { value: '', label: tr('Chọn Giáo viên') },
              ...mentors
                .filter((m) => m.id !== cohort?.mentorId)
                .map((m) => ({ value: String(m.id), label: `${m.name || m.fullName || m.email}` })),
            ]}
          />
        </Field>

        <Field label={tr('Từ buổi số')} hint={tr('Để trống = buổi tương lai đầu tiên')}>
          <Input
            type="number"
            min={1}
            value={fromSession}
            onChange={(e) => setFromSession(e.target.value)}
            placeholder={tr('Tự động')}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" icon={Eye} disabled={busy || !cohortId || !mentorId} onClick={runPreview}>
          {tr('Xem trước tác động')}
        </Button>
      </div>

      {preview && (
        <div className="space-y-4 border-t border-rp-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-rp-text">
              {preview.name}: {preview.currentMentorName} → {preview.replacementMentorName || `#${preview.replacementMentorId}`}
            </h3>
            <Badge tone={preview.eligible ? 'success' : 'danger'} size="sm" icon={false}>
              {preview.eligible ? tr('Có thể thay') : tr('Chưa thể thay')}
            </Badge>
          </div>

          <p className="text-xs text-rp-text-muted">
            {trf('Từ buổi {0} · Giữ {1} buổi lịch sử · Chuyển {2} buổi tương lai · {3} học viên đang học', {
              0: preview.fromSessionNumber || '—',
              1: preview.impact.retainedSessionCount,
              2: preview.impact.affectedSessionCount,
              3: preview.impact.activeLearnerCount,
            })}
          </p>

          <ul className="space-y-1 text-xs">
            {preview.checks.map((c) => (
              <li key={c.code} className={c.passed ? 'text-emerald-700' : 'text-rose-700'}>
                {c.passed ? '✓' : '✗'} {tr(c.message)}
              </li>
            ))}
          </ul>

          {preview.conflicts.length > 0 && (
            <Banner tone="danger" title={tr('Lịch trùng của Giáo viên thay thế')}>
              <ul className="space-y-0.5 text-xs">
                {preview.conflicts.map((c, i) => (
                  <li key={i}>{trf('Buổi {0}: {1} #{2} ({3})', { 0: c.sessionNumber, 1: c.kind, 2: c.conflictId, 3: date(c.startTime) })}</li>
                ))}
              </ul>
            </Banner>
          )}

          {preview.eligible && (
            <form
              className="space-y-3 rounded-2xl border border-rp-line bg-rp-bg-2/40 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!confirmed || reason.trim().length < 10) return;
                keyRef.current ||= crypto.randomUUID();
                onRun(async () => {
                  await replaceCohortMentor(preview.cohortId, {
                    mentorId: preview.replacementMentorId,
                    reason: reason.trim(),
                    idempotencyKey: keyRef.current,
                    expectedCohortRevision: preview.revision,
                    fromSessionNumber: fromSession ? Number(fromSession) : null,
                  });
                  keyRef.current = null;
                  setReason('');
                  setConfirmed(false);
                  setPreview(null);
                }, 'Đã thay Giáo viên chính cho các buổi còn lại; học viên và Giáo viên sẽ nhận thông báo.');
              }}
            >
              <Field label={tr('Lý do thay Giáo viên (10–1000 ký tự)')} required>
                <Textarea
                  rows={3}
                  minLength={10}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={tr('Nêu rõ lý do thay đổi phân công giảng dạy…')}
                />
              </Field>
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                label={tr('Tôi đã xem tác động và xác nhận thay Giáo viên chính')}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  icon={UserCheck}
                  disabled={busy || !confirmed || reason.trim().length < 10}
                >
                  {tr('Xác nhận thay Giáo viên')}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
