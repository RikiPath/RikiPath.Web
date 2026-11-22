import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui';
import ApprovedBankPage from './ApprovedBankPage.jsx';

export default function ContentLibrary() {
  const { pathname } = useLocation();
  return (
    <ApprovedBankPage
      pathname={pathname}
      page="ContentLibrary"
      breadcrumb="Ngữ pháp"
      title="Ngữ pháp"
      hint="Các mẫu ngữ pháp đã được Admin duyệt và gắn theo từng cấp độ."
      feature="grammar"
      manualType="Grammar"
      endpoint="/SharedBank/grammar/search"
      detailEndpoint="/SharedBank/grammar"
      secondaryLink={{ to: '/question-bank/', label: 'Ngân hàng câu hỏi' }}
      columns={[
        {
          key: 'structure',
          label: 'Mẫu ngữ pháp',
          render: (row) => (
            <div className="space-y-0.5">
              <p className="rp-jp font-semibold text-rp-text">{row.structure || row.title}</p>
              {row.title && row.structure && row.title !== row.structure && (
                <p className="text-xs text-rp-text-muted">{row.title}</p>
              )}
            </div>
          ),
        },
        {
          key: 'explanation',
          label: 'Giải thích',
          render: (row) => <span className="line-clamp-2 max-w-[360px] text-sm text-rp-text-2">{row.explanation || '—'}</span>,
        },
        {
          key: 'jlptLevelName',
          label: 'Cấp độ',
          render: (row) => (
            row.jlptLevelName ? <Badge tone="neutral" size="sm" icon={false}>{row.jlptLevelName}</Badge> : '—'
          ),
        },
      ]}
    />
  );
}
