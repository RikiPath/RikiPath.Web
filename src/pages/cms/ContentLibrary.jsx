import { AUTHOR_LEVELS } from '../content-author/authorLevels.js';
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
        { key: 'pattern', label: 'Mẫu' },
        { key: 'meaning', label: 'Nghĩa' },
        { key: 'level', label: 'Cấp' },
        { key: 'note', label: 'Ghi chú' },
      ]}
      fields={[
        { key: 'pattern', label: 'Mẫu câu', required: true },
        { key: 'level', label: 'Cấp', type: 'select', options: AUTHOR_LEVELS },
        { key: 'meaning', label: 'Nghĩa', required: true, wide: true },
        { key: 'note', label: 'Ghi chú', wide: true },
      ]}
      seed={[
        {
          id: 1,
          sample: true,
          pattern: '〜わけにはいかない',
          meaning: 'Không thể làm vì lý do xã hội',
          level: 'N3',
          note: 'Bố cục mẫu',
        },
      ]}
    />
  );
}
