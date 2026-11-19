import { useLocation } from 'react-router-dom';

import ApprovedBankPage from './ApprovedBankPage.jsx';
import { useLocale } from '@/locales/locale.js';

export default function KanjiEditor() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  return (
    <ApprovedBankPage
      pathname={pathname}
      page="KanjiEditor"
      breadcrumb={tr('Hán tự')}
      title={tr('Hán tự')}
      hint={tr('Hán tự đã được duyệt cùng bài học.')}
      endpoint="/SharedBank/kanji/search"
      detail={{ to: '/vocabulary-editor', label: 'Từ vựng' }}
      columns={[
        { key: 'character', label: 'Chữ' },
        { key: 'kunYomi', label: 'Kun' },
        { key: 'onYomi', label: 'On' },
        { key: 'meaning', label: 'Nghĩa' },
        { key: 'strokeCount', label: 'Nét' },
        { key: 'jlptLevelName', label: 'Cấp' },
      ]}
    />
  );
}
