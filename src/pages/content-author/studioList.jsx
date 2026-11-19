import { AUTHOR_LEVELS } from '@/features/content-author/constants/authorLevels.js';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ContentAuthorShell } from '@/layouts';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale } from '@/locales/locale.js';

const fieldClass =
  'h-10 w-full rounded-lg border border-rp-line bg-white px-3 text-[13px] text-rp-text outline-none focus:border-rp-brand-border';

function blankDraft(fields, level) {
  return Object.fromEntries(fields.map((field) => [field.key, field.key === 'level' ? level : (field.default ?? '')]));
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
  const { tr, trf } = useLocale();
  const [rows, setRows] = useState(seed);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState(AUTHOR_LEVELS[0]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => blankDraft(fields, level));

  const hasLevel = fields.some((field) => field.key === 'level');
  const hasSample = rows.some((row) => row.sample);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (hasLevel && row.level !== level) return false;
      if (!q) return true;
      return columns.some((column) =>
        String(row[column.key] ?? '').toLowerCase().includes(q),
      );
    });
  }, [rows, query, hasLevel, level, columns]);

  function onAdd(event) {
    event.preventDefault();
    const missing = fields.find((field) => field.required && !String(draft[field.key] || '').trim());
    if (missing) return;
    setRows((prev) => [{ id: Date.now(), sample: false, ...draft }, ...prev]);
    if (hasLevel) setLevel(draft.level);
    setOpen(false);
  }

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb={breadcrumb}>
      <main data-page={page} className="rp-container py-6 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-rp-text">{tr(title)}</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-rp-text-muted">{tr(hint)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {detail && (
              <Link
                to={detail.to}
                className="inline-flex h-10 items-center rounded-xl border border-rp-line bg-white px-3.5 text-[13px] text-rp-text-2 hover:bg-rp-brand-tint"
              >
                {tr(detail.label)}
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                if (!open) setDraft(blankDraft(fields, level));
                setOpen(!open);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rp-brand-strong px-3.5 text-[13px] text-white hover:bg-rp-brand-strong rp-press"
            >
              <Icon name="add" className="text-[18px]" />
              {addLabel}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-rp-line bg-white p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr('Tìm trong danh sách')}
            className="h-10 min-w-[180px] flex-1 rounded-xl border border-rp-line bg-rp-bg-2 px-3 text-[13px] outline-none focus:border-rp-brand-border"
          />
          {hasLevel &&
            AUTHOR_LEVELS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={level === item}
                onClick={() => setLevel(item)}
                className={[
                  'h-8 rounded-full px-3 text-[12px]',
                  level === item
                    ? 'bg-rp-brand-strong text-white'
                    : 'bg-rp-bg-2 text-rp-text-muted',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          <span className="px-1 text-[12px] text-rp-text-muted">{trf('{0} mục', { 0: visible.length })}</span>
        </div>

        {hasSample && (
          <p className="mt-3 text-[12px] leading-5 text-rp-text-muted">
            {tr('Thẻ gắn Mẫu chỉ để xem bố cục. Mục bạn thêm chỉ giữ đến khi tải lại trang.')}
          </p>
        )}

        {open && (
          <form
            onSubmit={onAdd}
            className="mt-4 grid gap-3 rounded-2xl border border-rp-brand-border bg-rp-brand-tint p-4 sm:grid-cols-2"
          >
            {fields.map((field) => (
              <label key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
                <span className="mb-1 block text-[12px] text-rp-text-muted">{tr(field.label)}</span>
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
                className="h-9 rounded-lg bg-rp-brand-strong px-3 text-[13px] text-white rp-press"
              >
                {tr('Lưu vào danh sách')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg px-3 text-[13px] text-rp-text-muted"
              >
                {tr('Đóng')}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 grid gap-3">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-rp-brand-border bg-white px-4 py-12 text-center text-[13px] text-rp-text-muted">{tr('Chưa có mục nào khớp bộ lọc.')}</p>
          ) : visible.map((row) => (
            <article key={row.id} className="rounded-2xl border border-rp-line bg-white px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.sample && <span className="rounded-full bg-rp-brand-tint px-2 py-0.5 text-[10px] font-medium text-rp-brand-strong">{tr('Mẫu')}</span>}
                    {row.level && <span className="rounded-full bg-rp-brand-tint px-2 py-0.5 text-[10px] font-medium text-rp-text-muted">{row.level}</span>}
                  </div>
                  <h2 className="mt-2 text-[16px] font-semibold text-rp-text" style={{ fontFamily: '"Segoe UI", "Yu Gothic", sans-serif' }}>
                    {row[columns[0].key] || tr('Chưa đặt tên')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                  className="rounded-lg px-2 py-1 text-[12px] text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                >
                  {tr('Xóa')}
                </button>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                {columns.slice(1).map((column) => (
                  <div key={column.key}>
                    <dt className="text-[11px] text-rp-text-muted">{tr(column.label)}</dt>
                    <dd className="mt-0.5 text-[13px] text-rp-brand-deep">{row[column.key] || '—'}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </main>
    </ContentAuthorShell>
  );
}
