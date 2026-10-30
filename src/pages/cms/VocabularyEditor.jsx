import { useLocation } from 'react-router-dom';

import ApprovedBankPage from './ApprovedBankPage.jsx';

export default function VocabularyEditor() {
  const { pathname } = useLocation();
  return (
    <ApprovedBankPage
      pathname={pathname}
      page="VocabularyEditor"
      breadcrumb="Từ vựng"
      title="Từ vựng"
      hint="Từ vựng đã được duyệt cùng bài học."
      endpoint="/SharedBank/vocabulary/search"
      detail={{ to: '/kanji-editor', label: 'Hán tự' }}
      columns={[
        { key: 'word', label: 'Từ' },
        { key: 'reading', label: 'Cách đọc' },
        { key: 'meaning', label: 'Nghĩa' },
        { key: 'jlptLevelName', label: 'Cấp' },
      ]}
    />
  );
}
