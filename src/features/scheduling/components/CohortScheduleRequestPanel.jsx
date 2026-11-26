import { useEffect, useRef, useState } from 'react';
import {
  createCohortScheduleRequest,
  getCohortScheduleRequests,
  getCohortShiftPreview,
  SCHEDULE_REQUEST_KIND,
  SCHEDULE_REQUEST_STATUS,
  withdrawCohortScheduleRequest,
} from '@/features/cohorts/api/cohortApi';
import { describeApiError } from '@/api/apiErrors';
import {
  Badge,
  Banner,
  Button,
  Card,
  CustomSelect,
  Field,
  Input,
  Textarea,
} from '@/components/ui';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { ScheduleRequestHistory, ShiftPreviewDetails } from './AdminCohortScheduleRequestsPanel';
import { useLocale } from '@/locales/locale.js';

const PREVIEW_DEBOUNCE_MS = 400;
const date = (v) => (v ? formatVnDateTime(v, '—') : '—');

function statusTone(status) {
  if (status === 'Approved') return 'success';
  if (status === 'Pending') return 'warning';
  return 'neutral';
}

function CohortRequestForm({ cohort, busy, onRun }) {
  const { tr, trf } = useLocale();
  const [kind, setKind] = useState('ShiftWeeks');
  const [weeks, setWeeks] = useState(1);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const idempotencyKey = useRef(null);

  useEffect(() => {
    let alive = true;
    getCohortScheduleRequests(cohort.id)
      .then((r) => alive && setRows(Array.isArray(r) ? r : []))
      .catch((e) => alive && setError(describeApiError(e).message));
    return () => {
      alive = false;
    };
  }, [cohort.id, tick]);

  const previewKey = kind === 'ShiftWeeks' ? `${cohort.id}:${weeks}` : '';
  useEffect(() => {
    if (!previewKey) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      getCohortShiftPreview(cohort.id, weeks)
        .then((p) => alive && setPreview({ key: previewKey, data: p, error: '' }))
        .catch((e) => alive && setPreview({ key: previewKey, data: null, error: describeApiError(e).message }));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [previewKey, cohort.id, weeks]);

  const activePreview = previewKey && preview?.key === previewKey ? preview : null;
  const hasPending = rows.some((r) => r.status === 'Pending');
  const blocked = kind === 'ShiftWeeks' && activePreview?.data && !activePreview.data.eligible;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const key = idempotencyKey.current;
    await onRun(async () => {
      await createCohortScheduleRequest(cohort.id, {
        kind,
        shiftWeeks: weeks,
        reason: trimmed,
        idempotencyKey: key,
      });
      idempotencyKey.current = null;
      setReason('');
      setTick((t) => t + 1);
    }, 'Đã gửi yêu cầu tới Quản trị viên. Lịch lớp chỉ thay đổi sau khi được duyệt.');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-rp-line bg-rp-bg-2 px-3.5 py-2.5">
        <p className="text-sm font-semibold text-rp-text">{cohort.name}</p>
        <p className="mt-0.5 text-xs text-rp-text-muted">{trf('(bắt đầu {0})', { 0: date(cohort.startsAt) })}</p>
      </div>

      {hasPending ? (
        <Banner tone="warning">
          {tr('Lớp đang có yêu cầu chờ Quản trị viên duyệt. Bạn có thể rút yêu cầu bên dưới trước khi gửi yêu cầu mới.')}
        </Banner>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loại yêu cầu">
              <CustomSelect
                disabled={busy}
                value={kind}
                onChange={(val) => {
                  setKind(val);
                  idempotencyKey.current = null;
                }}
                options={Object.entries(SCHEDULE_REQUEST_KIND).map(([v, l]) => ({
                  value: v,
                  label: tr(l),
                }))}
              />
            </Field>

            {kind === 'ShiftWeeks' && (
              <Field label="Số tuần dời">
                <Input
                  type="number"
                  disabled={busy}
                  min={1}
                  max={8}
                  value={weeks}
                  onChange={(e) => {
                    setWeeks(Math.min(8, Math.max(1, Number(e.target.value) || 1)));
                    idempotencyKey.current = null;
                  }}
                />
              </Field>
            )}
          </div>

          <Field label="Lý do" required counter={`${reason.trim().length} / 1000`}>
            <Textarea
              required
              rows={3}
              disabled={busy}
              maxLength={1000}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                idempotencyKey.current = null;
              }}
              placeholder={kind === 'ShiftWeeks' ? tr('VD: Chưa đủ học viên, đề nghị lùi ngày bắt đầu 1 tuần…') : tr('VD: Lớp chưa có học viên ghi danh…')}
            />
          </Field>

          {kind === 'ShiftWeeks' && !activePreview && (
            <p className="text-xs text-rp-text-muted">{tr('Đang xem trước lịch sau khi dời…')}</p>
          )}
          {activePreview?.error && (
            <Banner tone="danger">{activePreview.error}</Banner>
          )}
          {kind === 'ShiftWeeks' && <ShiftPreviewDetails preview={activePreview?.data} />}
          {kind === 'CancelEmptyCohort' && (
            <p className="text-xs text-rp-text-muted">
              {tr('Chỉ hủy được lớp chưa có học viên ghi danh thành công và không có giao dịch đang chờ.')}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={!reason.trim() || blocked}
            >
              {tr('Gửi yêu cầu')}
            </Button>
          </div>
        </form>
      )}

      {error && <Banner tone="danger">{error}</Banner>}

      {rows.length > 0 && (
        <div className="space-y-3 border-t border-rp-line pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-rp-text-muted">
            {tr('Yêu cầu đã gửi')} ({rows.length})
          </h3>
          {rows.map((r) => (
            <Card key={r.id} density="compact" className="space-y-2 bg-rp-bg-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-rp-text">
                  {tr(SCHEDULE_REQUEST_KIND[r.kind] || r.kind)}
                  {r.kind === 'ShiftWeeks' ? trf(' ({0} tuần)', { 0: r.shiftWeeks }) : ''}
                  {' · '}
                  <span className="text-xs font-normal text-rp-text-muted">{date(r.createdAtUtc)}</span>
                </span>
                <Badge tone={statusTone(r.status)} size="sm">
                  {tr(SCHEDULE_REQUEST_STATUS[r.status] || r.status)}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-[13px] text-rp-text">{r.reason}</p>
              {r.decisionNote && (
                <p className="rounded-lg border border-rp-line bg-rp-surface px-3 py-2 text-xs text-rp-text-2">
                  <strong>{tr('Phản hồi Quản trị viên:')}</strong> {r.decisionNote}
                </p>
              )}
              {r.status === 'Pending' && (
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      onRun(async () => {
                        await withdrawCohortScheduleRequest(r.id);
                        setTick((t) => t + 1);
                      }, 'Đã rút yêu cầu.')
                    }
                  >
                    {tr('Rút yêu cầu')}
                  </Button>
                </div>
              )}
              <ScheduleRequestHistory history={r.history} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CohortScheduleRequestPanel({ cohorts = [], initialCohortId = null, busy = false, onRun }) {
  const { tr } = useLocale();
  const [cohortId, setCohortId] = useState(initialCohortId ? String(initialCohortId) : '');
  const selected = cohorts.find((c) => String(c.id) === String(cohortId)) || cohorts[0] || null;
  if (cohorts.length === 0) return null;
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-rp-text-muted">
        {tr('Yêu cầu cần Quản trị viên duyệt; không thể dời hoặc hủy lớp đang diễn ra.')}
      </p>
      {cohorts.length > 1 && (
        <Field label="Lớp phụ trách">
          <CustomSelect
            value={String(selected?.id ?? '')}
            onChange={(val) => setCohortId(val)}
            options={cohorts.map((c) => ({ value: String(c.id), label: `${c.name} (${c.level})` }))}
          />
        </Field>
      )}
      {selected && <CohortRequestForm key={selected.id} cohort={selected} busy={busy} onRun={onRun} />}
    </div>
  );
}
