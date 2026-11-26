import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Copy,
  Languages,
  Repeat,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import { translateSelection } from '@/features/dictionary/api/dictionaryApi.js';
import { Badge, Button, IconButton, Skeleton, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { MAX_TRANSLATION_TEXT_LENGTH } from '@/utils/japaneseTextValidator.js';
import { mapTranslationError } from './translationErrorMap.js';

async function copyTextSafe(text) {
  if (!text) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
  return false;
}

export default function SelectionTranslatePopover({
  request,
  onClose,
  onSaveNotebook,
  onSaveSrs,
}) {
  const { tr, trf } = useLocale();
  const popoverRef = useRef(null);
  const audioRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const tooLongValidation = request?.validation?.reason === 'too-long' ? request.validation : null;
  const apiEnabled = Boolean(request?.selectedText && !tooLongValidation);

  const translateQuery = useQuery({
    queryKey: ['selection-translate', request?.selectedText || '', request?.contextSentence || ''],
    queryFn: ({ signal }) =>
      translateSelection({
        text: request.selectedText,
        contextSentence: request.contextSentence || '',
        signal,
      }),
    enabled: apiEnabled,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!request) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const onPointerDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [request, onClose]);

  if (!request) return null;

  const data = translateQuery.data || null;
  const loading = apiEnabled && (translateQuery.isLoading || translateQuery.isFetching);
  const error = translateQuery.error || null;
  const errMeta = error ? mapTranslationError(error, tr) : null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const popWidth = Math.min(400, vw - 24);
  const left = Math.max(12, Math.min(request.rect?.left ?? 160, vw - popWidth - 12));
  const preferredBelow = (request.rect?.bottom ?? 200) + 10;
  const top = preferredBelow + 300 > vh && (request.rect?.top ?? 200) > 280
    ? Math.max(16, (request.rect?.top ?? 280) - 310)
    : Math.max(16, Math.min(preferredBelow, vh - 260));

  async function handleCopy() {
    if (!data?.translation) return;
    try {
      const ok = await copyTextSafe(data.translation);
      if (ok) {
        setCopied(true);
        notify.success(tr('Đã sao chép bản dịch'), '', { key: 'translate-copy-ok' });
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      notify.warning(tr('Không thể sao chép tự động'));
    }
  }

  function handleSpeak() {
    if (data?.audioUrl) {
      try {
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        void audio.play();
        return;
      } catch {
        // Fallback to browser SpeechSynthesis below
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && request.selectedText) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(request.selectedText);
      utter.lang = 'ja-JP';
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }
  }

  const canSpeak = Boolean(
    data?.audioUrl || (typeof window !== 'undefined' && 'speechSynthesis' in window),
  );

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={tr('Nhật → Việt')}
      data-testid="selection-translate-popover"
      data-notebook-capture-ignore="true"
      data-translate-scope="deny"
      className="fixed z-[92] flex max-h-[min(78vh,460px)] w-[min(94vw,400px)] flex-col overflow-hidden rounded-2xl border border-rp-line bg-rp-surface text-rp-text shadow-2xl"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      {/* Compact Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rp-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rp-brand-tint text-rp-brand-strong">
            <Languages aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-rp-brand-strong">
            {tr('Nhật → Việt')}
          </span>
          {data && (
            <Badge
              tone={data.source === 'ApprovedBank' ? 'success' : 'brand'}
              size="sm"
              icon={false}
            >
              {data.source === 'ApprovedBank' ? tr('Từ điển học liệu') : tr('Dịch ngữ cảnh')}
            </Badge>
          )}
        </div>
        <IconButton
          size="sm"
          variant="ghost"
          icon={X}
          label={tr('Đóng')}
          onClick={onClose}
        />
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {/* Selected Japanese Text (Full preserved selection, never truncated) */}
        <div className="rounded-xl border border-rp-line/80 bg-rp-bg-2 px-3 py-2">
          <p className="rp-jp max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-[14px] font-bold leading-6 text-rp-text">
            {request.selectedText}
          </p>
          {data?.reading && (
            <p className="rp-jp mt-1 text-xs font-medium text-rp-brand-strong">
              {data.reading}
            </p>
          )}
        </div>

        {tooLongValidation ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-rp-warning-line bg-rp-warning-bg p-3 text-xs text-rp-text">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rp-warning" />
            <div className="space-y-1">
              <p className="font-semibold">
                {trf('Đoạn đã chọn dài {0}/{1} ký tự', {
                  0: tooLongValidation.length,
                  1: MAX_TRANSLATION_TEXT_LENGTH,
                })}
              </p>
              <p className="text-rp-text-2">
                {tr('Vui lòng chọn đoạn ngắn hơn để đảm bảo bản dịch đầy đủ và chính xác.')}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2 py-1" aria-live="polite" aria-label={tr('Đang dịch…')}>
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : errMeta ? (
          <div
            role="alert"
            className="space-y-2.5 rounded-xl border border-rp-danger-line bg-rp-danger-bg/60 p-3 text-xs"
          >
            <div className="flex items-start gap-2 text-rp-danger">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-semibold leading-5">{errMeta.message}</p>
            </div>
            {errMeta.retryable && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={RotateCcw}
                onClick={() => translateQuery.refetch()}
              >
                {tr('Thử lại')}
              </Button>
            )}
          </div>
        ) : data ? (
          <>
            <div className="rounded-xl border border-rp-line bg-rp-surface p-3">
              <p
                data-testid="translation-result-text"
                className="whitespace-pre-wrap break-words text-[14.5px] font-semibold leading-6 text-rp-text"
              >
                {data.translation}
              </p>
              {data.grammarNote && (
                <p className="mt-1.5 border-t border-rp-line/60 pt-1.5 text-xs leading-5 text-rp-text-2">
                  {data.grammarNote}
                </p>
              )}
              {data.exampleSentence && (
                <div className="mt-2 border-t border-rp-line/60 pt-2 text-xs">
                  <p className="rp-jp font-medium text-rp-text">{data.exampleSentence}</p>
                  {data.exampleMeaning && (
                    <p className="mt-0.5 text-rp-text-muted">{data.exampleMeaning}</p>
                  )}
                </div>
              )}
            </div>

            {Array.isArray(data.breakdown) && data.breakdown.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rp-text-muted">
                  {tr('Tách thành phần')}
                </p>
                <div className="grid gap-1">
                  {data.breakdown.slice(0, 5).map((item, idx) => (
                    <div
                      key={`${item.surface}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-rp-line/70 bg-rp-bg-2/70 px-2.5 py-1.5 text-xs"
                    >
                      <span className="rp-jp font-semibold text-rp-text">
                        {item.surface}
                        {item.reading ? (
                          <span className="ml-1 font-normal text-rp-text-muted">({item.reading})</span>
                        ) : null}
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

      {/* Action Footer */}
      {data && !loading && !errMeta && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-t border-rp-line bg-rp-bg-2/60 px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={copied ? Check : Copy}
              onClick={handleCopy}
            >
              {copied ? tr('Đã chép') : tr('Sao chép')}
            </Button>
            {canSpeak && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon={Volume2}
                onClick={handleSpeak}
                aria-label={tr('Nghe phát âm')}
              >
                {tr('Nghe')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onSaveNotebook && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon={BookmarkPlus}
                onClick={() => onSaveNotebook({
                  ...request,
                  meaning: data.translation,
                  reading: data.reading || '',
                })}
              >
                {tr('Sổ tay')}
              </Button>
            )}
            {onSaveSrs && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Repeat}
                onClick={() => onSaveSrs({
                  ...request,
                  meaning: data.translation,
                  reading: data.reading || '',
                })}
              >
                {tr('Thẻ SRS')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
