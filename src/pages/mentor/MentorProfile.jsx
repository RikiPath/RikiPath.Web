import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/auth/authContext.js';
import { getSession } from '@/app/auth/session.js';
import { invalidateSidebarCounters } from '@/features/sidebar-counters/api/sidebarCountersApi.js';
import { AdminShell } from '@/layouts';
import {
  Badge,
  Banner,
  Button,
  ContextualErrorState,
  CustomSelect,
  Field,
  FileUpload,
  Input,
  PageContainer,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  Tabs,
  Textarea,
  notify,
  useUnsavedGuard,
} from '@/components/ui';
import { describeApiError } from '@/api/apiErrors.js';
import {
  getMyMentorProfile,
  getMyVerificationDocument,
  submitMentorVerification,
  updateMyMentorProfile,
  uploadVerificationDocument,
} from '@/features/mentor/api/mentorProfileApi.js';
import { useLocale } from '@/locales/locale.js';

const JLPT = ['N5', 'N4', 'N3', 'N2', 'N1'];
const CERT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_CERT_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_URL_LEN = 500;

const emptyForm = {
  bio: '',
  expertise: '',
  jlptLevel: 'N3',
  yearsOfExperience: '',
  workplace: '',
  introductionVideoUrl: '',
};

const STATUS_BADGE_TONE = {
  Approved: 'success',
  Pending: 'warning',
  Rejected: 'danger',
  ChangesRequested: 'warning',
  Unverified: 'neutral',
};

const STATUS_LABELS = {
  Approved: 'Đã phê duyệt',
  Pending: 'Chờ xét duyệt',
  Rejected: 'Không được phê duyệt',
  ChangesRequested: 'Cần bổ sung hồ sơ',
  Unverified: 'Chưa gửi hồ sơ',
};

function toForm(profile) {
  return {
    bio: profile?.bio || '',
    expertise: profile?.expertise || '',
    jlptLevel: profile?.jlptLevel || 'N3',
    yearsOfExperience: profile?.yearsOfExperience ?? '',
    workplace: profile?.workplace || '',
    introductionVideoUrl: profile?.introductionVideoUrl || '',
  };
}

function normalizedSignature(data) {
  return JSON.stringify({
    bio: (data.bio || '').trim(),
    expertise: (data.expertise || '').trim(),
    jlptLevel: data.jlptLevel || 'N3',
    yearsOfExperience: data.yearsOfExperience === '' || data.yearsOfExperience == null ? '' : Number(data.yearsOfExperience),
    workplace: (data.workplace || '').trim(),
    introductionVideoUrl: (data.introductionVideoUrl || '').trim(),
  });
}

function isValidHttpUrl(raw) {
  const val = (raw || '').trim();
  if (!val) return true;
  if (val.length > MAX_VIDEO_URL_LEN) return false;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function MentorProfile({ embedded = false } = {}) {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const { primaryRole } = useAuth();
  const isAdminViewer = primaryRole === 'Admin';
  const uid = getSession()?.userId ?? 'anon';
  const profileKey = ['my-mentor-profile', uid];
  const client = useQueryClient();

  const [tab, setTab] = useState('info');
  const [form, setForm] = useState(emptyForm);
  const [notes, setNotes] = useState('');
  const [certFiles, setCertFiles] = useState([]);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [validationError, setValidationError] = useState('');

  const shouldRedirectEmbedded = !embedded && !isAdminViewer;

  const query = useQuery({
    queryKey: profileKey,
    queryFn: getMyMentorProfile,
    enabled: !isAdminViewer && !shouldRedirectEmbedded,
  });

  const [syncedProfile, setSyncedProfile] = useState(null);
  if (query.data && query.data !== syncedProfile) {
    const prevSignature = normalizedSignature(syncedProfile ? toForm(syncedProfile) : emptyForm);
    const hasUnsavedFormEdits = Boolean(syncedProfile) && normalizedSignature(form) !== prevSignature;
    setSyncedProfile(query.data);
    if (!hasUnsavedFormEdits) {
      setForm(toForm(query.data));
    }
  }

  const profile = query.data;
  const baselineSignature = useMemo(
    () => normalizedSignature(syncedProfile ? toForm(syncedProfile) : emptyForm),
    [syncedProfile],
  );
  const isDirty = useMemo(
    () => Boolean(syncedProfile) && normalizedSignature(form) !== baselineSignature,
    [syncedProfile, form, baselineSignature],
  );
  useUnsavedGuard(isDirty);

  const videoUrlError = useMemo(() => {
    const trimmed = form.introductionVideoUrl.trim();
    if (!trimmed) return '';
    if (trimmed.length > MAX_VIDEO_URL_LEN) return 'Link video giới thiệu tối đa 500 ký tự.';
    if (!isValidHttpUrl(trimmed)) return 'Link video phải bắt đầu bằng https:// hoặc http:// hợp lệ.';
    return '';
  }, [form.introductionVideoUrl]);

  const setField = (key) => (valueOrEvent) => {
    const val = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setForm((current) => ({ ...current, [key]: val }));
    setValidationError('');
  };

  const save = useMutation({
    mutationFn: () => updateMyMentorProfile({
      bio: form.bio.trim() || null,
      expertise: form.expertise.trim() || null,
      jlptLevel: form.jlptLevel || null,
      yearsOfExperience: form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience),
      workplace: form.workplace.trim() || null,
      introductionVideoUrl: form.introductionVideoUrl.trim() || null,
    }),
    onSuccess: (nextProfile) => {
      client.setQueryData(profileKey, nextProfile);
      setSyncedProfile(nextProfile);
      setForm(toForm(nextProfile));
      setValidationError('');
      notify.success('Đã lưu hồ sơ Giáo viên.', '', { key: 'mentor-profile-save' });
    },
    onError: (err) => {
      notify.apiError(err, 'Chưa lưu được hồ sơ Giáo viên', { key: 'mentor-profile-save-err' });
    },
  });

  const upload = useMutation({
    mutationFn: (file) => {
      notify.loading('Đang tải lên chứng chỉ xác minh…', '', { key: 'mentor-cert-upload', maxWaitMs: 30000 });
      return uploadVerificationDocument(file);
    },
    onSuccess: (nextProfile) => {
      client.setQueryData(profileKey, nextProfile);
      setSyncedProfile(nextProfile);
      setCertFiles([]);
      notify.success('Đã tải chứng chỉ xác minh lên hệ thống.', 'Bạn có thể gửi hồ sơ để xét duyệt.', {
        key: 'mentor-cert-upload',
        replace: true,
      });
    },
    onError: (err) => {
      notify.apiError(err, describeApiError(err).message || 'Tải chứng chỉ thất bại', {
        key: 'mentor-cert-upload',
        replace: true,
      });
    },
  });

  const submit = useMutation({
    mutationFn: () => submitMentorVerification({ notes: notes.trim() || null }),
    onSuccess: (nextProfile) => {
      client.setQueryData(profileKey, nextProfile);
      setSyncedProfile(nextProfile);
      invalidateSidebarCounters(client);
      const desc = nextProfile.verificationStatusDescription || 'Đã gửi hồ sơ xét duyệt.';
      notify.success('Đã gửi hồ sơ xét duyệt lên Quản trị viên.', tr(desc), { key: 'mentor-verify-submit' });
    },
    onError: (err) => {
      notify.apiError(err, 'Chưa gửi được hồ sơ xét duyệt', { key: 'mentor-verify-submit-err' });
    },
  });

  if (shouldRedirectEmbedded) {
    return <Navigate to="/profile/?tab=professional" replace />;
  }

  if (isAdminViewer) {
    return (
      <AdminShell pathname={pathname} breadcrumb={tr('Hồ sơ chuyên môn')}>
        <PageContainer width="default" density="comfortable" className="text-rp-text">
          <PageHeader
            eyebrow="Quản trị hệ thống"
            title="Hồ sơ chuyên môn"
            description="Trang này dành cho Giáo viên cập nhật thông tin giảng dạy và gửi chứng chỉ xác minh."
          />
          <Banner
            tone="info"
            title="Chuyển đến duyệt hồ sơ Giáo viên"
            actions={(
              <Button as={Link} to="/admin/mentor-verifications/" variant="primary" size="sm">
                {tr('Mở Duyệt hồ sơ Giáo viên')}
              </Button>
            )}
          >
            {tr('Quản trị viên xem xét và phê duyệt chứng chỉ của Giáo viên tại mục Duyệt hồ sơ xác minh.')}
          </Banner>
        </PageContainer>
      </AdminShell>
    );
  }

  const isApproved = profile?.verificationStatus === 'Approved';
  const isPendingReview = profile?.verificationStatus === 'Pending';
  const lockedVerified = isApproved || isPendingReview;
  const missingProfile = query.error?.status === 404;
  const loadBlocked = query.isError && !missingProfile;
  const statusTone = STATUS_BADGE_TONE[profile?.verificationStatus] || 'neutral';
  const statusLabel = profile?.verificationStatusDescription || STATUS_LABELS[profile?.verificationStatus] || 'Chưa có hồ sơ';
  const teachingLevels = Array.isArray(profile?.teachingJlptLevels) ? profile.teachingJlptLevels : [];

  const handleSave = (event) => {
    event.preventDefault();
    if (videoUrlError) {
      setValidationError(videoUrlError);
      return;
    }
    const years = form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience);
    if (years !== null && (!Number.isFinite(years) || years < 0 || years > 50)) {
      setValidationError('Số năm kinh nghiệm phải nằm trong khoảng từ 0 đến 50.');
      return;
    }
    setValidationError('');
    save.mutate();
  };

  const handleViewDoc = async () => {
    if (openingDoc) return;
    setOpeningDoc(true);
    try {
      const blob = await getMyVerificationDocument();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.apiError(err, 'Không mở được chứng chỉ.');
    } finally {
      setOpeningDoc(false);
    }
  };

  return (
    <div className="space-y-5 text-rp-text">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rp-line pb-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-rp-text">{tr('Hồ sơ chuyên môn')}</h2>
            <Badge tone={statusTone} size="sm">{tr(statusLabel)}</Badge>
            <RefreshingIndicator active={query.isFetching && !query.isPending} />
          </div>
          <p className="text-xs text-rp-text-muted">
            {tr('Quản lý trình độ JLPT, kinh nghiệm, giới thiệu giảng dạy và chứng chỉ xác minh.')}
          </p>
          {teachingLevels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-rp-text-muted">{tr('Cấp độ được phép giảng dạy')}:</span>
              {teachingLevels.map((lv) => (
                <Badge key={lv} tone="brand" icon={false} size="sm">{lv}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {profile?.hasVerificationDocument && (
            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              loading={openingDoc}
              onClick={handleViewDoc}
            >
              {tr('Xem chứng chỉ')}
            </Button>
          )}
          <Button
            type="submit"
            form="mentor-profile-form"
            variant="primary"
            size="sm"
            loading={save.isPending}
            disabled={query.isPending || loadBlocked || isPendingReview || !isDirty || Boolean(videoUrlError)}
          >
            {tr('Lưu hồ sơ')}
          </Button>
        </div>
      </div>

      {query.isPending && <SakuraLoader variant="section" context="profile" delay={160} />}

      {loadBlocked && (
        <ContextualErrorState
          error={query.error}
          title={tr('Chưa tải được hồ sơ chuyên môn')}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      )}

      {!query.isPending && !loadBlocked && (
        <div className="space-y-4">
          {profile?.rejectionReason && (
            <Banner tone="danger" title="Lý do cần chỉnh sửa">
              {profile.rejectionReason}
            </Banner>
          )}
          {profile?.reviewNotes && (
            <p className="rounded-xl border border-rp-line bg-rp-bg-2 px-3 py-2 text-xs leading-relaxed text-rp-text-2">
              {profile.reviewNotes}
            </p>
          )}

          <Tabs
            variant="pill"
            label={tr('Mục hồ sơ chuyên môn')}
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'info', label: 'Thông tin chuyên môn' },
              { value: 'verification', label: 'Chứng chỉ & xét duyệt' },
            ]}
          />

          {validationError && (
            <Banner tone="danger" onDismiss={() => setValidationError('')}>
              {tr(validationError)}
            </Banner>
          )}

          {tab === 'info' && (
            <div className="space-y-4">
              {isApproved && (
                <Banner tone="success">
                  {tr('Hồ sơ đã được phê duyệt: Chuyên môn, JLPT, Kinh nghiệm và Nơi công tác được cố định theo chứng chỉ đã duyệt. Bạn vẫn có thể cập nhật Giới thiệu và Video.')}
                </Banner>
              )}
              {isPendingReview && (
                <Banner tone="warning">
                  {tr('Hồ sơ đang chờ Quản trị viên xét duyệt nên tạm khóa chỉnh sửa cho tới khi có kết quả.')}
                </Banner>
              )}

              <form id="mentor-profile-form" onSubmit={handleSave} className="space-y-4">
                <Field label="Giới thiệu bản thân" counter={`${form.bio.length} / 2000`}>
                  <Textarea
                    disabled={isPendingReview || save.isPending}
                    value={form.bio}
                    onChange={setField('bio')}
                    maxLength={2000}
                    rows={4}
                    placeholder={tr('Kinh nghiệm giảng dạy, phong cách hướng dẫn và thế mạnh của bạn…')}
                  />
                </Field>

                <Field
                  label={lockedVerified ? 'Chuyên môn (đã xác minh)' : 'Chuyên môn'}
                  hint="Ví dụ: Giao tiếp N3–N2, Luyện đề JLPT, Kaiwa doanh nghiệp."
                >
                  <Input
                    disabled={lockedVerified || save.isPending}
                    value={form.expertise}
                    onChange={setField('expertise')}
                    maxLength={500}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={lockedVerified ? 'Trình độ JLPT (đã xác minh)' : 'Trình độ JLPT'}>
                    <CustomSelect
                      disabled={lockedVerified || save.isPending}
                      value={form.jlptLevel}
                      onChange={setField('jlptLevel')}
                      options={JLPT.map((level) => ({ value: level, label: `JLPT ${level}` }))}
                    />
                  </Field>

                  <Field label={lockedVerified ? 'Số năm kinh nghiệm (đã xác minh)' : 'Số năm kinh nghiệm'}>
                    <Input
                      disabled={lockedVerified || save.isPending}
                      type="number"
                      min={0}
                      max={50}
                      value={form.yearsOfExperience}
                      onChange={setField('yearsOfExperience')}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={lockedVerified ? 'Nơi công tác (đã xác minh)' : 'Nơi công tác'}>
                    <Input
                      disabled={lockedVerified || save.isPending}
                      value={form.workplace}
                      onChange={setField('workplace')}
                      maxLength={200}
                    />
                  </Field>

                  <Field label="Link video giới thiệu" error={videoUrlError}>
                    <Input
                      disabled={isPendingReview || save.isPending}
                      type="url"
                      value={form.introductionVideoUrl}
                      onChange={setField('introductionVideoUrl')}
                      maxLength={MAX_VIDEO_URL_LEN}
                      placeholder="https://..."
                      invalid={Boolean(videoUrlError)}
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rp-line pt-4">
                  <span className="text-xs text-rp-text-muted">
                    {isDirty ? tr('Bạn có thay đổi chưa lưu.') : tr('Hồ sơ đang ở phiên bản mới nhất.')}
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={save.isPending}
                    disabled={isPendingReview || !isDirty || Boolean(videoUrlError)}
                  >
                    {tr('Lưu hồ sơ')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {tab === 'verification' && (
            <div className="space-y-4">
              {lockedVerified && (
                <Banner tone={isApproved ? 'success' : 'warning'}>
                  {isApproved
                    ? tr('Chứng chỉ của bạn đã được xác minh và phê duyệt.')
                    : tr('Hồ sơ đang trong hàng đợi xét duyệt; không thể thay đổi chứng chỉ trong lúc chờ.')}
                </Banner>
              )}

              {isDirty && !lockedVerified && (
                <Banner tone="warning">
                  {tr('Bạn có thay đổi chưa lưu ở mục Thông tin chuyên môn. Hãy lưu hồ sơ trước khi gửi xét duyệt.')}
                </Banner>
              )}

              <FileUpload
                label={upload.isPending ? 'Đang tải chứng chỉ…' : 'Chọn tệp chứng chỉ xác minh'}
                hint={tr('Chấp nhận PDF, JPG, PNG · tối đa 5 MB.')}
                accept={CERT_TYPES}
                maxBytes={MAX_CERT_BYTES}
                files={certFiles}
                disabled={lockedVerified || upload.isPending}
                onChange={(files) => {
                  setCertFiles(files);
                  if (files[0]) upload.mutate(files[0]);
                }}
              />

              <Field label="Ghi chú gửi Quản trị viên" counter={`${notes.length} / 1000`}>
                <Textarea
                  disabled={lockedVerified || submit.isPending}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={tr('Ghi chú thêm về bằng cấp hoặc lịch sử giảng dạy nếu cần…')}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rp-line pt-4">
                <Button
                  variant="primary"
                  icon={ShieldCheck}
                  loading={submit.isPending}
                  disabled={lockedVerified || isDirty || !profile?.hasVerificationDocument}
                  onClick={() => submit.mutate()}
                >
                  {tr('Gửi hồ sơ xét duyệt')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
