import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CmsShell } from '../../components/shells';

const fieldClass =
  'mt-1 w-full rounded-lg border border-[#E8DFDC] bg-white px-3 py-2 text-[13px] text-[#2D282A] outline-none focus:border-[#E7C9D4]';

export default function CmsLessonDetail() {
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
    <CmsShell pathname={pathname} breadcrumb="Chi tiết bài">
      <main data-page="CmsLessonDetail" className="mx-auto w-full max-w-3xl px-6 py-7 sm:px-8">
        <Link
          to="/lesson-cms"
          className="inline-flex items-center gap-1 text-[13px] text-[#967F8A] hover:text-[#AD3155]"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Bài học
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-[#E7C9D6] bg-[linear-gradient(135deg,#FFF8FA,#FFFFFF)] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium tracking-[0.12em] text-[#AD3155]">BỐ CỤC MẪU</p>
              <h1 className="mt-1 text-[24px] font-semibold text-[#49353F]">Một bài học</h1>
              <p className="mt-1 max-w-lg text-[13px] leading-6 text-[#927B88]">
                Trang này chỉ để xem cách một bài được trình bày. Nút giữ không gửi lên máy chủ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaved(true)}
              className="h-10 rounded-xl bg-[#AD3155] px-3.5 text-[13px] text-white hover:bg-[#982B4B]"
            >
              Giữ trên trang
            </button>
          </div>
          {saved && <p className="mt-3 text-[12px] text-[#1E5C36]">Đã giữ trên trang này.</p>}
        </div>

        <form className="mt-4 grid gap-4 rounded-2xl border border-[#EADFE5] bg-white p-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-[12px] text-[#967F8A]">Tên bài</span>
            <input
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              className={fieldClass}
            />
          </label>
          <label>
            <span className="text-[12px] text-[#967F8A]">Cấp</span>
            <select
              value={form.level}
              onChange={(event) => setField('level', event.target.value)}
              className={fieldClass}
            >
              {['N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[12px] text-[#967F8A]">Kỹ năng</span>
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
              <span className="text-[12px] text-[#967F8A]">{label}</span>
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
    </CmsShell>
  );
}
