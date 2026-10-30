import { useLocation } from 'react-router-dom';

import ApprovedBankPage from './ApprovedBankPage.jsx';

export default function ContentLibrary() {
  const { pathname } = useLocation();
  return (
    <ApprovedBankPage
      pathname={pathname}
      page="ContentLibrary"
      breadcrumb="Ngữ pháp"
      title="Ngữ pháp"
      hint="Mẫu ngữ pháp đã được duyệt cùng bài học."
      endpoint="/SharedBank/grammar/search"
      columns={[
        { key: 'title', label: 'Mẫu' },
        { key: 'structure', label: 'Cấu trúc' },
        { key: 'explanation', label: 'Cách dùng' },
        { key: 'jlptLevelName', label: 'Cấp' },
      ]}
    />
  );
}
