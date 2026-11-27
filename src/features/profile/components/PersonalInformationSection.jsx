import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BookOpenCheck, Check, PencilLine, Phone, Shield, UserCheck } from 'lucide-react';
import { AlertDialog, Button, Field, Input, notify } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { formatApprovalStatusLabel } from '@/utils/terminology.js';
import { getMyMentorProfile } from '@/features/mentor/api/mentorProfileApi.js';
import { formatJlptLevel } from '@/utils/jlptLevel.js';
import { updateProfile } from '../api/profileApi.js';
import { PHONE_REGEX, ROLE_META } from '../profileConstants.js';

function ReadOnlyField({ label, value, action }) {
  const { tr } = useLocale();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-rp-text-muted">{tr(label)}</span>
        {action}
      </div>
      <div className="flex min-h-10 items-center rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] px-3.5 py-2 text-[13.5px] text-rp-text-2">
        <span className="min-w-0 truncate">{value || tr('Chưa cập nhật')}</span>
      </div>
    </div>
  );
}

export default function PersonalInformationSection({
  profile,
  role,
  editing,
  onEditingChange,
  onDirtyChange,
  onProfileSaved,
  onSwitchTab,
}) {
  const { tr } = useLocale();
  const roleInfo = ROLE_META[role] || ROLE_META.Learner;
  const initialFullName = profile?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || '';
  const initialPhone = profile?.phoneNumber || '';

  const [fullName, setFullName] = useState(initialFullName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [errors, setErrors] = useState({});
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const [lastSource, setLastSource] = useState({ profile, editing });
  if (profile !== lastSource.profile || editing !== lastSource.editing) {
    setLastSource({ profile, editing });
    if (!editing) {
      setFullName(initialFullName);
      setPhoneNumber(initialPhone);
      setErrors({});
    }
  }

  const isDirty = editing && (
    fullName.trim() !== initialFullName ||
    phoneNumber.trim() !== initialPhone
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const mentorProfileQuery = useQuery({
    queryKey: ['my-mentor-profile', profile?.userId ?? 'self'],
    queryFn: getMyMentorProfile,
    enabled: role === 'Mentor',
    staleTime: 60 * 1000,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated, variables) => {
      onProfileSaved?.(updated);
      onEditingChange?.(false);
      setErrors({});
      const removedPhone = Boolean(initialPhone && !variables?.phoneNumber);
      notify.success(
        tr('Đã cập nhật thông tin hồ sơ.'),
        removedPhone ? tr('Số điện thoại đã được gỡ khỏi hồ sơ.') : '',
        { key: 'profile-save-ok' },
      );
    },
    onError: (err) => {
      notify.apiError(err, tr('Chưa lưu được hồ sơ cá nhân'), { key: 'profile-save-err' });
    },
  });

  function validate() {
    const next = {};
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedName) {
      next.fullName = tr('Vui lòng nhập họ và tên.');
    } else if (trimmedName.length < 2) {
      next.fullName = tr('Họ và tên phải có ít nhất 2 ký tự.');
    } else if (trimmedName.length > 100) {
      next.fullName = tr('Họ và tên tối đa 100 ký tự.');
    }

    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      next.phoneNumber = tr('Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc +84912345678).');
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      notify.warning(tr('Vui lòng kiểm tra lại thông tin vừa nhập.'), '', { key: 'profile-save-validation' });
      return false;
    }
    return true;
  }

  function handleSave(event) {
    event.preventDefault();
    if (saveMutation.isPending || !validate()) return;
    if (!isDirty) {
      onEditingChange?.(false);
      notify.info(tr('Thông tin hồ sơ không có thay đổi mới.'), '', { key: 'profile-save-noop' });
      return;
    }
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    saveMutation.mutate({
      fullName: trimmedName,
      phoneNumber: trimmedPhone || null,
      updatePhoneNumber: true,
    });
  }

  function requestCancel() {
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onEditingChange?.(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EAE3E4] pb-4">
        <div>
          <h3 className="text-[17px] font-semibold text-rp-text">{tr('Thông tin cá nhân')}</h3>
          <p className="mt-1 text-[12.5px] leading-5 text-rp-text-muted">
            {tr('Thông tin định danh thống nhất trên toàn bộ không gian làm việc RikiPath.')}
          </p>
        </div>
        {!editing && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={PencilLine}
            onClick={() => onEditingChange?.(true)}
          >
            {tr('Chỉnh sửa')}
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Họ và tên" value={initialFullName} />
          <ReadOnlyField label="Email đăng nhập" value={profile?.email} />
          <ReadOnlyField label="Số điện thoại" value={initialPhone || tr('Chưa liên kết')} />
          <ReadOnlyField label="Vai trò tài khoản" value={tr(roleInfo.label)} />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Họ và tên')} error={errors.fullName} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  maxLength={100}
                  autoComplete="name"
                  placeholder={tr('Nhập họ và tên hiển thị')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}
            </Field>

            <Field
              label={tr('Số điện thoại')}
              hint={tr('Tùy chọn. Để trống nếu muốn gỡ số điện thoại.')}
              error={errors.phoneNumber}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  icon={Phone}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  maxLength={20}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="0912345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Email đăng nhập" value={profile?.email} />
            <ReadOnlyField label="Vai trò tài khoản" value={tr(roleInfo.label)} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#EAE3E4] pt-4">
            <Button type="button" variant="secondary" size="sm" disabled={saveMutation.isPending} onClick={requestCancel}>
              {tr('Hủy thay đổi')}
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={Check} loading={saveMutation.isPending}>
              {tr('Lưu thay đổi')}
            </Button>
          </div>
        </form>
      )}

      {/* Role-specific account summary extension */}
      <div className="rounded-xl border border-[#EAE3E4] bg-[#FAF7F8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAE3E4] bg-white text-rp-brand-strong">
              {role === 'Admin' ? <Shield aria-hidden="true" className="h-4 w-4" /> : role === 'ContentAuthor' ? <BookOpenCheck aria-hidden="true" className="h-4 w-4" /> : <BadgeCheck aria-hidden="true" className="h-4 w-4" />}
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-rp-text">
                {tr(roleInfo.label)} · {tr('Phạm vi không gian')}
              </p>
              <p className="mt-0.5 text-[12px] leading-5 text-rp-text-muted">
                {tr(roleInfo.summary)}
              </p>

              {role === 'Mentor' && mentorProfileQuery.data && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#EAE3E4] bg-white px-2.5 py-0.5 font-medium text-rp-text-2">
                    <UserCheck aria-hidden="true" className="h-3.5 w-3.5 text-rp-brand-strong" />
                    {mentorProfileQuery.data.verificationStatusDescription
                      || formatApprovalStatusLabel(mentorProfileQuery.data.verificationStatus, tr)}
                  </span>
                  {mentorProfileQuery.data.jlptLevel && (
                    <span className="inline-flex items-center rounded-full border border-[#F2D5DF] bg-[#FFF0F4] px-2.5 py-0.5 font-semibold text-rp-brand-strong">
                      {formatJlptLevel(mentorProfileQuery.data.jlptLevel)}
                    </span>
                  )}
                </div>
              )}

              {role === 'Admin' && (
                <p className="mt-2 text-[11.5px] text-rp-text-muted">
                  {tr('Để đảm bảo an toàn phân quyền, quản trị viên không thể tự chỉnh sửa vai trò hoặc hạ quyền của chính mình.')}
                </p>
              )}
            </div>
          </div>

          {role === 'Learner' && (
            <Button type="button" variant="secondary" size="sm" icon={ArrowRight} onClick={() => onSwitchTab?.('goals')}>
              {tr('Xem mục tiêu học tập')}
            </Button>
          )}
          {role === 'Mentor' && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => onSwitchTab?.('professional')}
            >
              {tr('Hồ sơ chuyên môn & chứng chỉ')}
            </Button>
          )}
          {role === 'ContentAuthor' && (
            <Link
              to="/cms-studio"
              className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#EAE3E4] bg-white px-3 text-[12px] font-medium text-rp-brand-strong hover:bg-[#FFF0F4]"
            >
              {tr('Mở Studio biên soạn')}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          )}
          {role === 'Admin' && (
            <Link
              to="/admin/users"
              className="rp-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#EAE3E4] bg-white px-3 text-[12px] font-medium text-rp-brand-strong hover:bg-[#FFF0F4]"
            >
              {tr('Quản trị người dùng')}
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <AlertDialog
        open={confirmDiscardOpen}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          setFullName(initialFullName);
          setPhoneNumber(initialPhone);
          setErrors({});
          onEditingChange?.(false);
          notify.info(tr('Đã hủy các chỉnh sửa chưa lưu.'), '', { key: 'profile-discard-info' });
        }}
        tone="warning"
        title="Hủy các thay đổi chưa lưu?"
        description="Các chỉnh sửa họ tên hoặc số điện thoại hiện tại sẽ không được lưu lại."
        confirmLabel="Hủy thay đổi"
        cancelLabel="Tiếp tục sửa"
      />
    </div>
  );
}
