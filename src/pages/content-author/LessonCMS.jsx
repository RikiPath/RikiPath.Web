import { ContentAuthorShell } from '@/layouts';
import { ManualContentWorkspace } from './ManualContentPage.jsx';
import { useLocale } from '@/locales/locale.js';

export default function LessonCMS() {
  const { tr } = useLocale();
  return (
    <ContentAuthorShell breadcrumb={tr('Bài học')}>
      <ManualContentWorkspace heading={tr('Bài học')} pageName="LessonCMS" fixedType="Lesson" />
    </ContentAuthorShell>
  );
}
