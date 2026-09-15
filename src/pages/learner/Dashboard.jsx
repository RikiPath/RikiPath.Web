import { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';
import {
  greetingHonorific,
  splitSrsQueue,
  timeOfDayGreeting,
  useLearnerHome,
  weekBloomStates,
} from '../../hooks/useLearnerHome.js';

export default function Dashboard() {
  const { pathname } = useLocation();
  const home = useLearnerHome();

  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') {
        try { fn(); } catch (err) { console.warn(err); }
        return;
      }
      return orig(type, fn, opts);
    };
    try {
      (function() {
          const currentNav = document.querySelector('aside nav a[data-path="dashboard"]');
          if (currentNav) {
            currentNav.classList.add('bg-primary-container', 'text-on-primary-container', 'font-bold', 'shadow-sm');
            currentNav.classList.remove('text-on-surface-variant');
          }
        })();
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);

  if (!home.session?.accessToken || home.unauthorized) {
    return <Navigate to="/auth" replace />;
  }

  if (!home.isLoading && home.profile && !home.profile.targetJlptLevelId && !home.session?.skipOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  const honorific = greetingHonorific(home.profile, home.session);
  const jlptLabel = home.profile?.targetJlptLevelName
    ? `Kỳ thi JLPT ${home.profile.targetJlptLevelName}`
    : 'Chưa chọn mục tiêu JLPT';
  const streakDays = home.streak?.currentStreakDays ?? 0;
  const longestStreak = home.streak?.longestStreakDays ?? 0;
  const isActiveToday = Boolean(home.streak?.isActiveToday);
  const completedLessons = home.completion?.completedLessons ?? 0;
  const totalLessons = home.completion?.totalLessons ?? 0;
  const completionPercent = Math.round(home.completion?.completionPercent ?? 0);
  const srsItems = home.srs?.items ?? [];
  const totalDue = home.srs?.totalDue ?? srsItems.length;
  const srsSplit = splitSrsQueue(srsItems);
  const blooms = weekBloomStates(streakDays, isActiveToday);
  const weakest = home.skills.length
    ? [...home.skills].sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))[0]
    : null;
  const vocabSkill = home.skills.find((s) => /từ|vocab/i.test(s.skillName || ''));
  const rememberedScore = vocabSkill ? Math.round(vocabSkill.averageScore) : null;
  const dailyMinutes = home.profile?.dailyStudyMinutes;
  const ringOffset = (251.2 * (100 - Math.min(100, Math.max(0, completionPercent)))) / 100;

  return (
    <LearnerShell pathname={pathname} breadcrumb="Tổng quan">
<div className="bg-background font-body-md text-on-surface antialiased" data-page="Dashboard" data-shell-unified="1">

<div className="pl-0"><main className="relative pt-0 bg-background min-h-screen"><div className="max-w-[1440px] mx-auto px-space-xl py-space-lg"><div className="flex flex-col w-full gap-space-lg">
<div className="grid grid-cols-12 gap-space-lg w-full items-start">
<div className="col-span-12 lg:col-span-8 flex flex-col gap-space-lg">
{/*  Welcome Editorial Card  */}
<div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-space-xl shadow-sm border border-outline-variant/50">
<div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none"></div>
<div className="absolute right-8 bottom-0 pointer-events-none opacity-20 lg:opacity-30 select-none">
<span className="font-japanese-display text-[140px] leading-none font-bold text-primary select-none">道</span>
</div>
<div className="relative z-10 flex flex-col gap-space-md max-w-xl">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm tracking-wide font-bold uppercase">
<span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>{jlptLabel}</span>
{typeof dailyMinutes === 'number' && dailyMinutes > 0 ? (
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold">
<span className="material-symbols-outlined text-[15px]">timer</span>{`Mục tiêu ${dailyMinutes} phút/ngày`}</span>
) : null}
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-label-sm text-label-sm font-bold">
<span className="material-symbols-outlined text-[14px]">trending_up</span>{home.isLoading ? 'Đang tải…' : `Streak ${streakDays} ngày`}</span>
</div>
<div className="flex flex-col gap-space-xxs">
<h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">{`${timeOfDayGreeting()}, ${honorific}! 🌸`}</h1>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{streakDays > 0
  ? <>Bạn đã duy trì nhịp độ liên tục {streakDays} ngày{longestStreak > streakDays ? ` (kỷ lục ${longestStreak} ngày)` : ''} — hãy giữ tinh thần <span className="text-primary font-semibold">"Chiritsumo"</span> (từng chút một tạo nên điều kỳ diệu).</>
  : <>Chưa có chuỗi học tập. Hoàn thành một bài học hoặc phiên ôn SRS hôm nay để bắt đầu streak thật.</>}</p>
</div>
<div className="flex items-center gap-space-lg pt-space-xs">
<div className="flex items-center gap-space-xs">
<div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
<span className="material-symbols-outlined text-[20px]">auto_stories</span>
</div>
<div className="flex flex-col">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">{totalLessons > 0 ? `${completedLessons}/${totalLessons}` : `${completedLessons}`}</span>
<span className="font-label-sm text-label-sm text-outline">Bài học đã hoàn thành</span>
</div>
</div>
<div className="w-px h-8 bg-outline-variant/40"></div>
<div className="flex items-center gap-space-xs">
<div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
<span className="material-symbols-outlined text-[20px]">psychology</span>
</div>
<div className="flex flex-col">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">{rememberedScore != null ? `${rememberedScore}` : `${totalDue}`}</span>
<span className="font-label-sm text-label-sm text-outline">{rememberedScore != null ? 'Điểm từ vựng TB' : 'Thẻ SRS đến hạn'}</span>
</div>
</div>
<div className="w-px h-8 bg-outline-variant/40"></div>
<div className="flex items-center gap-space-xs">
<div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
<span className="material-symbols-outlined text-[20px]">military_tech</span>
</div>
<div className="flex flex-col">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">{`${completionPercent}%`}</span>
<span className="font-label-sm text-label-sm text-outline">Tiến độ hoàn thành</span>
</div>
</div>
</div>
</div>
</div>
{/*  AI Advisor Priority Callout  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col sm:flex-row gap-space-lg items-start sm:items-center relative overflow-hidden border border-outline-variant/40">
<div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
<div className="relative flex-shrink-0">
<div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-secondary-container to-primary-fixed flex items-center justify-center text-primary shadow-md">
<span className="material-symbols-outlined text-[32px]">smart_toy</span>
</div>
<div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
<span className="material-symbols-outlined text-[13px]">bolt</span>
</div>
</div>
<div className="flex flex-col flex-1 min-w-0 gap-space-xxs">
<div className="flex items-center justify-between gap-space-xs">
<div className="flex items-center gap-space-xs">
<span className="font-title-sm text-title-sm text-on-surface font-bold">Haru Sensei AI</span>
<span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-label-sm font-semibold">Cố vấn cá nhân</span>
</div>
<button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container-high text-primary transition-colors" id="audio-play-btn" onClick={(e) => { const p = e.currentTarget.querySelector('.material-symbols-outlined'); p.innerText = p.innerText === 'volume_up' ? 'graphic_eq' : 'volume_up'; }}>
<span className="material-symbols-outlined text-[18px]">volume_up</span>
<span className="font-label-sm text-label-sm font-bold">Nghe lời khuyên</span>
</button>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">{weakest
  ? `"${honorific}, kỹ năng ${weakest.skillName} đang ở ${Math.round(weakest.averageScore ?? 0)}/100 sau ${weakest.attemptCount ?? 0} lượt. Hãy luyện thêm phần này hôm nay."`
  : `"${honorific}, chưa có dữ liệu kỹ năng từ bài thi thử. Học bài hoặc làm mini-test để Haru Sensei cá nhân hóa lời khuyên."`}</p>
<div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
<Link to="/exam-n3" className="px-space-md py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold shadow-sm hover:opacity-95 active:scale-98 transition-all flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">spellcheck</span>
<span className="">Luyện 5 câu sai ngay</span>
</Link>
<Link to="/ai-counselor" className="px-space-md py-2 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md font-bold hover:bg-primary-fixed/80 transition-all flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">help_center</span>
<span className="">Giải thích lỗi sai</span>
</Link>
</div>
</div>
</div>
{/*  Current Learning Task (In Progress)  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/40">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
<span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Tiến độ học tập</span>
</div>
<div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[16px]">schedule</span>
<span className="">{typeof dailyMinutes === 'number' && dailyMinutes > 0 ? `Mục tiêu ${dailyMinutes} phút/ngày` : 'Theo dữ liệu thật của tài khoản'}</span>
</div>
</div>
<div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
<div className="flex flex-col gap-space-xxs max-w-xl">
<span className="font-label-sm text-label-sm text-on-surface-variant font-medium">{jlptLabel}</span>
<h2 className="font-headline-md text-headline-md text-on-surface font-bold leading-snug">{totalLessons > 0 ? `Đã hoàn thành ${completedLessons}/${totalLessons} bài học` : 'Chưa có bài học hoàn thành'}</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">{totalLessons > 0
  ? 'Tiến độ được lấy từ Analytics của backend, cập nhật khi bạn hoàn thành bài học.'
  : 'Khi bạn bắt đầu lộ trình và hoàn thành bài, số liệu này sẽ hiện trên trang chủ.'}</p>
</div>
<div className="flex-shrink-0">
<Link to="/lessons" className="w-full md:w-auto px-space-lg py-3 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2">
<span className="">{totalLessons > 0 ? 'Tiếp tục học' : 'Bắt đầu học'}</span>
<span className="material-symbols-outlined text-[20px]">arrow_forward</span>
</Link>
</div>
</div>
<div className="flex flex-col gap-space-xs pt-space-xs">
<div className="flex items-center justify-between font-label-sm text-label-sm">
<span className="text-on-surface-variant font-semibold">{`Tiến độ hoàn thành: ${completionPercent}%`}</span>
<span className="text-primary font-bold">{`${completedLessons} bài đã xong`}</span>
</div>
<div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden flex">
<div className="h-full bg-gradient-to-r from-secondary-container to-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}></div>
</div>
{home.skills.length > 0 ? (
<div className="grid grid-cols-1 sm:grid-cols-3 gap-1 pt-1 text-center font-label-sm text-[11px] text-outline">
{home.skills.map((skill) => (
  <span key={skill.skillName} className="text-on-surface font-bold flex items-center justify-center gap-0.5">
    {`${skill.skillName}: ${Math.round(skill.averageScore ?? 0)}`}
  </span>
))}
</div>
) : null}
</div>
</div>
{/*  Quick Skill Practice Grid (3 Cards Bento)  */}
<div className="flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<h3 className="font-title-md text-title-md text-on-surface font-bold">Luyện tập kỹ năng nhanh</h3>
<span className="font-label-sm text-label-sm text-outline font-medium">Được cá nhân hóa theo tiến độ</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
{/*  Card 1: Flashcard SRS  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col justify-between gap-space-md hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
</div>
<span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">{`${totalDue} thẻ cần ôn`}</span>
</div>
<div className="flex flex-col">
<h4 className="font-title-sm text-title-sm text-on-surface font-bold">Flashcard SRS</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{"Ôn lặp lại ngắt quãng từ vựng N3 trọng tâm theo chu kỳ nhớ quên Ebbinghaus.\n                "}</p>
</div>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[15px]">av_timer</span>
<span className="">~6 phút</span>
</div>
<Link to="/daily-srs" className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary-container hover:text-on-primary-container text-primary font-label-md text-label-md font-bold transition-colors flex items-center gap-1">
<span className="">Ôn tập</span>
<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</div>
{/*  Card 2: AI Sentence Writing  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col justify-between gap-space-md hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="w-11 h-11 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-[22px]">draw</span>
</div>
<span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-bold">{"+50 EXP\n                "}</span>
</div>
<div className="flex flex-col">
<h4 className="font-title-sm text-title-sm text-on-surface font-bold">Luyện viết câu AI</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{"Thực hành ghép câu tự do với cấu trúc vừa học, Haru Sensei sửa câu tức thì.\n                "}</p>
</div>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[15px]">psychology</span>
<span className="">Chấm ngữ cảnh</span>
</div>
<Link to="/sentence-studio" className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary-container hover:text-on-primary-container text-primary font-label-md text-label-md font-bold transition-colors flex items-center gap-1">
<span className="">Viết ngay</span>
<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</div>
{/*  Card 3: Kanji N3 Handbook  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col justify-between gap-space-md hover:shadow-md transition-all group">
<div className="flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="w-11 h-11 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
<span className="font-japanese-display text-[18px] font-bold">漢</span>
</div>
<span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold">{"650 chữ\n                "}</span>
</div>
<div className="flex flex-col">
<h4 className="font-title-sm text-title-sm text-on-surface font-bold">Sổ tay Kanji N3</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{"Phân tích bộ thủ, âm Hán Việt, Onyomi - Kunyomi và các từ ghép thông dụng.\n                "}</p>
</div>
</div>
<div className="flex items-center justify-between pt-space-xs">
<div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
<span className="material-symbols-outlined text-[15px]">checklist</span>
<span className="">Đạt 380/650</span>
</div>
<Link to="/kanji-notebook" className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary-container hover:text-on-primary-container text-primary font-label-md text-label-md font-bold transition-colors flex items-center gap-1">
<span className="">Mở sổ</span>
<span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</div>
</div>
</div>
</div>
{/*  Right Column (4 columns)  */}
<div className="col-span-12 lg:col-span-4 flex flex-col gap-space-lg">
{/*  Spaced Repetition (SRS) Review Queue Card  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/40">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[18px]">replay</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Hàng đợi SRS</h3>
</div>
<span className="px-2 py-0.5 rounded-md bg-secondary-container/50 text-secondary font-label-sm text-label-sm font-bold">Hôm nay</span>
</div>
<div className="flex flex-col gap-space-xs">
<div className="flex items-baseline justify-between">
<span className="font-body-sm text-body-sm text-on-surface-variant">Tổng thẻ cần duyệt</span>
<span className="font-headline-sm text-headline-sm text-primary font-bold">{`${totalDue} thẻ`}</span>
</div>
{/*  Stack breakdown cards  */}
<div className="flex flex-col gap-2 pt-1">
<div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-error"></span>
<span className="font-body-sm text-body-sm text-on-surface font-medium">Cần ôn lại khẩn cấp</span>
</div>
<span className="font-label-md text-label-md font-bold text-error">{srsSplit.urgent}</span>
</div>
<div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
<span className="font-body-sm text-body-sm text-on-surface font-medium">Đến hạn ôn tập</span>
</div>
<span className="font-label-md text-label-md font-bold text-primary">{srsSplit.due}</span>
</div>
<div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
<span className="font-body-sm text-body-sm text-on-surface font-medium">Củng cố dài hạn</span>
</div>
<span className="font-label-md text-label-md font-bold text-tertiary">{srsSplit.longTerm}</span>
</div>
</div>
</div>
<Link to="/daily-srs" className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-[20px]">play_circle</span>
<span className="">Bắt đầu phiên ôn tập ({totalDue} thẻ)</span>
</Link>
</div>
{/*  Learning Streak & Weekly Flower Blossoming  */}
<div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-outline-variant/40">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<div className="w-8 h-8 rounded-lg bg-secondary-container/50 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[18px]">local_fire_department</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Chuỗi học tập</h3>
</div>
<span className="font-label-sm text-label-sm text-tertiary font-bold">{`Hoàn thành ${completionPercent}%`}</span>
</div>
<div className="flex items-center gap-space-lg">
<div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
<circle className="text-surface-container-high" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
<circle className="text-primary transition-all duration-1000" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={ringOffset} strokeLinecap="round" strokeWidth="8"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center text-center">
<span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-none">{streakDays}</span>
<span className="font-label-sm text-[10px] text-outline uppercase font-semibold">Ngày streak</span>
</div>
</div>
<div className="flex flex-col gap-1 min-w-0">
<span className="font-title-sm text-title-sm text-on-surface font-bold leading-tight">{isActiveToday ? 'Đã học hôm nay' : 'Chưa học hôm nay'}</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">{longestStreak > 0
  ? `Kỷ lục chuỗi học: ${longestStreak} ngày. Giữ nhịp để hoa nở đủ tuần.`
  : 'Hoàn thành hoạt động học hôm nay để bắt đầu chuỗi và nở hoa trên lịch tuần.'}</p>
</div>
</div>
<div className="flex flex-col gap-1.5 pt-1">
<div className="flex justify-between items-center px-1 font-label-sm text-[11px] text-outline uppercase">
<span className="">T2</span>
<span className="">T3</span>
<span className="">T4</span>
<span className="">T5</span>
<span className="">T6</span>
<span className="">T7</span>
<span className="">CN</span>
</div>
<div className="flex justify-between items-center">
{blooms.map((state, i) => {
  if (state === 'done') {
    return (
      <div key={i} className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs" title="Đã học">
        <span className="material-symbols-outlined text-[18px]">local_florist</span>
      </div>
    );
  }
  if (state === 'today') {
    return (
      <div key={i} className="w-9 h-9 rounded-xl bg-secondary-container text-primary flex items-center justify-center animate-pulse" title="Hôm nay">
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
      </div>
    );
  }
  if (state === 'missed') {
    return (
      <div key={i} className="w-9 h-9 rounded-xl bg-error-container/40 text-error flex items-center justify-center" title="Bỏ lỡ">
        <span className="w-2 h-2 rounded-full bg-error/70"></span>
      </div>
    );
  }
  return (
    <div key={i} className="w-9 h-9 rounded-xl bg-surface-container text-outline flex items-center justify-center" title={state === 'future' ? 'Chưa đến' : 'Chưa học'}>
      <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
    </div>
  );
})}
</div>
</div>
</div>
<div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/40">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-[18px]">video_call</span>
</div>
<h3 className="font-title-md text-title-md text-on-surface font-bold">Cố vấn 1-kèm-1</h3>
</div>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Chưa có lịch tư vấn từ API. Đặt buổi với sensei khi bạn sẵn sàng.</p>
<Link to="/consultation" className="w-full py-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-2">
<span className="material-symbols-outlined text-[18px]">event_available</span>
<span>Xem trung tâm tư vấn</span>
</Link>
</div>
</div>
</div>
</div>
</div></main></div>


    </div>
  
</LearnerShell>
);
}
