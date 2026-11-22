import { ContentAuthorShell } from '@/layouts';
import { ManualContentWorkspace } from './ManualContentPage.jsx';
import { useLocale } from '@/locales/locale.js';

export default function ExamBuilder() {
  const { tr } = useLocale();
  return (
    <ContentAuthorShell breadcrumb={tr('Xây đề thi')}>
      <ManualContentWorkspace heading={tr('Xây đề thi')} pageName="ExamBuilder" examOnly />
    </ContentAuthorShell>
  );
}
