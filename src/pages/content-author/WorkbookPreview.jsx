import { useState } from 'react';
import { CustomSelect, EmptyState } from '@/components/ui';
import { workbookEditKey } from '@/features/content-author/utils/workbookModel.js';
import { useLocale } from '@/locales/locale.js';

const rowsPerPage = 40;
const columnsPerPage = 12;
const buttonClass = 'rounded-lg border border-rp-line px-3 py-1.5 text-sm font-semibold text-rp-brand-strong disabled:opacity-45';

function PageControls({ label, page, total, change }) {
  const { tr } = useLocale();
  if (total <= 1) return null;
  return <div role="group" aria-label={label} className="flex items-center gap-2 text-xs text-slate-600">
    <button type="button" className={buttonClass} aria-label={label + ' trước'} disabled={page <= 0}
      onClick={() => change(page - 1)}>{tr('Trước')}</button>
    <span>{tr(label)} {page + 1}/{total}</span>
    <button type="button" className={buttonClass} aria-label={label + ' sau'} disabled={page + 1 >= total}
      onClick={() => change(page + 1)}>{tr('Sau')}</button>
  </div>;
}


function SheetGrid({ sheet, editing, changes, onCellChange }) {
  const { tr } = useLocale();
  const [rowPage, setRowPage] = useState(0);
  const [columnPage, setColumnPage] = useState(0);
  const [activeCell, setActiveCell] = useState(null);
  const rows = sheet.rows.slice(rowPage * rowsPerPage, (rowPage + 1) * rowsPerPage);
  const columns = sheet.columns.slice(columnPage * columnsPerPage, (columnPage + 1) * columnsPerPage);

  if (sheet.rows.length === 0) {
    return (
      <div className="p-4">
        <EmptyState variant="compact" illustration="table" title={tr('Sheet này chưa có dữ liệu.')} />
      </div>
    );
  }

  return <>
    <div tabIndex={0} role="region" aria-label={'Bảng dữ liệu ' + sheet.name} className="max-h-[32rem] overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col" className="sticky left-0 border-b border-r border-rp-line bg-rp-brand-soft px-3 py-2 text-xs">{tr('Dòng')}</th>
            {columns.map(column => <th key={column.index} scope="col" className="min-w-28 border-b border-r border-rp-line bg-rp-brand-soft px-3 py-2 text-center text-xs">
              {tr(column.label)}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.number}>
            <th scope="row" className="sticky left-0 border-b border-r border-rp-line bg-rp-brand-tint px-3 py-2 align-top text-xs font-medium">
              {row.number}
            </th>
            {columns.map(column => {
              const key = workbookEditKey(sheet.name, row.number, column.index);
              const original = row.numericValues?.[column.index] ?? row.cells[column.index] ?? '';
              const change = changes[key];
              const value = change?.value ?? row.cells[column.index] ?? '';
              const label = 'Ô ' + column.label + row.number;
              const formula = row.formulaColumns?.includes(column.index);
              return <td key={column.index} className={'max-w-72 min-w-28 whitespace-pre-wrap break-words border-b border-r border-rp-line px-3 py-2 align-top ' + (change ? 'bg-amber-50' : '')}>
                {editing && !formula ? (activeCell === key ? (
                  <textarea aria-label={label} autoFocus rows={3} maxLength={32767}
                    className="w-full min-w-24 resize-y rounded border border-rp-brand-strong bg-white p-1"
                    value={change?.value ?? original}
                    onBlur={() => setActiveCell(null)}
                    onChange={event => onCellChange({
                      sheetName: sheet.name, row: row.number, column: column.index, value: event.target.value,
                    }, original)}
                    onKeyDown={event => {
                      if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }} />
                ) : <button type="button" aria-label={'Sửa ' + label.toLowerCase()}
                  className="block min-h-6 w-full whitespace-pre-wrap break-words rounded text-left hover:bg-rp-brand-soft"
                  onClick={() => setActiveCell(key)}>{value || <span className="text-slate-400">—</span>}</button>) : value}
                {editing && formula && <span className="ml-1 text-xs text-slate-500">{tr('Công thức')}</span>}
              </td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
    <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-rp-line px-4 py-3">
      <PageControls label={tr('Trang dòng')} page={rowPage} total={Math.ceil(sheet.rows.length / rowsPerPage)} change={setRowPage} />
      <PageControls label={tr('Trang cột')} page={columnPage} total={Math.ceil(sheet.columns.length / columnsPerPage)} change={setColumnPage} />
    </footer>
  </>;
}

export default function WorkbookPreview({ workbook, changes, onCellChange, onApply, onDiscard, busy, applyError }) {
  const { tr, trf } = useLocale();
  const [activeSheet, setActiveSheet] = useState(0);
  const [editing, setEditing] = useState(false);
  const sheet = workbook.sheets[activeSheet];
  const changeCount = Object.keys(changes).length;
  return <section aria-label={tr('Nội dung file Excel')} className="overflow-hidden rounded-xl border border-rp-line bg-white text-rp-text">
    <header className="space-y-2 border-b border-rp-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="break-words font-semibold">{workbook.fileName}</h2>
        {sheet && <button type="button" className={buttonClass} aria-pressed={editing} disabled={busy}
          onClick={() => setEditing(value => !value)}>{editing ? tr('Xong chỉnh sửa') : tr('Chỉnh sửa ô')}</button>}
      </div>
      {editing && <p className="text-sm text-slate-600">{tr('Chọn một ô để sửa. Dùng Shift + Enter để xuống dòng trong ô.')}</p>}
      {changeCount > 0 && <div className="flex flex-wrap items-center gap-2 text-sm">
        <span role="status">{trf('{0} ô đã sửa', { 0: changeCount })}</span>
        <button type="button" disabled={busy} onClick={onApply}
          className="rounded-lg bg-rp-brand-strong px-3 py-1.5 font-semibold text-white disabled:opacity-50 rp-press">
          {busy ? tr('Đang áp dụng…') : tr('Áp dụng thay đổi')}
        </button>
        <button type="button" disabled={busy} onClick={onDiscard} className={buttonClass}>{tr('Bỏ thay đổi')}</button>
      </div>}
      {applyError && <p role="alert" className="text-sm text-rose-700">{tr(applyError.message)}</p>}
      {workbook.isTruncated && <p role="status" className="text-sm text-amber-900">{tr('File lớn, chỉ hiển thị một phần dữ liệu xem trước.')}</p>}
      {sheet && (
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span>Sheet</span>
          <div className="w-56 max-w-full">
            <CustomSelect
              size="sm"
              aria-label="Sheet"
              value={String(activeSheet)}
              onChange={(val) => setActiveSheet(Number(val))}
              options={workbook.sheets.map((item, index) => ({ value: String(index), label: item.name }))}
            />
          </div>
        </div>
      )}
    </header>
    {sheet ? <SheetGrid key={activeSheet + ':' + editing} sheet={sheet} editing={editing && !busy}
      changes={changes} onCellChange={onCellChange} /> : (
        <div className="p-4">
          <EmptyState variant="compact" illustration="table" title={tr('File chưa có sheet hiển thị.')} />
        </div>
      )}
  </section>;
}
