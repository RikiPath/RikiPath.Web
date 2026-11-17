import { AUTHOR_LEVELS } from '../content-author/authorLevels.js';
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
        { key: 'level', label: 'Cấp' },
      ]}
      fields={[
        { key: 'word', label: 'Từ', required: true },
        { key: 'reading', label: 'Cách đọc' },
        { key: 'meaning', label: 'Nghĩa', required: true, wide: true },
        { key: 'level', label: 'Cấp', type: 'select', options: AUTHOR_LEVELS },
      ]}
      seed={[
        { id: 1, sample: true, word: '経験', reading: 'けいけん', meaning: 'Kinh nghiệm', level: 'N3' },
        { id: 2, sample: true, word: '準備', reading: 'じゅんび', meaning: 'Chuẩn bị', level: 'N3' },
      ]}
    />
  );
}
