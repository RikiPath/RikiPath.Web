import { CmsShell } from '../../components/shells';
import { ManualContentWorkspace } from '../content-author/ManualContentPage.jsx';

export default function LessonCMS() {
  return (
    <CmsShell breadcrumb="Bài học">
      <ManualContentWorkspace heading="Bài học" pageName="LessonCMS" fixedType="Lesson" />
    </CmsShell>
  );
}
