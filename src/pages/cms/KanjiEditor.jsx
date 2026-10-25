import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function KanjiEditor() {
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="KanjiEditor"
      breadcrumb="Hán tự"
      title="Hán tự"
      hint="Chữ soạn trên trang này. Chưa lưu vào kho."
      addLabel="Thêm chữ"
      detail={{ to: '/vocabulary-editor', label: 'Từ vựng' }}
      columns={[
        { key: 'char', label: 'Chữ' },
        { key: 'reading', label: 'Âm' },
        { key: 'meaning', label: 'Nghĩa' },
        { key: 'strokes', label: 'Nét' },
        { key: 'level', label: 'Cấp' },
      ]}
      fields={[
        { key: 'char', label: 'Chữ', required: true },
        { key: 'reading', label: 'Âm' },
        { key: 'meaning', label: 'Nghĩa', required: true },
        { key: 'strokes', label: 'Số nét' },
        { key: 'level', label: 'Cấp', type: 'select', options: LEVELS, default: 'N3', wide: true },
      ]}
      seed={[
        { id: 1, sample: true, char: '咲', reading: 'さく', meaning: 'Nở', strokes: '9', level: 'N3' },
      ]}
    />
  );
}
