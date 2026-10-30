import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getSession } from '../../auth/session.js';
import {
  displayName,
  useLearnerProfile,
} from '../../hooks/useLearnerHome.js';

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

function Icon({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </span>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <dt className="mb-2 text-[12px] text-[#967F8A]">
        {label}
      </dt>
      <dd
        className="min-h-10 break-words rounded-lg
                   border border-[#EDE2E7] bg-[#FCFAFB]
                   px-3 py-2.5 text-[13px] text-[#62515A]"
      >
        {value || 'Chưa có thông tin'}
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
        'focus-visible:ring-2 focus-visible:ring-[#AD3155]/25',
        'focus-visible:ring-offset-2',
        primary
          ? 'bg-[#AD3155] text-white hover:bg-[#982B4B]'
          : 'border border-[#E7D7DF] bg-white text-[#9C5671] hover:bg-[#FFF3F7]',
      ].join(' ')}
    >
      {children}
      <Icon name="arrow_forward" className="text-[16px]" />
    </Link>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="text-[17px] font-semibold text-[#49353F]">
        {title}
      </h2>
      <p className="mt-1 text-[12px] leading-5 text-[#A08A95]">
        {description}
      </p>
    </div>
  );
}

export default function LearnerSettings() {
  const { pathname } = useLocation();
  const { tr } = useLocale();
  const session = getSession();
  const profileQuery = useLearnerProfile();

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
    <LearnerShell pathname={pathname} breadcrumb="Cài đặt">
      <main
        data-page="LearnerSettings"
        className="mx-auto max-w-[1120px] px-5 py-6
                   text-[#49353F] lg:px-7"
      >
        <header className="mb-5">
          <h1
            className="text-[25px] font-semibold
                       leading-tight tracking-tight"
          >
            {tr('Hồ sơ & cài đặt')}
          </h1>
          <p className="mt-1 text-[13px] text-[#967F8A]">
            {tr('Quản lý tài khoản và mục tiêu ôn luyện của bạn.')}
          </p>
        </header>

        {/* Tóm tắt tài khoản */}
        <section
          aria-label="Tóm tắt tài khoản"
          className="mb-5 flex flex-wrap items-center
                     justify-between gap-5 rounded-2xl
                     border border-[#EEDCE5] bg-[#FFF5F8]
                     px-5 py-5"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center
                         justify-center rounded-2xl
                         bg-[#F4D8E4] text-[22px]
                         font-medium text-[#A84466]"
            >
              {initial}
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-[19px] font-semibold">
                {name}
              </h2>

              <p className="mt-1 break-all text-[12px] text-[#A0808E]">
                {email || 'Chưa có email'}
              </p>

              {verification !== null && (
                <span
                  className="mt-2 inline-flex items-center gap-1
                             text-[11px] text-[#967580]"
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
              <p className="text-[11px] text-[#A0808E]">
                {tr('Mục tiêu JLPT')}
              </p>
              <p className="mt-1 text-[15px] font-medium text-[#A84466]">
                {level || tr('Chưa chọn')}
              </p>
            </div>

            <div className="h-8 w-px bg-[#EDD6E1]" />

            <div>
              <p className="text-[11px] text-[#A0808E]">
                {tr('Mỗi ngày')}
              </p>
              <p className="mt-1 text-[15px] font-medium text-[#A84466]">
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
                       bg-[#FFF0F3] px-4 py-3
                       text-[12px] text-[#A15A70]"
          >
            <span>
              Chưa tải được hồ sơ đầy đủ. Thông tin bên dưới
              có thể chưa cập nhật.
            </span>
            <button
              type="button"
              onClick={() => profileQuery.refetch()}
              disabled={profileQuery.isFetching}
              className="font-medium underline disabled:opacity-50"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Menu cài đặt */}
          <nav
            aria-label="Nhóm cài đặt"
            className="rounded-xl border border-[#EADFE5]
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
                      'focus-visible:ring-[#AD3155]/25',
                      active
                        ? 'bg-[#FCEAF1] font-medium text-[#A84466]'
                        : 'text-[#967F8A] hover:bg-[#FFF7FA]',
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
                       border-[#EADFE5] bg-white p-5 sm:p-6"
          >
            {activeTab === 'profile' && (
              <>
                <SectionHeading
                  title={tr('Thông tin tài khoản')}
                  description={tr('Thông tin hiện có trên tài khoản RikiPath.')}
                />

                {profileQuery.isPending && (
                  <p
                    role="status"
                    className="mb-4 text-[12px] text-[#A08A95]"
                  >
                    {tr('Đang tải hồ sơ…')}
                  </p>
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

                <div
                  className="mt-5 flex flex-wrap items-center
                             justify-between gap-3
                             border-t border-[#F0E7EC] pt-4"
                >
                  <p className="text-[12px] text-[#A08A95]">
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
                    className="rounded-xl border border-[#EFE0E7]
                               bg-[#FFFAFC] p-4"
                  >
                    <Icon
                      name="flag"
                      className="text-[23px] text-[#BA859B]"
                    />
                    <p className="mt-3 text-[12px] text-[#A08A95]">
                      {tr('Cấp độ mục tiêu')}
                    </p>
                    <p className="mt-1 text-[24px] font-semibold text-[#A84466]">
                      {level ? `JLPT ${level}` : tr('Chưa chọn')}
                    </p>
                  </div>

                  <div
                    className="rounded-xl border border-[#EFE0E7]
                               bg-[#FFFAFC] p-4"
                  >
                    <Icon
                      name="schedule"
                      className="text-[23px] text-[#BA859B]"
                    />
                    <p className="mt-3 text-[12px] text-[#A08A95]">
                      {tr('Thời gian mỗi ngày')}
                    </p>
                    <p className="mt-1 text-[24px] font-semibold text-[#A84466]">
                      {minutes || '—'}
                      {minutes && (
                        <span className="ml-1 text-[13px] font-normal">
                          {tr('phút')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end border-t border-[#F0E7EC] pt-4">
                  <ActionLink to="/onboarding" primary>
                    {level ? 'Đổi mục tiêu' : 'Chọn mục tiêu'}
                  </ActionLink>
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <SectionHeading
                  title={tr('Email & mật khẩu')}
                  description={tr('Quản lý thông tin đăng nhập tài khoản.')}
                />

                <div className="divide-y divide-[#F0E7EC]">
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-medium">
                        {tr('Email đăng nhập')}
                      </h3>
                      <p className="mt-1 break-all text-[12px] text-[#A08A95]">
                        {email || 'Chưa có email'}
                      </p>
                    </div>
                    <ActionLink to="/update-email">
                      {tr('Đổi email')}
                    </ActionLink>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <h3 className="text-[13px] font-medium">
                        Mật khẩu
                      </h3>
                      <p className="mt-1 text-[12px] text-[#A08A95]">
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
                             rounded-lg bg-[#FAF5F7] p-3
                             text-[12px] leading-5 text-[#A0808E]"
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

                <div className="divide-y divide-[#F0E7EC]">
                  {[
                    {
                      icon: 'history',
                      title: tr('Nhắc ôn tập đến hạn'),
                      description: tr('Nhắc ôn từ vựng và Hán tự đã lưu.'),
                    },
                    {
                      icon: 'event',
                      title: tr('Nhắc lịch tư vấn'),
                      description: tr('Thông báo trước buổi tư vấn với Mentor.'),
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 py-4"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0
                                   items-center justify-center
                                   rounded-lg bg-[#FBEEF4]
                                   text-[#B77E95]"
                      >
                        <Icon name={item.icon} className="text-[20px]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] font-medium">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-[12px] leading-5 text-[#A08A95]">
                          {item.description}
                        </p>
                      </div>

                      <span
                        className="shrink-0 rounded-md
                                   bg-[#F6F1F4] px-2 py-1
                                   text-[10px] text-[#A08A95]"
                      >
                        {tr('Chưa kết nối')}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-[12px] leading-5 text-[#A08A95]">
                  {tr('Tùy chọn thông báo cần được kết nối với hệ thống trước khi có thể bật hoặc tắt.')}
                </p>
              </>
            )}
          </section>
        </div>
      </main>
    </LearnerShell>
  );
}
