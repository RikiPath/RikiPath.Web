import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveCertificateSection,
  createCertificateSection,
  getCertificateSections,
  updateCertificateSection,
} from '../../api/admin.js';
import { AdminShell } from '../../components/shells';

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

const field = 'mt-1.5 block h-10 w-full rounded-lg border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/20';

export default function AdminCertificateSections() {
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
      setNotice(editId ? 'Đã cập nhật phần thi.' : 'Đã tạo phần thi.');
      setEditId(null);
      setForm(empty);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['certificate-sections'] });
    },
  });
  const archive = useMutation({
    mutationFn: archiveCertificateSection,
    onSuccess: async () => {
      setNotice('Đã lưu trữ phần thi.');
      await queryClient.invalidateQueries({ queryKey: ['certificate-sections'] });
    },
  });
  const allRows = Array.isArray(sections.data) ? sections.data : [];
  const levelOptions = [...new Map(allRows.map((row) => [row.certificateLevelId, row.certificateLevelCode || `Cấp ${row.certificateLevelId}`])).entries()]
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
    <AdminShell pathname={pathname} breadcrumb="Phần thi">
      <main className="mx-auto max-w-[1080px] px-4 py-6 text-[#352C31] sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Phần thi JLPT</h1>
            <p className="mt-1 text-[13px] text-[#82737B]">Từ vựng, ngữ pháp, đọc và nghe theo từng cấp.</p>
          </div>
          {!open && (
            <button
              type="button"
              onClick={() => { setNotice(''); setEditId(null); setForm(empty); setOpen(true); }}
              className="h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B]"
            >
              Thêm phần thi
            </button>
          )}
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLevelId('')} className={`h-8 rounded-lg px-3 text-[12px] ${levelId === '' ? 'bg-[#FCE8F0] font-medium text-[#AD3155]' : 'bg-white text-[#705261] hover:bg-[#FFF6FA]'}`}>
            Tất cả
          </button>
          {levelOptions.map((level) => (
            <button key={level.id} type="button" onClick={() => setLevelId(String(level.id))} className={`h-8 rounded-lg px-3 text-[12px] ${String(level.id) === levelId ? 'bg-[#FCE8F0] font-medium text-[#AD3155]' : 'bg-white text-[#705261] hover:bg-[#FFF6FA]'}`}>
              {level.code}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[12px] text-[#705261]">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
            Hiện phần đã lưu trữ
          </label>
        </div>

        {(sections.error || save.error || archive.error) && (
          <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">
            {(sections.error || save.error || archive.error).message}
          </p>
        )}
        {notice && <p className="mt-4 rounded-xl bg-[#E7F6EC] px-4 py-3 text-[13px] text-[#1E5C36]">{notice}</p>}

        {open && (
          <form
            className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white"
            onSubmit={(event) => { event.preventDefault(); setNotice(''); save.mutate(); }}
          >
            <div className="flex items-center justify-between border-b border-[#F3EDF0] px-5 py-4">
              <h2 className="text-[16px] font-semibold">{editId ? 'Sửa phần thi' : 'Phần thi mới'}</h2>
              <button type="button" onClick={close} className="h-8 rounded-lg px-2.5 text-[12px] text-[#8C6070] hover:bg-[#F8F3F5]">Đóng</button>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Cấp độ
                <select required value={form.certificateLevelId} onChange={(event) => set('certificateLevelId', event.target.value)} className={field}>
                  <option value="">Chọn cấp</option>
                  {levelOptions.map((level) => <option key={level.id} value={level.id}>{level.code}</option>)}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Tên phần
                <input required maxLength={200} value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Ví dụ: Nghe hiểu" className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Mã
                <input required maxLength={50} value={form.code} onChange={(event) => set('code', event.target.value)} placeholder="N3_LISTENING" className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Thứ tự
                <input required min="1" type="number" value={form.sortOrder} onChange={(event) => set('sortOrder', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Điểm tối đa
                <input required min="1" type="number" value={form.maxScore} onChange={(event) => set('maxScore', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Điểm đạt
                <input required min="0" type="number" value={form.passingScore} onChange={(event) => set('passingScore', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Số phút
                <input min="1" type="number" value={form.durationMinutes} onChange={(event) => set('durationMinutes', event.target.value)} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360] sm:col-span-2">
                Mô tả
                <textarea maxLength={1000} value={form.description} onChange={(event) => set('description', event.target.value)} className="mt-1.5 block min-h-20 w-full rounded-lg border border-[#E7DAE1] px-3 py-2 text-[13px] outline-none focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/20" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#F3EDF0] px-5 py-3">
              <button type="button" onClick={close} className="h-10 rounded-lg border border-[#E7DAE1] px-4 text-[13px]">Hủy</button>
              <button type="submit" disabled={save.isPending} className="h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50">
                {save.isPending ? 'Đang lưu…' : editId ? 'Lưu phần thi' : 'Tạo phần thi'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-4">
          {sections.isLoading && <p className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6 text-[13px] text-[#82737B]">Đang tải…</p>}
          {!sections.isLoading && groups.length === 0 && <p className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-6 text-[13px] text-[#82737B]">Chưa có phần thi.</p>}
          {groups.map(([level, items]) => (
            <section key={level} className="overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
              <header className="flex items-center justify-between border-b border-[#F3EDF0] px-5 py-3">
                <h2 className="text-[14px] font-semibold">{level}</h2>
                <span className="text-[12px] text-[#A08B96]">{items.length} phần</span>
              </header>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] text-[#A08B96]">
                    <th className="px-5 py-2 font-medium">Phần thi</th>
                    <th className="px-3 py-2 font-medium">Điểm</th>
                    <th className="px-3 py-2 font-medium">Phút</th>
                    <th className="px-5 py-2 text-right font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-[#F6F0F3]">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium">{row.name}</p>
                        <p className="mt-0.5 text-[12px] text-[#A08B96]">{row.code}{row.isArchived ? ' · đã lưu trữ' : ''}</p>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-[#705261]">{row.passingScore}/{row.maxScore}</td>
                      <td className="px-3 py-3 text-[13px] text-[#705261]">{row.durationMinutes ?? '—'}</td>
                      <td className="px-5 py-3 text-right">
                        {!row.isArchived && (
                          <span className="inline-flex gap-2">
                            <button type="button" onClick={() => edit(row)} className="h-8 rounded-lg border border-[#E7DAE1] px-3 text-[12px] hover:bg-[#FFF6FA]">Sửa</button>
                            <button type="button" onClick={() => archive.mutate(row.id)} className="h-8 rounded-lg px-3 text-[12px] text-[#A33357] hover:bg-[#FCF4F8]">Lưu trữ</button>
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
