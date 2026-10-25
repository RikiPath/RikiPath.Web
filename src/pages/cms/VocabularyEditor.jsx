import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function VocabularyEditor() {
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="VocabularyEditor"
      breadcrumb="Từ vựng"
      title="Từ vựng"
      hint="Từ soạn trên trang này. Hán tự nằm ở mục riêng."
      addLabel="Thêm từ"
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
        { key: 'level', label: 'Cấp', type: 'select', options: LEVELS, default: 'N3' },
      ]}
      seed={[
        { id: 1, sample: true, word: '経験', reading: 'けいけん', meaning: 'Kinh nghiệm', level: 'N3' },
        { id: 2, sample: true, word: '準備', reading: 'じゅんび', meaning: 'Chuẩn bị', level: 'N3' },
      ]}
    />
  );
}
