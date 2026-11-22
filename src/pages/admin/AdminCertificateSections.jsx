import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveCertificateSection,
  createCertificateSection,
  getCertificateSections,
  updateCertificateSection,
} from '@/features/admin/api/adminApi.js';
import { AdminShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import { ContextualEmptyState, ContextualErrorState, SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

const empty = {
  certificateLevelId: '',
  name: '',
  code: '',
  description: '',
  durationMinutes: '',
  maxScore: '',
  passingScore: '',
  sortOrder: '',
};

function bodyOf(form) {
  return {
    certificateLevelId: Number(form.certificateLevelId),
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim() || null,
    durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes),
    maxScore: Number(form.maxScore),
    passingScore: Number(form.passingScore),
    sortOrder: Number(form.sortOrder),
  };
}

const field = 'mt-1.5 block h-10 w-full rounded-lg border border-rp-line bg-white px-3 text-[13px] text-rp-text outline-none focus:border-rp-brand-strong focus:ring-2 focus:ring-rp-brand-strong/20';

export default function AdminCertificateSections() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [levelId, setLevelId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const sections = useQuery({
    queryKey: ['certificate-sections', includeArchived],
    queryFn: () => getCertificateSections({ includeArchived }),
  });
  const save = useMutation({
    mutationFn: () => (editId ? updateCertificateSection(editId, bodyOf(form)) : createCertificateSection(bodyOf(form))),
    onSuccess: async () => {
      const msg = editId ? 'Đã cập nhật phần thi.' : 'Đã tạo phần thi mới.';
      setNotice(msg);
      notify.success(msg, '', { key: 'admin-cert-section-save' });
      setEditId(null);
      setForm(empty);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['certificate-sections'] });
    },
    onError: (err) => notify.apiError(err, 'Chưa lưu được phần thi', { key: 'admin-cert-section-save-err' }),
  });
  const archive = useMutation({
    mutationFn: archiveCertificateSection,
    onSuccess: async () => {
      setNotice('Đã lưu trữ phần thi.');
      notify.success('Đã lưu trữ phần thi.', '', { key: 'admin-cert-section-archive' });
      await queryClient.invalidateQueries({ queryKey: ['certificate-sections'] });
    },
    onError: (err) => notify.apiError(err, 'Không thể lưu trữ phần thi', { key: 'admin-cert-section-archive-err' }),
  });
  const allRows = Array.isArray(sections.data) ? sections.data : [];
  const levelOptions = [...new Map(allRows.map((row) => [row.certificateLevelId, row.certificateLevelCode || trf('Cấp {0}', { 0: row.certificateLevelId })])).entries()]
    .map(([id, code]) => ({ id, code }));
  const rows = levelId ? allRows.filter((row) => String(row.certificateLevelId) === levelId) : allRows;
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.certificateLevelCode || 'Khác';
      map.set(key, [...(map.get(key) || []), row]);
    });
    return [...map.entries()];
  }, [rows]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => {
    setOpen(false);
    setEditId(null);
    setForm(empty);
  };
  const edit = (row) => {
    setNotice('');
    setEditId(row.id);
    setOpen(true);
    setForm({
      certificateLevelId: String(row.certificateLevelId),
      name: row.name || '',
      code: row.code || '',
      description: row.description || '',
      durationMinutes: row.durationMinutes ?? '',
      maxScore: row.maxScore ?? '',
      passingScore: row.passingScore ?? '',
      sortOrder: row.sortOrder ?? '',
    });
  };

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Phần thi')}>
      <main className="rp-container py-6 text-rp-text lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">{tr('Phần thi JLPT')}</h1>
            <p className="mt-1 text-[13px] text-rp-text-muted">{tr('Từ vựng, ngữ pháp, đọc và nghe theo từng cấp.')}</p>
          </div>
          {!open && (
            <button
              type="button"
              onClick={() => { setNotice(''); setEditId(null); setForm(empty); setOpen(true); }}
              className="h-10 rounded-lg bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep rp-press"
            >
              {tr('Thêm phần thi')}
            </button>
          )}
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLevelId('')} className={`h-8 rounded-lg px-3 text-[12px] ${levelId === '' ? 'bg-rp-brand-tint font-medium text-rp-brand-strong' : 'bg-white text-rp-text-2 hover:bg-rp-brand-tint'}`}>
            {tr('Tất cả')}
          </button>
          {levelOptions.map((level) => (
            <button key={level.id} type="button" onClick={() => setLevelId(String(level.id))} className={`h-8 rounded-lg px-3 text-[12px] ${String(level.id) === levelId ? 'bg-rp-brand-tint font-medium text-rp-brand-strong' : 'bg-white text-rp-text-2 hover:bg-rp-brand-tint'}`}>
              {level.code}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[12px] text-rp-text-2">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
            {tr('Hiện phần đã lưu trữ')}
          </label>
        </div>

        {(save.error || archive.error) && (
          <p role="alert" className="mt-4 rounded-xl bg-rp-brand-tint px-4 py-3 text-[13px] text-rp-brand-strong">
            {tr(describeApiError(save.error || archive.error).message)}
          </p>
        )}
        {sections.isError && (
          <ContextualErrorState
            variant="inline"
            className="mt-4"
            error={sections.error}
            title={tr('Chưa tải được danh sách phần thi')}
            onRetry={() => sections.refetch()}
            retrying={sections.isFetching}
          />
        )}
        {notice && <p className="mt-4 rounded-xl bg-rp-success-bg px-4 py-3 text-[13px] text-rp-success">{notice}</p>}

        {open && (
          <form
            className="mt-4 overflow-hidden rounded-2xl border border-rp-line bg-white"
            onSubmit={(event) => { event.preventDefault(); setNotice(''); save.mutate(); }}
          >
            <div className="flex items-center justify-between border-b border-rp-line px-5 py-4">
              <h2 className="text-[16px] font-semibold">{editId ? tr('Sửa phần thi') : tr('Phần thi mới')}</h2>
              <button type="button" onClick={close} className="h-8 rounded-lg px-2.5 text-[12px] text-rp-brand-strong hover:bg-rp-bg-2">{tr('Đóng')}</button>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Cấp độ')}
                <select required value={form.certificateLevelId} onChange={(event) => set('certificateLevelId', event.target.value)} className={field}>
                  <option value="">{tr('Chọn cấp')}</option>
                  {levelOptions.map((level) => <option key={level.id} value={level.id}>{level.code}</option>)}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Tên phần')}
                <input required maxLength={200} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder={tr('Ví dụ: Nghe hiểu')} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Mã')}
                <input required maxLength={50} value={form.code} onChange={(event) => set('code', event.target.value)} placeholder="N3_LISTENING" className={field} />
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Thứ tự')}
                <input required min="1" type="number" value={form.sortOrder} onChange={(event) => set('sortOrder', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Điểm tối đa')}
                <input required min="1" type="number" value={form.maxScore} onChange={(event) => set('maxScore', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Điểm đạt')}
                <input required min="0" type="number" value={form.passingScore} onChange={(event) => set('passingScore', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2">
                {tr('Số phút')}
                <input min="1" type="number" value={form.durationMinutes} onChange={(event) => set('durationMinutes', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-rp-text-2 sm:col-span-2">
                {tr('Mô tả')}
                <textarea maxLength={1000} value={form.description} onChange={(event) => set('description', event.target.value)} className="mt-1.5 block min-h-20 w-full rounded-lg border border-rp-line px-3 py-2 text-[13px] outline-none focus:border-rp-brand-strong focus:ring-2 focus:ring-rp-brand-strong/20" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-rp-line px-5 py-3">
              <button type="button" onClick={close} className="h-10 rounded-lg border border-rp-line px-4 text-[13px]">{tr('Hủy')}</button>
              <button type="submit" disabled={save.isPending} className="h-10 rounded-lg bg-rp-brand-strong px-4 text-[13px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 rp-press">
                {save.isPending ? tr('Đang lưu…') : editId ? tr('Lưu phần thi') : tr('Tạo phần thi')}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-4">
          {sections.isLoading && <SakuraLoader variant="section" context="data" delay={160} />}
          {!sections.isLoading && !sections.isError && groups.length === 0 && (
            <div className="rounded-2xl border border-rp-line bg-white px-5">
              <ContextualEmptyState compact title={tr('Chưa có phần thi.')} />
            </div>
          )}
          {groups.map(([level, items]) => (
            <section key={level} className="overflow-hidden rounded-2xl border border-rp-line bg-white">
              <header className="flex items-center justify-between border-b border-rp-line px-5 py-3">
                <h2 className="text-[14px] font-semibold">{level}</h2>
                <span className="text-[12px] text-rp-text-muted">{trf('{0} phần', { 0: items.length })}</span>
              </header>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] text-rp-text-muted">
                    <th className="px-5 py-2 font-medium">{tr('Phần thi')}</th>
                    <th className="px-3 py-2 font-medium">{tr('Điểm')}</th>
                    <th className="px-3 py-2 font-medium">{tr('Phút')}</th>
                    <th className="px-5 py-2 text-right font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-rp-line">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium">{row.name}</p>
                        <p className="mt-0.5 text-[12px] text-rp-text-muted">{row.code}{row.isArchived ? tr(' · đã lưu trữ') : ''}</p>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-rp-text-2">{row.passingScore}/{row.maxScore}</td>
                      <td className="px-3 py-3 text-[13px] text-rp-text-2">{row.durationMinutes ?? '—'}</td>
                      <td className="px-5 py-3 text-right">
                        {!row.isArchived && (
                          <span className="inline-flex gap-2">
                            <button type="button" onClick={() => edit(row)} className="h-8 rounded-lg border border-rp-line px-3 text-[12px] hover:bg-rp-brand-tint">{tr('Sửa')}</button>
                            <button type="button" onClick={() => archive.mutate(row.id)} className="h-8 rounded-lg px-3 text-[12px] text-rp-brand-strong hover:bg-rp-brand-tint">{tr('Lưu trữ')}</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </main>
    </AdminShell>
  );
}
