import { jlptExamDate } from '@/features/learning-path/utils/learningGoal.js';
import { useLocale } from '@/locales/locale.js';

const months = [
  { value: '07', label: 'Tháng 7' },
  { value: '12', label: 'Tháng 12' },
];
const control = 'mt-1 w-full rounded-lg border border-rp-line bg-white px-3 py-2 text-sm disabled:bg-rp-brand-tint';

export default function JlptExamDatePicker({ value, today, onChange, requiredForAssessment = false }) {
  const { tr } = useLocale();
  const year = value ? value.split('-')[0] : today.slice(0, 4);
  const periods = months.map(month => ({ ...month, date: jlptExamDate(year, month.value) }))
    .filter(period => period.date && period.date > today);
  const selected = periods.find(period => period.date === value);
  const existingDateUnavailable = /^\d{4}-\d{2}-\d{2}$/.test(value) && !selected;

  return <div className="mt-4" role="group" aria-labelledby="target-exam-date-label">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p id="target-exam-date-label" className="text-[13px] font-semibold">{tr('Ngày dự định thi')}{requiredForAssessment ? tr(' (cần để làm bài đánh giá)') : tr(' (không bắt buộc)')}</p>
      {value && <button type="button" className="text-xs font-semibold text-rp-brand-strong underline" onClick={() => onChange('')}>{tr('Xóa ngày thi')}</button>}
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <label className="text-xs">{tr('Năm')}
        <input type="number" min={today.slice(0, 4)} max="9999" step="1" inputMode="numeric"
          className={control} value={year} onChange={event => onChange(event.target.value + '--')} />
      </label>
      <label className="text-xs">{tr('Kỳ thi')}
        <select className={control} value={selected?.date ?? ''} disabled={!periods.length}
          onChange={event => onChange(event.target.value)}>
          <option value="">{tr('Chọn kỳ thi')}</option>
          {periods.map(period => <option key={period.date} value={period.date}>
            {tr(period.label)} · {period.date.slice(8)}/{period.value}/{year}
          </option>)}
        </select>
      </label>
    </div>
    {periods.length === 0 && /^\d{4}$/.test(year) && (
      <p className="mt-2 text-xs text-rp-text-muted">{tr('Năm này đã hết kỳ thi. Hãy chọn năm sau.')}</p>
    )}
    <p className="mt-2 text-xs text-rp-text-muted">{tr('Ngày thi được điền theo Chủ nhật đầu tiên của tháng 7 hoặc tháng 12.')}</p>
    {existingDateUnavailable && <p className="mt-2 text-xs text-rose-700">{tr('Ngày thi đã lưu không còn hợp lệ. Hãy chọn lại hoặc xóa ngày thi.')}</p>}
  </div>;
}
