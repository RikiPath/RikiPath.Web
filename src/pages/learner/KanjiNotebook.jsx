import { useLocation } from 'react-router-dom';
import { LearnerShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';
import { getSession } from '@/app/auth/session.js';
import SmartNotebookWorkspace from '@/features/notebook/components/SmartNotebookWorkspace.jsx';

export default function KanjiNotebook() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const signedIn = Boolean(getSession()?.accessToken);

  return (
    <LearnerShell pathname={pathname || '/kanji-notebook'} breadcrumb={tr('Sổ tay cá nhân')}>
      <div className="rp-container rp-cq py-[var(--rp-space-page-y)] text-rp-text">
        {!signedIn ? (
          <div className="rounded-2xl border border-rp-line bg-white p-6 text-[13.5px] text-rp-text-muted">
            {tr('Đăng nhập để xem và lưu sổ tay học tập của bạn.')}
          </div>
        ) : (
          <SmartNotebookWorkspace />
        )}
      </div>
    </LearnerShell>
  );
}
