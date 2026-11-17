import { CmsShell } from '../../components/shells';
import { ManualContentWorkspace } from '../content-author/ManualContentPage.jsx';

export default function ExamBuilder() {
  return (
    <CmsShell breadcrumb="Xây đề thi">
      <ManualContentWorkspace heading="Xây đề thi" pageName="ExamBuilder" examOnly />
    </CmsShell>
  );
}
