import { AUTHOR_LEVELS } from '@/features/content-author/constants/authorLevels.js';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ContentAuthorShell } from '@/layouts';
import Icon from '@/components/ui/Icon.jsx';
import { useLocale } from '@/locales/locale.js';

const fieldClass =
  'mt-1 w-full rounded-lg border border-rp-line bg-white px-3 py-2 text-[13px] text-rp-text outline-none focus:border-rp-brand-border';

export default function CmsLessonDetail() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    title: 'わけにはいかない',
    level: 'N3',
    skill: 'Ngữ pháp',
    goal: 'Phân biệt với わけではない.',
    video: '',
    examples: '',
    quiz: '',
  });

  function setField(key, value) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ContentAuthorShell pathname={pathname} breadcrumb={tr('Chi tiết bài')}>
      <main data-page="CmsLessonDetail" className="rp-container-reading py-6 lg:py-8">
        <Link
          to="/lesson-cms"
          className="inline-flex items-center gap-1 text-[13px] text-rp-text-muted hover:text-rp-brand-strong"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          {tr('Bài học')}
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-rp-brand-border bg-[linear-gradient(135deg,#FFF8FA,#FFFFFF)] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium tracking-[0.12em] text-rp-brand-strong">{tr('BỐ CỤC MẪU')}</p>
              <h1 className="mt-1 text-[24px] font-semibold text-rp-text">{tr('Một bài học')}</h1>
              <p className="mt-1 max-w-lg text-[13px] leading-6 text-rp-text-muted">
                {tr('Trang này chỉ để xem cách một bài được trình bày. Nút giữ không gửi lên máy chủ.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaved(true)}
              className="h-10 rounded-xl bg-rp-brand-strong px-3.5 text-[13px] text-white hover:bg-rp-brand-deep rp-press"
            >
              {tr('Giữ trên trang')}
            </button>
          </div>
          {saved && <p className="mt-3 text-[12px] text-rp-success">{tr('Đã giữ trên trang này.')}</p>}
        </div>

        <form className="mt-4 grid gap-4 rounded-2xl border border-rp-line bg-white p-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-[12px] text-rp-text-muted">{tr('Tên bài')}</span>
            <input
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              className={fieldClass}
            />
          </label>
          <label>
            <span className="text-[12px] text-rp-text-muted">{tr('Cấp')}</span>
            <select
              value={form.level}
              onChange={(event) => setField('level', event.target.value)}
              className={fieldClass}
            >
              {AUTHOR_LEVELS.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[12px] text-rp-text-muted">{tr('Kỹ năng')}</span>
            <select
              value={form.skill}
              onChange={(event) => setField('skill', event.target.value)}
              className={fieldClass}
            >
              {['Ngữ pháp', 'Từ vựng', 'Hán tự', 'Đọc', 'Nghe'].map((skill) => (
                <option key={skill}>{skill}</option>
              ))}
            </select>
          </label>
          {[
            ['goal', 'Mục tiêu'],
            ['video', 'Video'],
            ['examples', 'Ví dụ'],
            ['quiz', 'Câu hỏi'],
          ].map(([key, label]) => (
            <label key={key} className="sm:col-span-2">
              <span className="text-[12px] text-rp-text-muted">{tr(label)}</span>
              <textarea
                rows={2}
                value={form[key]}
                onChange={(event) => setField(key, event.target.value)}
                className={fieldClass}
              />
            </label>
          ))}
        </form>
      </main>
    </ContentAuthorShell>
  );
}
