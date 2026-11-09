import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { CmsShell } from '../../components/shells';

const fieldClass =
  'h-10 w-full rounded-lg border border-[#E8DFDC] bg-white px-3 text-[13px] text-[#2D282A] outline-none focus:border-[#E7C9D4]';

function blankDraft(fields) {
  return Object.fromEntries(fields.map((field) => [field.key, field.default ?? '']));
}

export default function StudioList({
  pathname,
  breadcrumb,
  title,
  hint,
  page,
  addLabel = 'Thêm',
  columns,
  fields,
  seed = [],
  detail,
}) {
  const [rows, setRows] = useState(seed);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => blankDraft(fields));

  const hasLevel = fields.some((field) => field.key === 'level');
  const hasSample = rows.some((row) => row.sample);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (level !== 'all' && row.level !== level) return false;
      if (!q) return true;
      return columns.some((column) =>
        String(row[column.key] ?? '').toLowerCase().includes(q),
      );
    });
  }, [rows, query, level, columns]);

  function onAdd(event) {
    event.preventDefault();
    const missing = fields.find((field) => field.required && !String(draft[field.key] || '').trim());
    if (missing) return;
    setRows((prev) => [{ id: Date.now(), sample: false, ...draft }, ...prev]);
    setDraft(blankDraft(fields));
    setOpen(false);
  }

  return (
    <CmsShell pathname={pathname} breadcrumb={breadcrumb}>
      <main data-page={page} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[#49353F]">{title}</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">{hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detail && (
              <Link
                to={detail.to}
                className="inline-flex h-10 items-center rounded-xl border border-[#E7DAE1] bg-white px-3.5 text-[13px] text-[#6F5660] hover:bg-[#FFF7F9]"
              >
                {detail.label}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white hover:bg-[#982B4B]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {addLabel}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#EADFE5] bg-white p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm trong danh sách"
            className="h-10 min-w-[180px] flex-1 rounded-xl border border-[#EADFE5] bg-[#FCFAFB] px-3 text-[13px] outline-none focus:border-[#E7C9D4]"
          />
          {hasLevel &&
            ['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={[
                  'h-8 rounded-full px-3 text-[12px]',
                  level === item
                    ? 'bg-[#AD3155] text-white'
                    : 'bg-[#FCFAFB] text-[#826773]',
                ].join(' ')}
              >
                {item === 'all' ? 'Mọi cấp' : item}
              </button>
            ))}
          <span className="px-1 text-[12px] text-[#AA8F9B]">{visible.length} mục</span>
        </div>

        {hasSample && (
          <p className="mt-3 text-[12px] leading-5 text-[#AA8F9B]">
            Thẻ gắn Mẫu chỉ để xem bố cục. Mục bạn thêm chỉ giữ đến khi tải lại trang.
          </p>
        )}

        {open && (
          <form
            onSubmit={onAdd}
            className="mt-4 grid gap-3 rounded-2xl border border-[#E7C9D6] bg-[#FFF8FA] p-4 sm:grid-cols-2"
          >
            {fields.map((field) => (
              <label key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                <span className="mb-1 block text-[12px] text-[#967F8A]">{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className={fieldClass}
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className={fieldClass}
                  />
                )}
              </label>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                className="h-9 rounded-lg bg-[#AD3155] px-3 text-[13px] text-white"
              >
                Lưu vào danh sách
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg px-3 text-[13px] text-[#826773]"
              >
                Đóng
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 grid gap-3">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E7C9D6] bg-white px-4 py-12 text-center text-[13px] text-[#AA8F9B]">Chưa có mục nào khớp bộ lọc.</p>
          ) : visible.map((row) => (
            <article key={row.id} className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.sample && <span className="rounded-full bg-[#FCEEF3] px-2 py-0.5 text-[10px] font-medium text-[#AD3155]">Mẫu</span>}
                    {row.level && <span className="rounded-full bg-[#FAF6F7] px-2 py-0.5 text-[10px] font-medium text-[#8D7481]">{row.level}</span>}
                  </div>
                  <h2 className="mt-2 text-[16px] font-semibold text-[#49353F]" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                    {row[columns[0].key] || 'Chưa đặt tên'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                  className="rounded-lg px-2 py-1 text-[12px] text-[#AA8F9B] hover:bg-[#FFF6FA] hover:text-[#AD3155]"
                >
                  Xóa
                </button>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                {columns.slice(1).map((column) => (
                  <div key={column.key}>
                    <dt className="text-[11px] text-[#B099A4]">{column.label}</dt>
                    <dd className="mt-0.5 text-[13px] text-[#5A3E4C]">{row[column.key] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </main>
    </CmsShell>
  );
}
