import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui';
import ApprovedBankPage from './ApprovedBankPage.jsx';

export default function KanjiEditor() {
  const { pathname } = useLocation();
  return (
    <ApprovedBankPage
      pathname={pathname}
      page="KanjiEditor"
      breadcrumb="Hán tự"
      title="Hán tự"
      hint="Kho chữ Hán đã duyệt kèm âm đọc On/Kun, Hán Việt và số nét."
      feature="kanji"
      manualType="Kanji"
      endpoint="/SharedBank/kanji/search"
      detailEndpoint="/SharedBank/kanji"
      secondaryLink={{ to: '/vocabulary-editor/', label: 'Kho Từ vựng' }}
      columns={[
        {
          key: 'character',
          label: 'Chữ Hán',
          align: 'center',
          compact: true,
          render: (row) => (
            <span className="rp-jp inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rp-brand-tint text-lg font-bold text-rp-brand-strong">
              {row.character}
            </span>
          ),
        },
        {
          key: 'meaning',
          label: 'Nghĩa',
          align: 'left',
          render: (row) => <span className="font-medium text-rp-text">{row.meaning}</span>,
        },
        {
          key: 'readings',
          label: 'Âm đọc',
          align: 'left',
          render: (row) => (
            <span className="rp-jp text-xs text-rp-text-2">
              {[row.onYomi && `On: ${row.onYomi}`, row.kunYomi && `Kun: ${row.kunYomi}`].filter(Boolean).join(' · ') || '—'}
            </span>
          ),
        },
        {
          key: 'strokeCount',
          label: 'Số nét',
          align: 'center',
          compact: true,
          render: (row) => <span className="tabular-nums text-xs">{row.strokeCount}</span>,
        },
        {
          key: 'jlptLevelName',
          label: 'Cấp độ',
          align: 'center',
          compact: true,
          render: (row) => (
            row.jlptLevelName ? <Badge tone="neutral" size="sm" icon={false}>{row.jlptLevelName}</Badge> : '—'
          ),
        },
      ]}
    />
  );
}
