import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, BookOpenCheck, CalendarCheck, CheckCircle2, ClipboardCheck, Clock3, MessageSquareText, School, Video } from 'lucide-react';
import ScenicPhoto from '@/components/brand/ScenicPhoto.jsx';
import { cx } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { FAQ, GROUP_STEPS, INTENSITY, JOURNEY, LEVELS, PERSONAL, TOOLS } from '../constants/landingContent.js';
import { StudyIllustration } from './StudyIllustrations.jsx';

// All marketing mockups below are illustrations of the product UI ("Minh họa"), never user data.
const WEEKDAYS = { vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], ja: ['月', '火', '水', '木', '金', '土', '日'] };

/* ------------------------------------------------------------ shared bits */

export function SectionHeading({ eyebrow, title, text, id, align = 'left', className, tone = 'brand' }) {
  const { tr } = useLocale();
  return (
    <div data-reveal className={cx(align === 'center' && 'mx-auto text-center', 'max-w-2xl', className)}>
      <p className={cx('inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]', tone === 'light' ? 'text-white/85' : 'text-rp-brand-pressed')}>
        <span aria-hidden="true" className={cx('h-px w-6', tone === 'light' ? 'bg-white/60' : 'bg-rp-brand-pressed/60')} />
        {tr(eyebrow)}
      </p>
      <h2 id={id} className={cx('mt-3 text-balance text-[clamp(1.6rem,1.2rem+1.4vw,2.45rem)] font-extrabold leading-[1.18] tracking-[-0.025em]', tone === 'light' ? 'text-white' : 'text-rp-text')}>{tr(title)}</h2>
      {text && <p className={cx('mt-3 rp-type-body leading-7', tone === 'light' ? 'text-white/85' : 'text-rp-text-2')}>{tr(text)}</p>}
    </div>
  );
}

export function CtaLink({ to, children, variant = 'primary', className }) {
  return (
    <Link
      to={to}
      className={cx(
        'lp-cta rp-focus group inline-flex min-h-12 items-center gap-2 rounded-rp-input px-5 py-2.5 text-[15px] font-semibold transition-[background-color,border-color,box-shadow,transform] duration-200',
        variant === 'primary'
          ? 'rp-press bg-rp-brand-pressed text-white shadow-rp-brand hover:bg-rp-brand-strong hover:shadow-[0_14px_28px_-12px_rgba(194,67,98,0.55)]'
          : variant === 'light'
            ? 'rp-press bg-white text-rp-brand-strong shadow-rp-pop hover:bg-rp-brand-tint'
            : 'rp-press border border-rp-line bg-white/90 text-rp-text hover:border-rp-brand-border hover:text-rp-brand-strong',
        className,
      )}
    >
      {children}
    </Link>
  );
}

function IllustrationTag() {
  const { tr } = useLocale();
  return <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-semibold text-rp-text-muted ring-1 ring-black/5">{tr('Minh họa')}</span>;
}

/* ------------------------------------------------------------ C — JLPT journey N5 → N2 */

const LEVEL_SKILLS = {
  N5: ['Kana', 'Từ vựng', 'Ngữ pháp'],
  N4: ['Hán tự', 'Nghe hiểu', 'Ngữ pháp'],
  N3: ['Đọc hiểu', 'Nghe hiểu', 'Hán tự'],
  N2: ['Đọc hiểu', 'Ngữ pháp', 'Thi thử JLPT'],
};

export function RoadmapSection() {
  const { tr, trf } = useLocale();
  return (
    <section id="roadmap" className="lp-band-white relative scroll-mt-24 overflow-hidden py-20 sm:py-24" aria-labelledby="roadmap-title">
      <div className="mx-auto max-w-[1280px] px-[var(--rp-space-page-x)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="roadmap-title"
            eyebrow={tr('Lộ trình JLPT')}
            title={tr('Đi từng bước từ N5 đến N2')}
            text={tr('Mỗi cấp độ có bài học, từ vựng, Kanji, ngữ pháp và đề luyện riêng. Bài đánh giá năng lực gợi ý điểm bắt đầu phù hợp.')}
          />
          <div data-reveal="scale" className="lp-float hidden md:block"><StudyIllustration name="roadmap" size="lg" /></div>
        </div>
        <div className="lp-draw relative mt-14" data-reveal>
          {/* Sakura path joins the four milestones left → right (desktop) / top → bottom (mobile). */}
          <svg aria-hidden="true" viewBox="0 0 1000 120" preserveAspectRatio="none" className="absolute inset-x-[6%] top-1 hidden h-24 w-[88%] lg:block">
            <path className="lp-path" pathLength="1" d="M30 62 C 180 8, 300 112, 500 60 S 820 8, 970 60" stroke="url(#lp-road)" strokeWidth="4" strokeLinecap="round" strokeDasharray="1" fill="none" />
            <defs>
              <linearGradient id="lp-road" x1="0" x2="1">
                <stop offset="0" stopColor="#F7B6C8" />
                <stop offset="1" stopColor="#C24362" />
              </linearGradient>
            </defs>
          </svg>
          <span aria-hidden="true" className="lp-connector-v absolute bottom-8 left-[27px] top-8 w-[3px] rounded-full bg-gradient-to-b from-[#F7B6C8] to-rp-brand-pressed lg:hidden" />
          <ol className="relative grid gap-5 lg:grid-cols-4">
            {LEVELS.map((lvl, i) => (
              <li key={lvl.level} data-reveal style={{ '--d': `${120 + i * 110}ms` }} className="relative pl-16 lg:pl-0">
                <div tabIndex={0} className="lp-card lp-level rp-focus group relative h-full rounded-[26px] border border-rp-line bg-white p-6 shadow-rp-xs">
                  <div className="flex items-center justify-between">
                    <span className="lp-level-node absolute -left-16 top-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F7B6C8] to-[#CC4B6B] text-[17px] font-extrabold text-white shadow-[0_10px_0_-2px_#B53D5C,0_18px_26px_-10px_rgba(204,75,107,0.65)] lg:static">{lvl.level}</span>
                    <span lang="ja" aria-hidden="true" className="rp-kanji text-[44px] leading-none text-rp-brand-soft transition-colors duration-300 group-hover:text-rp-brand-border group-focus-visible:text-rp-brand-border">{lvl.kanji}</span>
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-rp-text-muted">{trf('Bước {n}', { n: i + 1 })}</p>
                  <h3 className="mt-1 text-[19px] font-bold text-rp-text">JLPT {lvl.level} · {tr(lvl.name)}</h3>
                  <p className="mt-2 text-sm leading-6 text-rp-text-2">{tr(lvl.text)}</p>
                  <ul className="lp-level-more mt-4 flex flex-wrap gap-1.5" aria-label={tr('Kỹ năng trọng tâm')}>
                    {LEVEL_SKILLS[lvl.level].map((s) => (
                      <li key={s} className="rounded-full bg-rp-brand-tint px-2.5 py-1 text-[11.5px] font-semibold text-rp-brand-strong">{tr(s)}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ B — Learning ecosystem (bento) */

function MiniPreview({ type }) {
  const { tr, trf } = useLocale();
  if (type === 'flashcard') {
    return (
      <div className="lp-mini mt-5 grid grid-cols-2 gap-3" aria-hidden="true">
        <div className="rounded-2xl bg-white p-3 shadow-rp-xs ring-1 ring-black/5">
          <p lang="ja" className="rp-kanji text-[28px] font-semibold leading-none text-rp-text">準備</p>
          <p className="mt-1.5 text-[11px] text-rp-text-muted">じゅんび</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/5">
          <p className="text-[13px] font-bold text-tone-vocab">{tr('chuẩn bị')}</p>
          <p lang="ja" className="rp-jp mt-1.5 text-[11px] leading-4 text-rp-text-2">旅行の準備をする。</p>
        </div>
      </div>
    );
  }
  if (type === 'srs') {
    const rows = [['Ôn gấp', 'bg-[#F7B6C8]', 72], ['Đang nhớ', 'bg-[#C9B2F2]', 48], ['Dài hạn', 'bg-[#A9DCC4]', 30]];
    return (
      <div className="lp-mini mt-5 space-y-2.5" aria-hidden="true">
        {rows.map(([label, color, w]) => (
          <div key={label}>
            <div className="flex justify-between text-[11px] font-semibold text-rp-text-2"><span>{tr(label)}</span></div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/80"><span className={cx('lp-bar block h-full rounded-full', color)} style={{ '--w': `${w}%` }} /></div>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {[1, 3, 7, 14, 30].map((d) => <span key={d} className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-tone-listening ring-1 ring-black/5">{trf('{n} ngày', { n: d })}</span>)}
        </div>
      </div>
    );
  }
  if (type === 'exam') {
    return (
      <div className="lp-mini mt-5 flex flex-wrap items-center gap-4" aria-hidden="true">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-rp-xs ring-1 ring-black/5">
          <Clock3 className="h-4 w-4 text-tone-mock" />
          <span className="tabular-nums text-[14px] font-bold text-rp-text">105:00</span>
        </div>
        {['Kiến thức ngôn ngữ', 'Đọc hiểu', 'Nghe hiểu'].map((p, i) => (
          <span key={p} className="flex items-center gap-1.5 text-[12px] font-semibold text-rp-text-2">
            <span className={cx('h-2.5 w-2.5 rounded-full', ['bg-tone-mock', 'bg-tone-reading', 'bg-tone-listening'][i])} />{tr(p)}
          </span>
        ))}
      </div>
    );
  }
  return null;
}

export function ToolsSection() {
  const { tr } = useLocale();
  return (
    <section id="ecosystem" className="lp-band-ivory relative scroll-mt-24 overflow-hidden py-20 sm:py-24" aria-labelledby="tools-title">
      <div aria-hidden="true" className="rp-pattern-seigaiha absolute inset-x-0 top-0 h-40 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative mx-auto max-w-[1280px] px-[var(--rp-space-page-x)]">
        <SectionHeading id="tools-title" eyebrow={tr('Hệ sinh thái học tập')} title={tr('Mỗi kỹ năng, một công cụ được thiết kế riêng')} text={tr('Từ vựng, ngữ pháp, chữ viết, bốn kỹ năng và thi thử — đồng bộ tiến độ giữa Web và ứng dụng RikiPath.')} />
        <ul className="lp-bento mt-12 grid auto-rows-[minmax(0,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, i) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <StudyIllustration name={tool.art} size="md" className="lp-icon" />
                  {tool.preview && <IllustrationTag />}
                </div>
                <h3 className="mt-4 text-[17px] font-bold text-rp-text">{tr(tool.title)}</h3>
                <p className="mt-1.5 text-[13.5px] leading-6 text-rp-text-2">{tr(tool.text)}</p>
                {tool.preview && <MiniPreview type={tool.preview} />}
                {tool.to && (
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-rp-brand-pressed">
                    {tr('Tìm hiểu thêm')} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            );
            const cell = cx(
              'lp-card lp-tool group flex h-full flex-col rounded-[26px] border border-white/80 p-6 shadow-[0_18px_40px_-28px_rgba(90,30,55,0.35)]',
              `lp-tone-${tool.key}`,
            );
            return (
              <li
                key={tool.key}
                data-reveal
                style={{ '--d': `${(i % 4) * 80}ms` }}
                className={cx(tool.size === 'wide' && 'sm:col-span-2', tool.size === 'tall' && 'lg:row-span-2')}
              >
                {tool.to ? (
                  <Link to={tool.to} data-fx={tool.fx} className={cx(cell, 'rp-focus')}>{body}</Link>
                ) : (
                  <div data-fx={tool.fx} className={cell}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ D — Personalized learning */

const PERSONAL_ART = ['roadmap', 'notebook', 'ai', 'progress'];

export function PersonalizedSection() {
  const { tr, trf } = useLocale();
  const skills = [['Từ vựng', 'bg-tone-vocab', 78], ['Ngữ pháp', 'bg-tone-grammar', 64], ['Đọc hiểu', 'bg-tone-reading', 52], ['Nghe hiểu', 'bg-tone-listening', 58]];
  return (
    <section className="lp-band-mint relative overflow-hidden py-20 sm:py-24" aria-labelledby="personal-title">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-[var(--rp-space-page-x)] lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHeading id="personal-title" eyebrow={tr('Học theo cách của bạn')} title={tr('Bảng học tập biết bạn nên học gì tiếp theo')} />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {PERSONAL.map((item, i) => (
              <li key={item.title} data-reveal style={{ '--d': `${i * 90}ms` }} className="lp-card group flex gap-3 rounded-[22px] border border-white/80 bg-white/85 p-4">
                <StudyIllustration name={PERSONAL_ART[i]} size="sm" className="lp-icon mt-0.5" />
                <span>
                  <h3 className="text-[15px] font-bold text-rp-text">{tr(item.title)}</h3>
                  <p className="mt-1 text-[13.5px] leading-6 text-rp-text-2">{tr(item.text)}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <figure data-reveal="scale" className="relative">
          <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(166,226,206,0.6),transparent)]" />
          <div className="lp-dash rounded-[30px] border border-white/80 bg-white/95 p-5 shadow-[0_40px_80px_-40px_rgba(23,36,58,0.35)] sm:p-6" role="img" aria-label={tr('Minh họa bảng học tập: mục tiêu, tiến độ kỹ năng, gợi ý và hàng đợi ôn tập')}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-rp-text">{tr('Hôm nay nên học gì?')}</p>
              <IllustrationTag />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-3xl bg-[#E6F7F3] p-4">
                <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="40" stroke="#FFFFFF" strokeWidth="12" fill="none" />
                  <circle className="lp-ring" cx="50" cy="50" r="40" stroke="#2E9C7A" strokeWidth="12" strokeLinecap="round" fill="none" pathLength="100" strokeDasharray="100" style={{ '--p': 62 }} />
                </svg>
                <p className="mt-2 text-center text-[12px] font-semibold text-[#1F6F57]">{tr('Mục tiêu JLPT N3')}</p>
              </div>
              <ul className="space-y-2.5">
                {skills.map(([label, color, w], i) => (
                  <li key={label}>
                    <div className="flex justify-between text-[12px] font-semibold text-rp-text-2"><span>{tr(label)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-rp-muted"><span className={cx('lp-bar block h-full rounded-full', color)} style={{ '--w': `${w}%`, '--d': `${200 + i * 90}ms` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-5 space-y-2.5">
              {[
                { icon: BellRing, tone: 'text-tone-listening bg-tone-listening-bg', title: 'Ôn các thẻ đến hạn', sub: 'Ôn tập SRS' },
                { icon: BookOpenCheck, tone: 'text-tone-grammar bg-tone-grammar-bg', title: 'Tiếp tục bài học đang dở', sub: 'Lộ trình JLPT' },
                { icon: ClipboardCheck, tone: 'text-tone-mock bg-tone-mock-bg', title: 'Làm một đề thi thử có tính giờ', sub: 'Thi thử JLPT' },
                { icon: MessageSquareText, tone: 'text-tone-haru bg-tone-haru-bg', title: 'Nhờ Haru góp ý bài viết', sub: 'Haru AI · tham khảo' },
              ].map((row, i) => (
                <li key={row.title} data-reveal style={{ '--d': `${240 + i * 90}ms` }} className="flex items-center gap-3 rounded-2xl border border-rp-line bg-rp-bg-2/60 p-3">
                  <span aria-hidden="true" className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', row.tone)}><row.icon className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-rp-text">{tr(row.title)}</span>
                    <span className="block text-[11.5px] text-rp-text-muted">{tr(row.sub)}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-rp-text-disabled" />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-rp-text-muted">{trf('{n} thẻ đến hạn hôm nay', { n: 12 })} · {tr('Số liệu minh họa')}</p>
          </div>
          <figcaption className="mt-3 text-center text-[11px] text-rp-text-muted">{tr('Minh họa giao diện bảng học tập, nội dung thực tế phụ thuộc vào tài khoản của bạn.')}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ E — Group learning with Mentor */

function ClassroomShowcase({ plan }) {
  const { tr, trf, locale } = useLocale();
  const days = WEEKDAYS[locale] || WEEKDAYS.vi;
  const seats = ['#F2A2B8', '#9CC4E8', '#B9DDB0', '#F6D49A'];
  return (
    <div className="relative" role="img" aria-label={trf('Minh họa lớp học trực tuyến cường độ {name}: {perWeek} buổi mỗi tuần, 90 phút mỗi buổi, tối đa 4 học viên', { name: tr(plan.name), perWeek: plan.perWeek })}>
      <div className="rounded-[30px] border border-white/80 bg-white/95 p-4 shadow-[0_40px_80px_-40px_rgba(140,50,60,0.4)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13.5px] font-bold text-rp-text"><Video aria-hidden="true" className="h-4 w-4 text-tone-mentor" /> {tr('Phòng học trực tuyến')}</p>
          <IllustrationTag />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#FFE3D6] to-[#FCE9EE] p-3 sm:col-span-1 sm:flex-col sm:justify-center">
            <StudyIllustration name="group" size="sm" />
            <span className="text-[12px] font-bold text-[#9A3F35]">{tr('Giáo viên')}</span>
          </div>
          <div className="col-span-3 grid grid-cols-4 gap-2 sm:col-span-2 sm:grid-cols-2">
            {seats.map((c, i) => (
              <div key={c} className="lp-seat flex aspect-[4/3] items-center justify-center rounded-2xl bg-rp-bg-2" style={{ '--d': `${i * 120}ms` }}>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-rp-xs" style={{ background: c }}>
                  {i + 1}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2FA56A]" />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {days.map((day, i) => {
            const active = plan.days.includes(i);
            return (
              <div key={day} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-rp-text-muted">{day}</span>
                <span className={cx('lp-day flex h-12 w-full flex-col items-center justify-center rounded-xl text-[10px] font-semibold', active ? 'bg-gradient-to-b from-[#F7B6C8] to-[#E05A7A] text-white shadow-[0_10px_18px_-10px_rgba(194,67,98,0.7)]' : 'bg-rp-bg-2 text-transparent')}>
                  {active ? trf('{n} phút', { n: 90 }) : '·'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-2xl border border-rp-line bg-white p-3">
            <StudyIllustration name="notebook" size={34} />
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-rp-text">{tr('Bài tập về nhà')}</span>
              <span className="block text-[11px] text-rp-text-muted">{tr('Nộp bài · Giáo viên chấm và nhận xét')}</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl border border-rp-line bg-white p-3">
            <span aria-hidden="true" className="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-[#E7F6EC] text-[#0A7A3A]"><CheckCircle2 className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-rp-text">{tr('Điểm danh')}</span>
              <span className="block text-[11px] text-rp-text-muted">{tr('Có mặt · Vắng có phép · Vắng')}</span>
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11.5px] font-semibold text-rp-text-2">
            <span className="flex items-center gap-1.5"><CalendarCheck aria-hidden="true" className="h-3.5 w-3.5" /> {tr('Tiến trình khóa học')}</span>
            <span className="text-rp-text-muted">{trf('{0}/{1} buổi hoàn thành', { 0: 4, 1: 12 })}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-10 gap-1" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => <span key={i} className={cx('h-2 rounded-full', i < 4 ? 'bg-rp-brand-pressed' : 'bg-rp-brand-tint')} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GroupLearningSection({ ctaTo, ctaLabel }) {
  const { tr, trf } = useLocale();
  const standard = INTENSITY[1];
  return (
    <section id="group-learning" className="lp-band-peach relative scroll-mt-24 overflow-hidden py-20 sm:py-24" aria-labelledby="group-title">
      <div className="mx-auto max-w-[1280px] px-[var(--rp-space-page-x)]">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading
              id="group-title"
              eyebrow={tr('Học nhóm cùng Giáo viên')}
              title={tr('Lớp học nhóm trực tuyến, nhịp học do bạn chọn')}
              text={tr('Thời lượng khóa học và lịch học hằng tuần linh hoạt theo từng lớp, thanh toán trọn khóa. Lịch học, phòng học trực tuyến, bài tập về nhà và tiến độ nằm cùng một chỗ.')}
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-3" aria-label={tr('Cường độ lớp học')}>
              {INTENSITY.map((plan, i) => (
                <li key={plan.name} data-reveal style={{ '--d': `${i * 90}ms` }} className={cx('lp-card rounded-[22px] border bg-white/90 p-4', i === 1 ? 'border-rp-brand-border shadow-rp-card' : 'border-white/80')}>
                  <p className="text-[13px] font-bold text-rp-brand-strong">{tr(plan.name)}</p>
                  <p className="mt-1 text-[22px] font-extrabold text-rp-text">{trf('{n} buổi/tuần', { n: plan.perWeek })}</p>
                  <p className="mt-1 text-[12.5px] text-rp-text-2">{trf('{sessions} buổi · {hours} giờ', { sessions: plan.sessions, hours: plan.hours })}</p>
                  <p className="mt-2 text-[12px] leading-5 text-rp-text-muted">{tr(plan.note)}</p>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal="scale"><ClassroomShowcase plan={standard} /></div>
        </div>

        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={tr('Các bước tham gia lớp nhóm')}>
          {GROUP_STEPS.map((step, i) => (
            <li key={step.title} data-reveal style={{ '--d': `${i * 90}ms` }} className="lp-card rounded-[22px] border border-white/80 bg-white/90 p-5">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-rp-brand-pressed text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 text-[15px] font-bold text-rp-text">{tr(step.title)}</h3>
              <p className="mt-1 text-[13px] leading-5 text-rp-text-2">{tr(step.text)}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10" data-reveal><CtaLink to={ctaTo}><School aria-hidden="true" className="h-4 w-4" /> {tr(ctaLabel)}</CtaLink></div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ F — How RikiPath works */

export function JourneySection() {
  const { tr } = useLocale();
  return (
    <section className="lp-band-white py-20 sm:py-24" aria-labelledby="journey-title">
      <div className="mx-auto max-w-[1280px] px-[var(--rp-space-page-x)]">
        <SectionHeading id="journey-title" eyebrow={tr('Cách RikiPath hoạt động')} title={tr('Năm bước, một hành trình liền mạch')} align="center" />
        <ol data-reveal className="lp-journey relative mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-5 lg:gap-5">
          <span aria-hidden="true" className="lp-connector absolute left-[35px] top-4 h-[calc(100%-2rem)] w-[3px] rounded-full bg-gradient-to-b from-rp-brand-soft to-rp-brand lg:left-[10%] lg:right-[10%] lg:top-[36px] lg:h-[3px] lg:w-auto lg:bg-gradient-to-r" />
          {JOURNEY.map((step, i) => (
            <li key={step.title} data-reveal style={{ '--d': `${200 + i * 120}ms` }} className="lp-step group relative flex gap-4 lg:flex-col lg:items-center lg:text-center">
              <span className="relative z-10 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[24px] bg-white shadow-[0_16px_30px_-18px_rgba(194,67,98,0.6)] ring-4 ring-white">
                <StudyIllustration name={step.art} size={54} className="lp-icon" />
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rp-brand-pressed text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <span>
                <h3 className="text-[15.5px] font-bold text-rp-text lg:mt-3">{tr(step.title)}</h3>
                <p className="mt-1 text-[13px] leading-5 text-rp-text-2">{tr(step.text)}</p>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ FAQ + G — closing CTA */

export function FaqSection() {
  const { tr } = useLocale();
  return (
    <section id="faq" className="mx-auto max-w-[920px] scroll-mt-24 px-[var(--rp-space-page-x)] pb-20" aria-labelledby="faq-title">
      <SectionHeading id="faq-title" eyebrow={tr('Hỏi đáp')} title={tr('Câu hỏi thường gặp')} align="center" />
      <div data-reveal className="mt-8 divide-y divide-rp-line rounded-[26px] border border-rp-line bg-white shadow-rp-xs">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4 sm:px-6">
            <summary className="rp-focus flex cursor-pointer list-none items-center justify-between gap-4 rounded text-[15px] font-semibold text-rp-text">
              {tr(q)}
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rp-brand-tint text-rp-brand-pressed transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-6 text-rp-text-2">{tr(a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ClosingCta({ primaryTo, primaryLabel }) {
  const { tr } = useLocale();
  return (
    // Full-bleed band: no shared max-width container; only a small gutter so the rounded corners read.
    // The text block keeps its own max-width (readability); CTAs sit right of it on md+, stacked below on mobile.
    <section className="px-2 pb-10 sm:px-3" aria-labelledby="cta-title">
      <div data-reveal="scale" className="lp-closing relative isolate flex items-center overflow-hidden rounded-[24px] sm:rounded-[32px]">
        <ScenicPhoto name="bannerPagodaSunrise" decorative sizes="100vw" className="lp-closing-photo lp-kenburns absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden="true" className="lp-closing-scrim absolute inset-0 -z-10" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <span className="lp-sweep absolute inset-y-0 left-0 block w-1/3" />
        </div>
        <div aria-hidden="true" className="rp-pattern-seigaiha absolute inset-x-0 bottom-0 -z-10 h-28 opacity-30 [mask-image:linear-gradient(to_top,black,transparent)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden sm:block" data-idle>
          {[['10%', '14%', 0, 17], ['46%', '8%', 5, 19], ['80%', '10%', 3, 16], ['66%', '64%', 7, 18], ['28%', '72%', 10, 20]].map(([left, top, delay, dur]) => (
            <svg key={left} viewBox="0 0 20 20" className="rp-petal-drift absolute h-4 w-4" style={{ left, top, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}>
              <path d="M10 1.5c3.6 2.3 6 5.6 5.5 9.4-.4 3.4-3 6.1-5.5 7.6-2.5-1.5-5.1-4.2-5.5-7.6C4 7.1 6.4 3.8 10 1.5Z" fill="#F7B6C8" />
            </svg>
          ))}
        </div>
        <div className="mx-auto flex w-full max-w-[1280px] flex-col justify-end gap-8 self-stretch px-[clamp(1.25rem,0.6rem+2.4vw,3rem)] py-14 md:flex-row md:items-center md:justify-between md:py-16 lg:py-20">
          <div className="mt-auto max-w-[600px] md:mt-0">
            <p lang="ja" className="rp-kanji text-[15px] tracking-[0.25em] text-white/85">一歩ずつ、確かに。</p>
            <h2 id="cta-title" className="mt-3 text-balance text-[clamp(1.9rem,1.3rem+2.2vw,3.2rem)] font-extrabold leading-[1.12] tracking-[-0.03em] text-white [text-shadow:0_2px_18px_rgba(23,36,58,0.45)]">{tr('Bắt đầu từ mục tiêu JLPT của bạn')}</h2>
            <p className="mt-4 max-w-[520px] text-[15.5px] leading-7 text-white/90 sm:text-[17px]">{tr('Tạo tài khoản, chọn cấp độ mục tiêu và làm bài đánh giá năng lực đầu tiên.')}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row md:shrink-0 md:flex-col lg:flex-row">
            <CtaLink to={primaryTo} variant="light" className="justify-center">{tr(primaryLabel)} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" /></CtaLink>
            <Link
              to="/thi-thu"
              className="lp-cta lp-closing-ghost rp-focus rp-press inline-flex min-h-12 items-center justify-center gap-2 rounded-rp-input px-5 py-2.5 text-[15px] font-semibold transition-[background-color,border-color,transform] duration-200"
            >
              {tr('Xem đề thi thử')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
