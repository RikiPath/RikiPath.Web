import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Bell, GraduationCap, ShieldCheck, SlidersHorizontal, Target, UserRound } from 'lucide-react';
import { AdminShell, ContentAuthorShell, LearnerShell, MentorShell } from '@/layouts';
import { useAuth } from '@/app/auth/authContext.js';
import { AlertDialog, ContextualErrorState, RefreshingIndicator, SakuraLoader, cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { learnerKeys } from '@/features/dashboard/hooks/useLearnerHome.js';
import { getMyProfile } from '../api/profileApi.js';
import { PROFILE_TABS } from '../profileConstants.js';
import ProfileHeader from './ProfileHeader.jsx';
import AvatarUploaderModal from './AvatarUploaderModal.jsx';
import PersonalInformationSection from './PersonalInformationSection.jsx';
import AccountSecuritySection from './AccountSecuritySection.jsx';
import NotificationPreferencesSection from './NotificationPreferencesSection.jsx';
import PreferencesSection from './PreferencesSection.jsx';
import LearningGoalsSection from './LearningGoalsSection.jsx';
import LearnerAchievementsSection from '@/features/learning-moments/LearnerAchievementsSection.jsx';
import MentorProfile from '@/pages/mentor/MentorProfile.jsx';

const TAB_ICONS = {
  UserRound,
  GraduationCap,
  ShieldCheck,
  Bell,
  SlidersHorizontal,
  Target,
};

function RoleAccountShell({ role, breadcrumb, children }) {
  if (role === 'Admin') return <AdminShell breadcrumb={breadcrumb}>{children}</AdminShell>;
  if (role === 'ContentAuthor') return <ContentAuthorShell breadcrumb={breadcrumb}>{children}</ContentAuthorShell>;
  if (role === 'Mentor') return <MentorShell breadcrumb={breadcrumb}>{children}</MentorShell>;
  return <LearnerShell breadcrumb={breadcrumb}>{children}</LearnerShell>;
}

export default function ProfileWorkspace({ defaultTab = 'profile' }) {
  const { tr } = useLocale();
  const { primaryRole, user, syncUserProfile } = useAuth();
  const role = primaryRole || 'Learner';
  const queryClient = useQueryClient();
  const { search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const availableTabs = useMemo(
    () => PROFILE_TABS.filter((tab) => !tab.roles || tab.roles.includes(role)),
    [role],
  );

  const rawTab = searchParams.get('tab') || defaultTab;
  const activeTab = availableTabs.some((t) => t.id === rawTab) ? rawTab : availableTabs[0].id;

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState(null);

  const profileQueryKey = ['my-profile', user?.userId ?? 'self', role];
  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: getMyProfile,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const profile = profileQuery.data;

  // Keep AuthContext / Header / Dropdown synchronized whenever server profile refreshes
  useEffect(() => {
    if (!profile) return;
    const nextAvatar = profile.avatarUrl?.trim() || null;
    const prevAvatar = user?.avatarUrl?.trim() || null;
    if (
      (profile.fullName && profile.fullName !== user?.fullName) ||
      nextAvatar !== prevAvatar ||
      (profile.email && profile.email !== user?.email)
    ) {
      syncUserProfile(profile);
    }
  }, [profile, user?.fullName, user?.avatarUrl, user?.email, syncUserProfile]);

  function syncAccountCaches(updatedProfile) {
    if (updatedProfile) {
      queryClient.setQueryData(profileQueryKey, updatedProfile);
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      queryClient.invalidateQueries({ queryKey: ['my-mentor-profile'] });
      syncUserProfile(updatedProfile);
    } else {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile });
      queryClient.invalidateQueries({ queryKey: ['my-mentor-profile'] });
    }
  }

  function applyTabChange(nextTab) {
    const nextParams = new URLSearchParams(search);
    if (nextTab === 'profile') nextParams.delete('tab');
    else nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  }

  function handleTabClick(nextTab) {
    if (nextTab === activeTab) return;
    if (activeTab === 'profile' && editingProfile && profileDirty) {
      setPendingTabSwitch(nextTab);
      return;
    }
    if (activeTab === 'profile' && editingProfile) {
      setEditingProfile(false);
    }
    applyTabChange(nextTab);
  }

  function handleStartEdit() {
    if (activeTab !== 'profile') {
      applyTabChange('profile');
    }
    setEditingProfile(true);
  }

  return (
    <RoleAccountShell role={role} breadcrumb={tr('Hồ sơ & cài đặt')}>
      <div
        data-page="AccountProfile"
        className={cx('min-h-full', role === 'Admin' && 'bg-[#F8F6F4]')}
      >
        <main className="mx-auto w-full max-w-[1120px] min-w-0 space-y-5 px-[var(--rp-space-page-x)] py-5 text-rp-text lg:py-6">
          {role === 'Mentor' ? (
            <>
              <h1 className="sr-only">{tr('Hồ sơ của tôi & Cài đặt tài khoản')}</h1>
              {profileQuery.isFetching && !profileQuery.isPending && (
                <div className="flex justify-end">
                  <RefreshingIndicator active />
                </div>
              )}
            </>
          ) : (
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-rp-text">
                  {tr('Hồ sơ của tôi & Cài đặt tài khoản')}
                </h1>
                <p className="mt-1 text-[13px] text-rp-text-muted">
                  {tr('Quản lý thông tin cá nhân, bảo mật đăng nhập, thông báo và tùy chọn sử dụng trên RikiPath.')}
                </p>
              </div>
              <RefreshingIndicator active={profileQuery.isFetching && !profileQuery.isPending} />
            </header>
          )}

          {profileQuery.isPending && (
            <SakuraLoader variant="section" context="profile" delay={140} />
          )}

          {profileQuery.isError && (
            <div className="rounded-2xl border border-[#EAE3E4] bg-white p-5">
              <ContextualErrorState
                error={profileQuery.error}
                title={tr('Chưa tải được hồ sơ tài khoản')}
                onRetry={() => profileQuery.refetch()}
                retrying={profileQuery.isFetching}
              />
            </div>
          )}

          {profile && (
            <>
              <ProfileHeader
                profile={profile}
                role={role}
                isEditing={activeTab === 'profile' && editingProfile}
                onOpenAvatarModal={() => setAvatarModalOpen(true)}
                onStartEdit={handleStartEdit}
                onJumpToSecurity={() => handleTabClick('security')}
              />

              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[252px_minmax(0,1fr)] lg:gap-6">
                <nav
                  aria-label={tr('Điều hướng hồ sơ & cài đặt')}
                  className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#EAE3E4] bg-white p-2 shadow-rp-xs"
                >
                  <div className="flex gap-1 overflow-x-auto lg:flex-col">
                    {availableTabs.map((tab) => {
                      const active = activeTab === tab.id;
                      const TabIcon = TAB_ICONS[tab.icon] || UserRound;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          aria-pressed={active}
                          aria-controls="account-profile-panel"
                          onClick={() => handleTabClick(tab.id)}
                          className={cx(
                            'rp-focus flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors',
                            active
                              ? 'bg-[#FFF0F4] font-semibold text-rp-brand-strong'
                              : 'font-medium text-rp-text-2 hover:bg-[#FFF9FA] hover:text-rp-text',
                          )}
                        >
                          <TabIcon aria-hidden="true" className={cx('h-4 w-4 shrink-0', active ? 'text-rp-brand-strong' : 'text-rp-text-muted')} />
                          <span className="truncate">{tr(tab.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                </nav>

                <section
                  id="account-profile-panel"
                  aria-label={tr(availableTabs.find((t) => t.id === activeTab)?.label || 'Hồ sơ cá nhân')}
                  className="min-w-0 rounded-2xl border border-[#EAE3E4] bg-white p-5 shadow-rp-xs sm:p-6"
                >
                  {activeTab === 'profile' && (
                    <PersonalInformationSection
                      profile={profile}
                      role={role}
                      editing={editingProfile}
                      onEditingChange={setEditingProfile}
                      onDirtyChange={setProfileDirty}
                      onProfileSaved={syncAccountCaches}
                      onSwitchTab={handleTabClick}
                    />
                  )}
                  {activeTab === 'professional' && role === 'Mentor' && (
                    <MentorProfile embedded />
                  )}
                  {activeTab === 'security' && (
                    <AccountSecuritySection
                      profile={profile}
                      onProfileUpdated={() => syncAccountCaches()}
                    />
                  )}
                  {activeTab === 'notifications' && (
                    <NotificationPreferencesSection
                      profile={profile}
                      role={role}
                      onProfileUpdated={syncAccountCaches}
                    />
                  )}
                  {activeTab === 'preferences' && (
                    <PreferencesSection
                      profile={profile}
                      role={role}
                      onProfileUpdated={syncAccountCaches}
                    />
                  )}
                  {activeTab === 'goals' && role === 'Learner' && (
                    <div className="space-y-5">
                      <LearningGoalsSection
                        profile={profile}
                        onProfileUpdated={syncAccountCaches}
                      />
                      <LearnerAchievementsSection />
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      <AvatarUploaderModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        profile={profile}
        onAvatarUpdated={syncAccountCaches}
      />

      <AlertDialog
        open={Boolean(pendingTabSwitch)}
        onCancel={() => setPendingTabSwitch(null)}
        onConfirm={() => {
          const target = pendingTabSwitch;
          setPendingTabSwitch(null);
          setEditingProfile(false);
          setProfileDirty(false);
          if (target) applyTabChange(target);
        }}
        tone="warning"
        title="Rời mục Hồ sơ cá nhân?"
        description="Bạn đang có chỉnh sửa chưa lưu. Nếu chuyển tab, các thay đổi chưa lưu sẽ bị bỏ qua."
        confirmLabel="Bỏ thay đổi & chuyển"
        cancelLabel="Ở lại tiếp tục sửa"
      />
    </RoleAccountShell>
  );
}
