import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getSession } from '@/app/auth/session.js';
import { MentorShell } from '@/layouts';
import { ContextualErrorState, RefreshingIndicator, SakuraLoader } from '@/components/ui';
import { describeApiError } from '@/api/apiErrors.js';
import {
  getMyMentorProfile,
  submitMentorVerification,
  updateMyMentorProfile,
  uploadVerificationDocument,
  getMyVerificationDocument,
} from '@/features/mentor/api/mentorProfileApi.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

const JLPT = ['N5', 'N4', 'N3', 'N2', 'N1'];
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/35 focus-visible:ring-offset-2';
const field = `mt-1.5 w-full rounded-lg border border-rp-line bg-rp-bg-2 px-3 py-2.5 text-[13px] text-rp-text-2 outline-none focus:border-rp-brand-border focus:ring-2 focus:ring-rp-brand-strong/20 ${focus}`;
const card = 'rounded-2xl border border-rp-line bg-white';

const emptyForm = {
  bio: '',
  expertise: '',
  jlptLevel: 'N3',
  yearsOfExperience: '',
  workplace: '',
  introductionVideoUrl: '',
};

const STATUS_TONE = {
  Approved: 'bg-rp-success-bg text-rp-success',
  Pending: 'bg-rp-warning-bg text-rp-warning',
  Rejected: 'bg-rp-brand-tint text-rp-brand-strong',
  ChangesRequested: 'bg-rp-warning-bg text-rp-warning',
  Unverified: 'bg-rp-brand-soft text-rp-text-2',
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

function displayName(profile) {
  const name = (profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`).trim();
  return name || profile?.email || 'Cố vấn';
}

export default function MentorProfile() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const uid = getSession()?.userId ?? 'anon';
  const profileKey = ['my-mentor-profile', uid];
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: profileKey,
    queryFn: getMyMentorProfile,
  });

  const [syncedProfile, setSyncedProfile] = useState(null);
  if (query.data && query.data !== syncedProfile) {
    setSyncedProfile(query.data);
    setForm(toForm(query.data));
  }

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = useMutation({
    mutationFn: () => updateMyMentorProfile({
      bio: form.bio || null,
      expertise: form.expertise || null,
      jlptLevel: form.jlptLevel || null,
      yearsOfExperience: form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience),
      workplace: form.workplace || null,
      introductionVideoUrl: form.introductionVideoUrl || null,
    }),
    onSuccess: (profile) => {
      client.setQueryData(profileKey, profile);
      setForm(toForm(profile));
      setError('');
      setMessage('Đã lưu hồ sơ.');
      notify.success('Đã lưu hồ sơ cố vấn.', '', { key: 'mentor-profile-save' });
    },
    onError: (err) => {
      setError(describeApiError(err).message);
      notify.apiError(err, 'Chưa lưu được hồ sơ cố vấn', { key: 'mentor-profile-save-err' });
    },
  });

  const upload = useMutation({
    mutationFn: (file) => {
      notify.loading('Đang tải lên chứng chỉ xác minh…', '', { key: 'mentor-cert-upload', maxWaitMs: 30000 });
      return uploadVerificationDocument(file);
    },
    onSuccess: (profile) => {
      client.setQueryData(profileKey, profile);
      setError('');
      setMessage('Đã tải chứng chỉ. Bạn có thể gửi hồ sơ để xét duyệt.');
      notify.success('Đã tải chứng chỉ xác minh lên hệ thống.', 'Bạn có thể gửi hồ sơ để xét duyệt.', {
        key: 'mentor-cert-upload',
        replace: true,
      });
    },
    onError: (err) => {
      setError(err.message);
      notify.apiError(err, 'Tải chứng chỉ thất bại', { key: 'mentor-cert-upload', replace: true });
    },
  });

  const submit = useMutation({
    mutationFn: () => submitMentorVerification({ notes: notes || null }),
    onSuccess: (profile) => {
      client.setQueryData(profileKey, profile);
      setError('');
      const desc = profile.verificationStatusDescription || 'Đã gửi hồ sơ xét duyệt.';
      setMessage(desc);
      notify.success('Đã gửi hồ sơ xét duyệt lên Admin.', desc, { key: 'mentor-verify-submit' });
    },
    onError: (err) => {
      setError(describeApiError(err).message);
      notify.apiError(err, 'Chưa gửi được hồ sơ xét duyệt', { key: 'mentor-verify-submit-err' });
    },
  });

  const profile = query.data;
  const isApproved = profile?.verificationStatus === 'Approved';
  const isPendingReview = profile?.verificationStatus === 'Pending';
  const lockedVerified = isApproved || isPendingReview;
  const missingProfile = query.error?.status === 404;
  const loadBlocked = query.isError && !missingProfile;
  const name = displayName(profile);
  const statusTone = STATUS_TONE[profile?.verificationStatus] || STATUS_TONE.Unverified;

  return (
    <MentorShell pathname={pathname} breadcrumb={tr('Hồ sơ chuyên gia')}>
      <div className="rp-container py-6 text-rp-text lg:py-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">{tr('Hồ sơ chuyên gia')}</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-rp-text-muted">
              {tr('Giới thiệu, trình độ JLPT và chứng chỉ là điều kiện để gửi xét duyệt.')}
            </p>
          </div>
          <button
            type="submit"
            form="mentor-profile-form"
            disabled={save.isPending || query.isPending || loadBlocked}
            className={`inline-flex h-9 items-center rounded-lg bg-rp-brand-strong px-3 text-[12px] font-medium text-white hover:bg-rp-brand-deep disabled:opacity-50 ${focus}`}
          >
            {save.isPending ? tr('Đang lưu…') : tr('Lưu hồ sơ')}
          </button>
        </header>

        <RefreshingIndicator active={query.isFetching && !query.isPending} className="mb-3" />
        {query.isPending && <SakuraLoader variant="section" context="profile" delay={160} className="mb-4" />}
        {loadBlocked && (
          <div className={`${card} mb-4 p-5`}>
            <ContextualErrorState
              error={query.error}
              title={tr('Chưa tải được hồ sơ chuyên gia')}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          </div>
        )}
        {(message || error) && (
          <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-[13px] ${error ? 'bg-rp-brand-tint text-rp-brand-strong' : 'bg-rp-success-bg text-rp-success'}`}>
            {error || message}
          </p>
        )}

        {!query.isPending && !loadBlocked && (
        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-rp-brand-tint text-[20px] font-semibold text-rp-brand-strong">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold">{name}</p>
                <p className="truncate text-[12px] text-rp-text-muted">{profile?.email || tr('Chưa có email')}</p>
              </div>
            </div>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${statusTone}`}>
              {profile?.verificationStatusDescription || profile?.verificationStatus || tr('Chưa có hồ sơ')}
            </span>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div>
                <dt className="text-rp-text-muted">{tr('Nhận lịch')}</dt>
                <dd className="mt-0.5 font-medium">{profile?.isBookable ? tr('Đang mở') : tr('Chưa mở')}</dd>
              </div>
              <div>
                <dt className="text-rp-text-muted">{tr('Chứng chỉ')}</dt>
                <dd className="mt-0.5 font-medium">
                  {profile?.hasVerificationDocument ? tr('Đã tải lên') : tr('Chưa có')}
                  {profile?.hasVerificationDocument && (
                    <button
                      type="button"
                      className={`ml-2 text-[12px] font-medium rp-link ${focus}`}
                      onClick={async () => {
                        setMessage('');
                        setError('');
                        try {
                          const blob = await getMyVerificationDocument();
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank', 'noopener');
                          setTimeout(() => URL.revokeObjectURL(url), 60_000);
                        } catch (err) {
                          setError(describeApiError(err).message || 'Không mở được chứng chỉ.');
                        }
                      }}
                    >
                      Xem
                    </button>
                  )}
                </dd>
              </div>
              {profile?.phoneNumber && (
                <div>
                  <dt className="text-rp-text-muted">{tr('Điện thoại')}</dt>
                  <dd className="mt-0.5 font-medium">{profile.phoneNumber}</dd>
                </div>
              )}
            </dl>
            {profile?.rejectionReason && <p className="mt-4 rounded-xl bg-rp-brand-tint px-3 py-2 text-[12px] leading-5 text-rp-brand-strong">{profile.rejectionReason}</p>}
            {profile?.reviewNotes && <p className="mt-2 text-[12px] leading-5 text-rp-text-muted">{profile.reviewNotes}</p>}
          </aside>

          <div className="space-y-4">
            <form
              id="mentor-profile-form"
              className={`${card} p-5`}
              onSubmit={(event) => { event.preventDefault(); setMessage(''); setError(''); save.mutate(); }}
            >
              <h2 className="text-[14px] font-semibold text-rp-text-2">{tr('Thông tin chuyên môn')}</h2>
              {isApproved && (
                <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[12px] text-emerald-800">
                  {tr('Hồ sơ đã được phê duyệt: Chuyên môn, JLPT, Kinh nghiệm và Nơi công tác được cố định theo chứng chỉ đã duyệt. Bạn vẫn có thể cập nhật Giới thiệu và Video.')}
                </p>
              )}
              {isPendingReview && (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  {tr('Hồ sơ đang chờ Admin xét duyệt nên tạm khóa chỉnh sửa cho tới khi có kết quả.')}
                </p>
              )}
              <label className="mt-4 block text-[12px] text-rp-text-muted">{tr('Giới thiệu')}
                <textarea disabled={isPendingReview} value={form.bio} onChange={set('bio')} maxLength={2000} rows={4} className={`${field} disabled:cursor-not-allowed disabled:bg-rp-bg-2`} />
              </label>
              <label className="mt-3 block text-[12px] text-rp-text-muted">{tr('Chuyên môn')}{' '}{lockedVerified ? tr('(đã xác minh)') : ''}
                <input disabled={lockedVerified} value={form.expertise} onChange={set('expertise')} maxLength={500} className={`${field} disabled:cursor-not-allowed disabled:bg-rp-bg-2`} />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] text-rp-text-muted">JLPT {lockedVerified ? tr('(đã xác minh)') : ''}
                  <select
                    disabled={lockedVerified}
                    value={form.jlptLevel}
                    onChange={set('jlptLevel')}
                    className={`${field} appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 disabled:cursor-not-allowed disabled:bg-rp-bg-2`}
                    style={{
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23776C70' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                    }}
                  >
                    {JLPT.map((level) => <option key={level}>{level}</option>)}
                  </select>
                </label>
                <label className="block text-[12px] text-rp-text-muted">{tr('Số năm kinh nghiệm')}{' '}{lockedVerified ? tr('(đã xác minh)') : ''}
                  <input disabled={lockedVerified} type="number" min="0" max="50" value={form.yearsOfExperience} onChange={set('yearsOfExperience')} className={`${field} disabled:cursor-not-allowed disabled:bg-rp-bg-2`} />
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] text-rp-text-muted">{tr('Nơi công tác')}{' '}{lockedVerified ? tr('(đã xác minh)') : ''}
                  <input disabled={lockedVerified} value={form.workplace} onChange={set('workplace')} maxLength={200} className={`${field} disabled:cursor-not-allowed disabled:bg-rp-bg-2`} />
                </label>
                <label className="block text-[12px] text-rp-text-muted">{tr('Link video giới thiệu')}
                  <input disabled={isPendingReview} value={form.introductionVideoUrl} onChange={set('introductionVideoUrl')} maxLength={1000} className={`${field} disabled:cursor-not-allowed disabled:bg-rp-bg-2`} />
                </label>
              </div>
            </form>

            <section className={`${card} p-5`}>
              <h2 className="text-[14px] font-semibold text-rp-text-2">{tr('Chứng chỉ xác minh')}</h2>
              <p className="mt-1 text-[12px] leading-5 text-rp-text-muted">{tr('PDF, JPEG hoặc PNG, từ 4 byte đến 5 MB. Nội dung file phải khớp loại tệp.')}</p>
              <label className={`mt-3 flex h-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-rp-brand-border bg-rp-brand-tint text-[13px] text-rp-brand-strong hover:bg-rp-brand-tint ${focus}`}>
                {upload.isPending ? tr('Đang tải chứng chỉ…') : tr('Chọn chứng chỉ')}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setMessage('');
                    setError('');
                    upload.mutate(file);
                  }}
                />
              </label>
              <label className="mt-4 block text-[12px] text-rp-text-muted">{tr('Ghi chú gửi duyệt')}
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className={field} />
              </label>
              <button
                type="button"
                disabled={submit.isPending}
                onClick={() => { setMessage(''); setError(''); submit.mutate(); }}
                className={`mt-3 inline-flex h-9 items-center rounded-lg border border-rp-line bg-white px-3 text-[12px] font-medium text-rp-text-2 hover:bg-rp-brand-tint disabled:opacity-50 ${focus}`}
              >
                {submit.isPending ? tr('Đang gửi…') : tr('Gửi hồ sơ xét duyệt')}
              </button>
            </section>
          </div>
        </div>
        )}
      </div>
    </MentorShell>
  );
}
