import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Lock, Mail, RefreshCw, ShieldAlert } from 'lucide-react';
import { Banner, Button, Switch, notify } from '@/components/ui';
import SrsPreferencesModal from '@/features/srs/components/SrsPreferencesModal.jsx';
import { useLocale } from '@/locales/locale.js';
import { updateNotificationSettings } from '../api/profileApi.js';
import { NOTIFICATION_CATEGORIES_BY_ROLE } from '../profileConstants.js';

function clonePrefs(profile, categoriesMeta) {
  const categories = {};
  for (const cat of categoriesMeta) {
    categories[cat.key] = profile?.notificationCategories?.[cat.key] !== false;
  }
  categories.securityAlerts = true;
  return {
    emailNotificationsEnabled: Boolean(profile?.emailNotificationsEnabled),
    systemNotificationsEnabled: Boolean(profile?.systemNotificationsEnabled),
    notificationCategories: categories,
  };
}

export default function NotificationPreferencesSection({ profile, role, onProfileUpdated }) {
  const { tr } = useLocale();
  const categoriesMeta = NOTIFICATION_CATEGORIES_BY_ROLE[role] || NOTIFICATION_CATEGORIES_BY_ROLE.Learner;

  const [prefs, setPrefs] = useState(() => clonePrefs(profile, categoriesMeta));
  const [failedPayload, setFailedPayload] = useState(null);
  const [srsPrefsOpen, setSrsPrefsOpen] = useState(false);

  const [lastSource, setLastSource] = useState({ profile, categoriesMeta });
  if (profile !== lastSource.profile || categoriesMeta !== lastSource.categoriesMeta) {
    setLastSource({ profile, categoriesMeta });
    if (profile && !failedPayload) {
      setPrefs(clonePrefs(profile, categoriesMeta));
    }
  }

  const mutation = useMutation({
    mutationFn: ({ nextPrefs }) => updateNotificationSettings(nextPrefs),
    onSuccess: (updated, { actionLabel }) => {
      setFailedPayload(null);
      if (updated) {
        setPrefs(clonePrefs(updated, categoriesMeta));
      }
      onProfileUpdated?.(updated);
      notify.success(tr('Đã lưu tùy chọn thông báo.'), actionLabel || '', { key: 'profile-notif-ok' });
    },
    onError: (err, variables) => {
      // Revert optimistic UI state if backend rejects or fails
      setPrefs(clonePrefs(profile, categoriesMeta));
      setFailedPayload(variables);
      notify.apiError(err, tr('Chưa lưu được tùy chọn thông báo'), { key: 'profile-notif-err' });
    },
  });

  function commitUpdate(nextPrefs, actionLabel = '') {
    setPrefs(nextPrefs);
    setFailedPayload(null);
    mutation.mutate({ nextPrefs, actionLabel });
  }

  function handleMasterToggle(field, title, value) {
    const label = `${value ? tr('Đã bật') : tr('Đã tắt')}: ${tr(title)}`;
    commitUpdate({
      ...prefs,
      [field]: value,
    }, label);
  }

  function handleCategoryToggle(key, title, value) {
    const label = `${value ? tr('Đã bật') : tr('Đã tắt')}: ${tr(title)}`;
    commitUpdate({
      ...prefs,
      notificationCategories: {
        ...prefs.notificationCategories,
        [key]: value,
      },
    }, label);
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#EAE3E4] pb-4">
        <h3 className="text-[17px] font-semibold text-rp-text">{tr('Cài đặt thông báo')}</h3>
        <p className="mt-1 text-[12.5px] leading-5 text-rp-text-muted">
          {tr('Các tùy chọn này được lưu trực tiếp lên hệ thống và áp dụng cho mọi thông báo của tài khoản.')}
        </p>
      </div>

      {failedPayload && (
        <Banner tone="danger" title={tr('Chưa đồng bộ được thay đổi vừa rồi')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{tr('Đã khôi phục về trạng thái trước đó. Bạn có thể thử lưu lại ngay.')}</span>
            <button
              type="button"
              onClick={() => commitUpdate(failedPayload.nextPrefs ?? failedPayload, failedPayload.actionLabel || '')}
              className="rp-focus inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[12px] font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {tr('Thử lại')}
            </button>
          </div>
        </Banner>
      )}

      {/* Delivery Channels */}
      <section aria-label={tr('Kênh nhận thông báo')} className="rounded-xl border border-[#EAE3E4] bg-white">
        <div className="border-b border-[#EAE3E4] bg-[#FAF7F8] px-4 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
            {tr('Kênh nhận thông báo')}
          </p>
        </div>

        <div className="divide-y divide-[#EAE3E4] px-4">
          <div className="flex min-h-[68px] items-center justify-between gap-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-rp-brand-strong">
                <Mail aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13.5px] font-semibold leading-5 text-rp-text">{tr('Thông báo qua email')}</p>
                <p className="text-xs leading-[18px] text-rp-text-muted">
                  {tr('Nhận cập nhật quan trọng về lịch trình và hoạt động qua email tài khoản.')}
                </p>
              </div>
            </div>
            <Switch
              aria-label={tr('Thông báo qua email')}
              checked={prefs.emailNotificationsEnabled}
              disabled={!profile || mutation.isPending}
              onChange={(e) => handleMasterToggle('emailNotificationsEnabled', 'Thông báo qua email', e.target.checked)}
            />
          </div>

          <div className="flex min-h-[68px] items-center justify-between gap-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-rp-brand-strong">
                <Bell aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13.5px] font-semibold leading-5 text-rp-text">{tr('Thông báo trong ứng dụng')}</p>
                <p className="text-xs leading-[18px] text-rp-text-muted">
                  {tr('Hiển thị thông báo tức thời trong trung tâm thông báo và trên thiết bị.')}
                </p>
              </div>
            </div>
            <Switch
              aria-label={tr('Thông báo trong ứng dụng')}
              checked={prefs.systemNotificationsEnabled}
              disabled={!profile || mutation.isPending}
              onChange={(e) => handleMasterToggle('systemNotificationsEnabled', 'Thông báo trong ứng dụng', e.target.checked)}
            />
          </div>
        </div>
      </section>

      {/* Role-specific Notification Categories */}
      <section aria-label={tr('Danh mục theo vai trò')} className="rounded-xl border border-[#EAE3E4] bg-white">
        <div className="border-b border-[#EAE3E4] bg-[#FAF7F8] px-4 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">
            {tr('Phân loại thông báo theo vai trò')}
          </p>
        </div>

        <div className="divide-y divide-[#EAE3E4] px-4">
          {categoriesMeta.map((cat) => (
            <div key={cat.key} className="flex min-h-[68px] items-center justify-between gap-4 py-3.5">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13.5px] font-semibold leading-5 text-rp-text">{tr(cat.title)}</p>
                <p className="text-xs leading-[18px] text-rp-text-muted">{tr(cat.description)}</p>
              </div>
              <Switch
                aria-label={tr(cat.title)}
                checked={prefs.notificationCategories[cat.key]}
                disabled={!profile || mutation.isPending}
                onChange={(e) => handleCategoryToggle(cat.key, cat.title, e.target.checked)}
              />
            </div>
          ))}

          {/* Mandatory Security Alerts row */}
          <div className="flex min-h-[68px] items-center justify-between gap-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-brand-strong" />
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-semibold leading-5 text-rp-text">{tr('Cảnh báo bảo mật & thay đổi tài khoản')}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF7F8] px-2 py-0.5 text-[10.5px] font-semibold text-rp-text-muted ring-1 ring-[#EAE3E4]">
                    <Lock aria-hidden="true" className="h-3 w-3" />
                    {tr('Bắt buộc')}
                  </span>
                </div>
                <p className="text-xs leading-[18px] text-rp-text-muted">
                  {tr('Luôn bật cho thay đổi mật khẩu, xác thực email hoặc biến động an toàn tài khoản.')}
                </p>
              </div>
            </div>
            <Switch
              aria-label={tr('Cảnh báo bảo mật & thay đổi tài khoản')}
              checked
              disabled
              onChange={() => {}}
            />
          </div>
        </div>
      </section>

      {(!role || role === 'Learner') && (
        <section aria-label={tr('Nhắc ôn tập SRS hàng ngày')} className="rounded-xl border border-[#EAE3E4] bg-[#FFFCF8] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-rp-navy">{tr('Lịch nhắc ôn tập SRS thông minh')}</p>
            <p className="mt-0.5 text-[12px] leading-5 text-rp-text-muted">
              {tr('Cài đặt khung giờ nhắc ôn thẻ đến hạn, tần suất theo ngày và nhận email nhắc SRS.')}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setSrsPrefsOpen(true)}>
            {tr('Cài đặt nhắc SRS')}
          </Button>
          <SrsPreferencesModal open={srsPrefsOpen} onClose={() => setSrsPrefsOpen(false)} />
        </section>
      )}
    </div>
  );
}
