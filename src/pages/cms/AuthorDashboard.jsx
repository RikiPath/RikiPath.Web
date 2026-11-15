import { Link } from 'react-router-dom';
import { CmsShell } from '../../components/shells';
import { ManualContentWorkspace } from '../content-author/ManualContentPage.jsx';

export default function AuthorDashboard() {
  return (
    <CmsShell breadcrumb="Bảng tác giả">
      <ManualContentWorkspace heading="Bảng tác giả" pageName="AuthorDashboard">
        <nav aria-label="Lối tắt học liệu" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#9E2A4B]">
          <Link to="/lesson-cms/">Bài học</Link>
          <Link to="/vocabulary-editor/">Từ vựng</Link>
          <Link to="/question-bank/">Câu hỏi</Link>
        </nav>
      </ManualContentWorkspace>
    </CmsShell>
  );
}
