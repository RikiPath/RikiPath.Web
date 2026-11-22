import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import { setStudyLevel, updateAvatar, updateNotificationSettings, updateProfile } from '@/features/profile/api/profileApi.js';
import {
  displayName,
  learnerKeys,
  useLearnerProfile,
} from '@/features/dashboard/hooks/useLearnerHome.js';
import Icon from '@/components/ui/Icon.jsx';
import { SakuraLoader } from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';

const TABS = [
  {
    id: 'profile',
    label: 'Thông tin tài khoản',
    icon: 'person',
  },
  {
    id: 'goal',
    label: 'Mục tiêu ôn luyện',
    icon: 'flag',
  },
  {
    id: 'security',
    label: 'Email & mật khẩu',
    icon: 'lock',
  },
  {
    id: 'notifications',
    label: 'Thông báo',
    icon: 'notifications',
  },
];

const LEVEL_BY_ID = {
  1: 'N5',
  2: 'N4',
  3: 'N3',
  4: 'N2',
};


function InfoField({ label, value }) {
  const { tr } = useLocale();
  return (
    <div>
      <dt className="mb-2 text-[12px] text-rp-text-muted">
        {tr(label)}
      </dt>
      <dd
        className="min-h-10 break-words rounded-lg
                   border border-rp-line bg-rp-bg-2
                   px-3 py-2.5 text-[13px] text-rp-text-2"
      >
        {value || tr('Chưa có thông tin')}
      </dd>
    </div>
  );
}

function ActionLink({ to, children, primary = false }) {
  return (
    <Link
      to={to}
      className={[
        'inline-flex min-h-9 items-center justify-center gap-2',
        'rounded-lg px-3.5 py-2 text-[12px] font-medium',
        'transition-colors focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-rp-brand-strong/25',
        'focus-visible:ring-offset-2',
        primary
          ? 'bg-rp-brand-strong text-white hover:bg-rp-brand-deep'
          : 'border border-rp-line bg-white text-rp-brand-strong hover:bg-rp-brand-tint',
      ].join(' ')}
    >
      {children}
      <Icon name="arrow_forward" className="text-[16px]" />
    </Link>
  );
}

function SectionHeading({ title, description }) {
  const { tr } = useLocale();
  return (
    <div className="mb-5">
      <h2 className="text-[17px] font-semibold text-rp-text">
        {tr(title)}
      </h2>
      <p className="mt-1 text-[12px] leading-5 text-rp-text-muted">
        {tr(description)}
      </p>
    </div>
  );
}

export default function LearnerSettings() {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const session = getSession();
  const profileQuery = useLearnerProfile();
  const queryClient = useQueryClient();
  const notifMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      notify.success(tr('Đã lưu cài đặt thông báo.'), '', { key: 'settings-notif' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được cài đặt thông báo'), { key: 'settings-notif-err' }),
  });
  const saveProfile = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      notify.success(tr('Đã lưu thông tin hồ sơ.'), '', { key: 'settings-profile' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa lưu được hồ sơ'), { key: 'settings-profile-err' }),
  });
  const saveAvatar = useMutation({
    mutationFn: updateAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      notify.success(tr('Đã cập nhật ảnh đại diện.'), '', { key: 'settings-avatar' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa cập nhật được ảnh đại diện'), { key: 'settings-avatar-err' }),
  });
  const saveLevel = useMutation({
    mutationFn: setStudyLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      notify.success(tr('Đã cập nhật trình độ học.'), '', { key: 'settings-level' });
    },
    onError: (err) => notify.apiError(err, tr('Chưa cập nhật được trình độ học'), { key: 'settings-level-err' }),
  });
  const [studyLevelId, setStudyLevelId] = useState(3);
  const serverStudyLevelId = profileQuery.data?.currentStudyLevelId;
  const [syncedStudyLevelId, setSyncedStudyLevelId] = useState(null);
  if (serverStudyLevelId && serverStudyLevelId !== syncedStudyLevelId) {
    setSyncedStudyLevelId(serverStudyLevelId);
    setStudyLevelId(serverStudyLevelId);
  }

  const [activeTab, setActiveTab] = useState('profile');

  const profile = profileQuery.data;
  const name = displayName(profile, session) || tr('Người dùng');
  const email = profile?.email || session?.email || '';
  const phone = profile?.phoneNumber || profile?.phone || '';
  const initial = name.trim().charAt(0).toUpperCase() || 'R';

  const rawLevel =
    profile?.targetJlptLevel?.name ||
    profile?.targetJlptLevelName ||
    LEVEL_BY_ID[profile?.targetJlptLevelId];

  const level = ['N5', 'N4', 'N3', 'N2'].includes(rawLevel)
    ? rawLevel
    : null;

  const minutes =
    typeof profile?.dailyStudyMinutes === 'number' &&
    profile.dailyStudyMinutes > 0
      ? profile.dailyStudyMinutes
      : null;

  const verification =
    typeof profile?.isEmailVerified === 'boolean'
      ? profile.isEmailVerified
      : typeof session?.isEmailVerified === 'boolean'
        ? session.isEmailVerified
        : null;

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Cài đặt')}>
      <main
        data-page="LearnerSettings"
        className="rp-container py-6 text-rp-text lg:py-8"
      >
        <header className="mb-5">
          <h1
            className="text-[25px] font-semibold
                       leading-tight tracking-tight"
          >
            {tr('Hồ sơ & cài đặt')}
          </h1>
          <p className="mt-1 text-[13px] text-rp-text-muted">
            {tr('Quản lý tài khoản và mục tiêu ôn luyện của bạn.')}
          </p>
        </header>

        {/* Tóm tắt tài khoản */}
        <section
          aria-label={tr('Tóm tắt tài khoản')}
          className="mb-5 flex flex-wrap items-center
                     justify-between gap-5 rounded-2xl
                     border border-rp-line bg-rp-brand-tint
                     px-5 py-5"
        >
          <div className="flex min-w-0 items-center gap-4">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center
                           justify-center rounded-2xl
                           bg-rp-brand-soft text-[22px]
                           font-medium text-rp-brand-strong"
              >
                {initial}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="break-words text-[19px] font-semibold">
                {name}
              </h2>

              <p className="mt-1 break-all text-[12px] text-rp-text-muted">
                {email || tr('Chưa có email')}
              </p>

              {verification !== null && (
                <span
                  className="mt-2 inline-flex items-center gap-1
                             text-[11px] text-rp-text-muted"
                >
                  <Icon
                    name={
                      verification
                        ? 'verified'
                        : 'info'
                    }
                    className="text-[14px]"
                  />
                  {verification
                    ? tr('Email đã xác thực')
                    : tr('Email chưa xác thực')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div>
              <p className="text-[11px] text-rp-text-muted">
                {tr('Mục tiêu JLPT')}
              </p>
              <p className="mt-1 text-[15px] font-medium text-rp-brand-strong">
                {level || tr('Chưa chọn')}
              </p>
            </div>

            <div className="h-8 w-px bg-[#EDD6E1]" />

            <div>
              <p className="text-[11px] text-rp-text-muted">
                {tr('Mỗi ngày')}
              </p>
              <p className="mt-1 text-[15px] font-medium text-rp-brand-strong">
                {minutes ? `${minutes} ${tr('phút')}` : tr('Chưa đặt')}
              </p>
            </div>
          </div>
        </section>

        {profileQuery.isError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center
                       justify-between gap-2 rounded-lg
                       bg-rp-brand-tint px-4 py-3
                       text-[12px] text-rp-brand-strong"
          >
            <span>
              {tr('Chưa tải được hồ sơ đầy đủ. Thông tin bên dưới có thể chưa cập nhật.')}
            </span>
            <button
              type="button"
              onClick={() => profileQuery.refetch()}
              disabled={profileQuery.isFetching}
              className="font-medium underline disabled:opacity-50"
            >
              {tr('Thử lại')}
            </button>
          </div>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Menu cài đặt */}
          <nav
            aria-label={tr('Nhóm cài đặt')}
            className="rounded-xl border border-rp-line
                       bg-white p-2"
          >
            <div className="flex gap-1 overflow-x-auto lg:flex-col">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    aria-controls="settings-content"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      'flex min-h-10 shrink-0 items-center gap-2.5',
                      'rounded-lg px-3 text-left text-[12px]',
                      'transition-colors focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-rp-brand-strong/25',
                      active
                        ? 'bg-rp-brand-soft font-medium text-rp-brand-strong'
                        : 'text-rp-text-muted hover:bg-rp-brand-tint',
                    ].join(' ')}
                  >
                    <Icon name={tab.icon} className="text-[19px]" />
                    {tr(tab.label)}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Nội dung */}
          <section
            id="settings-content"
            aria-label={
              TABS.find((tab) => tab.id === activeTab)?.label
            }
            className="min-w-0 rounded-xl border
                       border-rp-line bg-white p-5 sm:p-6"
          >
            {activeTab === 'profile' && (
              <>
                <SectionHeading
                  title={tr('Thông tin tài khoản')}
                  description={tr('Thông tin hiện có trên tài khoản RikiPath.')}
                />

                {profileQuery.isPending && (
                  <SakuraLoader
                    variant="section"
                    context="profile"
                    delay={160}
                    className="mb-4"
                  />
                )}

                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoField label={tr('Tên hiển thị')} value={name} />
                  <InfoField label="Email" value={email} />
                  <InfoField label={tr('Số điện thoại')} value={phone} />
                  <InfoField
                    label={tr('Nội dung ôn luyện')}
                    value={tr('Tiếng Nhật · JLPT N5–N2')}
                  />
                </dl>

                <form
                  key={`${profile?.userId ?? 'anon'}-${profile?.fullName ?? `${profile?.firstName ?? ''}-${profile?.lastName ?? ''}`}`}
                  className="mt-5 grid gap-3 border-t border-rp-line pt-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    saveProfile.mutate({
                      fullName: String(data.get('fullName') || '').trim(),
                    });
                  }}
                >
                  <label className="sm:col-span-2 text-[12px] text-rp-text-muted">
                    {tr('Họ và tên')}
                    <input
                      name="fullName"
                      required
                      autoComplete="name"
                      defaultValue={profile?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || ''}
                      className="mt-1 h-10 w-full rounded-lg border border-rp-line px-3 text-[13px] text-rp-text outline-none focus:border-rp-brand-strong"
                    />
                  </label>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={saveProfile.isPending} className="h-9 rounded-lg bg-rp-brand-strong px-3 text-[12px] font-medium text-white disabled:opacity-50 rp-press">
                      {saveProfile.isPending ? tr('Đang lưu…') : tr('Lưu tên')}
                    </button>
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-rp-line px-3 text-[12px] text-rp-brand-strong">
                      {saveAvatar.isPending ? tr('Đang tải ảnh…') : tr('Đổi ảnh')}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) saveAvatar.mutate(file);
                        }}
                      />
                    </label>
                    {(saveProfile.isError || saveAvatar.isError) && (
                      <p className="text-[12px] text-rp-brand-strong">{tr((saveProfile.error || saveAvatar.error).message)}</p>
                    )}
                  </div>
                </form>

                <div
                  className="mt-5 flex flex-wrap items-center
                             justify-between gap-3
                             border-t border-rp-line pt-4"
                >
                  <p className="text-[12px] text-rp-text-muted">
                    {tr('Bạn có thể thay đổi email tại mục bảo mật.')}
                  </p>
                  <ActionLink to="/update-email">
                    {tr('Đổi email')}
                  </ActionLink>
                </div>
              </>
            )}

            {activeTab === 'goal' && (
              <>
                <SectionHeading
                  title={tr('Mục tiêu ôn luyện')}
                  description={tr('Chọn cấp độ và thời gian phù hợp với bạn.')}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div
                    className="rounded-xl border border-rp-line
                               bg-rp-brand-tint p-4"
                  >
                    <Icon
                      name="flag"
                      className="text-[23px] text-rp-brand"
                    />
                    <p className="mt-3 text-[12px] text-rp-text-muted">
                      {tr('Cấp độ mục tiêu')}
                    </p>
                    <p className="mt-1 text-[24px] font-semibold text-rp-brand-strong">
                      {level ? `JLPT ${level}` : tr('Chưa chọn')}
                    </p>
                  </div>

                  <div
                    className="rounded-xl border border-rp-line
                               bg-rp-brand-tint p-4"
                  >
                    <Icon
                      name="schedule"
                      className="text-[23px] text-rp-brand"
                    />
                    <p className="mt-3 text-[12px] text-rp-text-muted">
                      {tr('Thời gian mỗi ngày')}
                    </p>
                    <p className="mt-1 text-[24px] font-semibold text-rp-brand-strong">
                      {minutes || '—'}
                      {minutes && (
                        <span className="ml-1 text-[13px] font-normal">
                          {tr('phút')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-rp-line pt-4">
                  <p className="text-[12px] text-rp-text-muted">{tr('Cấp độ đang học trên lộ trình chuẩn')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={studyLevelId === id}
                        onClick={() => setStudyLevelId(id)}
                        className={`h-9 rounded-lg border px-3 text-[13px] ${studyLevelId === id ? 'border-rp-brand-strong bg-rp-brand-soft text-rp-brand-strong' : 'border-rp-line text-rp-text-muted'}`}
                      >
                        {LEVEL_BY_ID[id]}
                      </button>
                    ))}
                  </div>
                  {saveLevel.isError && <p className="mt-2 text-[12px] text-rp-brand-strong">{tr(saveLevel.error.message)}</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={saveLevel.isPending}
                      onClick={() => saveLevel.mutate({ currentStudyLevelId: studyLevelId })}
                      className="h-9 rounded-lg bg-rp-brand-strong px-3 text-[12px] font-medium text-white disabled:opacity-50 rp-press"
                    >
                      {saveLevel.isPending ? tr('Đang lưu…') : tr('Đặt cấp độ đang học')}
                    </button>
                    <ActionLink to="/onboarding" primary>
                      {level ? tr('Đổi mục tiêu') : tr('Chọn mục tiêu')}
                    </ActionLink>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <SectionHeading
                  title={tr('Email & mật khẩu')}
                  description={tr('Quản lý thông tin đăng nhập tài khoản.')}
                />

                <div className="divide-y divide-rp-line">
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-medium">
                        {tr('Email đăng nhập')}
                      </h3>
                      <p className="mt-1 break-all text-[12px] text-rp-text-muted">
                        {email || tr('Chưa có email')}
                      </p>
                    </div>
                    <ActionLink to="/update-email">
                      {tr('Đổi email')}
                    </ActionLink>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <h3 className="text-[13px] font-medium">
                        {tr('Mật khẩu')}
                      </h3>
                      <p className="mt-1 text-[12px] text-rp-text-muted">
                        {tr('Thay đổi mật khẩu đăng nhập.')}
                      </p>
                    </div>
                    <ActionLink to="/change-password">
                      {tr('Đổi mật khẩu')}
                    </ActionLink>
                  </div>
                </div>

                <p
                  className="mt-4 flex items-start gap-2
                             rounded-lg bg-rp-brand-tint p-3
                             text-[12px] leading-5 text-rp-text-muted"
                >
                  <Icon
                    name="lock"
                    className="mt-0.5 shrink-0 text-[16px]"
                  />
                  {tr('Không chia sẻ mật khẩu hoặc mã xác thực với người khác.')}
                </p>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <SectionHeading
                  title={tr('Thông báo')}
                  description={tr('Các hình thức nhắc ôn tập và lịch tư vấn.')}
                />

                <div className="divide-y divide-rp-line">
                  {[
                    {
                      key: 'emailNotificationsEnabled',
                      icon: 'mail',
                      title: tr('Thông báo qua email'),
                      description: tr('Gửi nhắc học và lịch lớp nhóm tới email của bạn.'),
                    },
                    {
                      key: 'systemNotificationsEnabled',
                      icon: 'notifications',
                      title: tr('Thông báo trong ứng dụng'),
                      description: tr('Hiện nhắc ôn tập và lịch lớp nhóm ngay trên RikiPath.'),
                    },
                  ].map((item) => {
                    const enabled = Boolean(profile?.[item.key]);
                    return (
                      <div key={item.key} className="flex items-start gap-3 py-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rp-brand-tint text-rp-brand-strong">
                          <Icon name={item.icon} className="text-[20px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[13px] font-medium">{tr(item.title)}</h3>
                          <p className="mt-1 text-[12px] leading-5 text-rp-text-muted">{tr(item.description)}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          disabled={!profile || notifMutation.isPending}
                          onClick={() => notifMutation.mutate({
                            emailNotificationsEnabled: item.key === 'emailNotificationsEnabled' ? !enabled : Boolean(profile.emailNotificationsEnabled),
                            systemNotificationsEnabled: item.key === 'systemNotificationsEnabled' ? !enabled : Boolean(profile.systemNotificationsEnabled),
                          })}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-rp-brand-strong' : 'bg-rp-line'}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {notifMutation.isError && <p role="alert" className="mt-3 text-[12px] text-rp-brand-strong">{tr(notifMutation.error.message)}</p>}
              </>
            )}
          </section>
        </div>
      </main>
    </LearnerShell>
  );
}
