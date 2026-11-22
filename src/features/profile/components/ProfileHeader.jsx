import { Camera, CheckCircle2, Flame, Globe, KeyRound, MailWarning, PencilLine, ShieldAlert, Target } from 'lucide-react';
import { Avatar, Button, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { ROLE_META } from '../profileConstants.js';

export default function ProfileHeader({
  profile,
  role,
  isEditing,
  onOpenAvatarModal,
  onStartEdit,
  onJumpToSecurity,
}) {
  const { tr } = useLocale();
  const roleInfo = ROLE_META[role] || ROLE_META.Learner;
  const fullName = profile?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || profile?.email || tr('Tài khoản');
  const isVerified = profile?.isEmailVerified !== false;
  const hasPassword = profile?.hasPassword !== false;

  return (
    <section
      aria-label={tr('Tóm tắt tài khoản')}
      className="relative overflow-hidden rounded-2xl border border-[#EAE3E4] bg-white px-5 py-5 shadow-rp-xs sm:px-6"
    >
      {/* Subtle Sakura corner motif (soft surface harmony, no heavy banner) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 180 120"
        className="pointer-events-none absolute -right-4 -top-4 h-28 w-40 opacity-35"
      >
        <circle cx="136" cy="36" r="34" fill="#FFF0F4" />
        <circle cx="102" cy="22" r="14" fill="#FADCE5" opacity="0.55" />
        <circle cx="156" cy="76" r="12" fill="#FADCE5" opacity="0.45" />
      </svg>

      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onOpenAvatarModal}
              aria-label={tr('Thay đổi ảnh đại diện')}
              className="rp-focus group relative block rounded-full"
            >
              <Avatar
                src={profile?.avatarUrl}
                name={fullName}
                size={72}
                className="ring-2 ring-[#F1E6E9] transition-transform duration-150 group-hover:scale-[1.02]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Camera className="h-5 w-5 text-white" />
              </span>
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FAF7F8] text-rp-brand-strong shadow-rp-xs transition-colors group-hover:bg-[#FFF0F4]"
              >
                <Camera className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[20px] font-semibold tracking-tight text-rp-text">
                {fullName}
              </h2>
              <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', roleInfo.badgeClass)}>
                {tr(roleInfo.label)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-rp-text-muted">
              <span className="truncate">{profile?.email || tr('Chưa có email')}</span>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rp-success-bg px-2 py-0.5 text-[11px] font-medium text-rp-success">
                  <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                  {tr('Email đã xác thực')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rp-warning-bg px-2 py-0.5 text-[11px] font-medium text-rp-warning">
                  <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
                  {tr('Chưa xác thực email')}
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1 rounded-md border border-[#EAE3E4] bg-[#FAF7F8] px-2 py-0.5 text-rp-text-2">
                <KeyRound aria-hidden="true" className="h-3 w-3 text-rp-text-muted" />
                {hasPassword ? tr('Mật khẩu nội bộ') : tr('Chưa đặt mật khẩu')}
              </span>
              {profile?.googleLinked && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#EAE3E4] bg-[#FAF7F8] px-2 py-0.5 text-rp-text-2">
                  <Globe aria-hidden="true" className="h-3 w-3 text-rp-brand-strong" />
                  Google
                </span>
              )}
              {role === 'Learner' && profile?.targetJlptLevelName && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#F2D5DF] bg-[#FFF0F4] px-2 py-0.5 font-medium text-rp-brand-strong">
                  <Target aria-hidden="true" className="h-3 w-3" />
                  {tr('Mục tiêu')}: {profile.targetJlptLevelName}
                </span>
              )}
              {role === 'Learner' && typeof profile?.currentStreak === 'number' && profile.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#F2E3C9] bg-[#FFF9ED] px-2 py-0.5 font-medium text-[#9B6215]">
                  <Flame aria-hidden="true" className="h-3 w-3" />
                  {profile.currentStreak} {tr('ngày liên tiếp')}
                </span>
              )}
            </div>

            {profile?.pendingEmail && (
              <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-[12px] text-amber-800">
                <MailWarning aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {tr('Đang chờ xác thực email mới')}: <strong>{profile.pendingEmail}</strong>
                </span>
                <button
                  type="button"
                  onClick={onJumpToSecurity}
                  className="rp-focus rounded px-1.5 py-0.5 text-[11.5px] font-semibold text-amber-900 underline-offset-2 hover:bg-amber-100"
                >
                  {tr('Nhập mã OTP')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant={isEditing ? 'secondary' : 'primary'}
            size="sm"
            icon={PencilLine}
            onClick={onStartEdit}
          >
            {isEditing ? tr('Đang chỉnh sửa') : tr('Chỉnh sửa hồ sơ')}
          </Button>
        </div>
      </div>
    </section>
  );
}
