import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Languages, Loader2, X } from 'lucide-react';
import { translateSelection } from '@/features/dictionary/api/dictionaryApi.js';
import { ContextualErrorState } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function SelectionTranslatePopover({ request, onClose }) {
  const { tr } = useLocale();

  const translateQuery = useQuery({
    queryKey: ['selection-translate', request?.selectedText || '', request?.contextSentence || ''],
    queryFn: () =>
      translateSelection({
        text: request.selectedText,
        contextSentence: request.contextSentence || '',
        targetLanguage: 'vi',
      }),
    enabled: Boolean(request?.selectedText),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!request) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request, onClose]);

  const data = translateQuery.data || null;
  const loading = translateQuery.isLoading || translateQuery.isFetching;
  const error = translateQuery.error || null;

  if (!request) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.max(12, Math.min((request.rect?.left ?? 160), vw - 392));
  const top = Math.min((request.rect?.bottom ?? 200) + 10, vh - 340);

  return (
    <div
      role="dialog"
      aria-label={tr('Dịch Nhật → Việt')}
      data-notebook-capture-ignore="true"
      className="fixed z-[92] w-[min(94vw,380px)] rounded-2xl border border-[#EAE3E4] bg-[#FFFCF8] p-4 shadow-2xl"
      style={{ left: `${left}px`, top: `${Math.max(16, top)}px` }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#EAE3E4] pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF0F4] text-rp-brand-strong">
            <Languages className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rp-brand-strong">{tr('Dịch Nhật → Việt')}</p>
            <p className="rp-jp truncate text-[14px] font-bold text-rp-navy">{request.selectedText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Đóng')}
          className="rp-focus flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted hover:bg-[#FFF0F4]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 max-h-[300px] overflow-y-auto space-y-2.5 pr-0.5">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs font-medium text-rp-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-rp-brand-strong" />
            <span>{tr('Đang tra cứu & dịch ngữ cảnh…')}</span>
          </div>
        ) : error ? (
          <ContextualErrorState
            error={error}
            title={tr('Không thể dịch đoạn này')}
            onRetry={() => translateQuery.refetch()}
          />
        ) : data ? (
          <>
            <div className="rounded-xl border border-[#EAE3E4] bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-rp-text-muted">
                  {data.source === 'ApprovedBank' ? tr('Từ học liệu đã duyệt') : tr('Bản dịch ngữ cảnh AI')}
                </span>
                {data.reading && (
                  <span className="rp-jp rounded-full bg-[#FFF0F4] px-2 py-0.5 text-[11px] font-semibold text-rp-brand-strong">
                    {data.reading}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-rp-navy">{data.translation}</p>
              {data.grammarNote && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-rp-text-2">{data.grammarNote}</p>
              )}
              {data.exampleSentence && (
                <div className="mt-2 border-t border-[#F2EAEB] pt-2 text-[12px]">
                  <p className="rp-jp font-medium text-rp-text">{data.exampleSentence}</p>
                  {data.exampleMeaning && <p className="mt-0.5 text-rp-text-muted">{data.exampleMeaning}</p>}
                </div>
              )}
            </div>

            {Array.isArray(data.breakdown) && data.breakdown.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">{tr('Tách thành phần')}</p>
                <div className="grid gap-1">
                  {data.breakdown.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[12px] border border-[#F2EAEB]">
                      <span className="rp-jp font-semibold text-rp-navy">
                        {item.surface}
                        {item.reading ? <span className="ml-1 text-[11px] font-normal text-rp-text-muted">({item.reading})</span> : null}
                      </span>
                      <span className="text-right text-rp-text-2">{item.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

    </div>
  );
}
