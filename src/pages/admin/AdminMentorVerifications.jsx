import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getAdminMentorProfile, getAdminMentorVerificationDocument, getAdminMentorVerifications, unwrapApiList, unwrapApiResult, verifyAdminMentor } from '@/features/admin/api/adminApi.js';
import { ContextualErrorState, SakuraLoader, StaleDataBar } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { useLocale } from '@/locales/locale.js';

const labels = {
  Unverified: 'Chưa gửi hồ sơ', Pending: 'Chờ xét duyệt', Approved: 'Đã phê duyệt',
  Rejected: 'Không được phê duyệt', ChangesRequested: 'Cần bổ sung thông tin',
};
const filters = ['Pending', 'ChangesRequested', 'Rejected', 'Approved', 'Unverified'];
const card = 'rounded-2xl border border-rp-line bg-white p-5';
const safeError = error => error?.status === 409
  ? 'Hồ sơ đã được xử lý ở phiên khác. Danh sách đang được cập nhật.'
  : error?.status === 401 || error?.status === 403
    ? 'Bạn không có quyền truy cập hồ sơ này.'
    : 'Không thể xử lý hồ sơ. Vui lòng thử lại.';
const fullName = row => row?.fullName?.trim() || [row?.firstName, row?.lastName].filter(Boolean).join(' ') || 'Giáo viên chưa cập nhật tên';

export default function AdminMentorVerifications() {
  const { trf, tr } = useLocale();
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('mentorId')) || null;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending');
  const [page, setPage] = useState(1);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [documentUrl, setDocumentUrl] = useState(null);
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['admin-mentor-verifications'],
    queryFn: () => getAdminMentorVerifications(),
    refetchInterval: 30000,
  });
  const detailQuery = useQuery({
    queryKey: ['admin-mentor-verification', selectedId],
    queryFn: () => getAdminMentorProfile(selectedId),
    enabled: Boolean(selectedId),
  });
  useEffect(() => {
    const onNew = () => { setToast('Hồ sơ giáo viên vừa được cập nhật.'); queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] }); if (selectedId) queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] }); };
    window.addEventListener('rikipath:mentor-verification', onNew);
    return () => window.removeEventListener('rikipath:mentor-verification', onNew);
  }, [queryClient, selectedId]);
  const rows = unwrapApiList(listQuery.data);
  const filtered = useMemo(() => rows.filter(row => {
    const matchesStatus = status === 'All' || row.verificationStatus === status;
    const text = `${fullName(row)} ${row.email || ''} ${row.expertise || ''}`.toLocaleLowerCase('vi-VN');
    return matchesStatus && text.includes(search.trim().toLocaleLowerCase('vi-VN'));
  }), [rows, status, search]);
  const pageSize = 10;
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const detail = unwrapApiResult(detailQuery.data);
  const currentDocumentUrl = documentUrl?.mentorId === selectedId ? documentUrl.url : '';
  useEffect(() => () => {
    if (documentUrl?.url) URL.revokeObjectURL(documentUrl.url);
  }, [documentUrl]);
  const documentQuery = useMutation({
    mutationFn: () => getAdminMentorVerificationDocument(selectedId),
    onSuccess: document => setDocumentUrl({
      mentorId: selectedId,
      url: URL.createObjectURL(document),
      isPdf: String(document?.type || '').toLowerCase().includes('pdf'),
    }),
  });
  const review = useMutation({
    mutationFn: () => verifyAdminMentor(selectedId, {
      decision,
      rejectionReason: decision === 'Reject' ? reason.trim() : null,
      reviewNotes: decision === 'RequestChanges' ? reason.trim() : null,
    }),
    onSuccess: () => {
      setNotice('Đã lưu quyết định xét duyệt.');
      notify.success('Đã lưu quyết định xét duyệt hồ sơ Giáo viên.', '', { key: `admin-mentor-verify-${selectedId}` });
      setDecision(''); setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
    },
    onError: (err) => {
      notify.apiError(err, 'Không lưu được quyết định xét duyệt', { key: `admin-mentor-verify-err-${selectedId}` });
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
    },
  });

  return <div className="grid gap-5 lg:grid-cols-[minmax(min(100%,280px),0.9fr)_minmax(0,1.1fr)]" data-page="AdminGiáo viênVerifications">
    <section className={card}>
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{tr('Hồ sơ xét duyệt')}</h2><button type="button" onClick={() => listQuery.refetch()} className="text-sm text-rp-brand-strong">{tr('Làm mới')}</button></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input aria-label={tr('Tìm giáo viên')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={tr('Tìm tên, email, chuyên môn')} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
        <select aria-label={tr('Lọc trạng thái')} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border px-2 py-2 text-sm">
          <option value="All">{tr('Tất cả')}</option>{filters.map(value => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
      </div>
      {toast && <p role="status" className="mt-3 text-sm text-[#397653]">{toast}</p>}
      {listQuery.isPending && <SakuraLoader variant="section" context="profile" label={tr('Đang tải hồ sơ')} delay={160} className="mt-5" />}
      {listQuery.isError && !rows.length && (
        <ContextualErrorState
          className="mt-4"
          compact
          error={listQuery.error}
          title={tr('Không tải được hồ sơ xét duyệt')}
          onRetry={() => listQuery.refetch()}
          retrying={listQuery.isFetching}
        />
      )}
      {listQuery.isError && rows.length > 0 && (
        <StaleDataBar className="mt-3" onRetry={() => listQuery.refetch()} retrying={listQuery.isFetching} />
      )}
      {!listQuery.isPending && !listQuery.isError && !filtered.length && <p className="mt-5 text-sm text-rp-text-muted">{tr('Không có hồ sơ phù hợp.')}</p>}
      <div className="mt-4 space-y-2">{visible.map(row => <button type="button" key={row.mentorId} onClick={() => { setParams({ mentorId: String(row.mentorId) }); setDecision(''); setNotice(''); setDocumentUrl(null); }} aria-pressed={selectedId === row.mentorId} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedId === row.mentorId ? 'border-rp-brand-strong bg-rp-brand-tint' : 'border-rp-line'}`}>
        {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rp-brand-tint font-bold text-rp-brand-strong">{fullName(row)[0]}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{fullName(row)}</span><span className="block truncate text-xs text-rp-text-muted">{row.jlptLevel || tr('Chưa cập nhật JLPT')} · {labels[row.verificationStatus] || tr('Đang cập nhật')}</span></span>
      </button>)}</div>
      {filtered.length > pageSize && <div className="mt-4 flex items-center justify-between text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>{tr('Trước')}</button><span>Trang {page}/{Math.ceil(filtered.length / pageSize)}</span><button type="button" disabled={page * pageSize >= filtered.length} onClick={() => setPage(page + 1)}>Sau</button></div>}
    </section>
    <section className={card}>
      <h2 className="font-semibold">{tr('Chi tiết hồ sơ giáo viên')}</h2>
      {!selectedId && <p className="mt-4 text-sm text-rp-text-muted">{tr('Chọn một hồ sơ để xem và xét duyệt.')}</p>}
      {selectedId && detailQuery.isPending && <SakuraLoader variant="section" context="profile" label={tr('Đang tải chi tiết')} delay={160} className="mt-4" />}
      {selectedId && detailQuery.isError && !detail && (
        <ContextualErrorState
          className="mt-4"
          compact
          error={detailQuery.error}
          title={tr('Không tải được chi tiết hồ sơ')}
          onRetry={() => detailQuery.refetch()}
          retrying={detailQuery.isFetching}
        />
      )}
      {detail && <>
        <div className="mt-4 flex items-center gap-3">{detail.avatarUrl ? <img src={detail.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rp-brand-tint text-lg font-bold">{fullName(detail)[0]}</span>}<div><p className="font-semibold">{fullName(detail)}</p><p className="text-sm text-rp-text-muted">{detail.email}</p></div></div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{[
          ['Trạng thái', labels[detail.verificationStatus] || 'Đang cập nhật'], ['Trình độ JLPT', detail.jlptLevel],
          ['Chuyên môn', detail.expertise], ['Kinh nghiệm', detail.yearsOfExperience == null ? null : trf('{0} năm', { 0: detail.yearsOfExperience })],
          ['Nơi công tác', detail.workplace], ['Ngày gửi', detail.submittedAt ? formatVnDateTime(detail.submittedAt, null) : null],
          ['Ngày xét duyệt', detail.reviewedAt ? formatVnDateTime(detail.reviewedAt, null) : null],
          ['Lý do từ chối', detail.rejectionReason], ['Ghi chú xét duyệt', detail.reviewNotes],
        ].map(([label, value]) => <div key={label}><dt className="text-rp-text-muted">{tr(label)}</dt><dd className="break-words font-medium">{value || tr('Chưa có thông tin')}</dd></div>)}</dl>
        <div className="mt-4 text-sm"><p className="text-rp-text-muted">{tr('Giới thiệu')}</p><p className="whitespace-pre-wrap">{detail.bio || tr('Chưa có thông tin')}</p></div>
        {detail.hasVerificationDocument && (
          <div className="mt-4 rounded-xl border border-rp-line bg-rp-bg-2 p-3.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => documentQuery.mutate()}
                disabled={documentQuery.isPending}
                className="inline-flex h-8 items-center rounded-lg border border-rp-brand-border bg-white px-3 text-[12.5px] font-semibold text-rp-brand-strong hover:bg-rp-brand-tint disabled:opacity-50"
              >
                {documentQuery.isPending ? tr('Đang tải tài liệu…') : currentDocumentUrl ? tr('Tải lại tài liệu chứng chỉ') : tr('Mở tài liệu chứng chỉ')}
              </button>
              {currentDocumentUrl && (
                <a href={currentDocumentUrl} target="_blank" rel="noopener noreferrer" className="rp-link text-[12.5px] font-semibold">
                  {tr('Mở trong tab mới')}
                </a>
              )}
            </div>
            {currentDocumentUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-rp-line bg-white p-2">
                {documentUrl?.isPdf ? (
                  <iframe
                    src={currentDocumentUrl}
                    title={tr('Tài liệu chứng chỉ giáo viên')}
                    className="h-64 w-full rounded border-0"
                  />
                ) : (
                  <img
                    src={currentDocumentUrl}
                    alt={tr('Tài liệu chứng chỉ giáo viên')}
                    className="max-h-56 min-h-16 w-auto rounded object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
            )}
            {documentQuery.isError && <p role="alert" className="mt-2 text-red-700">{tr('Không mở được tài liệu này. Có thể hồ sơ cũ cần gửi lại vào kho bảo vệ.')}</p>}
          </div>
        )}
        {detail.verificationStatus === 'Pending' && <div className="mt-6 border-t pt-5">
          {detail.hasVerificationDocument && !currentDocumentUrl && (
            <p className="mb-3 rounded-lg border border-rp-warning-line bg-rp-warning-bg px-3 py-2 text-[12px] font-medium text-rp-warning">
              {tr('Vui lòng bấm')}{' '}<strong>{tr('Mở tài liệu chứng chỉ')}</strong>{' '}{tr('để kiểm tra trước khi Phê duyệt hồ sơ.')}
            </p>
          )}
          <div className="flex flex-wrap gap-2">{[['Approve', 'Phê duyệt'], ['Reject', 'Từ chối'], ['RequestChanges', 'Yêu cầu bổ sung']].map(([value, label]) => <button type="button" key={value} disabled={value === 'Approve' && !currentDocumentUrl} onClick={() => { setDecision(value); setReason(''); }} className={`rounded-lg px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${decision === value ? 'bg-rp-brand-strong text-white' : 'border border-rp-line bg-white hover:bg-rp-brand-tint'}`}>{tr(label)}</button>)}</div>
          {decision && <div role="dialog" aria-label={tr('Xác nhận xét duyệt')} className="mt-4 rounded-xl bg-rp-bg-2 p-4"><p className="text-sm font-semibold">{tr('Xác nhận')}{' '}{decision === 'Approve' ? tr('phê duyệt') : decision === 'Reject' ? tr('từ chối') : tr('yêu cầu bổ sung')}{' '}{tr('hồ sơ?')}</p>{decision !== 'Approve' && <textarea aria-label={tr('Lý do hoặc nội dung cần bổ sung')} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={3} className="mt-3 w-full rounded-lg border p-2 text-sm" placeholder={tr('Nhập nội dung gửi cho giáo viên')} />}<div className="mt-3 flex gap-2"><button type="button" disabled={review.isPending || (decision !== 'Approve' && !reason.trim())} onClick={() => review.mutate()} className="rounded-lg bg-rp-brand-strong px-3 py-2 text-sm text-white disabled:opacity-50 rp-press">{review.isPending ? tr('Đang xử lý…') : tr('Xác nhận')}</button><button type="button" disabled={review.isPending} onClick={() => setDecision('')} className="rounded-lg border px-3 py-2 text-sm">{tr('Đóng')}</button></div></div>}
        </div>}
        {notice && <p role="status" className="mt-4 text-sm text-[#397653]">{notice}</p>}
        {review.isError && <p role="alert" className="mt-4 text-sm text-red-700">{safeError(review.error)}</p>}
      </>}
    </section>
  </div>;
}
