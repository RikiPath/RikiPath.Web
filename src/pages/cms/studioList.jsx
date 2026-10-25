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
      <main data-page={page} className="mx-auto w-full max-w-5xl px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">{title}</h1>
            <p className="mt-1 text-[13px] text-[#967F8A]">{hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detail && (
              <Link
                to={detail.to}
                className="inline-flex h-10 items-center rounded-xl border border-[#E8DFDC] bg-white px-3.5 text-[13px] text-[#6F5660] hover:bg-[#FFF7F9]"
              >
                {detail.label}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white hover:bg-[#9A2849]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {addLabel}
            </button>
          </div>
        </div>

        {hasSample && (
          <p className="mt-4 text-[12px] text-[#AA8F9B]">
            Dòng gắn Mẫu chỉ để xem bố cục. Thêm mới chỉ giữ trong phiên này.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm"
            className="h-10 w-full max-w-xs rounded-lg border border-[#E8DFDC] bg-white px-3 text-[13px] outline-none focus:border-[#E7C9D4]"
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
                    ? 'bg-[#FADDE8] text-[#A12E50]'
                    : 'bg-white text-[#826773] ring-1 ring-[#E8DFDC]',
                ].join(' ')}
              >
                {item === 'all' ? 'Mọi cấp' : item}
              </button>
            ))}
          <span className="ml-auto text-[12px] text-[#AA8F9B]">{visible.length} dòng</span>
        </div>

        {open && (
          <form
            onSubmit={onAdd}
            className="mt-4 grid gap-3 rounded-xl border border-[#E8DFDC] bg-white p-4 sm:grid-cols-2"
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

        <div className="mt-4 overflow-hidden rounded-xl border border-[#E8DFDC] bg-white">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[#AA8F9B]">Chưa có dòng nào.</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#FBF8F7] text-[11px] tracking-[0.06em] text-[#B18F9E]">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-3 py-2 font-medium">
                      {column.label.toUpperCase()}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-t border-[#F1E8E6]">
                    {columns.map((column) => (
                      <td key={column.key} className="max-w-[240px] truncate px-3 py-2.5 text-[#3F3038]">
                        {column.key === columns[0].key && row.sample && (
                          <span className="mr-2 rounded bg-[#F8E7EE] px-1.5 py-0.5 text-[10px] text-[#AD3155]">
                            Mẫu
                          </span>
                        )}
                        {row[column.key] || '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                        className="text-[12px] text-[#AA8F9B] hover:text-[#AD3155]"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </CmsShell>
  );
}
