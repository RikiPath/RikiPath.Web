import { useLocation } from 'react-router-dom';

import StudioList from './studioList.jsx';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function ContentLibrary() {
  const { pathname } = useLocation();
  return (
    <StudioList
      pathname={pathname}
      page="ContentLibrary"
      breadcrumb="Ngữ pháp"
      title="Ngữ pháp"
      hint="Mẫu câu soạn trên trang này. Chưa lưu vào kho."
      addLabel="Thêm mẫu"
      columns={[
        { key: 'pattern', label: 'Mẫu' },
        { key: 'meaning', label: 'Nghĩa' },
        { key: 'level', label: 'Cấp' },
        { key: 'note', label: 'Ghi chú' },
      ]}
      fields={[
        { key: 'pattern', label: 'Mẫu câu', required: true },
        { key: 'level', label: 'Cấp', type: 'select', options: LEVELS, default: 'N3' },
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
