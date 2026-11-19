import { useLocale } from '@/locales/locale.js';
export default function OrderingAnswer({ question, value, onChange }) {
  const { tr } = useLocale();
  const tokens = question.interactionData?.tokens ?? [];
  const chosen = Array.isArray(value) ? value : [];
  const remaining = [...chosen];
  const available = tokens.map((token, index) => {
    const used = remaining.indexOf(token);
    if (used < 0) return { token, index };
    remaining.splice(used, 1);
    return null;
  }).filter(Boolean);
  const unknown = question.options.find(option => option.optionId === 0);
  const tokenClass = 'rounded-lg border border-rp-brand-border bg-white px-3 py-2 text-sm text-rp-text hover:bg-rp-brand-tint disabled:opacity-60';

  return <div className="mt-4 space-y-3">
    <p className="text-sm text-rp-text-2">{tr('Chọn các cụm theo thứ tự. Bấm vào cụm đã chọn để đưa về danh sách.')}</p>
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-rp-line bg-rp-brand-tint p-2"
      role="group" aria-label={tr('Câu đã sắp xếp')}>
      {chosen.length ? chosen.map((token, index) => <button type="button" key={index}
        className={tokenClass} aria-label={'Bỏ cụm ' + (index + 1) + ' ' + token}
        onClick={() => onChange(chosen.filter((_, position) => position !== index))}>{token}</button>)
        : <span className="text-sm text-rp-text-muted">{tr('Câu đã sắp xếp sẽ hiện ở đây')}</span>}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={tr('Các cụm để sắp xếp')}>
      {available.map(({ token, index }) => <button type="button" key={index} className={tokenClass}
        onClick={() => onChange([...chosen, token])}>{token}</button>)}
    </div>
    {unknown && <button type="button" aria-pressed={value === unknown.optionId}
      className={tokenClass + (value === unknown.optionId ? ' !border-rp-brand-strong !bg-rp-brand-tint' : '')}
      onClick={() => onChange(value === unknown.optionId ? [] : unknown.optionId)}>{unknown.content}</button>}
  </div>;
}

