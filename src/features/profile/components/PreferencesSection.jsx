import { useMutation } from '@tanstack/react-query';
import { Clock3, Globe } from 'lucide-react';
import { cx, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import viFlag from '@/assets/flags/vi.svg';
import jaFlag from '@/assets/flags/ja.svg';
import { updateProfile } from '../api/profileApi.js';
import { STUDY_TIME_PREFERENCES } from '../profileConstants.js';

const LANGUAGE_CHOICES = [
  { id: 'vi', label: 'Tiếng Việt', native: 'Vietnamese · VI', flag: viFlag },
  { id: 'ja', label: '日本語', native: 'Tiếng Nhật · JA', flag: jaFlag },
];

export default function PreferencesSection({ profile, role, onProfileUpdated }) {
  const { locale, setLocale, tr } = useLocale();
  const selectedStudyTime = profile?.studyTimePreference || 'evening';

  const studyTimeMutation = useMutation({
    mutationFn: (preferenceId) => updateProfile({
      fullName: profile?.fullName || profile?.email || 'User',
      studyTimePreference: preferenceId,
    }),
    onSuccess: (updated) => {
      onProfileUpdated?.(updated);
      notify.success(tr('Đã cập nhật khung giờ học ưu tiên.'), '', { key: 'pref-study-time-ok' });
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa lưu được khung giờ học'), { key: 'pref-study-time-err' });
    },
  });

  function chooseLanguage(nextLocale) {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    notify.success(
      nextLocale === 'ja' ? '日本語に切り替えました。' : 'Đã chuyển sang Tiếng Việt.',
      '',
      { key: 'pref-locale-switch' },
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#EAE3E4] pb-4">
        <h3 className="text-[17px] font-semibold text-rp-text">{tr('Ngôn ngữ & tùy chọn hiển thị')}</h3>
        <p className="mt-1 text-[12.5px] leading-5 text-rp-text-muted">
          {tr('Tùy chỉnh ngôn ngữ hiển thị và thói quen sử dụng của bạn trên RikiPath.')}
        </p>
      </div>

      {/* Language selector */}
      <section aria-label={tr('Ngôn ngữ giao diện')} className="rounded-xl border border-[#EAE3E4] bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-rp-brand-strong">
            <Globe aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-[14.5px] font-semibold text-rp-text">{tr('Ngôn ngữ giao diện')}</h4>
            <p className="mt-0.5 text-[12px] text-rp-text-muted">
              {tr('Áp dụng ngay trên toàn bộ thanh điều hướng, bảng biểu và thông báo.')}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LANGUAGE_CHOICES.map((opt) => {
            const active = locale === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseLanguage(opt.id)}
                className={cx(
                  'rp-focus flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  active
                    ? 'border-[#E7B6C7] bg-[#FFF0F4] text-rp-brand-strong'
                    : 'border-[#EAE3E4] bg-white text-rp-text-2 hover:bg-[#FFF9FA]',
                )}
              >
                <span className="relative inline-flex h-5 w-7 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/15">
                  <img src={opt.flag} alt="" className="h-full w-full object-cover" draggable={false} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{opt.label}</span>
                  <span className="block text-[11.5px] text-rp-text-muted">{tr(opt.native)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Learner-only Study Time Preference */}
      {role === 'Learner' && (
        <section aria-label={tr('Khung giờ học ưu tiên')} className="rounded-xl border border-[#EAE3E4] bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-rp-brand-strong">
              <Clock3 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-[14.5px] font-semibold text-rp-text">{tr('Khung giờ học ưu tiên')}</h4>
              <p className="mt-0.5 text-[12px] text-rp-text-muted">
                {tr('Lưu trực tiếp vào hồ sơ để tối ưu gợi ý phiên ôn tập trong ngày.')}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {STUDY_TIME_PREFERENCES.map((slot) => {
              const active = selectedStudyTime === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!profile || studyTimeMutation.isPending}
                  aria-pressed={active}
                  onClick={() => studyTimeMutation.mutate(slot.id)}
                  className={cx(
                    'rp-focus rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:opacity-50',
                    active
                      ? 'border-[#E7B6C7] bg-[#FFF0F4] text-rp-brand-strong'
                      : 'border-[#EAE3E4] bg-white text-rp-text-2 hover:bg-[#FFF9FA]',
                  )}
                >
                  <span className="block text-[13px] font-semibold">{tr(slot.label)}</span>
                  <span className="mt-0.5 block text-[11.5px] text-rp-text-muted">{slot.hint}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
