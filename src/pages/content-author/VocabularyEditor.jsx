import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui';
import ApprovedBankPage from './ApprovedBankPage.jsx';

export default function VocabularyEditor() {
  const { pathname } = useLocation();
  return (
    <ApprovedBankPage
      pathname={pathname}
      page="VocabularyEditor"
      breadcrumb="Từ vựng"
      title="Từ vựng"
      hint="Kho từ vựng đã được duyệt và phát hành cho người học."
      feature="vocab"
      manualType="Vocabulary"
      endpoint="/SharedBank/vocabulary/search"
      detailEndpoint="/SharedBank/vocabulary"
      secondaryLink={{ to: '/kanji-editor/', label: 'Kho Hán tự' }}
      columns={[
        {
          key: 'word',
          label: 'Từ vựng',
          render: (row) => <span className="rp-jp font-semibold text-rp-text">{row.word}</span>,
        },
        {
          key: 'reading',
          label: 'Cách đọc',
          render: (row) => <span className="rp-jp text-rp-text-2">{row.reading || '—'}</span>,
        },
        {
          key: 'meaning',
          label: 'Nghĩa',
          render: (row) => <span title={row.meaning || ''} className="mx-auto line-clamp-2 max-w-[420px]">{row.meaning}</span>,
        },
        {
          key: 'jlptLevelName',
          label: 'Cấp độ',
          compact: true,
          render: (row) => (
            row.jlptLevelName ? <Badge tone="neutral" size="sm" icon={false}>{row.jlptLevelName}</Badge> : '—'
          ),
        },
      ]}
    />
  );
}
