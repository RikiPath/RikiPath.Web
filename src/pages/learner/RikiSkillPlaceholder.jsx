import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const SKILLS = {
  listening: { label: 'Nghe', icon: 'headphones' },
  speaking: { label: 'Nói', icon: 'mic' },
  reading: { label: 'Đọc', icon: 'menu_book' },
  essay: { label: 'Làm văn', icon: 'edit_note' },
};

export default function RikiSkillPlaceholder({ skill }) {
  const { pathname } = useLocation();
  const currentSkill = SKILLS[skill] || SKILLS.listening;

  return (
    <LearnerShell pathname={pathname} breadcrumb={`Riki - ${currentSkill.label}`}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center px-6 py-10 text-on-surface">
        <section className="w-full rounded-3xl border border-[#eadfd9] bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary-container text-primary">
            <span className="material-symbols-outlined text-[40px]">{currentSkill.icon}</span>
          </div>
          <p className="mt-6 font-label-md text-label-md uppercase tracking-[0.2em] text-primary">Riki</p>
          <h1 className="mt-2 font-headline-lg text-headline-lg">Luyện {currentSkill.label}</h1>
          <p className="mx-auto mt-3 max-w-md text-body-md text-on-surface-variant">
            Tính năng đang phát triển. Riki sẽ sớm có bài luyện {currentSkill.label} dành cho bạn.
          </p>
          <Link
            to="/app"
            className="mt-8 inline-flex rounded-full bg-primary px-5 py-2.5 font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
          >
            Về tổng quan
          </Link>
        </section>
      </div>
    </LearnerShell>
  );
}
