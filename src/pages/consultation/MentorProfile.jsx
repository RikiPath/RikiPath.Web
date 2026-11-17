import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ConsultShell } from '../../components/shells';
import {
  getMyMentorProfile,
  submitMentorVerification,
  updateMyMentorProfile,
  uploadVerificationDocument,
  getMyVerificationDocument,
} from '../../api/mentorProfileApi.js';

const JLPT = ['N5', 'N4', 'N3', 'N2', 'N1'];
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const field = `mt-1.5 w-full rounded-lg border border-[#EDE2E7] bg-[#FCFAFB] px-3 py-2.5 text-[13px] text-[#62515A] outline-none focus:border-[#E7C9D6] focus:ring-2 focus:ring-[#AD3155]/20 ${focus}`;
const card = 'rounded-2xl border border-[#EADFE5] bg-white';

const emptyForm = {
  bio: '',
  expertise: '',
  jlptLevel: 'N3',
  yearsOfExperience: '',
  workplace: '',
  introductionVideoUrl: '',
};

const STATUS_TONE = {
  Approved: 'bg-[#E7F6EC] text-[#1E5C36]',
  Pending: 'bg-[#FFF6E8] text-[#8A5A10]',
  Rejected: 'bg-[#FCF4F8] text-[#A33357]',
  ChangesRequested: 'bg-[#FFF6E8] text-[#8A5A10]',
  Unverified: 'bg-[#F6F1F4] text-[#866777]',
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
  const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  return name || profile?.email || 'Cố vấn';
}

export default function MentorProfile() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['my-mentor-profile'],
    queryFn: getMyMentorProfile,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setForm(toForm(query.data));
  }, [query.data]);

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
      client.setQueryData(['my-mentor-profile'], profile);
      setForm(toForm(profile));
      setError('');
      setMessage('Đã lưu hồ sơ.');
    },
    onError: (err) => setError(err.message),
  });

  const upload = useMutation({
    mutationFn: uploadVerificationDocument,
    onSuccess: (profile) => {
      client.setQueryData(['my-mentor-profile'], profile);
      setError('');
      setMessage('Đã tải chứng chỉ. Bạn có thể gửi hồ sơ để xét duyệt.');
    },
    onError: (err) => setError(err.message),
  });

  const submit = useMutation({
    mutationFn: () => submitMentorVerification({ notes: notes || null }),
    onSuccess: (profile) => {
      client.setQueryData(['my-mentor-profile'], profile);
      setError('');
      setMessage(profile.verificationStatusDescription || 'Đã gửi hồ sơ xét duyệt.');
    },
    onError: (err) => setError(err.message),
  });

  const profile = query.data;
  const missingProfile = query.error?.status === 404;
  const name = displayName(profile);
  const statusTone = STATUS_TONE[profile?.verificationStatus] || STATUS_TONE.Unverified;

  return (
    <ConsultShell pathname={pathname} breadcrumb="Hồ sơ chuyên gia">
      <div className="mx-auto w-full max-w-[1080px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-tight">Hồ sơ chuyên gia</h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-6 text-[#927B88]">
              Giới thiệu, trình độ JLPT và chứng chỉ là điều kiện để gửi xét duyệt.
            </p>
          </div>
          <button
            type="submit"
            form="mentor-profile-form"
            disabled={save.isPending}
            className={`inline-flex h-9 items-center rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
          >
            {save.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}
          </button>
        </header>

        {query.isPending && <p className="mb-4 text-[13px] text-[#9A8390]">Đang tải hồ sơ…</p>}
        {query.error && !missingProfile && <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}
        {(message || error) && (
          <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-[13px] ${error ? 'bg-[#FCF4F8] text-[#A33357]' : 'bg-[#E7F6EC] text-[#1E5C36]'}`}>
            {error || message}
          </p>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FCEEF3] text-[20px] font-semibold text-[#AD3155]">
                {profile?.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold">{name}</p>
                <p className="truncate text-[12px] text-[#927B88]">{profile?.email || 'Chưa có email'}</p>
              </div>
            </div>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${statusTone}`}>
              {profile?.verificationStatusDescription || profile?.verificationStatus || 'Chưa có hồ sơ'}
            </span>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div>
                <dt className="text-[#967F8A]">Nhận lịch</dt>
                <dd className="mt-0.5 font-medium">{profile?.isBookable ? 'Đang mở' : 'Chưa mở'}</dd>
              </div>
              <div>
                <dt className="text-[#967F8A]">Chứng chỉ</dt>
                <dd className="mt-0.5 font-medium">
                  {profile?.hasVerificationDocument ? 'Đã tải lên' : 'Chưa có'}
                  {profile?.hasVerificationDocument && (
                    <button
                      type="button"
                      className={`ml-2 text-[12px] font-medium text-[#AD3155] hover:underline ${focus}`}
                      onClick={async () => {
                        setMessage('');
                        setError('');
                        try {
                          const blob = await getMyVerificationDocument();
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank', 'noopener');
                          setTimeout(() => URL.revokeObjectURL(url), 60_000);
                        } catch (err) {
                          setError(err.message || 'Không mở được chứng chỉ.');
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
                  <dt className="text-[#967F8A]">Điện thoại</dt>
                  <dd className="mt-0.5 font-medium">{profile.phoneNumber}</dd>
                </div>
              )}
            </dl>
            {profile?.rejectionReason && <p className="mt-4 rounded-xl bg-[#FCF4F8] px-3 py-2 text-[12px] leading-5 text-[#A33357]">{profile.rejectionReason}</p>}
            {profile?.reviewNotes && <p className="mt-2 text-[12px] leading-5 text-[#927B88]">{profile.reviewNotes}</p>}
          </aside>

          <div className="space-y-4">
            <form
              id="mentor-profile-form"
              className={`${card} p-5`}
              onSubmit={(event) => { event.preventDefault(); setMessage(''); setError(''); save.mutate(); }}
            >
              <h2 className="text-[14px] font-semibold text-[#705261]">Thông tin chuyên môn</h2>
              <label className="mt-4 block text-[12px] text-[#967F8A]">Giới thiệu
                <textarea value={form.bio} onChange={set('bio')} maxLength={2000} rows={4} className={field} />
              </label>
              <label className="mt-3 block text-[12px] text-[#967F8A]">Chuyên môn
                <input value={form.expertise} onChange={set('expertise')} maxLength={500} className={field} />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] text-[#967F8A]">JLPT
                  <select value={form.jlptLevel} onChange={set('jlptLevel')} className={field}>
                    {JLPT.map((level) => <option key={level}>{level}</option>)}
                  </select>
                </label>
                <label className="block text-[12px] text-[#967F8A]">Số năm kinh nghiệm
                  <input type="number" min="0" max="50" value={form.yearsOfExperience} onChange={set('yearsOfExperience')} className={field} />
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] text-[#967F8A]">Nơi công tác
                  <input value={form.workplace} onChange={set('workplace')} maxLength={200} className={field} />
                </label>
                <label className="block text-[12px] text-[#967F8A]">Link video giới thiệu
                  <input value={form.introductionVideoUrl} onChange={set('introductionVideoUrl')} maxLength={1000} className={field} />
                </label>
              </div>
            </form>

            <section className={`${card} p-5`}>
              <h2 className="text-[14px] font-semibold text-[#705261]">Chứng chỉ xác minh</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#A18B97]">PDF, JPEG hoặc PNG, từ 4 byte đến 5 MB. Nội dung file phải khớp loại tệp.</p>
              <label className={`mt-3 flex h-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#E7C9D6] bg-[#FCF4F8] text-[13px] text-[#AD3155] hover:bg-[#FCEEF3] ${focus}`}>
                {upload.isPending ? 'Đang tải chứng chỉ…' : 'Chọn chứng chỉ'}
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
              <label className="mt-4 block text-[12px] text-[#967F8A]">Ghi chú gửi duyệt
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} className={field} />
              </label>
              <button
                type="button"
                disabled={submit.isPending}
                onClick={() => { setMessage(''); setError(''); submit.mutate(); }}
                className={`mt-3 inline-flex h-9 items-center rounded-lg border border-[#E7DAE1] bg-white px-3 text-[12px] font-medium text-[#866777] hover:bg-[#FFF6FA] disabled:opacity-50 ${focus}`}
              >
                {submit.isPending ? 'Đang gửi…' : 'Gửi hồ sơ xét duyệt'}
              </button>
            </section>
          </div>
        </div>
      </div>
    </ConsultShell>
  );
}
