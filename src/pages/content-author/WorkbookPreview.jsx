import { useState } from 'react';

const rowsPerPage = 40;
const columnsPerPage = 12;
const buttonClass = 'rounded-lg border border-[#E7D7DF] px-3 py-1.5 text-sm font-semibold text-[#9E2A4B] disabled:opacity-45';

function PageControls({ label, page, total, change }) {
  if (total <= 1) return null;
  return <div role="group" aria-label={label} className="flex items-center gap-2 text-xs text-slate-600">
    <button type="button" className={buttonClass} aria-label={label + ' trước'} disabled={page <= 0}
      onClick={() => change(page - 1)}>Trước</button>
    <span>{label} {page + 1}/{total}</span>
    <button type="button" className={buttonClass} aria-label={label + ' sau'} disabled={page + 1 >= total}
      onClick={() => change(page + 1)}>Sau</button>
  </div>;
}

export function workbookEditKey(sheetName, row, column) {
  return JSON.stringify([sheetName, row, column]);
}

function SheetGrid({ sheet, editing, changes, onCellChange }) {
  const [rowPage, setRowPage] = useState(0);
  const [columnPage, setColumnPage] = useState(0);
  const [activeCell, setActiveCell] = useState(null);
  const rows = sheet.rows.slice(rowPage * rowsPerPage, (rowPage + 1) * rowsPerPage);
  const columns = sheet.columns.slice(columnPage * columnsPerPage, (columnPage + 1) * columnsPerPage);

  if (sheet.rows.length === 0) return <p className="p-4 text-sm text-slate-600">Sheet này chưa có dữ liệu.</p>;

  return <>
    <div tabIndex={0} role="region" aria-label={'Bảng dữ liệu ' + sheet.name} className="max-h-[32rem] overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col" className="sticky left-0 border-b border-r border-[#EADFE5] bg-[#F7EEF2] px-3 py-2 text-xs">Dòng</th>
            {columns.map(column => <th key={column.index} scope="col" className="min-w-28 border-b border-r border-[#EADFE5] bg-[#F7EEF2] px-3 py-2 text-center text-xs">
              {column.label}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.number}>
            <th scope="row" className="sticky left-0 border-b border-r border-[#EADFE5] bg-[#FAF5F7] px-3 py-2 align-top text-xs font-medium">
              {row.number}
            </th>
            {columns.map(column => {
              const key = workbookEditKey(sheet.name, row.number, column.index);
              const original = row.numericValues?.[column.index] ?? row.cells[column.index] ?? '';
              const change = changes[key];
              const value = change?.value ?? row.cells[column.index] ?? '';
              const label = 'Ô ' + column.label + row.number;
              const formula = row.formulaColumns?.includes(column.index);
              return <td key={column.index} className={'max-w-72 min-w-28 whitespace-pre-wrap break-words border-b border-r border-[#EADFE5] px-3 py-2 align-top ' + (change ? 'bg-amber-50' : '')}>
                {editing && !formula ? (activeCell === key ? (
                  <textarea aria-label={label} autoFocus rows={3} maxLength={32767}
                    className="w-full min-w-24 resize-y rounded border border-[#AD3155] bg-white p-1"
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
                  className="block min-h-6 w-full whitespace-pre-wrap break-words rounded text-left hover:bg-[#F7EEF2]"
                  onClick={() => setActiveCell(key)}>{value || <span className="text-slate-400">—</span>}</button>) : value}
                {editing && formula && <span className="ml-1 text-xs text-slate-500">Công thức</span>}
              </td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
    <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#EADFE5] px-4 py-3">
      <PageControls label="Trang dòng" page={rowPage} total={Math.ceil(sheet.rows.length / rowsPerPage)} change={setRowPage} />
      <PageControls label="Trang cột" page={columnPage} total={Math.ceil(sheet.columns.length / columnsPerPage)} change={setColumnPage} />
    </footer>
  </>;
}

export default function WorkbookPreview({ workbook, changes, onCellChange, onApply, onDiscard, busy, applyError }) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [editing, setEditing] = useState(false);
  const sheet = workbook.sheets[activeSheet];
  const changeCount = Object.keys(changes).length;
  return <section aria-label="Nội dung file Excel" className="overflow-hidden rounded-xl border border-[#EADFE5] bg-white text-[#49353F]">
    <header className="space-y-2 border-b border-[#EADFE5] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="break-words font-semibold">{workbook.fileName}</h2>
        {sheet && <button type="button" className={buttonClass} aria-pressed={editing} disabled={busy}
          onClick={() => setEditing(value => !value)}>{editing ? 'Xong chỉnh sửa' : 'Chỉnh sửa ô'}</button>}
      </div>
      {editing && <p className="text-sm text-slate-600">Chọn một ô để sửa. Dùng Shift + Enter để xuống dòng trong ô.</p>}
      {changeCount > 0 && <div className="flex flex-wrap items-center gap-2 text-sm">
        <span role="status">{changeCount} ô đã sửa</span>
        <button type="button" disabled={busy} onClick={onApply}
          className="rounded-lg bg-[#AD3155] px-3 py-1.5 font-semibold text-white disabled:opacity-50">
          {busy ? 'Đang áp dụng…' : 'Áp dụng thay đổi'}
        </button>
        <button type="button" disabled={busy} onClick={onDiscard} className={buttonClass}>Bỏ thay đổi</button>
      </div>}
      {applyError && <p role="alert" className="text-sm text-rose-700">{applyError.message}</p>}
      {workbook.isTruncated && <p role="status" className="text-sm text-amber-900">File lớn, chỉ hiển thị một phần dữ liệu xem trước.</p>}
      {sheet && <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
        Sheet
        <select value={activeSheet} onChange={event => setActiveSheet(Number(event.target.value))}
          className="max-w-full rounded-lg border border-[#E7D7DF] bg-white px-3 py-1.5">
          {workbook.sheets.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}
        </select>
      </label>}
    </header>
    {sheet ? <SheetGrid key={activeSheet + ':' + editing} sheet={sheet} editing={editing && !busy}
      changes={changes} onCellChange={onCellChange} /> : <p className="p-4 text-sm text-slate-600">File chưa có sheet hiển thị.</p>}
  </section>;
}
