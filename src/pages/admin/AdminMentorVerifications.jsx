import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getAdminMentorProfile, getAdminMentorVerificationDocument, getAdminMentorVerifications, unwrapApiList, unwrapApiResult, verifyAdminMentor } from '../../api/admin.js';

const labels = {
  Unverified: 'Chưa gửi hồ sơ', Pending: 'Chờ xét duyệt', Approved: 'Đã phê duyệt',
  Rejected: 'Không được phê duyệt', ChangesRequested: 'Cần bổ sung thông tin',
};
const filters = ['Pending', 'ChangesRequested', 'Rejected', 'Approved', 'Unverified'];
const card = 'rounded-2xl border border-[#EAE1E6] bg-white p-5';
const safeError = error => error?.status === 409
  ? 'Hồ sơ đã được xử lý ở phiên khác. Danh sách đang được cập nhật.'
  : error?.status === 401 || error?.status === 403
    ? 'Bạn không có quyền truy cập hồ sơ này.'
    : 'Không thể xử lý hồ sơ. Vui lòng thử lại.';
const fullName = row => [row?.firstName, row?.lastName].filter(Boolean).join(' ') || 'Cố vấn chưa cập nhật tên';

export default function AdminMentorVerifications() {
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
    const onNew = () => { setToast('Hồ sơ cố vấn vừa được cập nhật.'); queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] }); if (selectedId) queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] }); };
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
    onSuccess: document => setDocumentUrl({ mentorId: selectedId, url: URL.createObjectURL(document) }),
  });
  const review = useMutation({
    mutationFn: () => verifyAdminMentor(selectedId, {
      decision,
      rejectionReason: decision === 'Reject' ? reason.trim() : null,
      reviewNotes: decision === 'RequestChanges' ? reason.trim() : null,
    }),
    onSuccess: () => {
      setNotice('Đã lưu quyết định xét duyệt.');
      setDecision(''); setReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-mentor-verification', selectedId] });
    },
  });

  return <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]" data-page="AdminMentorVerifications">
    <section className={card}>
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Hồ sơ xét duyệt</h2><button type="button" onClick={() => listQuery.refetch()} className="text-sm text-[#AD3155]">Làm mới</button></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input aria-label="Tìm cố vấn" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên, email, chuyên môn" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
        <select aria-label="Lọc trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border px-2 py-2 text-sm">
          <option value="All">Tất cả</option>{filters.map(value => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
      </div>
      {toast && <p role="status" className="mt-3 text-sm text-[#397653]">{toast}</p>}
      {listQuery.isPending && <p role="status" className="mt-5 text-sm">Đang tải hồ sơ…</p>}
      {listQuery.isError && <p role="alert" className="mt-5 text-sm text-red-700">Không tải được hồ sơ. Vui lòng thử lại.</p>}
      {!listQuery.isPending && !listQuery.isError && !filtered.length && <p className="mt-5 text-sm text-[#82737B]">Không có hồ sơ phù hợp.</p>}
      <div className="mt-4 space-y-2">{visible.map(row => <button type="button" key={row.mentorId} onClick={() => { setParams({ mentorId: String(row.mentorId) }); setDecision(''); setNotice(''); setDocumentUrl(null); }} aria-pressed={selectedId === row.mentorId} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedId === row.mentorId ? 'border-[#AD3155] bg-[#FCEEF3]' : 'border-[#EAE1E6]'}`}>
        {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FCEEF3] font-bold text-[#AD3155]">{fullName(row)[0]}</span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{fullName(row)}</span><span className="block truncate text-xs text-[#82737B]">{row.jlptLevel || 'Chưa cập nhật JLPT'} · {labels[row.verificationStatus] || 'Đang cập nhật'}</span></span>
      </button>)}</div>
      {filtered.length > pageSize && <div className="mt-4 flex items-center justify-between text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page}/{Math.ceil(filtered.length / pageSize)}</span><button type="button" disabled={page * pageSize >= filtered.length} onClick={() => setPage(page + 1)}>Sau</button></div>}
    </section>
    <section className={card}>
      <h2 className="font-semibold">Chi tiết hồ sơ cố vấn</h2>
      {!selectedId && <p className="mt-4 text-sm text-[#82737B]">Chọn một hồ sơ để xem và xét duyệt.</p>}
      {selectedId && detailQuery.isPending && <p role="status" className="mt-4 text-sm">Đang tải chi tiết…</p>}
      {selectedId && detailQuery.isError && <p role="alert" className="mt-4 text-sm text-red-700">Không tải được chi tiết hồ sơ.</p>}
      {detail && <>
        <div className="mt-4 flex items-center gap-3">{detail.avatarUrl ? <img src={detail.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FCEEF3] text-lg font-bold">{fullName(detail)[0]}</span>}<div><p className="font-semibold">{fullName(detail)}</p><p className="text-sm text-[#82737B]">{detail.email}</p></div></div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{[
          ['Trạng thái', labels[detail.verificationStatus] || 'Đang cập nhật'], ['Trình độ JLPT', detail.jlptLevel],
          ['Chuyên môn', detail.expertise], ['Kinh nghiệm', detail.yearsOfExperience == null ? null : `${detail.yearsOfExperience} năm`],
          ['Nơi công tác', detail.workplace], ['Ngày gửi', detail.submittedAt ? new Date(detail.submittedAt).toLocaleString('vi-VN') : null],
          ['Ngày xét duyệt', detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString('vi-VN') : null],
          ['Lý do từ chối', detail.rejectionReason], ['Ghi chú xét duyệt', detail.reviewNotes],
        ].map(([label, value]) => <div key={label}><dt className="text-[#82737B]">{label}</dt><dd className="break-words font-medium">{value || 'Chưa có thông tin'}</dd></div>)}</dl>
        <div className="mt-4 text-sm"><p className="text-[#82737B]">Giới thiệu</p><p className="whitespace-pre-wrap">{detail.bio || 'Chưa có thông tin'}</p></div>
        {detail.hasVerificationDocument && <div className="mt-4 rounded-xl bg-[#FCFAFB] p-3 text-sm"><button type="button" onClick={() => documentQuery.mutate()} disabled={documentQuery.isPending} className="font-semibold text-[#AD3155] underline disabled:opacity-50">{documentQuery.isPending ? 'Đang tải tài liệu…' : 'Mở tài liệu chứng chỉ'}</button>{currentDocumentUrl && <a href={currentDocumentUrl} target="_blank" rel="noopener noreferrer" className="ml-3 text-[#AD3155] underline">Xem tài liệu đã xác thực</a>}{documentQuery.isError && <p role="alert" className="mt-2 text-red-700">Không mở được tài liệu này. Có thể hồ sơ cũ cần gửi lại vào kho bảo vệ.</p>}</div>}
        {detail.verificationStatus === 'Pending' && <div className="mt-6 border-t pt-5">
          <div className="flex flex-wrap gap-2">{[['Approve', 'Phê duyệt'], ['Reject', 'Từ chối'], ['RequestChanges', 'Yêu cầu bổ sung']].map(([value, label]) => <button type="button" key={value} disabled={value === 'Approve' && !currentDocumentUrl} onClick={() => { setDecision(value); setReason(''); }} className={`rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${decision === value ? 'bg-[#AD3155] text-white' : 'border'}`}>{label}</button>)}</div>
          {decision && <div role="dialog" aria-label="Xác nhận xét duyệt" className="mt-4 rounded-xl bg-[#FCFAFB] p-4"><p className="text-sm font-semibold">Xác nhận {decision === 'Approve' ? 'phê duyệt' : decision === 'Reject' ? 'từ chối' : 'yêu cầu bổ sung'} hồ sơ?</p>{decision !== 'Approve' && <textarea aria-label="Lý do hoặc nội dung cần bổ sung" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={3} className="mt-3 w-full rounded-lg border p-2 text-sm" placeholder="Nhập nội dung gửi cho cố vấn" />}<div className="mt-3 flex gap-2"><button type="button" disabled={review.isPending || (decision !== 'Approve' && !reason.trim())} onClick={() => review.mutate()} className="rounded-lg bg-[#AD3155] px-3 py-2 text-sm text-white disabled:opacity-50">{review.isPending ? 'Đang xử lý…' : 'Xác nhận'}</button><button type="button" disabled={review.isPending} onClick={() => setDecision('')} className="rounded-lg border px-3 py-2 text-sm">Đóng</button></div></div>}
        </div>}
        {notice && <p role="status" className="mt-4 text-sm text-[#397653]">{notice}</p>}
        {review.isError && <p role="alert" className="mt-4 text-sm text-red-700">{safeError(review.error)}</p>}
      </>}
    </section>
  </div>;
}
